import uuid
from sqlalchemy.orm import Session
from app import models
from .collector import collect_evidence
from .correlator import correlate_evidence
from .scorer import score_factors
from .generator import generate_explanation

EXPLANATION_VERSION = "mechanistic-v1"

def generate_and_persist_explanation(db: Session, biological_anomaly: models.Anomaly) -> models.AnomalyExplanation:
    raw_data = collect_evidence(db, biological_anomaly, window_hours=4.0)
    correlated_data = correlate_evidence(raw_data)
    factor_scores, quality_notes = score_factors(correlated_data)
    explanation_result = generate_explanation(correlated_data, factor_scores, quality_notes)

    model_outputs = raw_data.get("model_outputs", {})

    existing = db.query(models.AnomalyExplanation).filter(
        models.AnomalyExplanation.anomaly_id == biological_anomaly.id
    ).first()

    explanation_attrs = dict(
        anomaly_id=biological_anomaly.id,
        farm_id=biological_anomaly.farm_id,
        pond_id=biological_anomaly.pond_id,
        summary=explanation_result["summary"],
        details=explanation_result["details"],
        primary_factor=explanation_result["primary_factor"],
        contributing_factors_json=explanation_result["contributing_factors_json"],
        supporting_evidence_json=explanation_result["supporting_evidence_json"],
        contradicting_evidence_json=explanation_result["contradicting_evidence_json"],
        confidence=explanation_result["confidence"],
        evidence_strength=explanation_result["evidence_strength"],
        analysis_start=raw_data["analysis_start"],
        analysis_end=raw_data["analysis_end"],
        model_run_id=uuid.UUID(model_outputs["model_run_id"]) if model_outputs.get("model_run_id") and isinstance(model_outputs.get("model_run_id"), str) else model_outputs.get("model_run_id"),
        model_version=model_outputs.get("model_version", "unknown"),
        explanation_version=EXPLANATION_VERSION,
        data_quality_notes=explanation_result["data_quality_notes"],
        uncertainty_notes=explanation_result["uncertainty_notes"],
    )

    if existing:
        for key, value in explanation_attrs.items():
            setattr(existing, key, value)
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing
    else:
        explanation_record = models.AnomalyExplanation(**explanation_attrs)
        db.add(explanation_record)
        db.commit()
        db.refresh(explanation_record)
        return explanation_record
