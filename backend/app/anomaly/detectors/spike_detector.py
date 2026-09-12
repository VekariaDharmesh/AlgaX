import statistics

def detect_spike(value: float, history: list[float]):
    if len(history) < 5:
        return {"is_anomaly": False} # Not enough history
        
    median = statistics.median(history)
    mad = statistics.median([abs(x - median) for x in history])
    
    if mad == 0:
        mad = 0.001 # Prevent division by zero
        
    z_score = abs(value - median) / mad
    
    # 0.6745 is the relationship between MAD and standard deviation for a normal distribution
    # modified_z = 0.6745 * (x - median) / mad
    modified_z = 0.6745 * z_score
    
    if modified_z > 5.0: # Very significant spike
        anomaly_type = "SUDDEN_SPIKE" if value > median else "SUDDEN_DROP"
        severity = "HIGH" if modified_z > 10.0 else "MEDIUM"
        confidence = min(0.99, 0.5 + (modified_z / 20.0))
        return {
            "is_anomaly": True,
            "anomaly_type": anomaly_type,
            "severity": severity,
            "confidence_score": round(confidence, 2),
            "observed_value": value,
            "expected_value": median,
            "deviation": value - median,
            "description": f"Detected {anomaly_type} (Modified Z-Score: {modified_z:.2f})"
        }
    return {"is_anomaly": False}
