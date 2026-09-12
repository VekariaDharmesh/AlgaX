from typing import Dict, Any, List

EVIDENCE_FAMILIES = {
    "TEMPERATURE": ["TEMPERATURE_STRESS", "temperature", "avg_temp_factor"],
    "NITROGEN": ["NUTRIENT_DEPLETION", "nitrogen", "avg_n_factor"],
    "OXYGEN": ["OXYGEN_STRESS", "dissolved_oxygen"],
    "PH": ["PH_INSTABILITY", "ph", "avg_ph_factor"],
    "LIGHT": ["LIGHT_ANOMALY", "light", "avg_light_factor"],
}

def correlate_evidence(collected_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Groups collected evidence into evidence families to prevent double counting.
    """
    families = {
        "TEMPERATURE": {"env_anomalies": [], "sensor_anomalies": [], "model_factor": None},
        "NITROGEN": {"env_anomalies": [], "sensor_anomalies": [], "model_factor": None},
        "OXYGEN": {"env_anomalies": [], "sensor_anomalies": [], "model_factor": None},
        "PH": {"env_anomalies": [], "sensor_anomalies": [], "model_factor": None},
        "LIGHT": {"env_anomalies": [], "sensor_anomalies": [], "model_factor": None},
    }
    
    # Map Environmental Anomalies
    for ea in collected_data.get("environmental_anomalies", []):
        for family, keys in EVIDENCE_FAMILIES.items():
            if ea["type"] in keys or ea["type"] == "ENVIRONMENTAL_COMBINATION":
                # Rough matching for combination
                if ea["type"] == "ENVIRONMENTAL_COMBINATION":
                    if family in ["TEMPERATURE", "OXYGEN"]:
                        families[family]["env_anomalies"].append(ea)
                else:
                    families[family]["env_anomalies"].append(ea)
    
    # Map Sensor Anomalies
    for sa in collected_data.get("sensor_anomalies", []):
        stype = sa["sensor_type"]
        for family, keys in EVIDENCE_FAMILIES.items():
            if stype in keys:
                families[family]["sensor_anomalies"].append(sa)
                
    # Map Model Factors
    model_data = collected_data.get("model_outputs", {})
    if model_data:
        families["TEMPERATURE"]["model_factor"] = model_data.get("avg_temp_factor")
        families["NITROGEN"]["model_factor"] = model_data.get("avg_n_factor")
        families["PH"]["model_factor"] = model_data.get("avg_ph_factor")
        families["LIGHT"]["model_factor"] = model_data.get("avg_light_factor")
        # Oxygen doesn't have a direct limitation factor in Phase 2
        
    collected_data["evidence_families"] = families
    return collected_data
