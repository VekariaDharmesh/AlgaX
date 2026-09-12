from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app import models
import json

def collect_evidence(db: Session, biological_anomaly: models.Anomaly, window_hours: float = 4.0) -> Dict[str, Any]:
    """
    Collects contextual evidence (Phase 3.1, 3.2 anomalies and Phase 2 outputs)
    for a given biological anomaly within a time window.
    """
    pond_id = biological_anomaly.pond_id
    anomaly_time = biological_anomaly.timestamp
    window_start = anomaly_time - timedelta(hours=window_hours)
    window_end = anomaly_time + timedelta(hours=1) # Include shortly after
    
    # 1. Biological Evidence (from Phase 3.3)
    # The evidence is stored in the `explanation` JSON field of the anomaly
    bio_evidence = biological_anomaly.explanation if biological_anomaly.explanation else {}
    
    # 2. Environmental Anomalies (Phase 3.2)
    env_anomalies = db.query(models.Anomaly).filter(
        models.Anomaly.pond_id == pond_id,
        models.Anomaly.timestamp >= window_start,
        models.Anomaly.timestamp <= window_end,
        models.Anomaly.source_provenance == "environmental_engine"
    ).all()
    
    env_evidence = [{
        "id": str(a.id),
        "type": a.anomaly_type.value,
        "severity": a.severity.value,
        "description": a.description,
        "timestamp": a.timestamp.isoformat(),
        "observed": a.observed_value
    } for a in env_anomalies]
    
    # 3. Sensor Anomalies (Phase 3.1)
    sensor_anomalies = db.query(models.Anomaly).filter(
        models.Anomaly.pond_id == pond_id,
        models.Anomaly.timestamp >= window_start,
        models.Anomaly.timestamp <= window_end,
        models.Anomaly.source_provenance.in_(["anomaly_engine_sensor", "anomaly_engine_dropout"])
    ).all()
    
    sensor_evidence = [{
        "id": str(a.id),
        "sensor_type": a.sensor_type,
        "type": a.anomaly_type.value,
        "severity": a.severity.value,
        "timestamp": a.timestamp.isoformat()
    } for a in sensor_anomalies]
    
    # 4. Phase 2 Model Outputs (Limitation Factors)
    # Fetch the most recent biomass estimates in the window
    estimates = db.query(models.BiomassEstimate).filter(
        models.BiomassEstimate.pond_id == pond_id,
        models.BiomassEstimate.timestamp >= window_start,
        models.BiomassEstimate.timestamp <= window_end
    ).order_by(models.BiomassEstimate.timestamp.asc()).all()
    
    model_evidence = {}
    if estimates:
        # Aggregate the limitation factors (use the average or the most restrictive)
        avg_light = sum(e.light_factor for e in estimates) / len(estimates)
        avg_temp = sum(e.temp_factor for e in estimates) / len(estimates)
        avg_ph = sum(e.ph_factor for e in estimates) / len(estimates)
        avg_n = sum(e.n_factor for e in estimates) / len(estimates)
        
        last_est = estimates[-1]
        model_evidence = {
            "avg_light_factor": round(avg_light, 3),
            "avg_temp_factor": round(avg_temp, 3),
            "avg_ph_factor": round(avg_ph, 3),
            "avg_n_factor": round(avg_n, 3),
            "model_run_id": str(last_est.model_run_id),
            "model_version": last_est.model_run.model_version if last_est.model_run else "unknown"
        }
    
    return {
        "anomaly": {
            "id": str(biological_anomaly.id),
            "type": biological_anomaly.anomaly_type.value,
            "severity": biological_anomaly.severity.value,
            "timestamp": biological_anomaly.timestamp.isoformat(),
            "evidence": bio_evidence
        },
        "environmental_anomalies": env_evidence,
        "sensor_anomalies": sensor_evidence,
        "model_outputs": model_evidence,
        "analysis_start": window_start.isoformat(),
        "analysis_end": window_end.isoformat()
    }
