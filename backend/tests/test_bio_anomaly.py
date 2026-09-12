import pytest
from datetime import datetime, timedelta, timezone
from app import models
from app.database import SessionLocal
from app.anomaly.bio_detectors.engine import check_biological_anomalies
from app.anomaly.bio_detectors.config import BIO_CONFIG
import uuid

def test_bio_anomaly_growth_suppression():
    db = SessionLocal()
    farm_id = uuid.uuid4()
    pond_id = uuid.uuid4()
    
    db.add(models.Farm(id=farm_id, name="Test Farm Bio"))
    db.add(models.Pond(id=pond_id, farm_id=farm_id, name="Test Pond Bio"))
    
    sensor_b = models.Sensor(id=uuid.uuid4(), pond_id=pond_id, type="biomass", unit="g/L", is_simulated=True)
    db.add(sensor_b)
    db.commit()
    
    # We need a ModelRun for BiomassEstimates
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
    
    # Expected: Biomass grows from 1.0 to 2.0 (+100%)
    # Observed: Biomass stays at 1.0 (0%) -> Suppression & Plateau
    
    for i in range(13):
        t = t0 - timedelta(hours=2) + timedelta(minutes=10*i)
        
        # Expected
        expected_val = 1.0 + (1.0 * (i / 12.0))
        db.add(models.BiomassEstimate(
            pond_id=pond_id,
            model_run_id=m_run.id,
            timestamp=t,
            biomass_g_per_l=expected_val,
            light_factor=1.0, temp_factor=1.0, ph_factor=1.0, n_factor=1.0,
            growth_rate=0.05, method="test", confidence_score=0.9
        ))
        
        # Observed
        db.add(models.SensorReading(pond_id=pond_id, sensor_id=sensor_b.id, timestamp=t, value=1.0, quality_flag=models.QualityFlag.ok))
        
    db.commit()
    
    check_biological_anomalies(db, pond_id, t0)
    
    anomalies = db.query(models.Anomaly).filter(models.Anomaly.pond_id == pond_id, models.Anomaly.source_provenance == "biological_engine").all()
    types = [a.anomaly_type.value for a in anomalies]
    
    assert "GROWTH_SUPPRESSION" in types
    assert "BIOMASS_PLATEAU" in types
    
    db.close()

def test_bio_anomaly_growth_acceleration():
    db = SessionLocal()
    farm_id = uuid.uuid4()
    pond_id = uuid.uuid4()
    db.add(models.Farm(id=farm_id, name="Test Farm Bio Accel"))
    db.add(models.Pond(id=pond_id, farm_id=farm_id, name="Test Pond Bio Accel"))
    
    sensor_b = models.Sensor(id=uuid.uuid4(), pond_id=pond_id, type="biomass", unit="g/L", is_simulated=True)
    db.add(sensor_b)
    db.commit()
    
    m_run = models.ModelRun(id=uuid.uuid4(), pond_id=pond_id, model_version="v1", period_start=datetime.now(timezone.utc), period_end=datetime.now(timezone.utc), parameters={}, status="success", provenance="simulated")
    db.add(m_run)
    db.commit()
    
    t0 = datetime.now(timezone.utc)
    
    for i in range(13):
        t = t0 - timedelta(hours=2) + timedelta(minutes=10*i)
        expected_val = 1.0 + (0.5 * (i / 12.0))
        db.add(models.BiomassEstimate(pond_id=pond_id, model_run_id=m_run.id, timestamp=t, biomass_g_per_l=expected_val, light_factor=1.0, temp_factor=1.0, ph_factor=1.0, n_factor=1.0, growth_rate=0.05, method="test", confidence_score=0.9))
        
        # Observed grows from 1.0 to 2.5
        obs_val = 1.0 + (1.5 * (i / 12.0))
        db.add(models.SensorReading(pond_id=pond_id, sensor_id=sensor_b.id, timestamp=t, value=obs_val, quality_flag=models.QualityFlag.ok))
        
    db.commit()
    check_biological_anomalies(db, pond_id, t0)
    
    anomalies = db.query(models.Anomaly).filter(models.Anomaly.pond_id == pond_id, models.Anomaly.source_provenance == "biological_engine").all()
    types = [a.anomaly_type.value for a in anomalies]
    
    assert "GROWTH_ACCELERATION" in types
    db.close()
    
def test_bio_anomaly_biomass_decline():
    db = SessionLocal()
    farm_id = uuid.uuid4()
    pond_id = uuid.uuid4()
    db.add(models.Farm(id=farm_id, name="Test Farm Bio Dec"))
    db.add(models.Pond(id=pond_id, farm_id=farm_id, name="Test Pond Bio Dec"))
    
    sensor_b = models.Sensor(id=uuid.uuid4(), pond_id=pond_id, type="biomass", unit="g/L", is_simulated=True)
    db.add(sensor_b)
    db.commit()
    
    m_run = models.ModelRun(id=uuid.uuid4(), pond_id=pond_id, model_version="v1", period_start=datetime.now(timezone.utc), period_end=datetime.now(timezone.utc), parameters={}, status="success", provenance="simulated")
    db.add(m_run)
    db.commit()
    
    t0 = datetime.now(timezone.utc)
    
    for i in range(13):
        t = t0 - timedelta(hours=2) + timedelta(minutes=10*i)
        expected_val = 1.0 + (0.5 * (i / 12.0))
        db.add(models.BiomassEstimate(pond_id=pond_id, model_run_id=m_run.id, timestamp=t, biomass_g_per_l=expected_val, light_factor=1.0, temp_factor=1.0, ph_factor=1.0, n_factor=1.0, growth_rate=0.05, method="test", confidence_score=0.9))
        
        # Observed declines from 1.0 to 0.8
        obs_val = 1.0 - (0.2 * (i / 12.0))
        db.add(models.SensorReading(pond_id=pond_id, sensor_id=sensor_b.id, timestamp=t, value=obs_val, quality_flag=models.QualityFlag.ok))
        
    db.commit()
    check_biological_anomalies(db, pond_id, t0)
    
    anomalies = db.query(models.Anomaly).filter(models.Anomaly.pond_id == pond_id, models.Anomaly.source_provenance == "biological_engine").all()
    types = [a.anomaly_type.value for a in anomalies]
    
    assert "BIOMASS_DECLINE" in types
    db.close()
