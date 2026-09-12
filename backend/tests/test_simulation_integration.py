import pytest
import uuid
import datetime
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal, engine
from app import models, schemas
from app.simulation.engine import simulation_manager, PondSimulationState

client = TestClient(app)

@pytest.fixture
def seeded_farm():
    with SessionLocal() as db:
        farm = db.query(models.Farm).first()
        if not farm:
            farm = models.Farm(id=uuid.uuid4(), name="Test Facility", location="Gujarat, India")
            db.add(farm)
            db.commit()
            db.refresh(farm)

        ponds = db.query(models.Pond).filter(models.Pond.farm_id == farm.id).all()
        if len(ponds) < 2:
            pond1 = models.Pond(id=uuid.uuid4(), farm_id=farm.id, name="Raceway Alpha", volume_liters=100000.0, species="Spirulina")
            pond2 = models.Pond(id=uuid.uuid4(), farm_id=farm.id, name="Raceway Beta", volume_liters=100000.0, species="Chlorella")
            db.add(pond1)
            db.add(pond2)
            db.commit()
            ponds = [pond1, pond2]

        pond1 = ponds[0]
        pond2 = ponds[1]

        # Ensure sensors exist for both ponds
        sensor_types = [
            (models.SensorType.temperature, "°C"),
            (models.SensorType.ph, "pH"),
            (models.SensorType.dissolved_oxygen, "mg/L"),
            (models.SensorType.turbidity, "NTU"),
            (models.SensorType.light, "µmol/m²/s"),
            (models.SensorType.nitrogen, "mg/L"),
        ]
        for p in [pond1, pond2]:
            for stype, unit in sensor_types:
                s = db.query(models.Sensor).filter(models.Sensor.pond_id == p.id, models.Sensor.type == stype).first()
                if not s:
                    s = models.Sensor(id=uuid.uuid4(), pond_id=p.id, type=stype, unit=unit, is_simulated=True)
                    db.add(s)

        # Ensure operator is assigned to farm
        op = db.query(models.User).filter(models.User.email == "operator@algax.io").first()
        if op:
            op.assigned_farm_id = farm.id

        db.commit()
        simulation_manager.initialize_ponds(db)
        return farm, pond1, pond2


