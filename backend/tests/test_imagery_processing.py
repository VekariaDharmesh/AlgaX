import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.database import SessionLocal
from app.models import Farm, Pond, ImageryRecord, ImagerySourceType
import os
import io
from PIL import Image

client = TestClient(app)

@pytest.fixture
def db_setup():
    db = SessionLocal()
    farm_id = uuid.uuid4()
    pond_id = uuid.uuid4()
    
    db.add(Farm(id=farm_id, name="Test Farm 4.2"))
    db.add(Pond(id=pond_id, farm_id=farm_id, name="Test Pond 4.2"))
    db.commit()
    yield {"farm_id": farm_id, "pond_id": pond_id}
    db.close()

def test_process_imagery_good(db_setup):
    farm_id = db_setup["farm_id"]
    pond_id = db_setup["pond_id"]
    
    # Create valid image
    img = Image.new('RGB', (100, 100), color = 'white')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_bytes = img_byte_arr.getvalue()
    
    response = client.post(
        "/api/imagery",
        data={
            "farm_id": str(farm_id),
            "pond_id": str(pond_id),
            "source_type": "SIMULATED"
        },
        files={"file": ("test_good.jpg", img_bytes, "image/jpeg")}
    )
    assert response.status_code == 200
    imagery_id = response.json()["id"]
    
    # Process
    proc_response = client.post(f"/api/imagery/{imagery_id}/process")
    assert proc_response.status_code == 200
    proc_data = proc_response.json()
    
    assert proc_data["imagery_id"] == imagery_id
    assert proc_data["processing_status"] == "COMPLETED"
    assert proc_data["quality_classification"] in ["GOOD", "REVIEW"]

def test_process_imagery_corrupted(db_setup):
    farm_id = db_setup["farm_id"]
    pond_id = db_setup["pond_id"]
    db = SessionLocal()
    
    import hashlib
    img_bytes = b"not_an_image"
    file_hash = hashlib.sha256(img_bytes).hexdigest()
    
    from app.api.imagery import STORAGE_DIR
    pond_storage_dir = os.path.join(STORAGE_DIR, str(farm_id), str(pond_id))
    os.makedirs(pond_storage_dir, exist_ok=True)
    
    safe_filename = f"{uuid.uuid4()}_corrupt.jpg"
    file_path = os.path.join(pond_storage_dir, safe_filename)
    
    with open(file_path, "wb") as f:
        f.write(img_bytes)
        
    record = ImageryRecord(
        farm_id=farm_id,
        pond_id=pond_id,
        source_type=ImagerySourceType.SIMULATED,
        filename="corrupt.jpg",
        mime_type="image/jpeg",
        file_size_bytes=len(img_bytes),
        storage_reference=os.path.join(str(farm_id), str(pond_id), safe_filename),
        sha256_hash=file_hash,
        provenance={}
    )
    db.add(record)
    db.commit()
    record_id = record.id
    db.close()
    
    proc_response = client.post(f"/api/imagery/{record_id}/process")
    assert proc_response.status_code == 200
    proc_data = proc_response.json()
    assert proc_data["processing_status"] == "FAILED"
    assert proc_data["quality_classification"] == "UNSUITABLE"
    assert "CORRUPTED" in proc_data["quality_flags"]

def test_process_idempotency(db_setup):
    farm_id = db_setup["farm_id"]
    pond_id = db_setup["pond_id"]
    
    img = Image.new('RGB', (100, 100), color = 'blue')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    
    res = client.post(
        "/api/imagery",
        data={
            "farm_id": str(farm_id),
            "pond_id": str(pond_id),
            "source_type": "SIMULATED"
        },
        files={"file": ("test_idem.jpg", img_byte_arr.getvalue(), "image/jpeg")}
    )
    imagery_id = res.json()["id"]
    
    proc1 = client.post(f"/api/imagery/{imagery_id}/process").json()
    proc2 = client.post(f"/api/imagery/{imagery_id}/process").json()
    
    assert proc1["id"] == proc2["id"]
