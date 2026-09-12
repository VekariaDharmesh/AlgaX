from typing import Dict, Any, Tuple, Optional, List

SEVERITY_WEIGHTS: Dict[str, float] = {
    "LOW": 0.3,
    "MEDIUM": 0.5,
    "HIGH": 0.8,
    "CRITICAL": 1.0,
}

DEFAULT_SEVERITY = "MEDIUM"

BIO_LOGICAL_ALIGNMENT: Dict[str, set] = {
    "GROWTH_SUPPRESSION": {"TEMPERATURE", "NITROGEN", "OXYGEN", "PH", "LIGHT"},
    "BIOMASS_DECLINE": {"TEMPERATURE", "NITROGEN", "OXYGEN", "PH", "LIGHT"},
    "BIOMASS_PLATEAU": {"NITROGEN", "PH", "LIGHT", "TEMPERATURE"},
    "GROWTH_ACCELERATION": {"NITROGEN", "LIGHT", "TEMPERATURE"},
    "BIOMASS_DEVIATION": {"TEMPERATURE", "NITROGEN", "PH", "OXYGEN", "LIGHT"},
    "EXPECTED_GROWTH_MISMATCH": {"TEMPERATURE", "NITROGEN", "PH", "OXYGEN", "LIGHT"},
    "BIOLOGICAL_RESPONSE_MISMATCH": set(),
}

STRESS_BIO_TYPES = {
    "GROWTH_SUPPRESSION", "BIOMASS_DECLINE", "BIOMASS_PLATEAU",
    "BIOMASS_DEVIATION", "EXPECTED_GROWTH_MISMATCH", "BIOLOGICAL_RESPONSE_MISMATCH",
}

def _map_severity_to_weight(severity: str) -> float:
    return SEVERITY_WEIGHTS.get(severity.upper(), SEVERITY_WEIGHTS[DEFAULT_SEVERITY])

def _calculate_mechanistic_score(evidence: Dict[str, Any]) -> Tuple[float, List[str]]:
    model_factor: Optional[float] = evidence.get("model_factor")
    notes: List[str] = []
    if model_factor is not None:
        score = 1.0 - model_factor
        notes.append(f"Model limitation factor: {model_factor:.2f} (mechanistic score: {score:.2f})")
        return round(max(0.0, min(1.0, score)), 3), notes
    notes.append("No Phase 2 model factor available for this family")
    return 0.0, notes

def _calculate_environmental_score(env_anomalies: List[Dict], analysis_start, analysis_end) -> Tuple[float, List[str]]:
    notes: List[str] = []
    if not env_anomalies:
        return 0.0, ["No environmental anomalies in this family"]
    max_weight = 0.0
    severities = [a.get("severity", DEFAULT_SEVERITY) for a in env_anomalies]
    max_weight = max(_map_severity_to_weight(s) for s in severities)
    notes.append(f"Environmental anomaly(s): {len(env_anomalies)}, strongest severity weight: {max_weight}")
    return round(max_weight, 3), notes

def _calculate_data_quality_penalty(sensor_anomalies: List[Dict]) -> Tuple[float, List[str]]:
    notes: List[str] = []
    if not sensor_anomalies:
        return 1.0, ["Sensor data quality: OK"]
    penalty = 0.5
    notes.append(f"Sensor data quality penalty ({len(sensor_anomalies)} anomaly(s)): {penalty}")
    return penalty, notes

def _calculate_biological_alignment(bio_type: str, family: str) -> Tuple[float, List[str]]:
    notes: List[str] = []
    alignment = BIO_LOGICAL_ALIGNMENT.get(bio_type, set())
    if family in alignment:
        notes.append(f"Biological alignment: {family} is aligned with {bio_type}")
        return 1.0, notes
    if bio_type in STRESS_BIO_TYPES and family in BIO_LOGICAL_ALIGNMENT.get("GROWTH_SUPPRESSION", set()):
        notes.append(f"Biological alignment: {family} is a general stress factor for {bio_type}")
        return 1.0, notes
    notes.append(f"Biological alignment penalty: {family} does not align with {bio_type}")
    return 0.1, notes

def _calculate_temporal_alignment(anomaly_time, family_evidence_times: List[Any]) -> Tuple[float, List[str]]:
    notes: List[str] = []
    if not family_evidence_times or anomaly_time is None:
        return 1.0, ["Temporal alignment: no timing data, using neutral weight"]
    from datetime import datetime
    if isinstance(anomaly_time, str):
        try:
            anomaly_time = datetime.fromisoformat(anomaly_time.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return 1.0, ["Temporal alignment: could not parse anomaly time"]
    valid_times = []
    for t in family_evidence_times:
        if t is None:
            continue
        if isinstance(t, str):
            try:
                parsed = datetime.fromisoformat(t.replace("Z", "+00:00"))
                valid_times.append(parsed)
            except (ValueError, TypeError):
                continue
        elif isinstance(t, datetime):
            valid_times.append(t)
    if not valid_times:
        return 1.0, ["Temporal alignment: no valid family evidence times"]
    time_deltas = [abs((t - anomaly_time).total_seconds() / 3600.0) for t in valid_times]
    avg_offset = sum(time_deltas) / len(time_deltas)
    if avg_offset <= 0.5:
        weight = 1.0
    elif avg_offset <= 2.0:
        weight = 0.8
    elif avg_offset <= 4.0:
        weight = 0.5
    else:
        weight = 0.2
    notes.append(f"Temporal alignment: avg offset {avg_offset:.2f}h, weight {weight}")
    return weight, notes

def score_factors(correlated_data: Dict[str, Any]) -> Tuple[Dict[str, float], List[str]]:
    scores: Dict[str, float] = {}
    quality_notes: List[str] = []
    families = correlated_data.get("evidence_families", {})
    bio_anomaly = correlated_data.get("anomaly", {})
    bio_type = bio_anomaly.get("type", "")
    anomaly_time = bio_anomaly.get("timestamp")
    for family, evidence in families.items():
        mech_score, mech_notes = _calculate_mechanistic_score(evidence)
        env_score, env_notes = _calculate_environmental_score(
            evidence.get("env_anomalies", []),
            correlated_data.get("analysis_start"),
            correlated_data.get("analysis_end"),
        )
        dq_penalty, dq_notes = _calculate_data_quality_penalty(evidence.get("sensor_anomalies", []))
        align_mult, align_notes = _calculate_biological_alignment(bio_type, family)
        all_family_times = [a.get("timestamp") for a in evidence.get("env_anomalies", [])] + \
                          [a.get("timestamp") for a in evidence.get("sensor_anomalies", [])]
        temporal_mult, temporal_notes = _calculate_temporal_alignment(anomaly_time, all_family_times)
        if env_anomalies_present := evidence.get("env_anomalies", []):
            base_score = (mech_score * 0.45) + (env_score * 0.45) + (max(mech_score, env_score) * 0.10)
        else:
            base_score = mech_score * 0.70
        final_score = base_score * dq_penalty * align_mult * temporal_mult
        final_score = round(max(0.0, min(1.0, final_score)), 3)
        scores[family] = final_score
        quality_notes.append(f"[{family}] " + " | ".join(mech_notes + env_notes + dq_notes + align_notes + temporal_notes))
    correlated_data["factor_scores"] = scores
    return scores, quality_notes