def test_simulation_status_endpoint(seeded_farm):
    """Verifies that simulation status returns all ponds, disclosure, and provenance metadata."""
    farm, pond1, pond2 = seeded_farm
    resp = client.get("/api/simulation/status", headers={"X-AlgaX-Role": "PLATFORM_ADMIN"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["disclosure"] == "SYNTHETIC_SIMULATION_DATA"
    assert data["provenance"] == "simulated"
    assert len(data["ponds"]) >= 2


def test_activate_healthy_pond(seeded_farm):
    """Activating Healthy Pond maintains normal baseline behavior."""
    farm, pond1, _ = seeded_farm
    resp = client.post(
        "/api/simulation/scenario",
        json={"pond_id": str(pond1.id), "scenario": "healthy"},
        headers={"X-AlgaX-Role": "PLATFORM_ADMIN"}
    )
    assert resp.status_code == 200
    state = resp.json()
    assert state["active_scenario"] == "healthy"
    assert state["dropout_sensor_type"] is None
    assert state["biomass"] >= 0.4
    assert state["nitrogen"] >= 10.0


def test_activate_nutrient_depletion(seeded_farm):
    """Activating Nutrient Depletion causes nitrogen to trend downwards over simulated time."""
    farm, pond1, _ = seeded_farm
    simulation_manager.reset(pond1.id)
    initial_n = simulation_manager.get_state(pond1.id).nitrogen

    resp = client.post(
        "/api/simulation/scenario",
        json={"pond_id": str(pond1.id), "scenario": "nutrient_depletion"},
        headers={"X-AlgaX-Role": "PLATFORM_ADMIN"}
    )
    assert resp.status_code == 200
    state = resp.json()
    assert state["active_scenario"] == "nutrient_depletion"

    with SessionLocal() as db:
        for _ in range(5):
            simulation_manager.step_pond(db, pond1.id)

    curr_state = simulation_manager.get_state(pond1.id)
    assert curr_state.nitrogen < initial_n


def test_activate_heatwave(seeded_farm):
    """Activating Heatwave causes base temperature to rise over time."""
    farm, pond1, _ = seeded_farm
    simulation_manager.reset(pond1.id)
    initial_temp = simulation_manager.get_state(pond1.id).temp_base

    resp = client.post(
        "/api/simulation/scenario",
        json={"pond_id": str(pond1.id), "scenario": "heatwave"},
        headers={"X-AlgaX-Role": "PLATFORM_ADMIN"}
    )
    assert resp.status_code == 200
    state = resp.json()
    assert state["active_scenario"] == "heatwave"

    with SessionLocal() as db:
        for _ in range(5):
            simulation_manager.step_pond(db, pond1.id)

    curr_state = simulation_manager.get_state(pond1.id)
    assert curr_state.temp_base > initial_temp


def test_activate_sensor_dropout(seeded_farm):
    """Activating Sensor Dropout stops readings for the target sensor."""
    farm, pond1, _ = seeded_farm
    simulation_manager.reset(pond1.id)

    resp = client.post(
        "/api/simulation/scenario",
        json={"pond_id": str(pond1.id), "scenario": "sensor_dropout"},
        headers={"X-AlgaX-Role": "PLATFORM_ADMIN"}
    )
    assert resp.status_code == 200
    state = resp.json()
    assert state["active_scenario"] == "sensor_dropout"
    assert state["dropout_sensor_type"] == "temperature"

    with SessionLocal() as db:
        temp_sensor = db.query(models.Sensor).filter(
            models.Sensor.pond_id == pond1.id,
            models.Sensor.type == models.SensorType.temperature
        ).first()
        ph_sensor = db.query(models.Sensor).filter(
            models.Sensor.pond_id == pond1.id,
            models.Sensor.type == models.SensorType.ph
        ).first()

        temp_count_before = db.query(models.SensorReading).filter(models.SensorReading.sensor_id == temp_sensor.id).count()
        ph_count_before = db.query(models.SensorReading).filter(models.SensorReading.sensor_id == ph_sensor.id).count()

        simulation_manager.step_pond(db, pond1.id)

        temp_count_after = db.query(models.SensorReading).filter(models.SensorReading.sensor_id == temp_sensor.id).count()
        ph_count_after = db.query(models.SensorReading).filter(models.SensorReading.sensor_id == ph_sensor.id).count()

        # Temperature sensor produced no new readings due to dropout
        assert temp_count_after == temp_count_before
        # pH sensor produced a new reading as expected
        assert ph_count_after == ph_count_before + 1


def test_playback_controls_speed_stop_reset(seeded_farm):
    """Tests 1x, 5x, 10x speeds, Stop, Resume, and Reset playback controls."""
    farm, pond1, _ = seeded_farm

    # Test Speed 5x
    resp = client.post(
        "/api/simulation/control",
        json={"action": "set_speed", "speed": 5, "pond_id": str(pond1.id)},
        headers={"X-AlgaX-Role": "PLATFORM_ADMIN"}
    )
    assert resp.status_code == 200
    assert simulation_manager.get_state(pond1.id).speed_multiplier == 5

    # Test Speed 10x
    resp = client.post(
        "/api/simulation/control",
        json={"action": "set_speed", "speed": 10, "pond_id": str(pond1.id)},
        headers={"X-AlgaX-Role": "PLATFORM_ADMIN"}
    )
    assert resp.status_code == 200
    assert simulation_manager.get_state(pond1.id).speed_multiplier == 10

    # Test Stop
    resp = client.post(
        "/api/simulation/control",
        json={"action": "stop", "pond_id": str(pond1.id)},
        headers={"X-AlgaX-Role": "PLATFORM_ADMIN"}
    )
    assert resp.status_code == 200
    assert simulation_manager.get_state(pond1.id).is_running is False

    # Test Resume
    resp = client.post(
        "/api/simulation/control",
        json={"action": "resume", "pond_id": str(pond1.id)},
        headers={"X-AlgaX-Role": "PLATFORM_ADMIN"}
    )
    assert resp.status_code == 200
    assert simulation_manager.get_state(pond1.id).is_running is True

    # Test Reset
    resp = client.post(
        "/api/simulation/reset",
        json={"pond_id": str(pond1.id)},
        headers={"X-AlgaX-Role": "PLATFORM_ADMIN"}
    )
    assert resp.status_code == 200
    state = simulation_manager.get_state(pond1.id)
    assert state.active_scenario == "healthy"
    assert state.speed_multiplier == 1
    assert state.nitrogen == 15.0
    assert state.temp_base == 25.0


def test_scenario_drives_telemetry_pipeline(seeded_farm):
    """Verifies that stepped simulation inserts real readings queryable via /api/telemetry with source_type='simulated'."""
    farm, pond1, _ = seeded_farm
    with SessionLocal() as db:
        simulation_manager.reset(pond1.id)
        simulation_manager.step_pond(db, pond1.id)

    # Query telemetry endpoint
    resp = client.get(f"/api/telemetry?pond_id={pond1.id}")
    assert resp.status_code == 200
    readings = resp.json()
    assert len(readings) > 0
    # Provenance check
    assert readings[0]["source_type"] == "simulated"
    assert readings[0]["quality_flag"] == "ok"


def test_scenario_reaches_model_engine(seeded_farm):
    """Verifies that simulation steps update ModelRun and BiomassEstimate records."""
    farm, pond1, _ = seeded_farm
    with SessionLocal() as db:
        simulation_manager.reset(pond1.id)
        simulation_manager.step_pond(db, pond1.id)

        biomass_est = db.query(models.BiomassEstimate).filter(
            models.BiomassEstimate.pond_id == pond1.id
        ).order_by(models.BiomassEstimate.timestamp.desc()).first()

        assert biomass_est is not None
        assert biomass_est.biomass_g_per_l > 0
        assert biomass_est.growth_rate is not None


def test_farm_and_pond_isolation(seeded_farm):
    """Verifies that injecting a scenario into Pond 1 leaves Pond 2 in baseline state."""
    farm, pond1, pond2 = seeded_farm
    simulation_manager.reset(pond1.id)
    simulation_manager.reset(pond2.id)

    # Inject heatwave into pond 1 only
    client.post(
        "/api/simulation/scenario",
        json={"pond_id": str(pond1.id), "scenario": "heatwave"},
        headers={"X-AlgaX-Role": "PLATFORM_ADMIN"}
    )

    state1 = simulation_manager.get_state(pond1.id)
    state2 = simulation_manager.get_state(pond2.id)

    assert state1.active_scenario == "heatwave"
    assert state2.active_scenario == "healthy"


def test_farm_isolation_enforced_for_operator(seeded_farm):
    """Verifies that an operator cannot inject a scenario into a pond outside their assigned facility."""
    farm, pond1, _ = seeded_farm
    other_farm_id = uuid.uuid4()
    other_pond_id = uuid.uuid4()

    with SessionLocal() as db:
        other_farm = models.Farm(id=other_farm_id, name="Other Facility", location="Tamil Nadu, India")
        other_pond = models.Pond(id=other_pond_id, farm_id=other_farm_id, name="Other Raceway", species="Spirulina")
        db.add(other_farm)
        db.add(other_pond)
        db.commit()

    resp = client.post(
        "/api/simulation/scenario",
        json={"pond_id": str(other_pond_id), "scenario": "heatwave"},
        headers={"X-AlgaX-Role": "FARM_OPERATOR"}
    )
    assert resp.status_code == 403
    assert "Access denied" in resp.json()["detail"]
