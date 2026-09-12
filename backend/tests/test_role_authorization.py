import pytest
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, get_db
from app import models

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield

def test_seeded_users_and_roles():
    """Verify that default 3 roles are seeded upon startup."""
    response = client.get("/api/auth/me", headers={"X-AlgaX-Role": "PLATFORM_ADMIN"})
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "PLATFORM_ADMIN"
    assert "FARM_OPERATOR" in data["permitted_roles"]
    assert "VERIFIER_AUDITOR" in data["permitted_roles"]
    assert "PLATFORM_ADMIN" in data["permitted_roles"]

def test_farm_operator_profile_permitted_roles():
    """Verify Farm Operator only has FARM_OPERATOR permitted."""
    response = client.get("/api/auth/me", headers={"X-AlgaX-Role": "FARM_OPERATOR"})
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "FARM_OPERATOR"
    assert data["permitted_roles"] == ["FARM_OPERATOR"]

def test_verifier_auditor_profile_permitted_roles():
    """Verify Verifier / Auditor only has VERIFIER_AUDITOR permitted."""
    response = client.get("/api/auth/me", headers={"X-AlgaX-Role": "VERIFIER_AUDITOR"})
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "VERIFIER_AUDITOR"
    assert data["permitted_roles"] == ["VERIFIER_AUDITOR"]

def test_removed_roles_cannot_be_used():
    """Verify obsolete roles RESEARCHER and INVESTOR are rejected."""
    # Attempting to authenticate or switch to RESEARCHER
    res_researcher = client.get("/api/auth/me", headers={"X-AlgaX-Role": "RESEARCHER"})
    assert res_researcher.status_code == 403

    # Attempting to authenticate or switch to INVESTOR
    res_investor = client.get("/api/auth/me", headers={"X-AlgaX-Role": "INVESTOR"})
    assert res_investor.status_code == 403

def test_operator_cannot_access_user_management():
    """Verify Farm Operator is blocked from user administration."""
    res = client.post("/api/users", json={
        "email": "test_unauthorized@algax.io",
        "name": "Unauthorized User",
        "role": "FARM_OPERATOR"
    }, headers={"X-AlgaX-Role": "FARM_OPERATOR"})
    assert res.status_code == 403
    assert "Forbidden" in res.json()["detail"]

def test_verifier_cannot_access_user_management():
    """Verify Verifier / Auditor is blocked from user administration."""
    res = client.post("/api/users", json={
        "email": "test_unauthorized2@algax.io",
        "name": "Unauthorized User 2",
        "role": "VERIFIER_AUDITOR"
    }, headers={"X-AlgaX-Role": "VERIFIER_AUDITOR"})
    assert res.status_code == 403
    assert "Forbidden" in res.json()["detail"]

def test_admin_can_manage_users_and_roles():
    """Verify Platform Admin can create, list, update, and deactivate users."""
    test_email = f"operator_{uuid.uuid4().hex[:6]}@algax.io"
    
    # 1. Create Farm Operator
    create_res = client.post("/api/users", json={
        "email": test_email,
        "name": "Test Farm Operator",
        "role": "FARM_OPERATOR",
        "is_active": True
    }, headers={"X-AlgaX-Role": "PLATFORM_ADMIN"})
    assert create_res.status_code == 201
    user_data = create_res.json()
    user_id = user_data["id"]
    assert user_data["email"] == test_email
    assert user_data["role"] == "FARM_OPERATOR"

    # 2. Change Role to Verifier / Auditor
    update_res = client.put(f"/api/users/{user_id}", json={
        "role": "VERIFIER_AUDITOR"
    }, headers={"X-AlgaX-Role": "PLATFORM_ADMIN"})
    assert update_res.status_code == 200
    assert update_res.json()["role"] == "VERIFIER_AUDITOR"

    # 3. Deactivate User
    del_res = client.delete(f"/api/users/{user_id}", headers={"X-AlgaX-Role": "PLATFORM_ADMIN"})
    assert del_res.status_code == 200
    assert "deactivated" in del_res.json()["message"]

def test_cannot_create_user_with_removed_role():
    """Verify Platform Admin cannot create a user with RESEARCHER or INVESTOR role."""
    res = client.post("/api/users", json={
        "email": f"researcher_{uuid.uuid4().hex[:6]}@algax.io",
        "name": "Legacy Researcher",
        "role": "RESEARCHER"
    }, headers={"X-AlgaX-Role": "PLATFORM_ADMIN"})
    assert res.status_code in [400, 422]

def test_operator_privilege_boundary_on_verifier_sealing():
    """Verify Farm Operator cannot seal evidence packages (Verifier-only action)."""
    db = next(get_db())
    farm = db.query(models.Farm).first()
    if not farm:
        farm = models.Farm(id=uuid.uuid4(), name="Test Verification Facility")
        db.add(farm)
        db.commit()
    
    pond = db.query(models.Pond).first()
    if not pond:
        pond = models.Pond(id=uuid.uuid4(), farm_id=farm.id, name="Pond Test-1")
        db.add(pond)
        db.commit()

    pkg = models.EvidencePackage(
        id=uuid.uuid4(),
        farm_id=farm.id,
        pond_id=pond.id,
        reporting_period_start=datetime.now(timezone.utc),
        reporting_period_end=datetime.now(timezone.utc),
        status=models.PackageStatus.READY_FOR_REVIEW,
        completeness=models.CompletenessClassification.COMPLETE,
        sensor_evidence_json=[{"type": "telemetry", "count": 10}],
        model_evidence_json=[{"type": "monod_droop", "status": "ok"}],
        carbon_evidence_json=[{"type": "carbon_lca", "net_tco2e": 4.2}],
        anomaly_evidence_json=[],
        imagery_evidence_json=[],
        cross_validation_evidence_json=[],
        harvest_evidence_json=[],
        calibration_evidence_json=[],
        limitations_json=[]
    )
    db.add(pkg)
    db.commit()
    pkg_id = str(pkg.id)

    # Attempt sealing as Farm Operator (Forbidden)
    seal_res = client.post(f"/api/v1/evidence-packages/{pkg_id}/seal", json={
        "sealed_by": "Operator Impersonator"
    }, headers={"X-AlgaX-Role": "FARM_OPERATOR"})
    assert seal_res.status_code == 403
    assert "Forbidden" in seal_res.json()["detail"]

    # Verifier can seal evidence package
    verifier_seal_res = client.post(f"/api/v1/evidence-packages/{pkg_id}/seal", json={
        "sealed_by": "Dr. Anand Ramanathan (Verifier)"
    }, headers={"X-AlgaX-Role": "VERIFIER_AUDITOR"})
    assert verifier_seal_res.status_code == 200
    assert verifier_seal_res.json()["status"] == "SEALED"
