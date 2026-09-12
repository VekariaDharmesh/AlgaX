import uuid
from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy.orm import Session

from app import models, database
from app.evidence.service import generate_evidence_package, seal_evidence_package
from app.evidence.verifier import (
    build_canonical_payload,
    compute_canonical_hash,
    verify_package_hash,
    format_iso_utc
)

@pytest.fixture
def db_session():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_sample_farm_and_pond(db: Session):
    farm = models.Farm(
        id=uuid.uuid4(),
        name=f"Test Farm {uuid.uuid4().hex[:6]}",
        location="34.05,-118.24"
    )
    pond = models.Pond(
        id=uuid.uuid4(),
        farm_id=farm.id,
        name="Pond 1",
        volume_liters=10000.0,
        species="Chlorella vulgaris",
        status=models.PondStatus.active
    )
    db.add(farm)
    db.add(pond)
    db.commit()
    db.refresh(farm)
    db.refresh(pond)
    return farm, pond

def test_phase7_deterministic_canonical_payload(db_session):
    farm, pond = create_sample_farm_and_pond(db_session)
    now = datetime.now(timezone.utc)
    
    pkg = generate_evidence_package(
        db=db_session,
        farm_id=farm.id,
        pond_id=pond.id,
        start_date=now - timedelta(days=7),
        end_date=now
    )
    
    payload1 = build_canonical_payload(pkg)
    payload2 = build_canonical_payload(pkg)
    
    hash1 = compute_canonical_hash(payload1)
    hash2 = compute_canonical_hash(payload2)
    
    assert payload1 == payload2
    assert hash1 == hash2
    assert len(hash1) == 64

def test_phase7_seal_package_workflow(db_session):
    farm, pond = create_sample_farm_and_pond(db_session)
    now = datetime.now(timezone.utc)
    
    pkg = generate_evidence_package(
        db=db_session,
        farm_id=farm.id,
        pond_id=pond.id,
        start_date=now - timedelta(days=7),
        end_date=now
    )
    
    assert pkg.status != models.PackageStatus.SEALED
    assert pkg.sealed_at is None
    
    pkg.completeness = models.CompletenessClassification.COMPLETE
    db_session.commit()
    
    sealed_pkg = seal_evidence_package(db_session, pkg.id, actor="auditor@algax.com")
    
    assert sealed_pkg.status == models.PackageStatus.SEALED
    assert sealed_pkg.sealed_at is not None
    assert sealed_pkg.sealed_by == "auditor@algax.com"
    assert sealed_pkg.canonical_hash is not None
    
    verification = verify_package_hash(sealed_pkg)
    assert verification["status"] == "MATCH"
    assert verification["integrity_match"] is True

def test_phase7_read_only_verification(db_session):
    farm, pond = create_sample_farm_and_pond(db_session)
    now = datetime.now(timezone.utc)
    
    pkg = generate_evidence_package(
        db=db_session,
        farm_id=farm.id,
        pond_id=pond.id,
        start_date=now - timedelta(days=7),
        end_date=now
    )
    pkg.completeness = models.CompletenessClassification.COMPLETE
    db_session.commit()
    
    sealed_pkg = seal_evidence_package(db_session, pkg.id)
    initial_hash = sealed_pkg.canonical_hash
    
    res1 = verify_package_hash(sealed_pkg)
    res2 = verify_package_hash(sealed_pkg)
    
    db_session.refresh(sealed_pkg)
    assert sealed_pkg.canonical_hash == initial_hash
    assert sealed_pkg.status == models.PackageStatus.SEALED
    assert res1["status"] == "MATCH"
    assert res2["status"] == "MATCH"

def test_phase7_tampering_detection(db_session):
    farm, pond = create_sample_farm_and_pond(db_session)
    now = datetime.now(timezone.utc)
    
    pkg = generate_evidence_package(
        db=db_session,
        farm_id=farm.id,
        pond_id=pond.id,
        start_date=now - timedelta(days=7),
        end_date=now
    )
    pkg.completeness = models.CompletenessClassification.COMPLETE
    pkg.sensor_evidence_json = [{"id": "s1", "type": "pH", "val": 7.2}]
    pkg.carbon_evidence_json = [{"id": "c1", "net_carbon_removed_kg": 150.0}]
    db_session.commit()
    
    sealed_pkg = seal_evidence_package(db_session, pkg.id)
    original_hash = sealed_pkg.canonical_hash
    
    # 1. Verify initially matching
    v_initial = verify_package_hash(sealed_pkg)
    assert v_initial["status"] == "MATCH"
    
    # 2. Tamper with sensor evidence
    sealed_pkg.sensor_evidence_json = [{"id": "s1", "type": "pH", "val": 9.9}]
    v_tampered_sensor = verify_package_hash(sealed_pkg)
    
    assert v_tampered_sensor["status"] == "MISMATCH"
    assert v_tampered_sensor["integrity_match"] is False
    assert v_tampered_sensor["stored_hash"] == original_hash
    
    # 3. Restore sensor evidence
    sealed_pkg.sensor_evidence_json = [{"id": "s1", "type": "pH", "val": 7.2}]
    v_restored = verify_package_hash(sealed_pkg)
    assert v_restored["status"] == "MATCH"
    
    # 4. Tamper with carbon accounting evidence
    sealed_pkg.carbon_evidence_json = [{"id": "c1", "net_carbon_removed_kg": 9999.0}]
    v_tampered_carbon = verify_package_hash(sealed_pkg)
    assert v_tampered_carbon["status"] == "MISMATCH"
    assert v_tampered_carbon["integrity_match"] is False

def test_phase7_unsealed_and_insufficient_evidence_statuses(db_session):
    farm, pond = create_sample_farm_and_pond(db_session)
    now = datetime.now(timezone.utc)
    
    pkg = generate_evidence_package(
        db=db_session,
        farm_id=farm.id,
        pond_id=pond.id,
        start_date=now - timedelta(days=7),
        end_date=now
    )
    
    v_unsealed = verify_package_hash(pkg)
    assert v_unsealed["status"] == "NOT_SEALED"
    
    pkg.status = models.PackageStatus.SEALED
    pkg.completeness = models.CompletenessClassification.INSUFFICIENT_EVIDENCE
    db_session.commit()
    v_insufficient = verify_package_hash(pkg)
    assert v_insufficient["status"] == "INSUFFICIENT_DATA"

def test_phase7_farm_isolation_api(client=None):
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)
    
    db = database.SessionLocal()
    try:
        farmA, pondA = create_sample_farm_and_pond(db)
        farmB, pondB = create_sample_farm_and_pond(db)
        now = datetime.now(timezone.utc)
        
        pkgA = generate_evidence_package(db, farmA.id, pondA.id, now - timedelta(days=7), now)
        pkgA.completeness = models.CompletenessClassification.COMPLETE
        db.commit()
        
        respA = client.get(f"/api/v1/evidence-packages/{pkgA.id}?farm_id={farmA.id}")
        assert respA.status_code == 200
        
        respB = client.get(f"/api/v1/evidence-packages/{pkgA.id}?farm_id={farmB.id}")
        assert respB.status_code == 403
        assert "Access denied" in respB.json()["detail"]
        
        resp_seal = client.post(f"/api/v1/evidence-packages/{pkgA.id}/seal?farm_id={farmB.id}")
        assert resp_seal.status_code == 403
        
        resp_verify = client.get(f"/api/v1/evidence-packages/{pkgA.id}/verify-hash?farm_id={farmB.id}")
        assert resp_verify.status_code == 403
    finally:
        db.close()
