from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app import models
from .config import BIO_CONFIG
import statistics

def check_biological_anomalies(db: Session, pond_id: str, current_time: datetime):
    window_start = current_time - timedelta(hours=BIO_CONFIG.observation_window_hours)
    
    # 1. Fetch Expected behavior (Phase 2 Model Estimates)
    estimates = db.query(models.BiomassEstimate).filter(
        models.BiomassEstimate.pond_id == pond_id,
        models.BiomassEstimate.timestamp >= window_start,
        models.BiomassEstimate.timestamp <= current_time
    ).order_by(models.BiomassEstimate.timestamp).all()
    
    if len(estimates) < 2:
        return
        
    expected_start = estimates[0].biomass_g_per_l
    expected_end = estimates[-1].biomass_g_per_l
    
    # Expected growth rate over the window
    # dt in hours
    dt_hours = (estimates[-1].timestamp - estimates[0].timestamp).total_seconds() / 3600.0
    if dt_hours <= 0:
        return
        
    expected_growth_rate = (expected_end - expected_start) / expected_start if expected_start > 0 else 0
    
    # 2. Fetch Observed behavior (Phase 1 Telemetry)
    # Get sensor ID for biomass
    biomass_sensor = db.query(models.Sensor).filter(
        models.Sensor.pond_id == pond_id,
        models.Sensor.type == "biomass"
    ).first()
    
    if not biomass_sensor:
        return
        
    readings = db.query(models.SensorReading).filter(
        models.SensorReading.sensor_id == biomass_sensor.id,
        models.SensorReading.timestamp >= window_start,
        models.SensorReading.timestamp <= current_time,
        models.SensorReading.quality_flag == models.QualityFlag.ok
    ).order_by(models.SensorReading.timestamp).all()
    
    if len(readings) < 2:
        return
        
    # Check if there is an OPEN sensor anomaly for biomass
    sensor_anomaly = db.query(models.Anomaly).filter(
        models.Anomaly.pond_id == pond_id,
        models.Anomaly.sensor_id == biomass_sensor.id,
        models.Anomaly.status == models.AnomalyStatus.OPEN,
        models.Anomaly.source_provenance == "anomaly_engine_sensor"
    ).first()
    
    # If the biomass sensor is broken, we cannot confidently detect biological anomalies
    if sensor_anomaly:
        return
        
    # We will use median filtering on rolling 15 min chunks to get a robust start/end
    # But for simplicity, we can just take the first few and last few readings
    observed_start = sum([r.value for r in readings[:3]]) / min(len(readings), 3)
    observed_end = sum([r.value for r in readings[-3:]]) / min(len(readings), 3)
    
    observed_growth_rate = (observed_end - observed_start) / observed_start if observed_start > 0 else 0
    
    # 3. Detect Anomalies
    anomalies = []
    
    # Relative Deviation
    relative_deviation = 0
    if expected_end > 0:
        relative_deviation = (observed_end - expected_end) / expected_end
        
    abs_deviation = observed_end - expected_end
    
    # Growth Suppression
    if relative_deviation <= BIO_CONFIG.suppression_threshold and abs_deviation <= -BIO_CONFIG.absolute_deviation_threshold:
        anomalies.append({
            "type": "GROWTH_SUPPRESSION",
            "severity": "HIGH",
            "confidence": 0.85,
            "description": f"Observed biomass is substantially below expected trajectory. Deviation: {relative_deviation*100:.1f}%.",
            "observed": observed_end,
            "expected": expected_end,
            "evidence": {
                "expected_growth": expected_growth_rate,
                "observed_growth": observed_growth_rate,
                "relative_deviation": relative_deviation
            }
        })
        
    # Growth Acceleration
    elif relative_deviation >= BIO_CONFIG.acceleration_threshold and abs_deviation >= BIO_CONFIG.absolute_deviation_threshold:
        anomalies.append({
            "type": "GROWTH_ACCELERATION",
            "severity": "MEDIUM",
            "confidence": 0.85,
            "description": f"Observed biomass is substantially above expected trajectory. Deviation: +{relative_deviation*100:.1f}%.",
            "observed": observed_end,
            "expected": expected_end,
            "evidence": {
                "expected_growth": expected_growth_rate,
                "observed_growth": observed_growth_rate,
                "relative_deviation": relative_deviation
            }
        })
        
    # Biomass Decline (Unexpected)
    if observed_growth_rate < -0.05 and expected_growth_rate > -0.01:
        # Check if it was a harvest event (assuming a harvest drops biomass by > 50% instantly)
        # But for now, if it's a gradual unexpected decline:
        if observed_end < observed_start * 0.5:
            # Likely a harvest, skip
            pass
        else:
            anomalies.append({
                "type": "BIOMASS_DECLINE",
                "severity": "CRITICAL",
                "confidence": 0.90,
                "description": f"Unexpected biomass decline detected. Model expected growth of {expected_growth_rate*100:.1f}% but observed decline of {observed_growth_rate*100:.1f}%.",
                "observed": observed_growth_rate,
                "expected": expected_growth_rate,
                "evidence": {
                    "expected_growth": expected_growth_rate,
                    "observed_growth": observed_growth_rate,
                    "relative_deviation": relative_deviation
                }
            })
            
    # Expected Growth Mismatch (e.g., Plateau)
    # If model expects decent growth but observed is flat
    if expected_growth_rate > 0.10 and abs(observed_growth_rate) < 0.02:
        anomalies.append({
            "type": "BIOMASS_PLATEAU",
            "severity": "HIGH",
            "confidence": 0.90,
            "description": f"Biomass plateaued despite environmental conditions expecting {expected_growth_rate*100:.1f}% growth.",
            "observed": observed_growth_rate,
            "expected": expected_growth_rate,
            "evidence": {
                "expected_growth": expected_growth_rate,
                "observed_growth": observed_growth_rate,
                "relative_deviation": relative_deviation
            }
        })
        
    # 4. Persistence
    from app.anomaly.service import persist_biological_anomaly, resolve_biological_anomalies
    
    active_types = set()
    for a in anomalies:
        active_types.add(a["type"])
        persist_biological_anomaly(db, pond_id, current_time, a)
        
    resolve_biological_anomalies(db, pond_id, current_time, active_types)
