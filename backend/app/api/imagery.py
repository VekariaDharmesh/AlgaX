import os
import uuid
import hashlib
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from PIL import Image, UnidentifiedImageError

from .. import models, schemas
from ..database import get_db

router = APIRouter()

STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "storage", "imagery")
os.makedirs(STORAGE_DIR, exist_ok=True)

SUPPORTED_MIME_TYPES = ["image/jpeg", "image/png", "image/tiff"]
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

@router.post("/imagery", response_model=schemas.ImageryRecordResponse)
async def upload_imagery(
    farm_id: uuid.UUID = Form(...),
    pond_id: uuid.UUID = Form(...),
    source_type: str = Form(...),
    capture_timestamp: Optional[datetime] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Validate Farm/Pond
    farm = db.query(models.Farm).filter(models.Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
        
    pond = db.query(models.Pond).filter(models.Pond.id == pond_id).first()
    if not pond or pond.farm_id != farm_id:
        raise HTTPException(status_code=400, detail="Pond does not exist or does not belong to the farm")

    if source_type not in [s.value for s in models.ImagerySourceType]:
        raise HTTPException(status_code=400, detail=f"Invalid source_type. Must be one of {list(models.ImagerySourceType)}")

    if file.content_type not in SUPPORTED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file format. Use JPEG, PNG, or TIFF.")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")

    # Compute SHA-256
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    # Check for duplicate in the same pond
    existing_record = db.query(models.ImageryRecord).filter(
        models.ImageryRecord.pond_id == pond_id,
        models.ImageryRecord.sha256_hash == file_hash
    ).first()
    if existing_record:
        # Idempotent return for the same pond
        return existing_record

    # Validate image using Pillow and extract metadata
    try:
        from io import BytesIO
        img = Image.open(BytesIO(file_bytes))
        img.verify()
        
        # Re-open to get width/height because verify() might close or advance
        img = Image.open(BytesIO(file_bytes))
        width_px, height_px = img.size
    except Exception as e:
        raise HTTPException(status_code=400, detail="File is corrupted or not a valid image")

    # Save physical file
    pond_storage_dir = os.path.join(STORAGE_DIR, str(farm_id), str(pond_id))
    os.makedirs(pond_storage_dir, exist_ok=True)
    
    # Safe filename
    original_basename = os.path.basename(file.filename) if file.filename else "upload"
    safe_filename = f"{uuid.uuid4()}_{original_basename}"
    file_path = os.path.join(pond_storage_dir, safe_filename)
    
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    # Prepare relative storage reference
    storage_reference = os.path.join(str(farm_id), str(pond_id), safe_filename)

    provenance = {
        "source": source_type,
        "ingestion_version": "4.1.0",
        "file_hash": file_hash,
        "original_filename": file.filename
    }

    db_record = models.ImageryRecord(
        farm_id=farm_id,
        pond_id=pond_id,
        source_type=models.ImagerySourceType(source_type),
        capture_timestamp=capture_timestamp,
        filename=file.filename,
        mime_type=file.content_type,
        file_size_bytes=len(file_bytes),
        storage_reference=storage_reference,
        sha256_hash=file_hash,
        width_px=width_px,
        height_px=height_px,
        processing_status=models.ImageryProcessingStatus.INGESTED,
        provenance=provenance
    )

    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    
    return db_record


@router.get("/imagery", response_model=List[schemas.ImageryRecordResponse])
def list_imagery(
    farm_id: Optional[uuid.UUID] = None,
    pond_id: Optional[uuid.UUID] = None,
    source_type: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(models.ImageryRecord)
    if farm_id:
        query = query.filter(models.ImageryRecord.farm_id == farm_id)
    if pond_id:
        query = query.filter(models.ImageryRecord.pond_id == pond_id)
    if source_type:
        query = query.filter(models.ImageryRecord.source_type == source_type)
        
    return query.order_by(desc(models.ImageryRecord.created_at)).limit(limit).all()


@router.get("/imagery/{record_id}", response_model=schemas.ImageryRecordResponse)
def get_imagery(record_id: uuid.UUID, db: Session = Depends(get_db)):
    record = db.query(models.ImageryRecord).filter(models.ImageryRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Imagery record not found")
    return record


@router.get("/imagery/{record_id}/preview")
def preview_imagery(record_id: uuid.UUID, db: Session = Depends(get_db)):
    record = db.query(models.ImageryRecord).filter(models.ImageryRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Imagery record not found")
        
    file_path = os.path.join(STORAGE_DIR, record.storage_reference)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image file missing from storage")
        
    return FileResponse(file_path, media_type=record.mime_type)
