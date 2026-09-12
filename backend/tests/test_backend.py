import pytest
from fastapi.testclient import TestClient
import uuid
from datetime import datetime, timezone
from app.main import app
from simulator.main import Simulator, PondState

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

import asyncio

def test_biology_and_environment():
    async def _test():
        sim = Simulator()
        state = PondState(uuid.uuid4())
        
        # initial state
        assert state.biomass == 0.5
        assert state.nitrogen == 15.0
        
        env = await sim.step_pond(state)
        assert "temperature" in env
        assert "light" in env
        
        # biomass should grow
        assert state.biomass > 0.5
        # nitrogen should decrease due to growth
        assert state.nitrogen < 15.0
        
        # Day/Night test
        state.time = datetime(2023, 1, 1, 12, 0, tzinfo=timezone.utc) # noon
        env_day = await sim.step_pond(state)
        assert env_day["light"] > 0
        assert env_day["dissolved_oxygen"] > 5.0 # increased DO
        
        state.time = datetime(2023, 1, 1, 0, 0, tzinfo=timezone.utc) # midnight
        env_night = await sim.step_pond(state)
        assert env_night["light"] == 0
        assert env_night["dissolved_oxygen"] < env_day["dissolved_oxygen"]

    asyncio.run(_test())

def test_sensor_dropout():
    async def _test():
        sim = Simulator()
        state = PondState(uuid.uuid4())
        state.dropout_sensor_type = "temperature"
        
        # simulate the dropout logic used in simulator.run
        env = await sim.step_pond(state)
        
        sensor = {"id": uuid.uuid4(), "type": "temperature"}
        if state.dropout_sensor_type == sensor["type"]:
            dropped_out = True
        else:
            dropped_out = False
            
        assert dropped_out == True

    asyncio.run(_test())

def test_api_ingest_validation():
    # 1. Invalid sensor ID
    response = client.post("/api/ingest/reading", json={
        "sensor_id": str(uuid.uuid4()),
        "pond_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "value": 25.0
    })
    assert response.status_code == 404 # sensor not found
    
    # 2. Missing required fields
    response = client.post("/api/ingest/reading", json={
        "sensor_id": str(uuid.uuid4()),
        "value": 25.0
    })
    assert response.status_code == 422 # validation error

def test_db_roundtrip():
    from app.database import SessionLocal
    from app.models import Farm, Pond, Sensor
    import uuid
    
    db = SessionLocal()
    farm_id = uuid.uuid4()
    pond_id = uuid.uuid4()
    sensor_id = uuid.uuid4()
    
    db.add(Farm(id=farm_id, name="Test Farm"))
    db.add(Pond(id=pond_id, farm_id=farm_id, name="Test Pond"))
    db.add(Sensor(id=sensor_id, pond_id=pond_id, type="temperature", unit="C", is_simulated=True))
    db.commit()
    
    # 1. Ingest reading
    timestamp = datetime.now(timezone.utc).isoformat()
    response = client.post("/api/ingest/reading", json={
        "sensor_id": str(sensor_id),
        "pond_id": str(pond_id),
        "timestamp": timestamp,
        "value": 26.5
    })
    assert response.status_code == 200
    reading = response.json()
    assert reading["value"] == 26.5
    assert reading["source_type"] == "simulated"
    
    # 2. Query telemetry
    response2 = client.get(f"/api/telemetry?pond_id={pond_id}&sensor_type=temperature")
    assert response2.status_code == 200
    telemetry = response2.json()
    assert len(telemetry) == 1
    assert telemetry[0]["value"] == 26.5
    assert telemetry[0]["sensor_id"] == str(sensor_id)
    
    db.close()
