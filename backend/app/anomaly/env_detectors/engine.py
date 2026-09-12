from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app import models
from .config import ENV_CONFIG
import statistics

def check_environmental_anomalies(db: Session, pond_id: str, current_time: datetime):
    """
    Evaluates the environmental state of the pond using recent telemetry.
    """
    window_start = current_time - timedelta(minutes=ENV_CONFIG.persistence_minutes)
    
    # 1. Fetch recent readings
    readings = db.query(models.SensorReading).join(models.Sensor).filter(
        models.SensorReading.pond_id == pond_id,
        models.SensorReading.timestamp >= window_start,
        models.SensorReading.timestamp <= current_time,
        models.SensorReading.quality_flag == models.QualityFlag.ok
    ).all()
    
    if not readings:
        return
        
    # Get all sensors in the pond with OPEN sensor anomalies
    bad_sensors = set(
        a.sensor_id for a in db.query(models.Anomaly.sensor_id).filter(
            models.Anomaly.pond_id == pond_id,
            models.Anomaly.status == models.AnomalyStatus.OPEN,
            models.Anomaly.source_provenance == "anomaly_engine_sensor"
        ).all() if a.sensor_id is not None
    )
        
    # Group by sensor type, ignoring bad sensors
    data_by_type = {}
    for r in readings:
        if r.sensor_id in bad_sensors:
            continue
            
        stype = r.sensor.type.value
        if stype not in data_by_type:
            data_by_type[stype] = []
        data_by_type[stype].append(r)
        
    for k in data_by_type:
        data_by_type[k].sort(key=lambda x: x.timestamp)
        
    # Calculate averages and trends
    stats = {}
    for stype, vals in data_by_type.items():
        if len(vals) < 3:
            continue # insufficient history
        avg_val = sum(x.value for x in vals) / len(vals)
        start_val = vals[0].value
        end_val = vals[-1].value
        dt_minutes = (vals[-1].timestamp - vals[0].timestamp).total_seconds() / 60.0
        
        rate = (end_val - start_val) / dt_minutes if dt_minutes > 0 else 0
        stats[stype] = {
            "avg": avg_val,
            "rate": rate,
            "current": end_val,
            "count": len(vals)
        }
        
    anomalies = []
    
    # Check 1: Temperature Stress
    if "temperature" in stats:
        t_stat = stats["temperature"]
        if t_stat["avg"] >= ENV_CONFIG.high_temp_threshold:
            anomalies.append({
                "type": "TEMPERATURE_STRESS",
                "severity": "HIGH",
                "confidence": 0.90,
                "description": f"Sustained high temperature detected (Avg: {t_stat['avg']:.1f}°C)",
                "observed": t_stat["avg"],
                "expected": ENV_CONFIG.high_temp_threshold
            })
            
    # Check 2: Oxygen Stress (often happens at night or high temp)
    if "dissolved_oxygen" in stats:
        do_stat = stats["dissolved_oxygen"]
        
        # Determine diurnal context
        is_night = False
        if "light" in stats and stats["light"]["avg"] < 10.0:
            is_night = True
            
        do_threshold = ENV_CONFIG.low_do_threshold
        if is_night:
            # Expected to be lower at night
            do_threshold = ENV_CONFIG.low_do_threshold - 1.0
            
        if do_stat["avg"] <= do_threshold:
            anomalies.append({
                "type": "OXYGEN_STRESS",
                "severity": "CRITICAL" if do_stat["avg"] < do_threshold - 2.0 else "HIGH",
                "confidence": 0.95,
                "description": f"Sustained low dissolved oxygen ({'Night' if is_night else 'Day'}) (Avg: {do_stat['avg']:.2f} mg/L)",
                "observed": do_stat["avg"],
                "expected": do_threshold
            })
            
    # Check 3: Nutrient Depletion
    if "nitrogen" in stats:
        n_stat = stats["nitrogen"]
        if n_stat["avg"] <= ENV_CONFIG.low_nitrogen_threshold:
            anomalies.append({
                "type": "NUTRIENT_DEPLETION",
                "severity": "MEDIUM",
                "confidence": 0.85,
                "description": f"Sustained low nitrogen levels (Avg: {n_stat['avg']:.4f})",
                "observed": n_stat["avg"],
                "expected": ENV_CONFIG.low_nitrogen_threshold
            })
            
    # Check 3b: pH Instability
    if "ph" in stats:
        ph_stat = stats["ph"]
        if ph_stat["avg"] >= ENV_CONFIG.ph_high_threshold or ph_stat["avg"] <= ENV_CONFIG.ph_low_threshold:
            anomalies.append({
                "type": "PH_INSTABILITY",
                "severity": "HIGH",
                "confidence": 0.90,
                "description": f"Sustained abnormal pH (Avg: {ph_stat['avg']:.2f})",
                "observed": ph_stat["avg"],
                "expected": 7.5
            })
        elif abs(ph_stat["rate"]) >= ENV_CONFIG.ph_trend_threshold:
            anomalies.append({
                "type": "PH_INSTABILITY",
                "severity": "MEDIUM",
                "confidence": 0.85,
                "description": f"Rapid pH drift (Rate: {ph_stat['rate']:.3f} per min)",
                "observed": ph_stat["rate"],
                "expected": 0.0
            })
            
    # Check 4: Environmental Combination (Heat + Low DO)
    if "temperature" in stats and "dissolved_oxygen" in stats:
        if stats["temperature"]["avg"] >= 33.0 and stats["dissolved_oxygen"]["avg"] <= 5.0:
            anomalies.append({
                "type": "ENVIRONMENTAL_COMBINATION",
                "severity": "CRITICAL",
                "confidence": 0.95,
                "description": f"Combined Heat and Oxygen stress. T={stats['temperature']['avg']:.1f}°C, DO={stats['dissolved_oxygen']['avg']:.1f}mg/L",
                "observed": stats["temperature"]["avg"],
                "expected": 30.0
            })
            
    # Process anomalies
    from app.anomaly.service import persist_environmental_anomaly, resolve_environmental_anomalies
    
    active_types = set()
    for a in anomalies:
        active_types.add(a["type"])
        persist_environmental_anomaly(db, pond_id, current_time, a)
        
    # Resolve any open environmental anomalies that are no longer active
    resolve_environmental_anomalies(db, pond_id, current_time, active_types)
