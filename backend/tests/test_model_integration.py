import pytest
from fastapi.testclient import TestClient
import uuid
from datetime import datetime, timezone, timedelta
from app.main import app
from app.database import SessionLocal
from app import models

client = TestClient(app)

def test_trigger_model_run():
    db = SessionLocal()
    farm_id = uuid.uuid4()
    pond_id = uuid.uuid4()
    sensor_id = uuid.uuid4()
    
    db.add(models.Farm(id=farm_id, name="Test Farm M"))
    db.add(models.Pond(id=pond_id, farm_id=farm_id, name="Test Pond M"))
    db.add(models.Sensor(id=sensor_id, pond_id=pond_id, type="temperature", unit="C", is_simulated=True))
    db.commit()
    
    start_time = datetime.now(timezone.utc) - timedelta(hours=1)
    end_time = datetime.now(timezone.utc)
    
    # 1. Ingest
    client.post("/api/ingest/reading", json={
        "sensor_id": str(sensor_id),
        "pond_id": str(pond_id),
        "timestamp": start_time.isoformat(),
        "value": 26.5
    })
    
    # 2. Run model
    res = client.post("/api/model/run", json={
        "pond_id": str(pond_id),
        "period_start": start_time.isoformat(),
        "period_end": end_time.isoformat()
    })
    print(res.json())
    assert res.status_code == 200
    
    # 3. Check biomass
    res_b = client.get(f"/api/model/biomass?pond_id={pond_id}")
    assert len(res_b.json()) == 1
    
    # 4. Check carbon
    res_c = client.get(f"/api/model/carbon?pond_id={pond_id}")
    c_data = res_c.json()[0]
    assert c_data["net_carbon_removed_kg"] is None # unspecified
    assert c_data["gross_co2_kg"] >= 0
    
    db.close()
