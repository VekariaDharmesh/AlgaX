from typing import Dict, Any, List
from datetime import datetime

EVIDENCE_FAMILIES: Dict[str, List[str]] = {
    "TEMPERATURE": ["TEMPERATURE_STRESS", "temperature", "avg_temp_factor"],
    "NITROGEN": ["NUTRIENT_DEPLETION", "nitrogen", "avg_n_factor"],
    "OXYGEN": ["OXYGEN_STRESS", "dissolved_oxygen"],
    "PH": ["PH_INSTABILITY", "ph", "avg_ph_factor"],
    "LIGHT": ["LIGHT_ANOMALY", "light", "avg_light_factor"],
}

SEVERITY_RANK = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
SEVERITY_LABELS = {1: "LOW", 2: "MEDIUM", 3: "HIGH", 4: "CRITICAL"}

def _parse_dt(ts: Any) -> datetime | None:
    if ts is None:
        return None
    if isinstance(ts, datetime):
        return ts
    if isinstance(ts, str):
        try:
            return datetime.fromisoformat(ts.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return None
    return None

def correlate_evidence(collected_data: Dict[str, Any]) -> Dict[str, Any]:
    families: Dict[str, Any] = {}
    for family_name in EVIDENCE_FAMILIES:
        families[family_name] = {
            "env_anomalies": [],
            "sensor_anomalies": [],
            "model_factor": None,
            "evidence_strength": "NONE",
            "time_offsets": [],
        }

    env_anomalies = collected_data.get("environmental_anomalies", [])
    sensor_anomalies = collected_data.get("sensor_anomalies", [])
    model_data = collected_data.get("model_outputs", {})

    for ea in env_anomalies:
        ea_type = ea.get("type", "")
        matched = False
        for family, keys in EVIDENCE_FAMILIES.items():
            if ea_type in keys or ea_type == "ENVIRONMENTAL_COMBINATION":
                families[family]["env_anomalies"].append(ea)
                matched = True
                if ea_type == "ENVIRONMENTAL_COMBINATION":
                    if family not in ("TEMPERATURE", "OXYGEN"):
                        families["TEMPERATURE"]["env_anomalies"].append(ea)
                        families["OXYGEN"]["env_anomalies"].append(ea)
        if not matched:
            families["TEMPERATURE"]["env_anomalies"].append(ea)

    for sa in sensor_anomalies:
        stype = sa.get("sensor_type", "")
        for family, keys in EVIDENCE_FAMILIES.items():
            if stype in keys:
                families[family]["sensor_anomalies"].append(sa)

    if model_data:
        families["TEMPERATURE"]["model_factor"] = model_data.get("avg_temp_factor")
        families["NITROGEN"]["model_factor"] = model_data.get("avg_n_factor")
        families["PH"]["model_factor"] = model_data.get("avg_ph_factor")
        families["LIGHT"]["model_factor"] = model_data.get("avg_light_factor")

    anomaly_time = _parse_dt(collected_data.get("anomaly", {}).get("timestamp"))
    for family_name, evidence in families.items():
        all_ev_times = []
        for a in evidence.get("env_anomalies", []):
            t = _parse_dt(a.get("timestamp"))
            if t and anomaly_time:
                all_ev_times.append(abs((t - anomaly_time).total_seconds() / 3600.0))
        for a in evidence.get("sensor_anomalies", []):
            t = _parse_dt(a.get("timestamp"))
            if t and anomaly_time:
                all_ev_times.append(abs((t - anomaly_time).total_seconds() / 3600.0))
        evidence["time_offsets"] = all_ev_times
        evidence["evidence_strength"] = _compute_strength(evidence, families[family_name])

    collected_data["evidence_families"] = families
    return collected_data

def _compute_strength(evidence: Dict[str, Any], family_data: Dict[str, Any]) -> str:
    env_anoms = family_data.get("env_anomalies", [])
    sensor_anoms = family_data.get("sensor_anomalies", [])
    model_factor = family_data.get("model_factor")
    if env_anoms:
        max_sev = max((SEVERITY_RANK.get(a.get("severity", "LOW"), 1) for a in env_anoms), default=0)
    else:
        max_sev = 0
    has_sensor_issue = len(sensor_anoms) > 0
    model_is_limited = model_factor is not None and model_factor < 0.5
    if max_sev >= 3 or (model_is_limited and max_sev >= 2):
        return "STRONG"
    if max_sev >= 2 or (model_is_limited and not has_sensor_issue):
        return "MODERATE"
    if max_sev >= 1 or model_is_limited:
        return "WEAK"
    return "NONE"
