import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.main import app, calculate_priority_score
from app.models import Anomaly, AnomalyStatus, AnomalyType, AnomalySeverity

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
import pytest

from sqlalchemy.pool import StaticPool
@pytest.fixture(scope="module")
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # Override dependency
    from app.database import get_db
    def override_get_db():
        try:
            yield session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    
    yield session
    
    session.close()
    app.dependency_overrides.clear()

client = TestClient(app)

def test_anomaly_priority_logic():
    # Test Biological Engine Critical Priority
    bio_critical = Anomaly(
        source_provenance="biological_engine",
        severity=AnomalySeverity.CRITICAL,
        status=AnomalyStatus.OPEN
    )
    assert calculate_priority_score(bio_critical) == 100 # 50 (bio) + 40 (crit) + 10 (open) = 100
    
    # Test Environmental Medium Investigating
    env_medium = Anomaly(
        source_provenance="environmental_engine",
        severity=AnomalySeverity.MEDIUM,
        status=AnomalyStatus.INVESTIGATING
    )
    assert calculate_priority_score(env_medium) == 45 # 30 (env) + 10 (med) + 5 (invest) = 45
    
    # Test Sensor Low Resolved (clamped to 0)
    sens_low = Anomaly(
        source_provenance="anomaly_engine_sensor",
        severity=AnomalySeverity.LOW,
        status=AnomalyStatus.RESOLVED
    )
    score = calculate_priority_score(sens_low)
    assert score == 0 # 10 (sensor) + 0 (low) - 20 (resolved) = -10 -> max(0, -10) = 0

def test_anomaly_lifecycle_endpoints(db_session: Session):
    # Create an anomaly
    pond_id = uuid.uuid4()
    anomaly = Anomaly(
        pond_id=pond_id,
        timestamp=datetime.now(timezone.utc),
        anomaly_type=AnomalyType.STALE_VALUE,
        severity=AnomalySeverity.LOW,
        confidence_score=0.9,
        description="Test Anomaly",
        source_provenance="anomaly_engine_sensor",
        status=AnomalyStatus.OPEN
    )
    db_session.add(anomaly)
    db_session.commit()
    db_session.refresh(anomaly)

    # 1. Fetch Paginated
    response = client.get("/api/anomalies")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert "priority_score" in data["items"][0]
    
    # 2. Patch to ACKNOWLEDGED
    patch_ack = client.patch(f"/api/anomalies/{anomaly.id}/status", json={"status": "ACKNOWLEDGED"})
    assert patch_ack.status_code == 200
    assert patch_ack.json()["status"] == "ACKNOWLEDGED"
    
    # 3. Patch to INVESTIGATING
    patch_inv = client.patch(f"/api/anomalies/{anomaly.id}/status", json={"status": "INVESTIGATING"})
    assert patch_inv.status_code == 200
    assert patch_inv.json()["status"] == "INVESTIGATING"

    # 4. Patch to RESOLVED
    patch_res = client.patch(f"/api/anomalies/{anomaly.id}/status", json={"status": "RESOLVED"})
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "RESOLVED"
