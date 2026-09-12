import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import uuid

from app.main import app
from app.models import Base, Farm, Pond, EvidencePackage, PackageStatus, CompletenessClassification, ReviewState
from app.database import get_db

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

client = TestClient(app)

@pytest.fixture(scope="module")
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    
    # Override dependency
    app.dependency_overrides[get_db] = lambda: db
    
    yield db
    
    app.dependency_overrides.clear()
    db.close()

@pytest.fixture
def test_pond(db_session: Session):
    farm = Farm(name="Review Test Farm")
    db_session.add(farm)
    db_session.commit()
    db_session.refresh(farm)
    
    pond = Pond(farm_id=farm.id, name="Review Pond 1")
    db_session.add(pond)
    db_session.commit()
    db_session.refresh(pond)
    return pond

@pytest.fixture
def test_package(db_session: Session, test_pond: Pond):
    pkg = EvidencePackage(
        farm_id=test_pond.farm_id,
        pond_id=test_pond.id,
        reporting_period_start=datetime.now(timezone.utc) - timedelta(days=30),
        reporting_period_end=datetime.now(timezone.utc),
        status=PackageStatus.DRAFT,
        completeness=CompletenessClassification.INSUFFICIENT_EVIDENCE,
        review_state=ReviewState.NOT_STARTED,
        sensor_evidence_json=[],
        model_evidence_json=[],
        carbon_evidence_json=[],
        anomaly_evidence_json=[],
        imagery_evidence_json=[],
        cross_validation_evidence_json=[],
        limitations_json=[],
        canonical_hash="testhash"
    )
    db_session.add(pkg)
    db_session.commit()
    db_session.refresh(pkg)
    return pkg

def test_add_review_action_changes_state(test_package: EvidencePackage):
    # Post a START_REVIEW action
    response = client.post(
        f"/api/evidence-packages/{test_package.id}/review/actions",
        json={
            "action": "START_REVIEW",
            "note": "Starting the review for this package."
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["action"] == "START_REVIEW"
    assert data["note"] == "Starting the review for this package."
    assert data["actor"] == "reviewer@algaemrv.com"
    
    # Check that the package state was mutated
    pkg_response = client.get(f"/api/evidence-packages/{test_package.id}")
    assert pkg_response.status_code == 200
    assert pkg_response.json()["review_state"] == "IN_REVIEW"

def test_get_review_actions(test_package: EvidencePackage):
    # Post a FLAG_FOR_ATTENTION action
    client.post(
        f"/api/evidence-packages/{test_package.id}/review/actions",
        json={"action": "FLAG_FOR_ATTENTION", "note": "Missing some sensor data"}
    )
    
    # Get all actions
    response = client.get(f"/api/evidence-packages/{test_package.id}/review/actions")
    assert response.status_code == 200
    actions = response.json()
    assert len(actions) == 1
    assert actions[0]["action"] == "FLAG_FOR_ATTENTION"
    assert actions[0]["note"] == "Missing some sensor data"
    
    # Check package state
    pkg_response = client.get(f"/api/evidence-packages/{test_package.id}")
    assert pkg_response.json()["review_state"] == "NEEDS_ATTENTION"
