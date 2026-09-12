import os
import uuid
import datetime
import math
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

    print("Seeding Genesis Algae Farm with Telemetry...")
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
                sensor = Sensor(pond_id=pond.id, type=s_type, unit=s_unit, is_simulated=True)
                session.add(sensor)
                session.flush()
            all_sensors.append(sensor)
    
    session.commit()

    # Seed 48 historical telemetry readings per sensor (spanning last 24h)
    now = datetime.datetime.now(datetime.timezone.utc)
    readings = []
    
    base_values = {
        SensorType.temperature: 25.5,
        SensorType.ph: 7.8,
        SensorType.dissolved_oxygen: 6.8,
        SensorType.turbidity: 14.2,
        SensorType.light: 650.0,
        SensorType.nitrogen: 12.5,
        SensorType.biomass: 0.85
    }

    for s in all_sensors:
        for i in range(48):
            ts = now - datetime.timedelta(minutes=i * 30)
            hour = ts.hour + ts.minute / 60.0
            hours_elapsed = 24.0 - (i * 0.5)

            if s.type == SensorType.light:
                if 6.0 <= hour <= 18.0:
                    val = round(math.sin((hour - 6.0) / 12.0 * math.pi) * 850.0, 1)
                else:
                    val = 0.0
            elif s.type == SensorType.temperature:
                val = round(24.0 + math.sin((hour - 8.0) / 24.0 * 2.0 * math.pi) * 4.5, 2)
            elif s.type == SensorType.dissolved_oxygen:
                if 6.0 <= hour <= 18.0:
                    val = round(6.5 + math.sin((hour - 6.0) / 12.0 * math.pi) * 3.2, 2)
                else:
                    val = round(max(4.5, 6.5 - math.sin((hour - 18.0) / 12.0 * math.pi) * 1.2), 2)
            elif s.type == SensorType.ph:
                if 6.0 <= hour <= 18.0:
                    val = round(7.4 + math.sin((hour - 6.0) / 12.0 * math.pi) * 1.0, 2)
                else:
                    val = 7.4
            elif s.type == SensorType.nitrogen:
                val = round(max(1.0, 18.0 - (hours_elapsed / 24.0) * 5.5 + math.sin(hour / 24.0 * 2.0 * math.pi) * 0.4), 2)
            elif s.type == SensorType.biomass:
                val = round(0.55 + (hours_elapsed / 24.0) * 0.58 + math.sin(hour / 12.0 * math.pi) * 0.03, 2)
            elif s.type == SensorType.turbidity:
                bio = 0.55 + (hours_elapsed / 24.0) * 0.58
                val = round(bio * 115.0 + math.sin(hour / 6.0) * 2.0, 1)
            elif s.type == SensorType.conductivity:
                val = round(1250.0 + math.sin(hour / 24.0 * 2.0 * math.pi) * 35.0, 1)
            elif s.type == SensorType.water_level:
                val = round(1.85 + math.cos(hour / 24.0 * 2.0 * math.pi) * 0.05, 2)
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
                source_type=SourceType.simulated
            )
            readings.append(reading)

    session.add_all(readings)
    session.commit()
    print(f"Seed complete with {len(readings)} telemetry readings.")
    session.close()

if __name__ == "__main__":
    seed_database()
