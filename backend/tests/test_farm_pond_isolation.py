import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app import models

# Use in-memory SQLite for isolated testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_isolation.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    # Create test farms
    farm_a = models.Farm(id=uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"), name="Kutch Bio-Raceway Facility", location="Kutch, Gujarat")
    farm_b = models.Farm(id=uuid.UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"), name="Rameswaram Coastal Algae Hub", location="Rameswaram, Tamil Nadu")
    farm_c = models.Farm(id=uuid.UUID("cccccccc-cccc-4ccc-8ccc-cccccccccccc"), name="Sambhar Salt Lake Bio-Culture Site", location="Sambhar, Rajasthan")
    db.add_all([farm_a, farm_b, farm_c])
    db.commit()

    # Create distinct ponds for Farm A
    pond_a1 = models.Pond(id=uuid.UUID("a1111111-1111-4111-8111-111111111111"), farm_id=farm_a.id, name="Pond Narmada", volume_liters=120000, species="Chlorella vulgaris")
    pond_a2 = models.Pond(id=uuid.UUID("a2222222-2222-4222-8222-222222222222"), farm_id=farm_a.id, name="Pond Sabarmati", volume_liters=95000, species="Spirulina platensis")
    
    # Create distinct ponds for Farm B
    pond_b1 = models.Pond(id=uuid.UUID("b1111111-1111-4111-8111-111111111111"), farm_id=farm_b.id, name="Pond Kaveri", volume_liters=150000, species="Chlorella vulgaris")
    pond_b2 = models.Pond(id=uuid.UUID("b2222222-2222-4222-8222-222222222222"), farm_id=farm_b.id, name="Pond Vaigai", volume_liters=100000, species="Spirulina platensis")

    # Create distinct ponds for Farm C (including same pond name test)
    pond_c1 = models.Pond(id=uuid.UUID("c1111111-1111-4111-8111-111111111111"), farm_id=farm_c.id, name="Pond Narmada", volume_liters=110000, species="Dunaliella salina")
    pond_c2 = models.Pond(id=uuid.UUID("c2222222-2222-4222-8222-222222222222"), farm_id=farm_c.id, name="Pond Pushkar", volume_liters=120000, species="Spirulina platensis")

    db.add_all([pond_a1, pond_a2, pond_b1, pond_b2, pond_c1, pond_c2])
    db.commit()

    # Create test users
    admin = models.User(
        id=uuid.UUID("33333333-3333-4333-8333-333333333333"),
        email="admin@algax.io",
        name="Platform Admin",
        role=models.UserRole.PLATFORM_ADMIN,
        is_active=True
    )
    operator_a = models.User(
        id=uuid.UUID("11111111-1111-4111-8111-111111111111"),
        email="operator_a@algax.io",
        name="Operator Farm A",
        role=models.UserRole.FARM_OPERATOR,
        assigned_farm_id=farm_a.id,
        is_active=True
    )
    operator_b = models.User(
        id=uuid.UUID("44444444-4444-4444-8444-444444444444"),
        email="operator_b@algax.io",
        name="Operator Farm B",
        role=models.UserRole.FARM_OPERATOR,
        assigned_farm_id=farm_b.id,
        is_active=True
    )
    db.add_all([admin, operator_a, operator_b])
    db.commit()

    # Create sensors and telemetry for Pond A1 and Pond B1
    sensor_a = models.Sensor(id=uuid.UUID("a5555555-5555-4555-8555-555555555555"), pond_id=pond_a1.id, type=models.SensorType.temperature, unit="°C", is_simulated=False)
    sensor_b = models.Sensor(id=uuid.UUID("b5555555-5555-4555-8555-555555555555"), pond_id=pond_b1.id, type=models.SensorType.temperature, unit="°C", is_simulated=False)
    db.add_all([sensor_a, sensor_b])
    db.commit()

    db.close()
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)

@pytest.fixture
def client():
    return TestClient(app)

# 1. Farm A returns only Farm A ponds
def test_farm_a_returns_only_farm_a_ponds(client):
    res = client.get("/api/ponds?farm_id=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", headers={"X-AlgaX-Role": "PLATFORM_ADMIN"})
    assert res.status_code == 200
    ponds = res.json()
    assert len(ponds) == 2
    names = [p["name"] for p in ponds]
    assert "Pond Narmada" in names
    assert "Pond Sabarmati" in names
    assert "Pond Kaveri" not in names
    for p in ponds:
        assert p["farm_id"] == "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"

# 2. Farm B returns only Farm B ponds
def test_farm_b_returns_only_farm_b_ponds(client):
    res = client.get("/api/ponds?farm_id=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", headers={"X-AlgaX-Role": "PLATFORM_ADMIN"})
    assert res.status_code == 200
    ponds = res.json()
    assert len(ponds) == 2
    names = [p["name"] for p in ponds]
    assert "Pond Kaveri" in names
    assert "Pond Vaigai" in names
    assert "Pond Sabarmati" not in names
    for p in ponds:
        assert p["farm_id"] == "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

# 3. Farm C returns only Farm C ponds
def test_farm_c_returns_only_farm_c_ponds(client):
    res = client.get("/api/ponds?farm_id=cccccccc-cccc-4ccc-8ccc-cccccccccccc", headers={"X-AlgaX-Role": "PLATFORM_ADMIN"})
    assert res.status_code == 200
    ponds = res.json()
    assert len(ponds) == 2
    names = [p["name"] for p in ponds]
    assert "Pond Narmada" in names
    assert "Pond Pushkar" in names
    for p in ponds:
        assert p["farm_id"] == "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

# 4. Same pond name on different farms represents different IDs
def test_same_pond_name_different_farms_distinct_ids(client):
    res_a = client.get("/api/ponds?farm_id=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", headers={"X-AlgaX-Role": "PLATFORM_ADMIN"})
    res_c = client.get("/api/ponds?farm_id=cccccccc-cccc-4ccc-8ccc-cccccccccccc", headers={"X-AlgaX-Role": "PLATFORM_ADMIN"})
    pond_a_narmada = next(p for p in res_a.json() if p["name"] == "Pond Narmada")
    pond_c_narmada = next(p for p in res_c.json() if p["name"] == "Pond Narmada")
    
    assert pond_a_narmada["id"] != pond_c_narmada["id"]
    assert pond_a_narmada["farm_id"] == "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    assert pond_c_narmada["farm_id"] == "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

# 5. Cross-farm pond access is rejected
def test_cross_farm_pond_access_rejected(client):
    # Request Pond A1 with Farm B context
    res = client.get(
        "/api/ponds/a1111111-1111-4111-8111-111111111111?farm_id=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        headers={"X-AlgaX-Role": "PLATFORM_ADMIN"}
    )
    assert res.status_code == 404

# 6. Pond creation associates with correct farm & rejects invalid farm
def test_pond_creation_associates_correct_farm(client):
    # Valid creation under Farm A
    payload = {
        "farm_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "name": "Pond Tapi New",
        "volume_liters": 88000,
        "species": "Scenedesmus"
    }
    res = client.post("/api/ponds", json=payload, headers={"X-AlgaX-Role": "PLATFORM_ADMIN"})
    assert res.status_code == 201
    created = res.json()
    assert created["farm_id"] == "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    assert created["name"] == "Pond Tapi New"

    # Nonexistent farm rejected
    invalid_payload = {
        "farm_id": "99999999-9999-4999-8999-999999999999",
        "name": "Orphan Pond",
        "volume_liters": 50000
    }
    res_inv = client.post("/api/ponds", json=invalid_payload, headers={"X-AlgaX-Role": "PLATFORM_ADMIN"})
    assert res_inv.status_code == 404

# 7. Pond update respects farm ownership
def test_pond_update_respects_farm_ownership(client):
    update_payload = {"name": "Pond Sabarmati Updated", "volume_liters": 98000}
    
    # Valid update
    res = client.put(
        "/api/ponds/a2222222-2222-4222-8222-222222222222",
        json=update_payload,
        headers={"X-AlgaX-Role": "PLATFORM_ADMIN"}
    )
    assert res.status_code == 200
    assert res.json()["name"] == "Pond Sabarmati Updated"

    # Cross-farm update rejected
    res_cross = client.put(
        "/api/ponds/a2222222-2222-4222-8222-222222222222?farm_id=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        json=update_payload,
        headers={"X-AlgaX-Role": "PLATFORM_ADMIN"}
    )
    assert res_cross.status_code == 403

# 8. Pond deletion respects farm ownership
def test_pond_deletion_respects_farm_ownership(client):
    # Create temporary pond
    create_res = client.post("/api/ponds", json={
        "farm_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "name": "Temp Pond",
        "volume_liters": 10000
    }, headers={"X-AlgaX-Role": "PLATFORM_ADMIN"})
    temp_id = create_res.json()["id"]

    # Cross-farm delete rejected
    res_cross = client.delete(
        f"/api/ponds/{temp_id}?farm_id=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        headers={"X-AlgaX-Role": "PLATFORM_ADMIN"}
    )
    assert res_cross.status_code == 403

    # Valid delete succeeds
    res_valid = client.delete(
        f"/api/ponds/{temp_id}?farm_id=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        headers={"X-AlgaX-Role": "PLATFORM_ADMIN"}
    )
    assert res_valid.status_code == 200

# 9. Downstream Telemetry respects farm & pond isolation
def test_telemetry_respects_farm_and_pond_isolation(client):
    # Mismatched pond and farm in telemetry query
    res = client.get(
        "/api/telemetry?pond_id=a1111111-1111-4111-8111-111111111111&farm_id=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        headers={"X-AlgaX-Role": "PLATFORM_ADMIN"}
    )
    assert res.status_code == 404

    # Mismatched in telemetry stats
    res_stats = client.get(
        "/api/telemetry/stats?pond_id=a1111111-1111-4111-8111-111111111111&farm_id=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        headers={"X-AlgaX-Role": "PLATFORM_ADMIN"}
    )
    assert res_stats.status_code == 404

# 10. Role isolation: Operator A cannot access or modify Farm B ponds
def test_operator_scoped_to_assigned_farm(client):
    # Operator A accessing Farm A ponds succeeds
    res_a = client.get(
        "/api/ponds?farm_id=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        headers={"X-AlgaX-Role": "FARM_OPERATOR", "X-AlgaX-User-Id": "11111111-1111-4111-8111-111111111111"}
    )
    assert res_a.status_code == 200
    assert len(res_a.json()) > 0

    # Operator A accessing Farm B ponds is forbidden
    res_b = client.get(
        "/api/ponds?farm_id=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        headers={"X-AlgaX-Role": "FARM_OPERATOR", "X-AlgaX-User-Id": "11111111-1111-4111-8111-111111111111"}
    )
    assert res_b.status_code == 403

    # Operator A creating pond on Farm B is forbidden
    res_create = client.post(
        "/api/ponds",
        json={"farm_id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "name": "Illegal Pond", "volume_liters": 50000},
        headers={"X-AlgaX-Role": "FARM_OPERATOR", "X-AlgaX-User-Id": "11111111-1111-4111-8111-111111111111"}
    )
    assert res_create.status_code == 403
