import pytest
from datetime import datetime, timedelta, timezone
from app import models
from app.database import SessionLocal
from app.anomaly.service import run_sensor_anomaly_detection, check_for_dropouts
import uuid

def test_anomaly_integration():
    db = SessionLocal()
    farm_id = uuid.uuid4()
    pond_id = uuid.uuid4()
    sensor_id = uuid.uuid4()
    
    db.add(models.Farm(id=farm_id, name="Test Farm A"))
    db.add(models.Pond(id=pond_id, farm_id=farm_id, name="Test Pond A"))
    sensor = models.Sensor(id=sensor_id, pond_id=pond_id, type="temperature", unit="C", is_simulated=True)
    db.add(sensor)
    db.commit()
    db.refresh(sensor)
    
    t0 = datetime.now(timezone.utc)
    
    # 1. Healthy reading
    r1 = models.SensorReading(pond_id=pond_id, sensor_id=sensor.id, timestamp=t0, value=25.0, quality_flag=models.QualityFlag.ok)
    db.add(r1)
    db.commit()
    db.refresh(r1)
    r1.sensor = sensor
    
    run_sensor_anomaly_detection(db, r1)
    assert db.query(models.Anomaly).filter(models.Anomaly.sensor_id == sensor.id).count() == 0
    
    # 2. Impossible value reading
    r2 = models.SensorReading(pond_id=pond_id, sensor_id=sensor.id, timestamp=t0 + timedelta(minutes=1), value=99.0, quality_flag=models.QualityFlag.ok)
    db.add(r2)
    db.commit()
    db.refresh(r2)
    r2.sensor = sensor
    
    run_sensor_anomaly_detection(db, r2)
    anomalies = db.query(models.Anomaly).filter(models.Anomaly.sensor_id == sensor.id).all()
    assert len(anomalies) == 1
    assert anomalies[0].anomaly_type == models.AnomalyType.OUT_OF_RANGE
    assert anomalies[0].status == models.AnomalyStatus.OPEN
    
    # 3. To cleanly resolve without triggering rate-of-change, let's delete r2 from the test DB history so r3 doesn't trip rate-of-change
    db.delete(r2)
    db.commit()
    
    r3 = models.SensorReading(pond_id=pond_id, sensor_id=sensor.id, timestamp=t0 + timedelta(minutes=2), value=25.5, quality_flag=models.QualityFlag.ok)
    db.add(r3)
    db.commit()
    db.refresh(r3)
    r3.sensor = sensor
    
    run_sensor_anomaly_detection(db, r3)
    
    out_of_range_anomaly = db.query(models.Anomaly).filter(
        models.Anomaly.sensor_id == sensor.id,
        models.Anomaly.anomaly_type == models.AnomalyType.OUT_OF_RANGE
    ).first()
    assert out_of_range_anomaly.status == models.AnomalyStatus.RESOLVED

    # 4. Check dropout
    t_dropout = t0 + timedelta(minutes=30)
    check_for_dropouts(db, t_dropout)
    anomalies_drop = db.query(models.Anomaly).filter(
        models.Anomaly.sensor_id == sensor.id,
        models.Anomaly.anomaly_type == models.AnomalyType.SENSOR_DROPOUT
    ).all()
    assert len(anomalies_drop) == 1
    assert anomalies_drop[0].status == models.AnomalyStatus.OPEN
    
    db.close()
