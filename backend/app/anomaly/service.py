from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import uuid

from .. import models
from .config import SENSOR_CONFIGS
from .detectors import (
    detect_out_of_range,
    detect_spike,
    detect_rate_change,
    detect_stale_value,
    detect_dropout
)

def run_sensor_anomaly_detection(db: Session, reading: models.SensorReading):
    """
    Called upon ingestion of a new sensor reading.
    Runs Phase 3.1 rules on the reading.
    """
    sensor_type = reading.sensor.type.value
    config = SENSOR_CONFIGS.get(sensor_type)
    if not config:
        return # unsupported sensor type

    # 1. Out of range
    res_range = detect_out_of_range(reading.value, config)
    if res_range["is_anomaly"]:
        persist_anomaly(db, reading, res_range)
        return # If it's physically out of range, don't bother checking spike/rate

    # 2. Get history (last 2 hours up to 20 readings)
    history_window = reading.timestamp - timedelta(hours=2)
    hist_readings = db.query(models.SensorReading).filter(
        models.SensorReading.sensor_id == reading.sensor_id,
        models.SensorReading.timestamp >= history_window,
        models.SensorReading.timestamp < reading.timestamp,
        models.SensorReading.quality_flag == models.QualityFlag.ok
    ).order_by(models.SensorReading.timestamp.desc()).limit(20).all()

    # Need ascending order for time-based analysis
    hist_readings.reverse()

    if hist_readings:
        # Rate of change (compare to immediate previous)
        prev_reading = hist_readings[-1]
        res_rate = detect_rate_change(
            reading.value, reading.timestamp, 
            prev_reading.value, prev_reading.timestamp, config
        )
        if res_rate["is_anomaly"]:
            persist_anomaly(db, reading, res_rate)
            return

        # Spike detection
        history_vals = [r.value for r in hist_readings]
        res_spike = detect_spike(reading.value, history_vals)
        if res_spike["is_anomaly"]:
            persist_anomaly(db, reading, res_spike)
            return

        # Stale value
        stale_history = [{"value": r.value, "timestamp": r.timestamp} for r in hist_readings]
        stale_history.append({"value": reading.value, "timestamp": reading.timestamp})
        res_stale = detect_stale_value(stale_history, reading.timestamp, config)
        if res_stale["is_anomaly"]:
            persist_anomaly(db, reading, res_stale)
            return

    # If we reached here, no anomaly was detected!
    from .resolver import resolve_open_anomalies
    resolve_open_anomalies(db, reading.sensor_id, reading.timestamp)

def check_for_dropouts(db: Session, current_time: datetime = None):
    """
    Called periodically (e.g. by scheduler) to check for missing data.
    """
    if current_time is None:
        current_time = datetime.now(timezone.utc)
        
    sensors = db.query(models.Sensor).all()
    for s in sensors:
        config = SENSOR_CONFIGS.get(s.type.value)
        if not config: continue
            
        last_reading = db.query(models.SensorReading).filter(
            models.SensorReading.sensor_id == s.id
        ).order_by(models.SensorReading.timestamp.desc()).first()
        
        if last_reading:
            res_drop = detect_dropout(last_reading.timestamp, current_time, config)
            if res_drop["is_anomaly"]:
                # Check if we already have an open dropout anomaly for this sensor
                open_anomaly = db.query(models.Anomaly).filter(
                    models.Anomaly.sensor_id == s.id,
                    models.Anomaly.anomaly_type == models.AnomalyType.SENSOR_DROPOUT,
                    models.Anomaly.status == models.AnomalyStatus.OPEN
                ).first()
                if not open_anomaly:
                    anomaly = models.Anomaly(
                        pond_id=s.pond_id,
                        sensor_id=s.id,
                        sensor_type=s.type.value,
                        timestamp=current_time,
                        anomaly_type=res_drop["anomaly_type"],
                        severity=res_drop["severity"],
                        confidence_score=res_drop["confidence_score"],
                        observed_value=res_drop["observed_value"],
                        expected_value=res_drop["expected_value"],
                        deviation=res_drop["deviation"],
                        description=res_drop["description"],
                        source_provenance="anomaly_engine_dropout"
                    )
                    db.add(anomaly)
                    db.commit()
        else:
            # No data at all ever
            pass

