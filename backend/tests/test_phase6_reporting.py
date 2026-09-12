import pytest
import uuid
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app
from app import models
from app.database import SessionLocal

client = TestClient(app)

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def setup_farm_and_pond(db_session):
    farm = models.Farm(name="Phase 6 Test Farm", location="Imperial Valley, CA")
    db_session.add(farm)
    db_session.flush()

    pond = models.Pond(farm_id=farm.id, name="Phase 6 Pond A", volume_liters=50000.0)
    db_session.add(pond)
    db_session.flush()

    # Add sensors & readings
    sensor = models.Sensor(pond_id=pond.id, type=models.SensorType.temperature, unit="°C")
    db_session.add(sensor)
    db_session.flush()

    now = datetime.now(timezone.utc)
    reading = models.SensorReading(
        sensor_id=sensor.id,
        pond_id=pond.id,
        timestamp=now - timedelta(days=2),
        value=25.5,
        quality_flag=models.QualityFlag.ok,
        source_type=models.SourceType.simulated
    )
    db_session.add(reading)

    # Add Model Run & Carbon Estimate
    model_run = models.ModelRun(
        pond_id=pond.id,
        model_version="1.2.0",
        period_start=now - timedelta(days=5),
        period_end=now,
        parameters={"temp": 25.5},
        status=models.ModelRunStatus.success,
        provenance="growth_model_v1"
    )
    db_session.add(model_run)
    db_session.flush()

    carbon_est = models.CarbonEstimate(
        pond_id=pond.id,
        model_run_id=model_run.id,
        period_start=now - timedelta(days=5),
        period_end=now,
        gross_co2_kg=1200.0,
        retained_co2_kg=720.0,
        operational_emissions_kg=60.0,
        net_carbon_removed_kg=660.0,
        realized_c_fraction=0.45,
        end_use="Bioplastic",
        confidence_score=0.92
    )
    db_session.add(carbon_est)
    db_session.commit()

    return farm, pond

def test_phase6_create_evidence_package(setup_farm_and_pond):
    farm, pond = setup_farm_and_pond
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=7)

    payload = {
        "reporting_period_start": start.isoformat(),
        "reporting_period_end": now.isoformat()
    }

    response = client.post(f"/api/ponds/{pond.id}/evidence-packages", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["farm_id"] == str(farm.id)
    assert data["pond_id"] == str(pond.id)
    assert data["canonical_hash"] is not None
    assert len(data["canonical_hash"]) == 64
    assert data["completeness"] in ["COMPLETE", "PARTIAL"]

def test_phase6_verify_sha256_hash_match_and_mismatch(setup_farm_and_pond, db_session):
    farm, pond = setup_farm_and_pond
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=7)

    # 1. Create Package
    res_create = client.post(f"/api/ponds/{pond.id}/evidence-packages", json={
        "reporting_period_start": start.isoformat(),
        "reporting_period_end": now.isoformat()
    })
    pkg_id = res_create.json()["id"]
    from app.evidence.service import seal_evidence_package
    pkg = db_session.query(models.EvidencePackage).filter(models.EvidencePackage.id == uuid.UUID(pkg_id)).first()
    pkg.completeness = models.CompletenessClassification.COMPLETE
    db_session.commit()
    seal_evidence_package(db_session, uuid.UUID(pkg_id))

    # 2. Verify Hash -> MATCH
    res_verify = client.get(f"/api/evidence-packages/{pkg_id}/verify-hash")
    assert res_verify.status_code == 200
    v_data = res_verify.json()
    assert v_data["integrity_match"] is True
    assert v_data["status"] in ["MATCH", "INTEGRITY MATCH"]
    assert "verified" in v_data["message"].lower() or "passed" in v_data["message"].lower()

    # 3. Tamper with hash -> MISMATCH
    pkg = db_session.query(models.EvidencePackage).filter(models.EvidencePackage.id == uuid.UUID(pkg_id)).first()
    pkg.canonical_hash = "0000000000000000000000000000000000000000000000000000000000000000"
    db_session.commit()

    res_verify_tampered = client.get(f"/api/evidence-packages/{pkg_id}/verify-hash")
    assert res_verify_tampered.status_code == 200
    vt_data = res_verify_tampered.json()
    assert vt_data["integrity_match"] is False
    assert vt_data["status"] in ["MISMATCH", "INTEGRITY MISMATCH"]

def test_phase6_canonical_json_and_pdf(setup_farm_and_pond):
    farm, pond = setup_farm_and_pond
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=7)

    res_create = client.post(f"/api/ponds/{pond.id}/evidence-packages", json={
        "reporting_period_start": start.isoformat(),
        "reporting_period_end": now.isoformat()
    })
    pkg_id = res_create.json()["id"]

    # Canonical JSON
    res_json = client.get(f"/api/evidence-packages/{pkg_id}/canonical-json")
    assert res_json.status_code == 200
    j_data = res_json.json()
    assert "payload" in j_data
    assert j_data["payload"]["farm_id"] == str(farm.id)

    # PDF / HTML Report
    res_pdf = client.get(f"/api/evidence-packages/{pkg_id}/pdf")
    assert res_pdf.status_code == 200
    assert "Verification-Ready Evidence Report" in res_pdf.text
