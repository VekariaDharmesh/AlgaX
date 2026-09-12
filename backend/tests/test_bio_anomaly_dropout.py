import pytest
from datetime import datetime, timedelta, timezone
from app import models
from app.database import SessionLocal
from app.anomaly.bio_detectors.engine import check_biological_anomalies
import uuid

def test_bio_anomaly_sensor_dropout():
    db = SessionLocal()
    farm_id = uuid.uuid4()
    pond_id = uuid.uuid4()
    
    db.add(models.Farm(id=farm_id, name="Test Farm Bio 2"))
    db.add(models.Pond(id=pond_id, farm_id=farm_id, name="Test Pond Bio 2"))
    
    sensor_b = models.Sensor(id=uuid.uuid4(), pond_id=pond_id, type="biomass", unit="g/L", is_simulated=True)
    db.add(sensor_b)
    db.commit()
    
    m_run = models.ModelRun(
        id=uuid.uuid4(),
        pond_id=pond_id,
        model_version="v1",
        period_start=datetime.now(timezone.utc),
        period_end=datetime.now(timezone.utc),
        parameters={},
        status="success",
        provenance="simulated"
    )
    db.add(m_run)
    db.commit()
    
    t0 = datetime.now(timezone.utc)
    
    # 1. Create a sensor anomaly explicitly
    anomaly = models.Anomaly(
        pond_id=pond_id,
        sensor_id=sensor_b.id,
        sensor_type="biomass",
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
    
    for i in range(13):
        t = t0 - timedelta(hours=2) + timedelta(minutes=10*i)
        db.add(models.BiomassEstimate(
            pond_id=pond_id, model_run_id=m_run.id, timestamp=t, biomass_g_per_l=1.5,
            light_factor=1.0, temp_factor=1.0, ph_factor=1.0, n_factor=1.0, growth_rate=0.05, method="test", confidence_score=0.9
        ))
        db.add(models.SensorReading(pond_id=pond_id, sensor_id=sensor_b.id, timestamp=t, value=0.0, quality_flag=models.QualityFlag.ok))
        
    db.commit()
    
    check_biological_anomalies(db, pond_id, t0)
    
    bio_anomalies = db.query(models.Anomaly).filter(models.Anomaly.pond_id == pond_id, models.Anomaly.source_provenance == "biological_engine").count()
    assert bio_anomalies == 0
    
    db.close()
