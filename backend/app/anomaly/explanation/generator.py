from typing import Dict, Any, List, Tuple
from app.models import EvidenceStrength

CONTRIBUTING_THRESHOLD = 0.2
CONFIDENCE_THRESHOLDS = {
    EvidenceStrength.STRONG: 0.8,
    EvidenceStrength.MODERATE: 0.5,
    EvidenceStrength.WEAK: 0.2,
    EvidenceStrength.INSUFFICIENT: 0.0,
}

PENALTY_PER_QUALITY_NOTE = 0.10
MAX_QUALITY_PENALTY = 0.40
PENALTY_PER_UNCERTAINTY_NOTE = 0.05
MIN_CONFIDENCE_FLOOR = 0.1

def calculate_overall_confidence(factor_scores: Dict[str, float], data_quality_notes: List[str], contradicting_evidence: List[Dict[str, Any]] = None) -> float:
    if not factor_scores:
        return round(0.1, 2)
    max_score = max(factor_scores.values())
    confidence = max_score
    if data_quality_notes:
        penalty = min(len(data_quality_notes) * PENALTY_PER_QUALITY_NOTE, MAX_QUALITY_PENALTY)
        confidence -= penalty

    # Penalize for contradictory evidence
    if contradicting_evidence:
        penalty = min(len(contradicting_evidence) * 0.1, 0.4)
        confidence -= penalty

    confidence = max(confidence, MIN_CONFIDENCE_FLOOR)
    return round(confidence, 2)

def map_evidence_strength(confidence: float) -> EvidenceStrength:
    if confidence >= CONFIDENCE_THRESHOLDS[EvidenceStrength.STRONG]:
        return EvidenceStrength.STRONG
    elif confidence >= CONFIDENCE_THRESHOLDS[EvidenceStrength.MODERATE]:
        return EvidenceStrength.MODERATE
    elif confidence >= CONFIDENCE_THRESHOLDS[EvidenceStrength.WEAK]:
        return EvidenceStrength.WEAK
    return EvidenceStrength.INSUFFICIENT

def _generate_structured_narrative(
    correlated_data: Dict[str, Any],
    factor_scores: Dict[str, float],
    contributing_factors: List[Dict[str, Any]],
    confidence: float,
    evidence_strength: EvidenceStrength,
) -> str:
    bio_type = correlated_data.get("anomaly", {}).get("type", "BIOLOGICAL ANOMALY")
    bio_type_readable = bio_type.replace("_", " ").lower()
    primary = contributing_factors[0] if contributing_factors else None

    lines: List[str] = []
    lines.append(f"=== Biological Anomaly Explanation ===")
    lines.append(f"Anomaly Type: {bio_type_readable}")
    lines.append(f"Explanation Version: mechanistic-v1")
    lines.append(f"")

    if not contributing_factors:
        lines.append("A biological response anomaly was detected, but the available environmental")
        lines.append("and model evidence is insufficient to identify a dominant contributing factor.")
        lines.append(f"Confidence: {confidence:.2f} ({evidence_strength.value})")
        lines.append("")
        lines.append("Recommended Action: Review additional data sources or consider external")
        lines.append("factors (e.g., disease, contamination, unmonitored parameters).")
        return "\n".join(lines)

    if primary:
        lines.append(f"Primary Factor: {primary['factor'].capitalize()}")
        lines.append(f"Primary Score: {primary['score']:.2f}")
    else:
        lines.append("Primary Factor: None identified")

    lines.append("")
    lines.append("--- Contributing Factors (ranked by score) ---")
    for cf in contributing_factors:
        lines.append(f"  - {cf['factor'].capitalize()}: {cf['score']:.2f}")

    lines.append("")
    lines.append("--- Factor Analysis ---")
    for cf in contributing_factors:
        family_data = correlated_data.get("evidence_families", {}).get(cf["factor"], {})
        env_anoms = family_data.get("env_anomalies", [])
        sensor_anoms = family_data.get("sensor_anomalies", [])
        model_factor = family_data.get("model_factor")
        strength = family_data.get("evidence_strength", "NONE")
        lines.append(f"  {cf['factor'].capitalize()} (Score: {cf['score']:.2f}, Evidence Strength: {strength}):")
        if model_factor is not None:
            lines.append(f"    Model limitation factor: {model_factor:.2f}")
        if env_anoms:
            descriptions = "; ".join(a.get("description", "N/A") for a in env_anoms[:5])
            lines.append(f"    Environmental signals: {descriptions}")
        else:
            lines.append(f"    No direct environmental anomalies")
        if sensor_anoms:
            lines.append(f"    Sensor anomalies detected: {len(sensor_anoms)}")
        else:
            lines.append(f"    No sensor data quality issues")

    if len(contributing_factors) > 1:
        secondary = [f["factor"].lower() for f in contributing_factors[1:]]
        lines.append("")
        lines.append(f"Secondary contributors: {', '.join(secondary)}")

    lines.append("")
    lines.append(f"Overall Confidence: {confidence:.2f} ({evidence_strength.value})")
    return "\n".join(lines)

