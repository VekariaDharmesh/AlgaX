"""Phase 3.3 — Biological Anomaly Detection Engine.

Compares Phase 2 model-derived expected biomass against Phase 1 simulated
biomass telemetry over a rolling observation window.

Key design decisions:
  * "Expected" = BiomassEstimate from Phase 2 growth model.
  * "Observed" = SensorReading from the biomass sensor (which is virtual/simulated
    in this test-bed — provenance is preserved via source_type on the reading and
    is_simulated on the sensor).
  * Severity is graduated based on deviation magnitude — not hardcoded.
  * Confidence scales with the number of available readings.
  * If the biomass sensor has an OPEN Phase 3.1 anomaly, biological detection
    is suppressed (we cannot trust the input).
  * A sudden large drop (> harvest_drop_ratio) is treated as a likely harvest
    event and excluded from BIOMASS_DECLINE.
  * This module does NOT generate causal explanations (Phase 3.4).
    It stores structured evidence for later interpretation.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Set

from sqlalchemy.orm import Session

from app import models
from .config import BIO_CONFIG


# ---------------------------------------------------------------------------
# Pure helper functions (no DB, no side effects — testable in isolation)
# ---------------------------------------------------------------------------

def calculate_graduated_severity(abs_relative_deviation: float) -> str:
    """Map |relative_deviation| to a severity level.

    Returns a string matching AnomalySeverity enum values.
    """
    d = abs(abs_relative_deviation)
    if d >= BIO_CONFIG.severity_critical_threshold:
        return "CRITICAL"
    elif d >= BIO_CONFIG.severity_high_threshold:
        return "HIGH"
    elif d >= BIO_CONFIG.severity_medium_threshold:
        return "MEDIUM"
    else:
        return "LOW"


def calculate_confidence(num_readings: int, has_env_anomalies: bool = False) -> float:
    """Scale confidence based on available evidence.

    More readings → higher confidence (up to base_confidence).
    Active environmental anomalies reduce confidence slightly since the
    model's expected baseline may itself be unreliable.
    """
    ratio = min(num_readings / BIO_CONFIG.full_confidence_readings, 1.0)
    confidence = BIO_CONFIG.min_confidence + ratio * (BIO_CONFIG.base_confidence - BIO_CONFIG.min_confidence)
    if has_env_anomalies:
        confidence *= 0.85  # 15% reduction when env is unstable
    return round(min(max(confidence, 0.0), 1.0), 3)


def safe_relative_deviation(observed: float, expected: float) -> Optional[float]:
    """Calculate (observed - expected) / expected, returning None when unsafe."""
    if expected <= 0.0:
        return None
    return (observed - expected) / expected


def safe_growth_rate(start: float, end: float) -> Optional[float]:
    """Calculate (end - start) / start, returning None when unsafe."""
    if start <= 0.0:
        return None
    return (end - start) / start


def robust_endpoint(values: List[float], count: int = 3) -> float:
    """Average the first/last `count` values for noise robustness."""
    n = min(len(values), count)
    return sum(values[:n]) / n


# ---------------------------------------------------------------------------
# Main detection function
# ---------------------------------------------------------------------------

def check_biological_anomalies(db: Session, pond_id, current_time: datetime):
    """Run Phase 3.3 biological anomaly detection for a single pond.

    Called from the model_loop in main.py after Phase 2 and Phase 3.2.
    """
    window_start = current_time - timedelta(hours=BIO_CONFIG.observation_window_hours)

    # ------------------------------------------------------------------
    # 1. Fetch Expected behaviour (Phase 2 BiomassEstimate)
    # ------------------------------------------------------------------
    estimates = (
        db.query(models.BiomassEstimate)
        .filter(
            models.BiomassEstimate.pond_id == pond_id,
            models.BiomassEstimate.timestamp >= window_start,
            models.BiomassEstimate.timestamp <= current_time,
        )
        .order_by(models.BiomassEstimate.timestamp)
        .all()
    )

    if len(estimates) < 2:
        # Insufficient model history — cannot make a biological claim
        return

    expected_start = estimates[0].biomass_g_per_l
    expected_end = estimates[-1].biomass_g_per_l

    dt_hours = (estimates[-1].timestamp - estimates[0].timestamp).total_seconds() / 3600.0
    if dt_hours <= 0:
        return

    expected_growth = safe_growth_rate(expected_start, expected_end)
    if expected_growth is None:
        # expected_start <= 0: cannot compute meaningful rates
        return

    # ------------------------------------------------------------------
    # 2. Fetch Observed behaviour (Phase 1 biomass sensor telemetry)
    # ------------------------------------------------------------------
    biomass_sensor = (
        db.query(models.Sensor)
        .filter(models.Sensor.pond_id == pond_id, models.Sensor.type == "biomass")
        .first()
    )
    if not biomass_sensor:
        return

    readings = (
        db.query(models.SensorReading)
        .filter(
            models.SensorReading.sensor_id == biomass_sensor.id,
            models.SensorReading.timestamp >= window_start,
            models.SensorReading.timestamp <= current_time,
            models.SensorReading.quality_flag == models.QualityFlag.ok,
        )
        .order_by(models.SensorReading.timestamp)
        .all()
    )

    if len(readings) < BIO_CONFIG.min_readings_required:
        # Not enough telemetry to make a confident biological claim
        return

    # ------------------------------------------------------------------
    # 3. Phase 3.1 guard: suppress if biomass sensor is broken
    # ------------------------------------------------------------------
    sensor_anomaly = (
        db.query(models.Anomaly)
        .filter(
            models.Anomaly.pond_id == pond_id,
            models.Anomaly.sensor_id == biomass_sensor.id,
            models.Anomaly.status == models.AnomalyStatus.OPEN,
            models.Anomaly.source_provenance.in_([
                "anomaly_engine_sensor",
                "anomaly_engine_dropout",
            ]),
        )
        .first()
    )
    if sensor_anomaly:
        return

    # ------------------------------------------------------------------
    # 4. Check for active environmental anomalies (Phase 3.2 context)
    # ------------------------------------------------------------------
    has_env_anomalies = (
        db.query(models.Anomaly)
        .filter(
            models.Anomaly.pond_id == pond_id,
            models.Anomaly.status == models.AnomalyStatus.OPEN,
            models.Anomaly.source_provenance == "environmental_engine",
        )
        .count()
        > 0
    )

    # ------------------------------------------------------------------
    # 5. Compute observed endpoints (robust averaging)
    # ------------------------------------------------------------------
    obs_values = [r.value for r in readings]

    # Guard: reject negative biomass readings as invalid
    if any(v < 0 for v in obs_values):
        return

    observed_start = robust_endpoint(obs_values[:3])
    observed_end = robust_endpoint(obs_values[-3:][::-1])  # last 3 in order

    observed_growth = safe_growth_rate(observed_start, observed_end)
    if observed_growth is None:
        # observed_start <= 0: cannot compute meaningful rates
        return

    # ------------------------------------------------------------------
    # 6. Calculate deviation metrics
    # ------------------------------------------------------------------
    relative_deviation = safe_relative_deviation(observed_end, expected_end)
    abs_deviation = observed_end - expected_end

    num_readings = len(readings)
    confidence = calculate_confidence(num_readings, has_env_anomalies)

    # Shared evidence payload (stored as JSON, used by Phase 3.4 later)
    base_evidence = {
        "expected_start": round(expected_start, 4),
        "expected_end": round(expected_end, 4),
        "expected_growth": round(expected_growth, 6),
        "observed_start": round(observed_start, 4),
        "observed_end": round(observed_end, 4),
        "observed_growth": round(observed_growth, 6),
        "relative_deviation": round(relative_deviation, 6) if relative_deviation is not None else None,
        "abs_deviation": round(abs_deviation, 4),
        "num_readings": num_readings,
        "num_estimates": len(estimates),
        "window_hours": round(dt_hours, 2),
        "has_env_anomalies": has_env_anomalies,
        "biomass_sensor_simulated": biomass_sensor.is_simulated,
    }

    # ------------------------------------------------------------------
    # 7. Detect anomalies
    # ------------------------------------------------------------------
    anomalies: List[Dict[str, Any]] = []

    # --- A. GROWTH_SUPPRESSION / GROWTH_ACCELERATION ---
    if relative_deviation is not None:
        if (
            relative_deviation <= BIO_CONFIG.suppression_threshold
            and abs_deviation <= -BIO_CONFIG.absolute_deviation_threshold
        ):
            severity = calculate_graduated_severity(relative_deviation)
            anomalies.append({
                "type": "GROWTH_SUPPRESSION",
                "severity": severity,
                "confidence": confidence,
                "description": (
                    f"Simulated biomass ({observed_end:.3f} g/L) is "
                    f"{abs(relative_deviation)*100:.1f}% below model-expected "
                    f"trajectory ({expected_end:.3f} g/L)."
                ),
                "observed": observed_end,
                "expected": expected_end,
                "evidence": base_evidence,
            })

        elif (
            relative_deviation >= BIO_CONFIG.acceleration_threshold
            and abs_deviation >= BIO_CONFIG.absolute_deviation_threshold
        ):
            severity = calculate_graduated_severity(relative_deviation)
            anomalies.append({
                "type": "GROWTH_ACCELERATION",
                "severity": severity,
                "confidence": confidence,
                "description": (
                    f"Simulated biomass ({observed_end:.3f} g/L) is "
                    f"+{relative_deviation*100:.1f}% above model-expected "
                    f"trajectory ({expected_end:.3f} g/L)."
                ),
                "observed": observed_end,
                "expected": expected_end,
                "evidence": base_evidence,
            })

    # --- B. BIOMASS_DECLINE ---
    if (
        observed_growth < BIO_CONFIG.decline_observed_threshold
        and expected_growth > BIO_CONFIG.decline_expected_threshold
    ):
        # Harvest guard: large sudden drops are operational, not biological
        drop_ratio = (observed_start - observed_end) / observed_start if observed_start > 0 else 0
        if drop_ratio >= BIO_CONFIG.harvest_drop_ratio:
            pass  # Likely harvest — suppress
        else:
            growth_diff = abs(observed_growth - expected_growth)
            severity = calculate_graduated_severity(growth_diff / max(abs(expected_growth), 0.01))
            anomalies.append({
                "type": "BIOMASS_DECLINE",
                "severity": severity,
                "confidence": confidence,
                "description": (
                    f"Unexpected biomass decline detected. Model expected "
                    f"{expected_growth*100:.1f}% growth but simulated telemetry "
                    f"shows {observed_growth*100:.1f}% change."
                ),
                "observed": observed_growth,
                "expected": expected_growth,
                "evidence": base_evidence,
            })

    # --- C. BIOMASS_PLATEAU ---
    if (
        expected_growth >= BIO_CONFIG.plateau_expected_growth_min
        and abs(observed_growth) < BIO_CONFIG.plateau_observed_growth_max
    ):
        severity = calculate_graduated_severity(
            (expected_growth - observed_growth) / max(expected_growth, 0.01)
        )
        anomalies.append({
            "type": "BIOMASS_PLATEAU",
            "severity": severity,
            "confidence": confidence,
            "description": (
                f"Biomass plateaued (growth {observed_growth*100:.2f}%) despite "
                f"model expecting {expected_growth*100:.1f}% growth over "
                f"{dt_hours:.1f}h window."
            ),
            "observed": observed_growth,
            "expected": expected_growth,
            "evidence": base_evidence,
        })

    # ------------------------------------------------------------------
    # 8. Persist & resolve
    # ------------------------------------------------------------------
    from app.anomaly.service import persist_biological_anomaly, resolve_biological_anomalies

    active_types: Set[str] = set()
    for a in anomalies:
        active_types.add(a["type"])
        persist_biological_anomaly(db, pond_id, current_time, a)

    resolve_biological_anomalies(db, pond_id, current_time, active_types)
