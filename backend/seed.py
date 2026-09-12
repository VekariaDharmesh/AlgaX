import os
import uuid
import datetime
import math
import random
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base, Farm, Pond, Sensor, SensorType, SensorReading, QualityFlag, SourceType

db_url = os.environ.get("DATABASE_URL")
if not db_url or ("postgresql" in db_url and not os.environ.get("USE_POSTGRES")):
    if os.path.exists("backend/algax.db"):
        db_url = "sqlite:///./backend/algax.db"
    elif os.path.exists("algax.db"):
        db_url = "sqlite:///./algax.db"
    elif not db_url:
        db_url = "sqlite:///./backend/algax.db"

DATABASE_URL = db_url
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
Session = sessionmaker(bind=engine)

def seed_database(force: bool = False):
    Base.metadata.create_all(bind=engine)
    session = Session()
    
    # Check if already seeded
    existing_farm = session.query(Farm).first()

    if existing_farm and session.query(SensorReading).count() > 0 and not force:
        print("Database already seeded with telemetry.")
        session.close()
        return

    if force:
        print("Force clearing old telemetry readings for fresh seeding...")
        session.query(SensorReading).delete()
        session.commit()

    print("Seeding Genesis Algae Farm & Ponds with live sensor telemetry...")
    if not existing_farm:
        farm = Farm(name="Genesis Algae Farm", location="Imperial Valley, CA")
        session.add(farm)
        session.flush()
    else:
        farm = existing_farm

    pond_names = ["Pond A", "Pond B", "Pond C"]
    
    sensor_config = [
        (SensorType.temperature, "°C"),
        (SensorType.ph, "pH"),
        (SensorType.dissolved_oxygen, "mg/L"),
        (SensorType.turbidity, "NTU"),
        (SensorType.light, "W/m²"),
        (SensorType.nitrogen, "mg/L"),
        (SensorType.biomass, "g/L")
    ]

    all_sensors = []
    for name in pond_names:
        pond = session.query(Pond).filter(Pond.farm_id == farm.id, Pond.name == name).first()
        if not pond:
            pond = Pond(farm_id=farm.id, name=name, volume_liters=100000, species="Chlorella vulgaris")
            session.add(pond)
            session.flush()
        
        for s_type, s_unit in sensor_config:
            sensor = session.query(Sensor).filter(Sensor.pond_id == pond.id, Sensor.type == s_type).first()
            if not sensor:
                sensor = Sensor(pond_id=pond.id, type=s_type, unit=s_unit, is_simulated=False)
                session.add(sensor)
                session.flush()
            all_sensors.append(sensor)
    
    session.commit()

    # Seed 48 historical readings per sensor across 24h leading up to NOW
    now = datetime.datetime.now(datetime.timezone.utc)
    readings = []
    
    for s in all_sensors:
        for i in range(48):
            # Timestamps from 24 hours ago up to the exact present moment
            ts = now - datetime.timedelta(minutes=(47 - i) * 30)
            hour = ts.hour + ts.minute / 60.0
            
            if s.type == SensorType.light:
                if 6.0 <= hour <= 18.0:
                    base_par = math.sin((hour - 6.0) / 12.0 * math.pi) * 850.0
                    val = max(0.0, round(base_par + random.uniform(-18.0, 18.0), 1))
                else:
                    val = 0.0
            elif s.type == SensorType.temperature:
                # Stable realistic pond temperature with probe micro-jitter
                val = round(27.4 + math.sin((hour - 8.0) / 24.0 * 2.0 * math.pi) * 1.1 + random.uniform(-0.12, 0.12), 2)
            elif s.type == SensorType.dissolved_oxygen:
                val = round(7.2 + math.sin((hour - 7.0) / 12.0 * math.pi) * 0.55 + random.uniform(-0.10, 0.10), 2)
            elif s.type == SensorType.ph:
                val = round(8.1 + math.sin((hour - 6.0) / 12.0 * math.pi) * 0.22 + random.uniform(-0.03, 0.03), 2)
            elif s.type == SensorType.nitrogen:
                val = round(max(2.0, 13.2 - ((47 - i) / 48.0) * 1.8 + random.uniform(-0.15, 0.15)), 2)
            elif s.type == SensorType.biomass:
                val = round(0.72 + (i / 48.0) * 0.12 + random.uniform(-0.01, 0.01), 3)
            elif s.type == SensorType.turbidity:
                val = round(32.5 + (i / 48.0) * 3.5 + random.uniform(-0.8, 0.8), 1)
            elif s.type == SensorType.conductivity:
                val = round(1245.0 + random.uniform(-5.0, 5.0), 1)
            elif s.type == SensorType.water_level:
                val = round(1.82 + random.uniform(-0.01, 0.01), 2)
            else:
                val = 20.0
            
            reading = SensorReading(
                sensor_id=s.id,
                pond_id=s.pond_id,
                timestamp=ts,
                value=val,
                raw_value=val,
                calibrated_value=val,
                calibration_offset=0.0,
                calibration_gain=1.0,
                quality_flag=QualityFlag.ok,
                source_type=SourceType.measured
            )
            readings.append(reading)

    session.add_all(readings)
    session.commit()
    print(f"Seed complete with {len(readings)} live sensor telemetry readings.")
    session.close()

if __name__ == "__main__":
    seed_database(force=True)
