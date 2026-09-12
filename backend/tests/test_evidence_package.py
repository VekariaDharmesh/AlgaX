import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from app.main import app
from app import models
from app.database import get_db

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from uuid import uuid4

@pytest.fixture(scope="module")
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    models.Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()

@pytest.fixture(scope="module")
def test_client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def test_pond(db_session):
    farm = models.Farm(name="Test Farm")
    db_session.add(farm)
    db_session.commit()
    pond = models.Pond(farm_id=farm.id, name="Test Pond")
    db_session.add(pond)
    db_session.commit()
    return pond

def test_create_evidence_package(db_session: Session, test_client: TestClient, test_pond: models.Pond):
    # Ensure there are some sensors
    sensor = models.Sensor(pond_id=test_pond.id, type=models.SensorType.temperature, unit="C", is_simulated=True)
    db_session.add(sensor)
    db_session.commit()
    db_session.refresh(sensor)
    
    reading = models.SensorReading(
        sensor_id=sensor.id,
        pond_id=test_pond.id,
        timestamp=datetime.now(timezone.utc) - timedelta(hours=1),
        value=25.0
    )
    db_session.add(reading)
    db_session.commit()
    
    start_date = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    end_date = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    
    payload = {
        "reporting_period_start": start_date,
        "reporting_period_end": end_date
    }
    
    response = test_client.post(f"/api/ponds/{test_pond.id}/evidence-packages", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "DRAFT"
    assert data["completeness"] == "PARTIAL"
    assert data["canonical_hash"] is not None
    assert len(data["sensor_evidence_json"]) == 1

def test_list_evidence_packages(db_session: Session, test_client: TestClient, test_pond: models.Pond):
    response = test_client.get(f"/api/ponds/{test_pond.id}/evidence-packages")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_evidence_package_report(db_session: Session, test_client: TestClient, test_pond: models.Pond):
    # First create a package
    start_date = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    end_date = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    payload = {
        "reporting_period_start": start_date,
        "reporting_period_end": end_date
    }
    create_response = test_client.post(f"/api/ponds/{test_pond.id}/evidence-packages", json=payload)
    pkg_id = create_response.json()["id"]
    
    # Get report
    report_response = test_client.get(f"/api/evidence-packages/{pkg_id}/report")
    assert report_response.status_code == 200
    assert "text/html" in report_response.headers["content-type"]
    assert "Verification-Ready Evidence Report" in report_response.text
