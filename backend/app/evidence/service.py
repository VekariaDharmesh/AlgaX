import uuid
import hashlib
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc

from .. import models

def _serialize_dt(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

def generate_evidence_package(
    db: Session,
    farm_id: uuid.UUID,
    pond_id: uuid.UUID,
    start_date: datetime,
    end_date: datetime
) -> models.EvidencePackage:
    # Gather Sensors
    readings = db.query(models.SensorReading).filter(
        models.SensorReading.pond_id == pond_id,
        models.SensorReading.timestamp >= start_date,
        models.SensorReading.timestamp <= end_date
    ).all()
    
    sensor_ev = [{"id": str(r.id), "sensor_id": str(r.sensor_id), "timestamp": r.timestamp.isoformat(), "type": r.source_type.value} for r in readings]
    
    # Gather Models & Carbon
    model_runs = db.query(models.ModelRun).filter(
        models.ModelRun.pond_id == pond_id,
        models.ModelRun.period_start >= start_date,
        models.ModelRun.period_end <= end_date
    ).all()
    
    model_ev = []
    carbon_ev = []
    for m in model_runs:
        model_ev.append({
            "id": str(m.id),
            "version": m.model_version,
            "period_start": m.period_start.isoformat(),
            "period_end": m.period_end.isoformat(),
            "status": m.status.value
        })
        
        for c in m.carbon_estimates:
            carbon_ev.append({
                "id": str(c.id),
                "model_run_id": str(m.id),
                "gross_co2_kg": c.gross_co2_kg,
                "net_carbon_removed_kg": c.net_carbon_removed_kg,
                "end_use": c.end_use
            })
            
    # Gather Anomalies
    anomalies = db.query(models.Anomaly).filter(
        models.Anomaly.pond_id == pond_id,
        models.Anomaly.timestamp >= start_date,
        models.Anomaly.timestamp <= end_date
    ).all()
    
    anomaly_ev = [{
        "id": str(a.id),
        "type": a.anomaly_type.value,
        "severity": a.severity.value,
        "status": a.status.value,
        "timestamp": a.timestamp.isoformat()
    } for a in anomalies]
    
    # Gather Imagery
    imagery = db.query(models.ImageryRecord).filter(
        models.ImageryRecord.pond_id == pond_id,
        models.ImageryRecord.capture_timestamp >= start_date,
        models.ImageryRecord.capture_timestamp <= end_date
    ).all()
    
    imagery_ev = [{
        "id": str(i.id),
        "source": i.source_type.value,
        "capture_timestamp": i.capture_timestamp.isoformat() if i.capture_timestamp else None,
        "hash": i.sha256_hash
    } for i in imagery]
    
    # Gather Cross-Validation
    cv_runs = db.query(models.CrossValidationRun).filter(
        models.CrossValidationRun.pond_id == pond_id,
        models.CrossValidationRun.comparison_window_start >= start_date,
        models.CrossValidationRun.comparison_window_end <= end_date
    ).all()
    
    cv_ev = [{
        "id": str(cv.id),
        "result_status": cv.result_status.value,
        "confidence": cv.confidence.value,
        "model_trend": cv.model_trend.value if cv.model_trend else None,
        "imagery_trend": cv.imagery_trend.value if cv.imagery_trend else None
    } for cv in cv_runs]
    
    # Classify completeness
    missing_sections = []
    if not sensor_ev: missing_sections.append("Sensor Evidence")
    if not model_ev: missing_sections.append("Model Evidence")
    if not carbon_ev: missing_sections.append("Carbon Accounting")
    if not imagery_ev: missing_sections.append("Imagery Evidence")
    if not cv_ev: missing_sections.append("Cross-Validation Evidence")
    
    if len(missing_sections) == 0:
        completeness = models.CompletenessClassification.COMPLETE
    elif len(missing_sections) < 5:
        completeness = models.CompletenessClassification.PARTIAL
    else:
        completeness = models.CompletenessClassification.INSUFFICIENT_EVIDENCE
        
    limitations = [{"issue": f"Missing {m}"} for m in missing_sections]
    
    # Check for simulation data
    has_sim = any(r.source_type == models.SourceType.simulated for r in readings) or \
              any(i.source_type == models.ImagerySourceType.SIMULATED for i in imagery)
              
    pkg = models.EvidencePackage(
        farm_id=farm_id,
        pond_id=pond_id,
        reporting_period_start=start_date,
        reporting_period_end=end_date,
        package_version="5.1.0",
        status=models.PackageStatus.READY_FOR_REVIEW if completeness == models.CompletenessClassification.COMPLETE else models.PackageStatus.DRAFT,
        completeness=completeness,
        sensor_evidence_json=sensor_ev,
        model_evidence_json=model_ev,
        carbon_evidence_json=carbon_ev,
        anomaly_evidence_json=anomaly_ev,
        imagery_evidence_json=imagery_ev,
        cross_validation_evidence_json=cv_ev,
        limitations_json=limitations,
        contains_simulated_data=has_sim
    )

    from .verifier import build_canonical_payload, compute_canonical_hash
    payload = build_canonical_payload(pkg)
    pkg.canonical_hash = compute_canonical_hash(payload)
    
    db.add(pkg)
    db.commit()
    db.refresh(pkg)
    
    return pkg

def seal_evidence_package(
    db: Session,
    package_id: uuid.UUID,
    actor: str = "auditor@algax.com"
) -> models.EvidencePackage:
    pkg = db.query(models.EvidencePackage).filter(models.EvidencePackage.id == package_id).first()
    if not pkg:
        raise ValueError("Evidence Package not found")
        
    if pkg.completeness == models.CompletenessClassification.INSUFFICIENT_EVIDENCE:
        raise ValueError("Cannot seal evidence package with INSUFFICIENT_EVIDENCE classification")

    from .verifier import build_canonical_payload, compute_canonical_hash
    payload = build_canonical_payload(pkg)
    pkg.canonical_hash = compute_canonical_hash(payload)
    pkg.status = models.PackageStatus.SEALED
    pkg.sealed_at = datetime.now(timezone.utc)
    pkg.sealed_by = actor
    
    db.commit()
    db.refresh(pkg)
    return pkg

