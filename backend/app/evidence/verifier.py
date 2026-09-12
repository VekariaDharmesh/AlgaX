import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, Any, List

from .. import models

def format_iso_utc(dt: Any) -> str:
    """
    Converts any datetime (UTC, localized, or string) to a deterministic UTC ISO string (YYYY-MM-DDTHH:MM:SSZ).
    """
    if isinstance(dt, str):
        try:
            dt_parsed = datetime.fromisoformat(dt)
            return format_iso_utc(dt_parsed)
        except Exception:
            return dt

    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            dt_utc = dt.replace(tzinfo=timezone.utc)
        else:
            dt_utc = dt.astimezone(timezone.utc)
        return dt_utc.strftime('%Y-%m-%dT%H:%M:%SZ')

    return str(dt)

def canonicalize_element(val: Any) -> Any:
    """
    Recursively normalizes data structures for deterministic JSON hashing:
    - Dicts: sorts keys and normalizes values.
    - Lists: sorts list of dicts by 'id' or 'timestamp' if present for order stability.
    - Datetime strings: converts to ISO UTC string.
    - Floats: rounds to 6 decimal places.
    """
    if isinstance(val, dict):
        return {k: canonicalize_element(v) for k, v in sorted(val.items())}
    elif isinstance(val, list):
        normalized_list = [canonicalize_element(x) for x in val]
        if normalized_list and isinstance(normalized_list[0], dict):
            if "id" in normalized_list[0]:
                normalized_list.sort(key=lambda x: str(x.get("id", "")))
            elif "timestamp" in normalized_list[0]:
                normalized_list.sort(key=lambda x: str(x.get("timestamp", "")))
        return normalized_list
    elif isinstance(val, float):
        return round(val, 6)
    elif isinstance(val, datetime):
        return format_iso_utc(val)
    return val

def build_canonical_payload(pkg: models.EvidencePackage) -> Dict[str, Any]:
    """
    Builds the deterministic canonical dictionary for an EvidencePackage.
    Ensures stable key ordering, UTC ISO formatted dates, list sorting, and clean key structures.
    """
    raw_payload = {
        "farm_id": str(pkg.farm_id),
        "pond_id": str(pkg.pond_id),
        "reporting_period_start": format_iso_utc(pkg.reporting_period_start),
        "reporting_period_end": format_iso_utc(pkg.reporting_period_end),
        "package_version": pkg.package_version,
        "completeness": pkg.completeness.value if hasattr(pkg.completeness, "value") else str(pkg.completeness),
        "sensor_evidence": pkg.sensor_evidence_json or [],
        "model_evidence": pkg.model_evidence_json or [],
        "carbon_evidence": pkg.carbon_evidence_json or [],
        "anomaly_evidence": pkg.anomaly_evidence_json or [],
        "imagery_evidence": pkg.imagery_evidence_json or [],
        "cross_validation_evidence": pkg.cross_validation_evidence_json or [],
        "limitations": pkg.limitations_json or [],
        "contains_simulated_data": bool(pkg.contains_simulated_data)
    }
    if getattr(pkg, "harvest_evidence_json", None):
        raw_payload["harvest_evidence"] = pkg.harvest_evidence_json
    if getattr(pkg, "calibration_evidence_json", None):
        raw_payload["calibration_evidence"] = pkg.calibration_evidence_json
    return canonicalize_element(raw_payload)

def compute_canonical_hash(payload: Dict[str, Any]) -> str:
    """
    Computes deterministic SHA-256 digest from canonical payload.
    """
    canonical_str = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(canonical_str.encode('utf-8')).hexdigest()

def verify_package_hash(pkg: models.EvidencePackage) -> Dict[str, Any]:
    """
    Recomputes SHA-256 digest of package evidence content and compares with stored canonical_hash.
    
    IMPORTANT: This function is READ-ONLY and will NOT modify database state or overwrite stored hashes.
    """
    if not pkg:
        return {
            "package_id": None,
            "integrity_match": False,
            "stored_hash": "",
            "recomputed_hash": "",
            "status": "VERIFICATION_ERROR",
            "message": "Evidence package not found.",
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "sealed_at": None,
            "sealed_by": None
        }

    payload = build_canonical_payload(pkg)
    recomputed_hash = compute_canonical_hash(payload)
    stored_hash = (pkg.canonical_hash or "").strip().lower()
    is_match = (stored_hash == recomputed_hash.strip().lower()) if stored_hash else False

    if pkg.status != models.PackageStatus.SEALED:
        return {
            "package_id": str(pkg.id),
            "integrity_match": is_match,
            "stored_hash": stored_hash,
            "recomputed_hash": recomputed_hash,
            "status": "NOT_SEALED",
            "message": "Evidence package is unsealed — fingerprint check is preliminary.",
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "sealed_at": format_iso_utc(pkg.sealed_at) if pkg.sealed_at else None,
            "sealed_by": pkg.sealed_by
        }

    if pkg.completeness == models.CompletenessClassification.INSUFFICIENT_EVIDENCE:
        return {
            "package_id": str(pkg.id),
            "integrity_match": False,
            "stored_hash": pkg.canonical_hash or "",
            "recomputed_hash": "",
            "status": "INSUFFICIENT_DATA",
            "message": "Verification cannot be completed — evidence coverage is INSUFFICIENT_EVIDENCE.",
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "sealed_at": format_iso_utc(pkg.sealed_at) if pkg.sealed_at else None,
            "sealed_by": pkg.sealed_by
        }

    payload = build_canonical_payload(pkg)
    recomputed_hash = compute_canonical_hash(payload)
    stored_hash = (pkg.canonical_hash or "").strip().lower()

    is_match = (stored_hash == recomputed_hash.strip().lower())
    
    return {
        "package_id": str(pkg.id),
        "integrity_match": is_match,
        "stored_hash": stored_hash,
        "recomputed_hash": recomputed_hash,
        "status": "MATCH" if is_match else "MISMATCH",
        "message": (
            "Evidence integrity verified — package matches sealed SHA-256 fingerprint."
            if is_match else
            "INTEGRITY MISMATCH — current evidence content does not match sealed fingerprint."
        ),
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "sealed_at": format_iso_utc(pkg.sealed_at) if pkg.sealed_at else None,
        "sealed_by": pkg.sealed_by
    }
