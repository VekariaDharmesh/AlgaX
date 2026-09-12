import uuid
from typing import List, Optional, Union
from sqlalchemy.orm import Session
from app import models
from app.models import EvidenceStrength

def get_explanations(
    db: Session,
    pond_id: Optional[Union[str, uuid.UUID]] = None,
    farm_id: Optional[Union[str, uuid.UUID]] = None,
    evidence_strength: Optional[EvidenceStrength] = None,
    limit: int = 100,
) -> List[models.AnomalyExplanation]:
    query = db.query(models.AnomalyExplanation)
    if pond_id:
        p_id = uuid.UUID(str(pond_id)) if isinstance(pond_id, str) else pond_id
        query = query.filter(models.AnomalyExplanation.pond_id == p_id)
    if farm_id:
        f_id = uuid.UUID(str(farm_id)) if isinstance(farm_id, str) else farm_id
        query = query.filter(models.AnomalyExplanation.farm_id == f_id)
    if evidence_strength:
        query = query.filter(models.AnomalyExplanation.evidence_strength == evidence_strength)
    return query.order_by(models.AnomalyExplanation.created_at.desc()).limit(limit).all()

def get_explanation_by_anomaly(db: Session, anomaly_id: Union[str, uuid.UUID]) -> Optional[models.AnomalyExplanation]:
    a_id = uuid.UUID(str(anomaly_id)) if isinstance(anomaly_id, str) else anomaly_id
    return db.query(models.AnomalyExplanation).filter(
        models.AnomalyExplanation.anomaly_id == a_id
    ).first()

def regenerate_explanation(db: Session, anomaly: models.Anomaly) -> models.AnomalyExplanation:
    from . import generate_and_persist_explanation
    return generate_and_persist_explanation(db, anomaly)
