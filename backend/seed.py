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

def seed_database():
    Base.metadata.create_all(bind=engine)
    session = Session()
    
    # Check if already seeded
    existing_farm = session.query(Farm).first()
    if existing_farm and session.query(SensorReading).count() > 0:
        print("Database already seeded with telemetry.")
        session.close()
        return

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
        base_val = base_values.get(s.type, 20.0)
        for i in range(48):
            ts = now - datetime.timedelta(minutes=i * 30)
            var = math.sin(i / 3.0) * (base_val * 0.08)
            val = round(max(0.1, base_val + var), 2)
            
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
