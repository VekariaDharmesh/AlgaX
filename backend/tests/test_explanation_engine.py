import pytest
from datetime import datetime, timezone, timedelta
from app.anomaly.explanation.scorer import score_factors
from app.anomaly.explanation.generator import generate_explanation

def test_factor_scoring_healthy():
    # Scenario A - Healthy, but a biological anomaly triggered (e.g. slight mismatch)
    correlated_data = {
        "anomaly": {"type": "BIOMASS_DEVIATION"},
        "evidence_families": {
            "NITROGEN": {"env_anomalies": [], "sensor_anomalies": [], "model_factor": 0.95},
            "TEMPERATURE": {"env_anomalies": [], "sensor_anomalies": [], "model_factor": 0.90}
        }
    }
    
    scores, notes = score_factors(correlated_data)
    assert scores["NITROGEN"] < 0.1 # Very low score, factor is close to 1.0 (no limitation)
    assert scores["TEMPERATURE"] < 0.1

def test_factor_scoring_nitrogen_depletion():
    # Scenario B - Nitrogen depletion
    correlated_data = {
        "anomaly": {"type": "GROWTH_SUPPRESSION"},
        "evidence_families": {
            "NITROGEN": {
                "env_anomalies": [{"severity": "HIGH", "description": "Low N"}],
                "sensor_anomalies": [],
                "model_factor": 0.40 # High limitation
            },
            "TEMPERATURE": {"env_anomalies": [], "sensor_anomalies": [], "model_factor": 0.90}
        }
    }
    
    scores, notes = score_factors(correlated_data)
    assert scores["NITROGEN"] > 0.6 # High score
    assert scores["TEMPERATURE"] < 0.1

def test_factor_scoring_sensor_dropout():
    # Scenario E - Sensor Dropout penalty
    correlated_data = {
        "anomaly": {"type": "GROWTH_SUPPRESSION"},
        "evidence_families": {
            "NITROGEN": {
                "env_anomalies": [{"severity": "HIGH", "description": "Low N"}],
                "sensor_anomalies": [{"severity": "HIGH", "sensor_type": "nitrogen"}], # Penalty
                "model_factor": 0.40
            }
        }
    }
    
    scores, notes = score_factors(correlated_data)
    assert len(notes) == 1
    assert scores["NITROGEN"] > 0.2 and scores["NITROGEN"] < 0.5 # Should be halved by penalty

def test_explanation_generator():
    correlated_data = {
        "anomaly": {"type": "GROWTH_SUPPRESSION"},
        "evidence_families": {
            "NITROGEN": {
                "env_anomalies": [{"severity": "HIGH", "description": "Sustained low nitrogen"}],
                "sensor_anomalies": [],
                "model_factor": 0.40
            },
            "TEMPERATURE": {
                "env_anomalies": [],
                "sensor_anomalies": [],
                "model_factor": 0.90
            }
        }
    }
    
    factor_scores = {"NITROGEN": 0.68, "TEMPERATURE": 0.08}
    notes = []
    
    explanation = generate_explanation(correlated_data, factor_scores, notes)
    
    assert explanation["primary_factor"] == "NITROGEN"
    assert "Nitrogen limitation is the primary contributing factor" in explanation["summary"]
    assert len(explanation["contributing_factors_json"]) == 1 # Only Nitrogen is > 0.2
    assert explanation["confidence"] == 0.68
    assert explanation["evidence_strength"] == "MODERATE"
    
def test_explanation_no_evidence():
    correlated_data = {
        "anomaly": {"type": "BIOMASS_DECLINE"},
        "evidence_families": {
            "NITROGEN": {"env_anomalies": [], "sensor_anomalies": [], "model_factor": 0.99},
        }
    }
    factor_scores = {"NITROGEN": 0.01}
    notes = []
    explanation = generate_explanation(correlated_data, factor_scores, notes)
    
    assert explanation["primary_factor"] is None
    assert "insufficient to identify a dominant contributing factor" in explanation["summary"]
    assert explanation["confidence"] == 0.10
    assert explanation["evidence_strength"] == "INSUFFICIENT"
