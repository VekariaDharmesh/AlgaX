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

INDIAN_FARMS_CONFIG = [
    {
        "name": "Kutch Bio-Raceway Facility",
        "location": "Kutch, Gujarat, India",
        "ponds": [
            {"name": "Pond Narmada", "volume": 120000, "species": "Chlorella vulgaris"},
            {"name": "Pond Sabarmati", "volume": 95000, "species": "Spirulina platensis"},
            {"name": "Pond Tapi", "volume": 110000, "species": "Scenedesmus obliquus"},
            {"name": "Pond Mahi", "volume": 85000, "species": "Dunaliella salina"},
        ]
    },
    {
        "name": "Rameswaram Coastal Algae Hub",
        "location": "Rameswaram, Tamil Nadu, India",
        "ponds": [
            {"name": "Pond Kaveri", "volume": 150000, "species": "Chlorella vulgaris"},
            {"name": "Pond Vaigai", "volume": 100000, "species": "Spirulina platensis"},
            {"name": "Pond Tamirabarani", "volume": 90000, "species": "Haematococcus pluvialis"},
        ]
    },
    {
        "name": "Sambhar Salt Lake Bio-Culture Site",
        "location": "Sambhar Lake, Rajasthan, India",
        "ponds": [
            {"name": "Pond Luni", "volume": 180000, "species": "Dunaliella salina"},
            {"name": "Pond Pushkar", "volume": 120000, "species": "Spirulina platensis"},
            {"name": "Pond Banas", "volume": 105000, "species": "Chlorella pyrenoidosa"},
        ]
    },
    {
        "name": "Kochi Blue-Carbon Marine Facility",
        "location": "Kochi, Kerala, India",
        "ponds": [
            {"name": "Pond Periyar", "volume": 130000, "species": "Nannochloropsis oculata"},
            {"name": "Pond Pamba", "volume": 115000, "species": "Tetraselmis suecica"},
            {"name": "Pond Chalakudy", "volume": 90000, "species": "Isochrysis galbana"},
        ]
    },
    {
        "name": "Chilika Lagoon Bio-Sequestration Hub",
        "location": "Chilika, Odisha, India",
        "ponds": [
            {"name": "Pond Mahanadi", "volume": 160000, "species": "Chlorella vulgaris"},
            {"name": "Pond Daya", "volume": 110000, "species": "Scenedesmus obliquus"},
            {"name": "Pond Bhargavi", "volume": 95000, "species": "Spirulina maxima"},
        ]
    },
    {
        "name": "Bhavnagar Marine Algae Centre",
        "location": "Bhavnagar, Gujarat, India",
        "ponds": [
            {"name": "Pond Shetrunji", "volume": 140000, "species": "Chlorella vulgaris"},
            {"name": "Pond Dhadhar", "volume": 105000, "species": "Spirulina platensis"},
            {"name": "Pond Ghela", "volume": 80000, "species": "Dunaliella salina"},
        ]
    }
]

def seed_database(force: bool = False):
    Base.metadata.create_all(bind=engine)
    session = Session()
    
    if force:
        print("Force clearing old telemetry & ponds for fresh Indian locations seeding...")
        session.query(SensorReading).delete()
        session.query(Sensor).delete()
        session.query(Pond).delete()
        session.query(Farm).delete()
        session.commit()

    print("Seeding 6 Indian Algae Cultivation Facilities & Regional Ponds with live telemetry...")
    
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
    
    for farm_spec in INDIAN_FARMS_CONFIG:
        farm = session.query(Farm).filter(Farm.name == farm_spec["name"]).first()
        if not farm:
            farm = Farm(name=farm_spec["name"], location=farm_spec["location"])
            session.add(farm)
            session.flush()
        
        for pond_spec in farm_spec["ponds"]:
            pond = session.query(Pond).filter(Pond.farm_id == farm.id, Pond.name == pond_spec["name"]).first()
            if not pond:
                pond = Pond(
                    farm_id=farm.id,
                    name=pond_spec["name"],
                    volume_liters=pond_spec["volume"],
                    species=pond_spec["species"]
                )
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
            ts = now - datetime.timedelta(minutes=(47 - i) * 30)
            hour = ts.hour + ts.minute / 60.0
            
            if s.type == SensorType.light:
                if 6.0 <= hour <= 18.0:
                    base_par = math.sin((hour - 6.0) / 12.0 * math.pi) * 850.0
                    val = max(0.0, round(base_par + random.uniform(-18.0, 18.0), 1))
                else:
                    val = 0.0
            elif s.type == SensorType.temperature:
                val = round(28.2 + math.sin((hour - 8.0) / 24.0 * 2.0 * math.pi) * 1.2 + random.uniform(-0.12, 0.12), 2)
            elif s.type == SensorType.dissolved_oxygen:
                val = round(7.4 + math.sin((hour - 7.0) / 12.0 * math.pi) * 0.55 + random.uniform(-0.10, 0.10), 2)
            elif s.type == SensorType.ph:
                val = round(8.2 + math.sin((hour - 6.0) / 12.0 * math.pi) * 0.22 + random.uniform(-0.03, 0.03), 2)
            elif s.type == SensorType.nitrogen:
                val = round(max(2.0, 13.5 - ((47 - i) / 48.0) * 1.8 + random.uniform(-0.15, 0.15)), 2)
            elif s.type == SensorType.biomass:
                val = round(0.75 + (i / 48.0) * 0.14 + random.uniform(-0.01, 0.01), 3)
            elif s.type == SensorType.turbidity:
                val = round(34.0 + (i / 48.0) * 3.5 + random.uniform(-0.8, 0.8), 1)
            elif s.type == SensorType.conductivity:
                val = round(1260.0 + random.uniform(-5.0, 5.0), 1)
            elif s.type == SensorType.water_level:
                val = round(1.85 + random.uniform(-0.01, 0.01), 2)
            else:
                val = 20.0
            
            reading = SensorReading(
                id=uuid.uuid4(),
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
    print(f"Seed complete: 6 Indian Facilities, {len(all_sensors) // 7} Ponds, {len(readings)} Telemetry readings.")
    session.close()

if __name__ == "__main__":
    seed_database(force=True)
