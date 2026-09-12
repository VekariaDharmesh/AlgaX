from datetime import datetime
from ..config import SensorDetectionConfig

def detect_stale_value(history: list[dict], current_time: datetime, config: SensorDetectionConfig):
    # history is a list of {"value": float, "timestamp": datetime}
    if not history:
        return {"is_anomaly": False}
        
    duration = (current_time - history[0]["timestamp"]).total_seconds() / 60.0
    if duration < config.stale_duration_minutes:
        return {"is_anomaly": False} # Not enough time has passed to be considered stale
        
    values = [x["value"] for x in history]
    if len(values) < 3: # Require at least 3 readings to consider it stale
        return {"is_anomaly": False}
        
    val_range = max(values) - min(values)
    
    if val_range <= config.stale_tolerance:
        return {
            "is_anomaly": True,
            "anomaly_type": "STALE_VALUE",
            "severity": "MEDIUM",
            "confidence_score": 0.85,
            "observed_value": val_range,
            "expected_value": config.stale_tolerance,
            "deviation": 0.0,
            "description": f"Value has been perfectly flat for {duration:.1f} minutes."
        }
    return {"is_anomaly": False}
