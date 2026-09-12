from typing import Dict, Any, List

def calculate_overall_confidence(factor_scores: Dict[str, float], data_quality_notes: List[str]) -> float:
    if not factor_scores:
        return 0.0
    
    # Base confidence is derived from the strongest signal
    max_score = max(factor_scores.values())
    confidence = max_score
    
    # Penalize for widespread data quality issues
    if data_quality_notes:
        penalty = min(len(data_quality_notes) * 0.1, 0.4)
        confidence -= penalty
        
    return round(max(confidence, 0.1), 2)

def map_evidence_strength(confidence: float) -> str:
    if confidence >= 0.8:
        return "STRONG"
    elif confidence >= 0.5:
        return "MODERATE"
    elif confidence >= 0.2:
        return "WEAK"
    return "INSUFFICIENT"

def generate_explanation(correlated_data: Dict[str, Any], factor_scores: Dict[str, float], data_quality_notes: List[str]) -> Dict[str, Any]:
    confidence = calculate_overall_confidence(factor_scores, data_quality_notes)
    evidence_strength = map_evidence_strength(confidence)
    
    # Categorize factors
    contributing_factors = []
    for factor, score in factor_scores.items():
        if score >= 0.2:
            contributing_factors.append({"factor": factor, "score": score})
            
    contributing_factors.sort(key=lambda x: x["score"], reverse=True)
    
    primary_factor = contributing_factors[0]["factor"] if contributing_factors else None
    
    # Generate Summary
    bio_type = correlated_data["anomaly"]["type"]
    summary = f"A biological response mismatch ({bio_type}) was detected."
    
    if not contributing_factors:
        summary = "A biological anomaly was detected, but the available environmental and model evidence is insufficient to identify a dominant contributing factor."
        details = "Environmental conditions do not show a strong stress signal during the analysis window. Review recommended."
    else:
        primary = contributing_factors[0]
        if len(contributing_factors) > 1:
            secondary = [f["factor"].lower() for f in contributing_factors[1:]]
            summary = f"{primary['factor'].capitalize()} limitation is the strongest contributing factor associated with the observed {bio_type.lower().replace('_', ' ')}. Secondary contributors include {', '.join(secondary)}."
        else:
            summary = f"{primary['factor'].capitalize()} limitation is the primary contributing factor associated with the observed {bio_type.lower().replace('_', ' ')}."
            
        details_parts = []
        for cf in contributing_factors:
            f_name = cf["factor"]
            f_score = cf["score"]
            family_data = correlated_data["evidence_families"][f_name]
            
            env_anoms = [a["description"] for a in family_data["env_anomalies"]]
            mf = family_data["model_factor"]
            
            detail = f"- {f_name.capitalize()} (Score: {f_score:.2f}): "
            if mf is not None:
                detail += f"Model limitation factor was {mf:.2f}. "
            if env_anoms:
                detail += f"Environmental signals: {'; '.join(env_anoms)}."
            details_parts.append(detail)
            
        details = "\n".join(details_parts)
        
    # Collate raw supporting evidence for API
    supporting_evidence = []
    contradicting_evidence = []
    
    for family, data in correlated_data["evidence_families"].items():
        score = factor_scores.get(family, 0)
        if score >= 0.2:
            supporting_evidence.append({
                "family": family,
                "model_factor": data["model_factor"],
                "environmental_anomalies": data["env_anomalies"]
            })
        elif score < 0.2 and data["model_factor"] is not None and data["model_factor"] < 0.8:
             contradicting_evidence.append({
                "family": family,
                "reason": "Limitation factor indicates stress, but lacks environmental support or aligns poorly."
             })
             
    # Uncertainty
    uncertainty_notes = []
    if not contributing_factors and bio_type in ["GROWTH_SUPPRESSION", "BIOMASS_DECLINE"]:
        uncertainty_notes.append("Biological suppression detected without clear environmental cause. Consider external factors (e.g. disease, contamination) or unmonitored parameters.")
        
    return {
        "summary": summary,
        "details": details,
        "primary_factor": primary_factor,
        "contributing_factors_json": contributing_factors,
        "supporting_evidence_json": supporting_evidence,
        "contradicting_evidence_json": contradicting_evidence,
        "confidence": confidence,
        "evidence_strength": evidence_strength,
        "data_quality_notes": data_quality_notes,
        "uncertainty_notes": uncertainty_notes
    }
