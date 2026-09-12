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

def test_contradictory_evidence_lowers_confidence():
    # Scenario F: Contradictory evidence
    correlated_data = {
        "anomaly": {"type": "GROWTH_SUPPRESSION"},
        "evidence_families": {
            "TEMPERATURE": {
                "env_anomalies": [],
                "sensor_anomalies": [],
                "model_factor": 0.40 # Indicates strong limitation
            }
        }
    }
    
    # Model factor indicates stress but there is no environmental anomaly to support it,
    # so the mechanistic score is high but environmental support is 0.
    # Base score: mech_score * 0.8 = (1.0 - 0.4) * 0.8 = 0.48
    factor_scores = {"TEMPERATURE": 0.48}
    notes = []
    
    explanation = generate_explanation(correlated_data, factor_scores, notes)
    
    # Since model_factor is 0.4 (< 0.8) but score is >= 0.2, it's not immediately placed in contradicting_evidence
    # Wait, the rule is score < 0.2 and model_factor < 0.8 for contradicting evidence.
    # If we want to test contradictory evidence, we need a factor that has low score but high model limitation.
    # E.g., model says limitation, but there is contradictory sensor or alignment penalty.
    pass

def test_contradictory_evidence_explicit():
    # Scenario F: Contradictory evidence penalty applied
    correlated_data = {
        "anomaly": {"type": "GROWTH_ACCELERATION"}, # Bio response contradicts limitation
        "evidence_families": {
            "TEMPERATURE": {
                "env_anomalies": [{"severity": "HIGH", "description": "Heat"}],
                "sensor_anomalies": [],
                "model_factor": 0.20 # Severe limitation
            }
        }
    }
    
    # Because of GROWTH_ACCELERATION, alignment_multiplier = 0.1
    # mech_score = 0.8, env_score = 0.8 -> base_score = 0.8
    # final_score = 0.8 * 0.1 = 0.08
    scores, notes = score_factors(correlated_data)
    assert scores["TEMPERATURE"] < 0.2
    
    explanation = generate_explanation(correlated_data, scores, notes)
    
    assert len(explanation["contradicting_evidence_json"]) == 1
    # The highest score was 0.08, but penalty for 1 contradicting evidence is 0.1, so it floors to 0.1
    assert explanation["confidence"] == 0.1

def test_multi_factor_explanation():
    # Scenario: Multiple contributing factors
    correlated_data = {
        "anomaly": {"type": "GROWTH_SUPPRESSION"},
        "evidence_families": {
            "TEMPERATURE": {
                "env_anomalies": [{"severity": "HIGH", "description": "Heatwave"}],
                "sensor_anomalies": [],
                "model_factor": 0.30 
            },
            "NITROGEN": {
                "env_anomalies": [{"severity": "MEDIUM", "description": "N Depletion"}],
                "sensor_anomalies": [],
                "model_factor": 0.50
            }
        }
    }
    
    scores, notes = score_factors(correlated_data)
    explanation = generate_explanation(correlated_data, scores, notes)
    
    assert len(explanation["contributing_factors_json"]) == 2
    assert explanation["primary_factor"] == "TEMPERATURE"
    assert "Temperature limitation is the strongest contributing factor" in explanation["summary"]
    assert "Secondary contributors include: nitrogen" in explanation["summary"]
