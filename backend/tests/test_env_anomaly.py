import pytest
from datetime import datetime, timedelta, timezone
from app import models
from app.database import SessionLocal
from app.anomaly.env_detectors.engine import check_environmental_anomalies
from app.anomaly.env_detectors.config import ENV_CONFIG
import uuid

def test_environmental_anomaly():
    db = SessionLocal()
    farm_id = uuid.uuid4()
    pond_id = uuid.uuid4()
    
    db.add(models.Farm(id=farm_id, name="Test Farm Env"))
    db.add(models.Pond(id=pond_id, farm_id=farm_id, name="Test Pond Env"))
    
    sensor_t = models.Sensor(id=uuid.uuid4(), pond_id=pond_id, type="temperature", unit="C", is_simulated=True)
    sensor_do = models.Sensor(id=uuid.uuid4(), pond_id=pond_id, type="dissolved_oxygen", unit="mg/L", is_simulated=True)
    db.add_all([sensor_t, sensor_do])
    db.commit()
    
    t0 = datetime.now(timezone.utc)
    
    # Insert sustained high temp over 30 mins
    for i in range(30):
        t = t0 - timedelta(minutes=30-i)
        db.add(models.SensorReading(pond_id=pond_id, sensor_id=sensor_t.id, timestamp=t, value=36.0, quality_flag=models.QualityFlag.ok))
        db.add(models.SensorReading(pond_id=pond_id, sensor_id=sensor_do.id, timestamp=t, value=3.0, quality_flag=models.QualityFlag.ok))
    
    db.commit()
    
    check_environmental_anomalies(db, pond_id, t0)
    
    anomalies = db.query(models.Anomaly).filter(models.Anomaly.pond_id == pond_id, models.Anomaly.source_provenance == "environmental_engine").all()
    # Should flag TEMPERATURE_STRESS, OXYGEN_STRESS, ENVIRONMENTAL_COMBINATION
    types = [a.anomaly_type.value for a in anomalies]
    assert "TEMPERATURE_STRESS" in types
    assert "OXYGEN_STRESS" in types
    assert "ENVIRONMENTAL_COMBINATION" in types
    
    db.close()
