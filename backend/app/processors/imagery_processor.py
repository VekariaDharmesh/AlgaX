import hashlib
import io
import os
import uuid
from PIL import Image, ImageOps, ImageStat, ImageFilter
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app import models

PROCESSING_VERSION = "4.2.0"
MAX_DIMENSION = 4096

STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "storage", "imagery")

def compute_sharpness(image: Image.Image) -> float:
    gray = image.convert("L")
    edges = gray.filter(ImageFilter.FIND_EDGES)
    stat = ImageStat.Stat(edges)
    return stat.var[0]

def compute_quality_metrics(image: Image.Image) -> dict:
    metrics = {}
    metrics["sharpness"] = compute_sharpness(image)
    
    gray = image.convert("L")
    stat = ImageStat.Stat(gray)
    metrics["brightness"] = stat.mean[0]
    metrics["contrast"] = stat.stddev[0]
    
    hist = gray.histogram()
    total_pixels = sum(hist)
    if total_pixels > 0:
        metrics["underexposed_fraction"] = sum(hist[0:6]) / total_pixels
        metrics["overexposed_fraction"] = sum(hist[250:256]) / total_pixels
    else:
        metrics["underexposed_fraction"] = 0.0
        metrics["overexposed_fraction"] = 0.0
        
    return metrics

def classify_quality(metrics: dict, flags: list) -> str:
    if "CORRUPTED" in flags or "UNSUPPORTED_FORMAT" in flags or "MISSING_PIXELS" in flags:
        return models.QualityClassification.UNSUITABLE.value
        
    if metrics.get("sharpness", 0) < 50.0:
        flags.append(models.ImageQualityFlag.BLUR.value)
        
    if metrics.get("brightness", 0) < 40.0:
        flags.append(models.ImageQualityFlag.TOO_DARK.value)
    elif metrics.get("brightness", 0) > 220.0:
        flags.append(models.ImageQualityFlag.TOO_BRIGHT.value)
        
    if metrics.get("contrast", 0) < 20.0:
        flags.append(models.ImageQualityFlag.LOW_CONTRAST.value)
        
    if metrics.get("underexposed_fraction", 0) > 0.2:
        flags.append(models.ImageQualityFlag.UNDEREXPOSED.value)
    if metrics.get("overexposed_fraction", 0) > 0.2:
        flags.append(models.ImageQualityFlag.OVEREXPOSED.value)
        
    if len(flags) > 0:
        if models.ImageQualityFlag.BLUR.value in flags or models.ImageQualityFlag.TOO_DARK.value in flags or models.ImageQualityFlag.TOO_BRIGHT.value in flags:
            return models.QualityClassification.REVIEW.value
        return models.QualityClassification.REVIEW.value
        
    return models.QualityClassification.GOOD.value


def process_imagery(db: Session, imagery_record: models.ImageryRecord) -> models.ImageryProcessing:
    existing = db.query(models.ImageryProcessing).filter(
        models.ImageryProcessing.imagery_id == imagery_record.id,
        models.ImageryProcessing.processing_version == PROCESSING_VERSION
    ).first()
    
    if existing:
        return existing
        
    flags = []
    original_path = os.path.join(STORAGE_DIR, imagery_record.storage_reference)
    
    try:
        with open(original_path, "rb") as f:
            original_bytes = f.read()
            
        original_hash = hashlib.sha256(original_bytes).hexdigest()
        img = Image.open(io.BytesIO(original_bytes))
        
        # Original dims
        orig_w, orig_h = img.size
        
        # Orientation Correct
        img = ImageOps.exif_transpose(img)
        transposed_w, transposed_h = img.size
        orientation_corrected = (orig_w != transposed_w or orig_h != transposed_h) # simplified check
        
        # Color Convert
        if img.mode != "RGB":
            img = img.convert("RGB")
            
        # Resize
        resize_applied = False
        if max(img.size) > MAX_DIMENSION:
            img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.Resampling.LANCZOS)
            resize_applied = True
            
        proc_w, proc_h = img.size
        
        metrics = compute_quality_metrics(img)
        classification = classify_quality(metrics, flags)
        
        out_bytes = io.BytesIO()
        img.save(out_bytes, format="JPEG", quality=90)
        processed_bytes = out_bytes.getvalue()
        processed_hash = hashlib.sha256(processed_bytes).hexdigest()
        
        # Save processed file
        processed_basename = f"processed_{uuid.uuid4()}.jpg"
        farm_pond_dir = os.path.join(STORAGE_DIR, str(imagery_record.farm_id), str(imagery_record.pond_id))
        os.makedirs(farm_pond_dir, exist_ok=True)
        processed_path = os.path.join(farm_pond_dir, processed_basename)
        
        with open(processed_path, "wb") as f:
            f.write(processed_bytes)
            
        processed_storage_reference = os.path.join(str(imagery_record.farm_id), str(imagery_record.pond_id), processed_basename)
        
        processing = models.ImageryProcessing(
            imagery_id=imagery_record.id,
            processing_version=PROCESSING_VERSION,
            processing_status="COMPLETED",
            processed_storage_reference=processed_storage_reference,
            original_sha256_hash=original_hash,
            processed_sha256_hash=processed_hash,
            original_width_px=orig_w,
            original_height_px=orig_h,
            processed_width_px=proc_w,
            processed_height_px=proc_h,
            color_space="RGB",
            orientation_corrected=orientation_corrected,
            resize_applied=resize_applied,
            quality_classification=models.QualityClassification(classification),
            quality_flags=flags,
            quality_metrics=metrics,
            preprocessing_metadata={
                "max_dimension": MAX_DIMENSION,
                "output_format": "JPEG"
            }
        )
        
    except Exception as e:
        flags.append(models.ImageQualityFlag.CORRUPTED.value)
        processing = models.ImageryProcessing(
            imagery_id=imagery_record.id,
            processing_version=PROCESSING_VERSION,
            processing_status="FAILED",
            original_sha256_hash=imagery_record.sha256_hash,
            quality_classification=models.QualityClassification.UNSUITABLE,
            quality_flags=flags,
            preprocessing_metadata={"error": str(e)}
        )
        
    db.add(processing)
    db.commit()
    db.refresh(processing)
    return processing
