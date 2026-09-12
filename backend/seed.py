import os
import uuid
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Farm, Pond, Sensor, SensorType

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/algaemrv")
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

def seed_database():
    session = Session()
    
    # Check if already seeded
    if session.query(Farm).first():
        print("Database already seeded.")
        return

    print("Seeding Genesis Algae Farm...")
    farm = Farm(name="Genesis Algae Farm", location="Imperial Valley, CA")
    session.add(farm)
    session.flush()

    pond_names = ["Pond A", "Pond B", "Pond C"]
    
    sensor_config = [
        (SensorType.temperature, "°C"),
        (SensorType.ph, ""),
        (SensorType.dissolved_oxygen, "mg/L"),
        (SensorType.turbidity, "NTU"),
        (SensorType.light, "W/m2"),
        (SensorType.nitrogen, "mg/L"),
        (SensorType.biomass, "g/L")
    ]

    for name in pond_names:
        pond = Pond(farm_id=farm.id, name=name, volume_liters=100000, species="Chlorella vulgaris")
        session.add(pond)
        session.flush()
        
        for s_type, s_unit in sensor_config:
            sensor = Sensor(pond_id=pond.id, type=s_type, unit=s_unit, is_simulated=True)
            session.add(sensor)
    
    session.commit()
    print("Seed complete.")
    session.close()

if __name__ == "__main__":
    seed_database()
