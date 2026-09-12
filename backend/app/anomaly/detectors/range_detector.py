from ..config import SensorDetectionConfig

def detect_out_of_range(value: float, config: SensorDetectionConfig):
    if value < config.minimum_value or value > config.maximum_value:
        deviation = value - config.maximum_value if value > config.maximum_value else config.minimum_value - value
        severity = "CRITICAL" if deviation > (config.maximum_value - config.minimum_value) * 0.5 else "HIGH"
        return {
            "is_anomaly": True,
            "anomaly_type": "OUT_OF_RANGE",
            "severity": severity,
            "confidence_score": 0.95,
            "observed_value": value,
            "expected_value": config.maximum_value if value > config.maximum_value else config.minimum_value,
            "deviation": deviation,
            "description": f"Value {value} is out of physical range [{config.minimum_value}, {config.maximum_value}]"
        }
    return {"is_anomaly": False}