def persist_anomaly(db: Session, reading: models.SensorReading, result: dict):
    # Check if similar OPEN anomaly exists to prevent duplicates
    existing = db.query(models.Anomaly).filter(
        models.Anomaly.sensor_id == reading.sensor_id,
        models.Anomaly.anomaly_type == result["anomaly_type"],
        models.Anomaly.status == models.AnomalyStatus.OPEN
    ).first()
    
    if existing:
        # Update it (duration extends)
        existing.observed_value = result["observed_value"]
        existing.timestamp = reading.timestamp
    else:
        anomaly = models.Anomaly(
            pond_id=reading.pond_id,
            sensor_id=reading.sensor_id,
            sensor_type=reading.sensor.type.value,
            timestamp=reading.timestamp,
            anomaly_type=result["anomaly_type"],
            severity=result["severity"],
            confidence_score=result["confidence_score"],
            observed_value=result.get("observed_value"),
            expected_value=result.get("expected_value"),
            deviation=result.get("deviation"),
            description=result["description"],
            source_provenance="anomaly_engine_sensor"
        )
        db.add(anomaly)
        
    db.commit()

def persist_environmental_anomaly(db: Session, pond_id: str, timestamp: datetime, result: dict):
    # Check if similar OPEN anomaly exists
    existing = db.query(models.Anomaly).filter(
        models.Anomaly.pond_id == pond_id,
        models.Anomaly.anomaly_type == result["type"],
        models.Anomaly.status == models.AnomalyStatus.OPEN,
        models.Anomaly.source_provenance == "environmental_engine"
    ).first()
    
    if existing:
        existing.observed_value = result["observed"]
        existing.timestamp = timestamp
        existing.description = result["description"]
    else:
        anomaly = models.Anomaly(
            pond_id=pond_id,
            sensor_id=None, # Environmental anomalies apply to the pond, not a specific sensor
            sensor_type=None,
            timestamp=timestamp,
            anomaly_type=result["type"],
            severity=result["severity"],
            confidence_score=result["confidence"],
            observed_value=result["observed"],
            expected_value=result["expected"],
            deviation=result["observed"] - result["expected"],
            description=result["description"],
            source_provenance="environmental_engine"
        )
        db.add(anomaly)
    db.commit()

def resolve_environmental_anomalies(db: Session, pond_id: str, timestamp: datetime, active_types: set):
    """
    Resolve environmental anomalies that are OPEN but not in active_types.
    """
    open_anomalies = db.query(models.Anomaly).filter(
        models.Anomaly.pond_id == pond_id,
        models.Anomaly.status == models.AnomalyStatus.OPEN,
        models.Anomaly.source_provenance == "environmental_engine"
    ).all()
    
    for a in open_anomalies:
        if a.anomaly_type.value not in active_types:
            a.status = models.AnomalyStatus.RESOLVED
            a.resolved_at = timestamp
            
    if open_anomalies:
        db.commit()

def persist_biological_anomaly(db: Session, pond_id: str, timestamp: datetime, result: dict):
    # Check if similar OPEN anomaly exists
    existing = db.query(models.Anomaly).filter(
        models.Anomaly.pond_id == pond_id,
        models.Anomaly.anomaly_type == result["type"],
        models.Anomaly.status == models.AnomalyStatus.OPEN,
        models.Anomaly.source_provenance == "biological_engine"
    ).first()
    
    if existing:
        existing.observed_value = result["observed"]
        existing.timestamp = timestamp
        existing.description = result["description"]
        existing.explanation = result.get("evidence", {}) # Store evidence in JSON explanation field for now
    else:
        anomaly = models.Anomaly(
            pond_id=pond_id,
            sensor_id=None,
            sensor_type=None,
            timestamp=timestamp,
            anomaly_type=result["type"],
            severity=result["severity"],
            confidence_score=result["confidence"],
            observed_value=result["observed"],
            expected_value=result["expected"],
            deviation=result["observed"] - result["expected"],
            description=result["description"],
            source_provenance="biological_engine",
            explanation=result.get("evidence", {})
        )
        db.add(anomaly)
    db.commit()
    
    # Phase 3.4 - Trigger Explanation Engine
    from .explanation import generate_and_persist_explanation
    generate_and_persist_explanation(db, existing if existing else anomaly)

def resolve_biological_anomalies(db: Session, pond_id: str, timestamp: datetime, active_types: set):
    open_anomalies = db.query(models.Anomaly).filter(
        models.Anomaly.pond_id == pond_id,
        models.Anomaly.status == models.AnomalyStatus.OPEN,
        models.Anomaly.source_provenance == "biological_engine"
    ).all()
    
    for a in open_anomalies:
        if a.anomaly_type.value not in active_types:
            a.status = models.AnomalyStatus.RESOLVED
            a.resolved_at = timestamp
            
    if open_anomalies:
        db.commit()