def generate_explanation(
    correlated_data: Dict[str, Any],
    factor_scores: Dict[str, float],
    data_quality_notes: List[str],
) -> Dict[str, Any]:
    bio_type = correlated_data.get("anomaly", {}).get("type", "")
    families = correlated_data.get("evidence_families", {})

    env_desc_parts: List[str] = []
    contradicting_evidence: List[Dict[str, Any]] = []
    supporting_evidence: List[Dict[str, Any]] = []

    for family, data in families.items():
        score = factor_scores.get(family, 0)
        if score >= CONTRIBUTING_THRESHOLD:
            supporting_evidence.append({
                "family": family,
                "model_factor": data.get("model_factor"),
                "evidence_strength": data.get("evidence_strength", "NONE"),
                "environmental_anomalies": [
                    {"type": a.get("type"), "severity": a.get("severity"), "description": a.get("description")}
                    for a in data.get("env_anomalies", [])
                ],
            })
            env_desc_parts.append(
                f"{family.replace('_', ' ').capitalize()}: score {score:.2f}, "
                f"evidence strength {data.get('evidence_strength', 'NONE')}"
            )
        elif score < CONTRIBUTING_THRESHOLD and data.get("model_factor") is not None and data["model_factor"] < 0.8:
            contradicting_evidence.append({
                "family": family,
                "model_factor": data["model_factor"],
                "reason": "Limitation factor indicates stress, but lacks environmental support or aligns poorly.",
            })

    confidence = calculate_overall_confidence(factor_scores, data_quality_notes, contradicting_evidence)
    evidence_strength = map_evidence_strength(confidence)

    contributing_factors: List[Dict[str, Any]] = []
    for factor, score in factor_scores.items():
        if score >= CONTRIBUTING_THRESHOLD:
            contributing_factors.append({"factor": factor, "score": score})
    contributing_factors.sort(key=lambda x: x["score"], reverse=True)

    primary_factor = contributing_factors[0]["factor"] if contributing_factors else None

    if not contributing_factors:
        summary = (
            "A biological anomaly was detected, but the available environmental "
            "and model evidence is insufficient to identify a dominant contributing factor."
        )
        details = _generate_structured_narrative(correlated_data, factor_scores, [], confidence, evidence_strength)
    else:
        primary = contributing_factors[0]
        secondary = [f["factor"].lower() for f in contributing_factors[1:]]
        if secondary:
            summary = (
                f"{primary['factor'].capitalize()} limitation is the strongest contributing factor "
                f"associated with the observed {bio_type.lower().replace('_', ' ')}. "
                f"Secondary contributors include: {', '.join(secondary)}."
            )
        else:
            summary = (
                f"{primary['factor'].capitalize()} limitation is the primary contributing factor "
                f"associated with the observed {bio_type.lower().replace('_', ' ')}."
            )
        details = _generate_structured_narrative(
            correlated_data, factor_scores, contributing_factors, confidence, evidence_strength
        )

    uncertainty_notes: List[str] = []
    if not contributing_factors and bio_type in ("GROWTH_SUPPRESSION", "BIOMASS_DECLINE", "BIOMASS_PLATEAU"):
        uncertainty_notes.append(
            "Biological suppression detected without clear environmental cause. "
            "Consider external factors (e.g., disease, contamination) or unmonitored parameters."
        )
    if not contributing_factors:
        uncertainty_notes.append(
            "No environmental or model factors exceeded the minimum contribution threshold."
        )
    if all(s == 0.0 for s in factor_scores.values()):
        uncertainty_notes.append("All factor scores are zero; evidence is purely speculative.")

    return {
        "summary": summary,
        "details": details,
        "primary_factor": primary_factor,
        "contributing_factors_json": contributing_factors,
        "supporting_evidence_json": supporting_evidence,
        "contradicting_evidence_json": contradicting_evidence,
        "confidence": confidence,
        "evidence_strength": evidence_strength.value,
        "data_quality_notes": data_quality_notes,
        "uncertainty_notes": uncertainty_notes,
    }
