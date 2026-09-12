import pytest
from datetime import datetime, timedelta
from app.anomaly.detectors import detect_out_of_range, detect_spike, detect_rate_change, detect_stale_value, detect_dropout
from app.anomaly.config import SENSOR_CONFIGS

def test_out_of_range():
    config = SENSOR_CONFIGS["temperature"]
    # Normal
    assert not detect_out_of_range(25.0, config)["is_anomaly"]
    # Out of range (high)
    res_high = detect_out_of_range(55.0, config)
    assert res_high["is_anomaly"]
    assert res_high["severity"] in ["HIGH", "CRITICAL"]
    assert res_high["anomaly_type"] == "OUT_OF_RANGE"
    # Out of range (low)
    res_low = detect_out_of_range(-5.0, config)
    assert res_low["is_anomaly"]

def test_spike_detection():
    history = [25.0, 25.1, 24.9, 25.0, 25.2, 25.1]
    
    # Normal reading
    assert not detect_spike(25.3, history)["is_anomaly"]
    
    # Sudden spike
    res_spike = detect_spike(40.0, history)
    assert res_spike["is_anomaly"]
    assert res_spike["anomaly_type"] == "SUDDEN_SPIKE"
    
    # Sudden drop
    res_drop = detect_spike(10.0, history)
    assert res_drop["is_anomaly"]
    assert res_drop["anomaly_type"] == "SUDDEN_DROP"

def test_rate_of_change():
    config = SENSOR_CONFIGS["temperature"]
    t1 = datetime.now()
    t2 = t1 + timedelta(minutes=1)
    
    # Normal rate (1 deg / min)
    assert not detect_rate_change(26.0, t2, 25.0, t1, config)["is_anomaly"]
    
    # Abnormal rate (5 deg / min)
    res_rate = detect_rate_change(30.0, t2, 25.0, t1, config)
    assert res_rate["is_anomaly"]
    assert res_rate["anomaly_type"] == "RATE_OF_CHANGE"

def test_stale_value():
    config = SENSOR_CONFIGS["temperature"]
    t0 = datetime.now()
    
    history_normal = [{"value": 25.0, "timestamp": t0}, {"value": 26.0, "timestamp": t0 + timedelta(minutes=15)}, {"value": 25.5, "timestamp": t0 + timedelta(minutes=31)}]
    assert not detect_stale_value(history_normal, t0 + timedelta(minutes=31), config)["is_anomaly"]
    
    history_stale = [{"value": 25.0, "timestamp": t0}, {"value": 25.0, "timestamp": t0 + timedelta(minutes=15)}, {"value": 25.0, "timestamp": t0 + timedelta(minutes=31)}]
    res_stale = detect_stale_value(history_stale, t0 + timedelta(minutes=31), config)
    assert res_stale["is_anomaly"]
    assert res_stale["anomaly_type"] == "STALE_VALUE"

def test_dropout():
    config = SENSOR_CONFIGS["temperature"]
    t0 = datetime.now()
    
    # Normal (5 min gap)
    assert not detect_dropout(t0, t0 + timedelta(minutes=5), config)["is_anomaly"]
    
    # Dropout (20 min gap)
    res_drop = detect_dropout(t0, t0 + timedelta(minutes=20), config)
    assert res_drop["is_anomaly"]
    assert res_drop["anomaly_type"] == "SENSOR_DROPOUT"

