from datetime import datetime
from ..config import SensorDetectionConfig

def detect_rate_change(current_val: float, current_time: datetime, prev_val: float, prev_time: datetime, config: SensorDetectionConfig):
    dt_minutes = (current_time - prev_time).total_seconds() / 60.0
    if dt_minutes <= 0:
        return {"is_anomaly": False} # Same timestamp
        
    rate = abs(current_val - prev_val) / dt_minutes
    
    if rate > config.max_rate_of_change_per_minute:
        severity = "HIGH" if rate > config.max_rate_of_change_per_minute * 2 else "MEDIUM"
        return {
            "is_anomaly": True,
            "anomaly_type": "RATE_OF_CHANGE",
            "severity": severity,
            "confidence_score": 0.90,
            "observed_value": rate,
            "expected_value": config.max_rate_of_change_per_minute,
            "deviation": rate - config.max_rate_of_change_per_minute,
            "description": f"Unrealistic rate of change: {rate:.2f} per min (max allowed: {config.max_rate_of_change_per_minute})"
        }
    return {"is_anomaly": False}
