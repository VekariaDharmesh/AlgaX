from sqlalchemy.orm import Session
from app import models
from .collector import collect_evidence
from .correlator import correlate_evidence
from .scorer import score_factors
from .generator import generate_explanation

EXPLANATION_VERSION = "mechanistic-v1"

def generate_and_persist_explanation(db: Session, biological_anomaly: models.Anomaly):
    """
    Main entry point for Phase 3.4.
    Collects evidence, correlates it, scores mechanistic factors, generates an explanation,
    and persists it to the database.
    """
    # 1. Collect Evidence
    raw_data = collect_evidence(db, biological_anomaly, window_hours=4.0)
    
    # 2. Correlate Evidence
    correlated_data = correlate_evidence(raw_data)
    
    # 3. Score Factors
    factor_scores, quality_notes = score_factors(correlated_data)
    
    # 4. Generate Explanation
    explanation_result = generate_explanation(correlated_data, factor_scores, quality_notes)
    
    # 5. Persist
    # Check if one already exists
    existing = db.query(models.AnomalyExplanation).filter(
        models.AnomalyExplanation.anomaly_id == biological_anomaly.id
    ).first()
    
    if not existing:
        model_outputs = raw_data.get("model_outputs", {})
        
        explanation_record = models.AnomalyExplanation(
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
            model_run_id=model_outputs.get("model_run_id"),
            model_version=model_outputs.get("model_version", "unknown"),
            explanation_version=EXPLANATION_VERSION,
            data_quality_notes=explanation_result["data_quality_notes"],
            uncertainty_notes=explanation_result["uncertainty_notes"]
        )
        db.add(explanation_record)
        db.commit()
