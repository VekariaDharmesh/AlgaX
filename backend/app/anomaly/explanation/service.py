from typing import List, Optional
from sqlalchemy.orm import Session
from app import models
from app.models import EvidenceStrength

def get_explanations(
    db: Session,
    pond_id: Optional[str] = None,
    farm_id: Optional[str] = None,
    evidence_strength: Optional[EvidenceStrength] = None,
    limit: int = 100,
) -> List[models.AnomalyExplanation]:
    query = db.query(models.AnomalyExplanation)
    if pond_id:
        query = query.filter(models.AnomalyExplanation.pond_id == pond_id)
    if farm_id:
        query = query.filter(models.AnomalyExplanation.farm_id == farm_id)
    if evidence_strength:
        query = query.filter(models.AnomalyExplanation.evidence_strength == evidence_strength)
    return query.order_by(models.AnomalyExplanation.created_at.desc()).limit(limit).all()

def get_explanation_by_anomaly(db: Session, anomaly_id: str) -> Optional[models.AnomalyExplanation]:
    return db.query(models.AnomalyExplanation).filter(
        models.AnomalyExplanation.anomaly_id == anomaly_id
    ).first()

def regenerate_explanation(db: Session, anomaly: models.Anomaly) -> models.AnomalyExplanation:
    from . import generate_and_persist_explanation
    return generate_and_persist_explanation(db, anomaly)
