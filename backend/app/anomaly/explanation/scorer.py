from typing import Dict, Any, Tuple

def score_factors(correlated_data: Dict[str, Any]) -> Tuple[Dict[str, float], Dict[str, Any]]:
    """
    Calculates a mechanistic factor score (0.0 to 1.0) for each evidence family.
    Returns (scores, data_quality_notes)
    """
    families = correlated_data.get("evidence_families", {})
    bio_anomaly = correlated_data.get("anomaly", {})
    bio_type = bio_anomaly.get("type", "")
    
    scores = {}
    quality_notes = []
    
    for family, evidence in families.items():
        score = 0.0
        
        # 1. Mechanistic Limitation (Phase 2)
        model_factor = evidence.get("model_factor")
        mech_score = 0.0
        if model_factor is not None:
            # Factor is 0 (fully limited) to 1 (not limited). We want the inverse for scoring.
            mech_score = 1.0 - model_factor
        
        # 2. Environmental Support (Phase 3.2)
        env_score = 0.0
        env_anomalies = evidence.get("env_anomalies", [])
        if env_anomalies:
            # If there's a critical environmental anomaly, it strongly supports the factor
            max_severity = max([a.get("severity", "LOW") for a in env_anomalies], key=lambda s: {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}.get(s, 0))
            env_score = {"LOW": 0.2, "MEDIUM": 0.5, "HIGH": 0.8, "CRITICAL": 1.0}.get(max_severity, 0.0)
            
        # 3. Data Quality (Phase 3.1)
        sensor_anomalies = evidence.get("sensor_anomalies", [])
        quality_penalty = 1.0
        if sensor_anomalies:
            quality_penalty = 0.5 # Halve the score if sensors are acting up
            quality_notes.append(f"Recent {family.lower()} sensor anomalies degrade data quality confidence.")
            
        # 4. Biological Alignment (Does this factor explain the biological response?)
        alignment_multiplier = 1.0
        
        # Example alignment rules
        if bio_type in ["GROWTH_SUPPRESSION", "BIOMASS_DECLINE", "BIOMASS_PLATEAU"]:
            # These are stress responses. All limitation factors align with stress.
            pass
        elif bio_type == "GROWTH_ACCELERATION":
            # If growth accelerated, severe limitation doesn't make sense as a cause
            # It might be caused by a recovery of limitation, but that's complex.
            # We penalize limitation factors trying to explain acceleration.
            alignment_multiplier = 0.1
            
        # Combine
        if family == "OXYGEN":
            # Oxygen doesn't have a direct model factor in this version, rely entirely on environment
            base_score = env_score
        else:
            # Average mechanistic limitation and environmental support (if env exists, otherwise lean on mech)
            if env_anomalies:
                base_score = (mech_score * 0.6) + (env_score * 0.4)
            else:
                base_score = mech_score * 0.8 # Penalize slightly if no direct env anomaly supports it
                
        final_score = base_score * quality_penalty * alignment_multiplier
        scores[family] = round(min(max(final_score, 0.0), 1.0), 3)
        
    correlated_data["factor_scores"] = scores
    return scores, quality_notes
