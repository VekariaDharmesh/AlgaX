import pytest
import uuid
from fastapi.testclient import TestClient
from datetime import datetime, timezone
import io
from PIL import Image

from app.main import app
from app.database import SessionLocal
from app.models import Farm, Pond

client = TestClient(app)

@pytest.fixture
def db_setup():
    db = SessionLocal()
    farm_id = uuid.uuid4()
    pond_id = uuid.uuid4()
    
    db.add(Farm(id=farm_id, name="Test Farm Imagery"))
    db.add(Pond(id=pond_id, farm_id=farm_id, name="Test Pond Imagery"))
    db.commit()
    
    yield {"farm_id": farm_id, "pond_id": pond_id}
    
    # Cleanup logic if needed
    db.close()

import random

def create_dummy_image(width=100, height=100):
    from PIL import Image
    import io
    # Generate unique color to ensure unique hash
    color = (random.randint(0,255), random.randint(0,255), random.randint(0,255))
    img = Image.new('RGB', (width, height), color=color)
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    return img_byte_arr.getvalue()

def test_imagery_upload(db_setup):
    farm_id = str(db_setup["farm_id"])
    pond_id = str(db_setup["pond_id"])
    
    img_bytes = create_dummy_image()
    
    # Upload image
    response = client.post(
        "/api/imagery",
        data={
            "farm_id": farm_id,
            "pond_id": pond_id,
            "source_type": "SIMULATED",
            "capture_timestamp": datetime.now(timezone.utc).isoformat()
        },
        files={
            "file": ("dummy.png", img_bytes, "image/png")
        }
    )
    
    assert response.status_code == 200, f"Failed: {response.text}"
    data = response.json()
    assert data["farm_id"] == farm_id
    assert data["pond_id"] == pond_id
    assert data["source_type"] == "SIMULATED"
    assert data["mime_type"] == "image/png"
    assert data["width_px"] == 100
    assert data["height_px"] == 100
    assert data["processing_status"] == "INGESTED"
    assert data["sha256_hash"] is not None
    
    record_id = data["id"]
    
    # Retrieve metadata
    response = client.get(f"/api/imagery/{record_id}")
    assert response.status_code == 200
    assert response.json()["id"] == record_id
    
    # List imagery
    response = client.get(f"/api/imagery?farm_id={farm_id}&pond_id={pond_id}")
    assert response.status_code == 200
    assert len(response.json()) >= 1
    
    # Preview image
    response = client.get(f"/api/imagery/{record_id}/preview")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"

def test_imagery_invalid_mime(db_setup):
    farm_id = str(db_setup["farm_id"])
    pond_id = str(db_setup["pond_id"])
    
    response = client.post(
        "/api/imagery",
        data={
            "farm_id": farm_id,
            "pond_id": pond_id,
            "source_type": "SIMULATED"
        },
        files={
            "file": ("dummy.txt", b"not an image", "text/plain")
        }
    )
    
    assert response.status_code == 400
    assert "Unsupported file format" in response.text

def test_imagery_fake_image(db_setup):
    farm_id = str(db_setup["farm_id"])
    pond_id = str(db_setup["pond_id"])
    
    response = client.post(
        "/api/imagery",
        data={
            "farm_id": farm_id,
            "pond_id": pond_id,
            "source_type": "SIMULATED"
        },
        files={
            "file": ("evil.png", b"not an image bytes but png extension", "image/png")
        }
    )
    
    assert response.status_code == 400
    assert "File is corrupted or not a valid image" in response.text

def test_imagery_path_traversal(db_setup):
    farm_id = str(db_setup["farm_id"])
    pond_id = str(db_setup["pond_id"])
    img_bytes = create_dummy_image()
    
    response = client.post(
        "/api/imagery",
        data={
            "farm_id": farm_id,
            "pond_id": pond_id,
            "source_type": "SIMULATED"
        },
        files={
            "file": ("../../../etc/passwd", img_bytes, "image/png")
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert ".." not in data["storage_reference"]
    assert "passwd" in data["storage_reference"]

def test_imagery_duplicate_hash(db_setup):
    farm_id = str(db_setup["farm_id"])
    pond_id = str(db_setup["pond_id"])
    img_bytes = create_dummy_image()
    
    resp1 = client.post("/api/imagery", data={"farm_id": farm_id, "pond_id": pond_id, "source_type": "SIMULATED"}, files={"file": ("img.png", img_bytes, "image/png")})
    assert resp1.status_code == 200
    id1 = resp1.json()["id"]
    
    resp2 = client.post("/api/imagery", data={"farm_id": farm_id, "pond_id": pond_id, "source_type": "SIMULATED"}, files={"file": ("img2.png", img_bytes, "image/png")})
    assert resp2.status_code == 200
    id2 = resp2.json()["id"]
    
    assert id1 == id2  # Exact duplicate returns the same record

def test_imagery_isolation(db_setup):
    db = SessionLocal()
    farm2_id = uuid.uuid4()
    pond2_id = uuid.uuid4()
    db.add(Farm(id=farm2_id, name="Farm 2"))
    db.add(Pond(id=pond2_id, farm_id=farm2_id, name="Pond 2"))
    db.commit()
    db.close()
    
    farm_id = str(db_setup["farm_id"])
    
    # Try uploading pond2 with farm1 -> should fail
    img_bytes = create_dummy_image()
    response = client.post("/api/imagery", data={"farm_id": farm_id, "pond_id": str(pond2_id), "source_type": "SIMULATED"}, files={"file": ("img.png", img_bytes, "image/png")})
    assert response.status_code == 400
    assert "does not belong to the farm" in response.text
