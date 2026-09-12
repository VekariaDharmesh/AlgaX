"""Phase 3.3 — Sensor dropout suppression test for biological anomalies.

Verifies that an OPEN Phase 3.1 biomass sensor anomaly (either sensor or dropout provenance)
prevents Phase 3.3 from generating biological anomaly records.
"""

import uuid
from datetime import datetime, timedelta, timezone

from app import models
from app.database import SessionLocal
from app.anomaly.bio_detectors.engine import check_biological_anomalies


def _create_pond_with_data(db, t0, sensor_provenance: str):
    """Create a pond with severe deviation data plus an OPEN sensor anomaly."""
    farm_id = uuid.uuid4()
    pond_id = uuid.uuid4()
    db.add(models.Farm(id=farm_id, name=f"Farm-{farm_id}"))
    db.add(models.Pond(id=pond_id, farm_id=farm_id, name=f"Pond-{pond_id}"))

    sensor = models.Sensor(
        id=uuid.uuid4(), pond_id=pond_id,
        type="biomass", unit="g/L", is_simulated=True,
    )
    db.add(sensor)
    db.commit()

    m_run = models.ModelRun(
        id=uuid.uuid4(), pond_id=pond_id,
        model_version="v1", period_start=t0, period_end=t0,
        parameters={}, status="success", provenance="simulated",
    )
    db.add(m_run)

    # Add an OPEN sensor anomaly
    db.add(models.Anomaly(
        pond_id=pond_id, sensor_id=sensor.id, sensor_type="biomass",
        timestamp=t0, anomaly_type=models.AnomalyType.SENSOR_DROPOUT,
        severity=models.AnomalySeverity.HIGH, confidence_score=0.9,
        description="Dropout", source_provenance=sensor_provenance,
        status=models.AnomalyStatus.OPEN,
    ))
    db.commit()

    # Insert data that would normally trigger suppression
    for i in range(13):
        t = t0 - timedelta(hours=2) + timedelta(minutes=10 * i)
        db.add(models.BiomassEstimate(
            pond_id=pond_id, model_run_id=m_run.id, timestamp=t,
            biomass_g_per_l=1.5,
            light_factor=1.0, temp_factor=1.0, ph_factor=1.0, n_factor=1.0,
            growth_rate=0.05, method="test", confidence_score=0.9,
        ))
        db.add(models.SensorReading(
            pond_id=pond_id, sensor_id=sensor.id, timestamp=t,
            value=0.1, quality_flag=models.QualityFlag.ok,
        ))
    db.commit()
    return pond_id


def test_bio_anomaly_sensor_dropout():
    """anomaly_engine_sensor provenance suppresses bio detection."""
    db = SessionLocal()
    t0 = datetime.now(timezone.utc)
    pond_id = _create_pond_with_data(db, t0, "anomaly_engine_sensor")
    check_biological_anomalies(db, pond_id, t0)

    bio_count = db.query(models.Anomaly).filter(
        models.Anomaly.pond_id == pond_id,
        models.Anomaly.source_provenance == "biological_engine",
    ).count()
    assert bio_count == 0
    db.close()


def test_bio_anomaly_dropout_provenance():
    """anomaly_engine_dropout provenance also suppresses bio detection."""
    db = SessionLocal()
    t0 = datetime.now(timezone.utc)
    pond_id = _create_pond_with_data(db, t0, "anomaly_engine_dropout")
    check_biological_anomalies(db, pond_id, t0)

    bio_count = db.query(models.Anomaly).filter(
        models.Anomaly.pond_id == pond_id,
        models.Anomaly.source_provenance == "biological_engine",
    ).count()
    assert bio_count == 0
    db.close()
