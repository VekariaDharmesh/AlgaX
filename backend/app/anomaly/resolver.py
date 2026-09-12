from sqlalchemy.orm import Session
from datetime import datetime
from .. import models

def resolve_open_anomalies(db: Session, sensor_id: str, timestamp: datetime):
    open_anomalies = db.query(models.Anomaly).filter(
        models.Anomaly.sensor_id == sensor_id,
        models.Anomaly.status == models.AnomalyStatus.OPEN,
        models.Anomaly.anomaly_type.in_([
            models.AnomalyType.OUT_OF_RANGE,
            models.AnomalyType.SUDDEN_SPIKE,
            models.AnomalyType.SUDDEN_DROP,
            models.AnomalyType.RATE_OF_CHANGE,
            models.AnomalyType.STALE_VALUE,
            models.AnomalyType.SENSOR_DROPOUT
        ])
    ).all()
    
    for a in open_anomalies:
        a.status = models.AnomalyStatus.RESOLVED
        a.resolved_at = timestamp
        
    if open_anomalies:
        db.commit()
