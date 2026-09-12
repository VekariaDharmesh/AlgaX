import pytest
from datetime import datetime, timedelta, timezone
from app import models
from app.database import SessionLocal
from app.anomaly.env_detectors.engine import check_environmental_anomalies
from app.anomaly.service import run_sensor_anomaly_detection
import uuid

def test_env_anomaly_sensor_dropout():
    db = SessionLocal()
    farm_id = uuid.uuid4()
    pond_id = uuid.uuid4()
    
    db.add(models.Farm(id=farm_id, name="Test Farm Env 2"))
    db.add(models.Pond(id=pond_id, farm_id=farm_id, name="Test Pond Env 2"))
    
    sensor_t = models.Sensor(id=uuid.uuid4(), pond_id=pond_id, type="temperature", unit="C", is_simulated=True)
    db.add(sensor_t)
    db.commit()
    
    t0 = datetime.now(timezone.utc)
    
    # 1. Create a sensor anomaly explicitly
    anomaly = models.Anomaly(
        pond_id=pond_id,
        sensor_id=sensor_t.id,
        sensor_type="temperature",
        timestamp=t0,
        anomaly_type=models.AnomalyType.SENSOR_DROPOUT,
        severity=models.AnomalySeverity.HIGH,
        confidence_score=0.9,
        description="Dropout",
        source_provenance="anomaly_engine_sensor",
        status=models.AnomalyStatus.OPEN
    )
    db.add(anomaly)
    db.commit()
    
    # 2. Insert some "high temp" readings (maybe it recovered with noise or is stuck)
    for i in range(30):
        t = t0 - timedelta(minutes=30-i)
        db.add(models.SensorReading(pond_id=pond_id, sensor_id=sensor_t.id, timestamp=t, value=36.0, quality_flag=models.QualityFlag.ok))
        
    db.commit()
    
    # Run the env detector
    check_environmental_anomalies(db, pond_id, t0)
    
    # Should NOT flag TEMPERATURE_STRESS because the sensor has an OPEN sensor anomaly
    env_anomalies = db.query(models.Anomaly).filter(models.Anomaly.pond_id == pond_id, models.Anomaly.source_provenance == "environmental_engine").count()
    assert env_anomalies == 0
    
    db.close()
