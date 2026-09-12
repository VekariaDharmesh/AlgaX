from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app import models

def collect_evidence(db: Session, biological_anomaly: models.Anomaly, window_hours: float = 4.0) -> Dict[str, Any]:
    pond_id = biological_anomaly.pond_id
    anomaly_time = biological_anomaly.timestamp
    window_start = anomaly_time - timedelta(hours=window_hours)
    window_end = anomaly_time + timedelta(hours=1)

    bio_evidence = biological_anomaly.explanation if biological_anomaly.explanation else {}

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
        "observed": a.observed_value,
        "confidence_score": a.confidence_score,
    } for a in env_anomalies]

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
        "timestamp": a.timestamp.isoformat(),
        "confidence_score": a.confidence_score,
    } for a in sensor_anomalies]

    estimates = db.query(models.BiomassEstimate).filter(
        models.BiomassEstimate.pond_id == pond_id,
        models.BiomassEstimate.timestamp >= window_start,
        models.BiomassEstimate.timestamp <= window_end
    ).order_by(models.BiomassEstimate.timestamp.asc()).all()

    model_evidence: Dict[str, Any] = {}
    if estimates:
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
            "model_version": last_est.model_run.model_version if last_est.model_run else "unknown",
        }

    return {
        "anomaly": {
            "id": str(biological_anomaly.id),
            "type": biological_anomaly.anomaly_type.value,
            "severity": biological_anomaly.severity.value,
            "timestamp": biological_anomaly.timestamp.isoformat(),
            "evidence": bio_evidence,
        },
        "environmental_anomalies": env_evidence,
        "sensor_anomalies": sensor_evidence,
        "model_outputs": model_evidence,
        "analysis_start": window_start.isoformat(),
        "analysis_end": window_end.isoformat(),
        "collection_metadata": {
            "window_hours": window_hours,
            "anomaly_timestamp": biological_anomaly.timestamp.isoformat(),
            "evidence_count_env": len(env_evidence),
            "evidence_count_sensor": len(sensor_evidence),
            "model_outputs_available": len(model_evidence) > 0,
        },
    }
