from datetime import datetime
from ..config import SensorDetectionConfig

def detect_dropout(last_timestamp: datetime, current_time: datetime, config: SensorDetectionConfig):
    if not last_timestamp:
        return {"is_anomaly": False} # No previous data, can't be a dropout (just starting)
        
    duration = (current_time - last_timestamp).total_seconds() / 60.0
    
    if duration > config.dropout_duration_minutes:
        severity = "HIGH" if duration > config.dropout_duration_minutes * 4 else "MEDIUM"
        return {
            "is_anomaly": True,
            "anomaly_type": "SENSOR_DROPOUT",
            "severity": severity,
            "confidence_score": 0.98,
            "observed_value": duration,
            "expected_value": config.dropout_duration_minutes,
            "deviation": duration - config.dropout_duration_minutes,
            "description": f"No data received for {duration:.1f} minutes."
        }
    return {"is_anomaly": False}
