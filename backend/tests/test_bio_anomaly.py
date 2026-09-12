"""Phase 3.3 — Comprehensive Biological Anomaly Detection Tests.

Tests cover:
  - Growth suppression (mild, moderate, severe)
  - Growth acceleration
  - Biomass decline
  - Biomass plateau
  - Harvest suppression (no false BIOMASS_DECLINE on harvest)
  - Normal healthy behaviour (no false positives)
  - Sensor dropout suppression
  - Insufficient history
  - Multi-pond isolation
  - Duplicate anomaly deduplication
  - Anomaly resolution lifecycle
  - Graduated severity
  - Confidence scaling
  - Negative/zero biomass guard
  - Determinism (same input → same output)
  - Environmental anomaly interaction
"""

import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app import models
from app.database import SessionLocal
from app.anomaly.bio_detectors.engine import (
    check_biological_anomalies,
    calculate_graduated_severity,
    calculate_confidence,
    safe_relative_deviation,
    safe_growth_rate,
)
from app.anomaly.bio_detectors.config import BIO_CONFIG


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_pond(db) -> tuple:
    """Create a Farm + Pond + biomass Sensor, return (pond_id, sensor)."""
    farm_id = uuid.uuid4()
    pond_id = uuid.uuid4()
    db.add(models.Farm(id=farm_id, name=f"Farm-{farm_id}"))
    db.add(models.Pond(id=pond_id, farm_id=farm_id, name=f"Pond-{pond_id}"))
    sensor = models.Sensor(
        id=uuid.uuid4(), pond_id=pond_id,
        type="biomass", unit="g/L", is_simulated=True,
    )
    db.add(sensor)
    db.commit()

    m_run = models.ModelRun(
        id=uuid.uuid4(), pond_id=pond_id,
        model_version="v1", period_start=datetime.now(timezone.utc),
        period_end=datetime.now(timezone.utc), parameters={},
        status="success", provenance="simulated",
    )
    db.add(m_run)
    db.commit()
    return pond_id, sensor, m_run


def _insert_bio_data(db, pond_id, sensor, m_run, t0,
                     expected_start, expected_end,
                     observed_start, observed_end,
                     n_points=13, window_hours=2.0):
    """Insert BiomassEstimates and SensorReadings along a linear trajectory."""
    for i in range(n_points):
        frac = i / (n_points - 1)
        t = t0 - timedelta(hours=window_hours) + timedelta(hours=window_hours * frac)

        exp_val = expected_start + (expected_end - expected_start) * frac
        db.add(models.BiomassEstimate(
            pond_id=pond_id, model_run_id=m_run.id, timestamp=t,
            biomass_g_per_l=exp_val,
            light_factor=1.0, temp_factor=1.0, ph_factor=1.0, n_factor=1.0,
            growth_rate=0.05, method="test", confidence_score=0.9,
        ))

        obs_val = observed_start + (observed_end - observed_start) * frac
        db.add(models.SensorReading(
            pond_id=pond_id, sensor_id=sensor.id, timestamp=t,
            value=obs_val, quality_flag=models.QualityFlag.ok,
        ))

    db.commit()


def _get_bio_anomalies(db, pond_id):
    return db.query(models.Anomaly).filter(
        models.Anomaly.pond_id == pond_id,
        models.Anomaly.source_provenance == "biological_engine",
    ).all()


def _get_bio_types(db, pond_id):
    return [a.anomaly_type.value for a in _get_bio_anomalies(db, pond_id)]


# ---------------------------------------------------------------------------
# Pure function unit tests
# ---------------------------------------------------------------------------

class TestPureFunctions:
    def test_graduated_severity_low(self):
        assert calculate_graduated_severity(0.20) == "LOW"

    def test_graduated_severity_medium(self):
        assert calculate_graduated_severity(0.35) == "MEDIUM"

    def test_graduated_severity_high(self):
        assert calculate_graduated_severity(0.55) == "HIGH"

    def test_graduated_severity_critical(self):
        assert calculate_graduated_severity(0.80) == "CRITICAL"

    def test_graduated_severity_boundary_medium(self):
        assert calculate_graduated_severity(BIO_CONFIG.severity_medium_threshold) == "MEDIUM"

    def test_graduated_severity_boundary_high(self):
        assert calculate_graduated_severity(BIO_CONFIG.severity_high_threshold) == "HIGH"

    def test_confidence_full_readings(self):
        c = calculate_confidence(BIO_CONFIG.full_confidence_readings)
        assert c == BIO_CONFIG.base_confidence

    def test_confidence_few_readings(self):
        c = calculate_confidence(1)
        assert c < BIO_CONFIG.base_confidence
        assert c >= BIO_CONFIG.min_confidence

    def test_confidence_env_anomalies_reduce(self):
        c_clean = calculate_confidence(12, has_env_anomalies=False)
        c_dirty = calculate_confidence(12, has_env_anomalies=True)
        assert c_dirty < c_clean

    def test_confidence_bounds(self):
        assert 0.0 <= calculate_confidence(0) <= 1.0
        assert 0.0 <= calculate_confidence(100) <= 1.0
        assert 0.0 <= calculate_confidence(1, True) <= 1.0

    def test_safe_relative_deviation_normal(self):
        assert safe_relative_deviation(1.5, 1.0) == pytest.approx(0.5)

    def test_safe_relative_deviation_zero_expected(self):
        assert safe_relative_deviation(1.0, 0.0) is None

    def test_safe_relative_deviation_negative_expected(self):
        assert safe_relative_deviation(1.0, -0.5) is None

    def test_safe_growth_rate_normal(self):
        assert safe_growth_rate(1.0, 1.5) == pytest.approx(0.5)

    def test_safe_growth_rate_zero_start(self):
        assert safe_growth_rate(0.0, 1.0) is None


# ---------------------------------------------------------------------------
# Integration tests against the database
# ---------------------------------------------------------------------------

class TestGrowthSuppression:
    def test_severe_suppression(self):
        """Expected grows 1.0 → 2.0, observed stays at 1.0 → -50% deviation."""
        db = SessionLocal()
        pond_id, sensor, m_run = _create_pond(db)
        t0 = datetime.now(timezone.utc)
        _insert_bio_data(db, pond_id, sensor, m_run, t0,
                         expected_start=1.0, expected_end=2.0,
                         observed_start=1.0, observed_end=1.0)
        check_biological_anomalies(db, pond_id, t0)
        types = _get_bio_types(db, pond_id)
        assert "GROWTH_SUPPRESSION" in types
        db.close()

    def test_mild_suppression_below_threshold(self):
        """Expected 1.0 → 1.2, observed 1.0 → 1.05 → -12.5% (below 25% threshold)."""
        db = SessionLocal()
        pond_id, sensor, m_run = _create_pond(db)
        t0 = datetime.now(timezone.utc)
        _insert_bio_data(db, pond_id, sensor, m_run, t0,
                         expected_start=1.0, expected_end=1.2,
                         observed_start=1.0, observed_end=1.05)
        check_biological_anomalies(db, pond_id, t0)
        types = _get_bio_types(db, pond_id)
        assert "GROWTH_SUPPRESSION" not in types
        db.close()


class TestGrowthAcceleration:
    def test_acceleration(self):
        """Expected 1.0 → 1.3, observed 1.0 → 2.0 → +54% deviation."""
        db = SessionLocal()
        pond_id, sensor, m_run = _create_pond(db)
        t0 = datetime.now(timezone.utc)
        _insert_bio_data(db, pond_id, sensor, m_run, t0,
                         expected_start=1.0, expected_end=1.3,
                         observed_start=1.0, observed_end=2.0)
        check_biological_anomalies(db, pond_id, t0)
        types = _get_bio_types(db, pond_id)
        assert "GROWTH_ACCELERATION" in types
        db.close()

    def test_small_positive_deviation_no_acceleration(self):
        """Expected 1.0 → 1.5, observed 1.0 → 1.65 → +10% (below 40%)."""
        db = SessionLocal()
        pond_id, sensor, m_run = _create_pond(db)
        t0 = datetime.now(timezone.utc)
        _insert_bio_data(db, pond_id, sensor, m_run, t0,
                         expected_start=1.0, expected_end=1.5,
                         observed_start=1.0, observed_end=1.65)
        check_biological_anomalies(db, pond_id, t0)
        types = _get_bio_types(db, pond_id)
        assert "GROWTH_ACCELERATION" not in types
        db.close()


class TestBiomassPlateau:
    def test_plateau_when_growth_expected(self):
        """Expected grows from 1.0 → 1.1 (+10%), observed stays flat at 1.0."""
        db = SessionLocal()
        pond_id, sensor, m_run = _create_pond(db)
        t0 = datetime.now(timezone.utc)
        _insert_bio_data(db, pond_id, sensor, m_run, t0,
                         expected_start=1.0, expected_end=1.1,
                         observed_start=1.0, observed_end=1.005)
        check_biological_anomalies(db, pond_id, t0)
        types = _get_bio_types(db, pond_id)
        assert "BIOMASS_PLATEAU" in types
        db.close()

    def test_no_plateau_when_growth_is_low(self):
        """Expected grows 1.0 → 1.01 (+1%), observed flat → not enough expected growth to flag."""
        db = SessionLocal()
        pond_id, sensor, m_run = _create_pond(db)
        t0 = datetime.now(timezone.utc)
        _insert_bio_data(db, pond_id, sensor, m_run, t0,
                         expected_start=1.0, expected_end=1.01,
                         observed_start=1.0, observed_end=1.005)
        check_biological_anomalies(db, pond_id, t0)
        types = _get_bio_types(db, pond_id)
        assert "BIOMASS_PLATEAU" not in types
        db.close()


class TestBiomassDecline:
    def test_decline_detected(self):
        """Expected 1.0 → 1.3, observed 1.0 → 0.93 → decline."""
        db = SessionLocal()
        pond_id, sensor, m_run = _create_pond(db)
        t0 = datetime.now(timezone.utc)
        _insert_bio_data(db, pond_id, sensor, m_run, t0,
                         expected_start=1.0, expected_end=1.3,
                         observed_start=1.0, observed_end=0.93)
        check_biological_anomalies(db, pond_id, t0)
        types = _get_bio_types(db, pond_id)
        assert "BIOMASS_DECLINE" in types
        db.close()


class TestHarvestGuard:
    def test_harvest_drop_suppressed(self):
        """A 50% drop in observed biomass should be treated as harvest, not decline."""
        db = SessionLocal()
        pond_id, sensor, m_run = _create_pond(db)
        t0 = datetime.now(timezone.utc)
        _insert_bio_data(db, pond_id, sensor, m_run, t0,
                         expected_start=2.0, expected_end=2.1,
                         observed_start=2.0, observed_end=0.8)
        check_biological_anomalies(db, pond_id, t0)
        types = _get_bio_types(db, pond_id)
        assert "BIOMASS_DECLINE" not in types
        db.close()


class TestNormalBehaviour:
    def test_healthy_pond_no_anomalies(self):
        """Expected 1.0 → 1.1, observed 1.0 → 1.08 → within tolerance."""
        db = SessionLocal()
        pond_id, sensor, m_run = _create_pond(db)
        t0 = datetime.now(timezone.utc)
        _insert_bio_data(db, pond_id, sensor, m_run, t0,
                         expected_start=1.0, expected_end=1.1,
                         observed_start=1.0, observed_end=1.08)
        check_biological_anomalies(db, pond_id, t0)
        anomalies = _get_bio_anomalies(db, pond_id)
        assert len(anomalies) == 0
        db.close()

    def test_slight_underperformance_no_anomaly(self):
        """Expected 1.0 → 1.2, observed 1.0 → 1.12 → -6.7% (below 25%)."""
        db = SessionLocal()
        pond_id, sensor, m_run = _create_pond(db)
        t0 = datetime.now(timezone.utc)
        _insert_bio_data(db, pond_id, sensor, m_run, t0,
                         expected_start=1.0, expected_end=1.2,
                         observed_start=1.0, observed_end=1.12)
        check_biological_anomalies(db, pond_id, t0)
        anomalies = _get_bio_anomalies(db, pond_id)
        assert len(anomalies) == 0
        db.close()


class TestSensorDropoutSuppression:
    def test_dropout_suppresses_bio_detection(self):
        """An OPEN biomass sensor anomaly should prevent bio detection entirely."""
        db = SessionLocal()
        pond_id, sensor, m_run = _create_pond(db)
        t0 = datetime.now(timezone.utc)

        db.add(models.Anomaly(
            pond_id=pond_id, sensor_id=sensor.id, sensor_type="biomass",
            timestamp=t0, anomaly_type=models.AnomalyType.SENSOR_DROPOUT,
            severity=models.AnomalySeverity.HIGH, confidence_score=0.9,
            description="Dropout", source_provenance="anomaly_engine_sensor",
            status=models.AnomalyStatus.OPEN,
        ))
        db.commit()

        _insert_bio_data(db, pond_id, sensor, m_run, t0,
                         expected_start=1.0, expected_end=2.0,
                         observed_start=1.0, observed_end=0.1)
        check_biological_anomalies(db, pond_id, t0)
        assert len(_get_bio_anomalies(db, pond_id)) == 0
        db.close()


class TestInsufficientHistory:
    def test_only_one_reading(self):
        """With fewer than min_readings_required readings, no detection should run."""
        db = SessionLocal()
        pond_id, sensor, m_run = _create_pond(db)
        t0 = datetime.now(timezone.utc)

        # Only 2 estimates, only 2 readings (below min_readings=3)
        for i in range(2):
            t = t0 - timedelta(hours=1) + timedelta(minutes=30 * i)
            db.add(models.BiomassEstimate(
                pond_id=pond_id, model_run_id=m_run.id, timestamp=t,
                biomass_g_per_l=1.0 + i * 0.5,
                light_factor=1.0, temp_factor=1.0, ph_factor=1.0, n_factor=1.0,
                growth_rate=0.05, method="test", confidence_score=0.9,
            ))
            db.add(models.SensorReading(
                pond_id=pond_id, sensor_id=sensor.id, timestamp=t,
                value=0.1, quality_flag=models.QualityFlag.ok,
            ))
        db.commit()

        check_biological_anomalies(db, pond_id, t0)
        assert len(_get_bio_anomalies(db, pond_id)) == 0
        db.close()


class TestMultiPondIsolation:
    def test_ponds_isolated(self):
        """Anomalies on Pond A must not appear on Pond B."""
        db = SessionLocal()

        pond_a, sensor_a, m_run_a = _create_pond(db)
        pond_b, sensor_b, m_run_b = _create_pond(db)
        t0 = datetime.now(timezone.utc)

        # Pond A: severe suppression
        _insert_bio_data(db, pond_a, sensor_a, m_run_a, t0,
                         expected_start=1.0, expected_end=2.0,
                         observed_start=1.0, observed_end=1.0)
        # Pond B: healthy
        _insert_bio_data(db, pond_b, sensor_b, m_run_b, t0,
                         expected_start=1.0, expected_end=1.1,
                         observed_start=1.0, observed_end=1.08)

        check_biological_anomalies(db, pond_a, t0)
        check_biological_anomalies(db, pond_b, t0)

        assert len(_get_bio_anomalies(db, pond_a)) > 0
        assert len(_get_bio_anomalies(db, pond_b)) == 0
        db.close()


class TestDeduplication:
    def test_no_duplicate_anomalies_on_repeat(self):
        """Running detection twice on the same state should not create duplicates."""
        db = SessionLocal()
        pond_id, sensor, m_run = _create_pond(db)
        t0 = datetime.now(timezone.utc)

        _insert_bio_data(db, pond_id, sensor, m_run, t0,
                         expected_start=1.0, expected_end=2.0,
                         observed_start=1.0, observed_end=1.0)

        check_biological_anomalies(db, pond_id, t0)
        count_1 = len(_get_bio_anomalies(db, pond_id))

        check_biological_anomalies(db, pond_id, t0)
        count_2 = len(_get_bio_anomalies(db, pond_id))

        assert count_1 == count_2
        db.close()


class TestResolutionLifecycle:
    def test_anomaly_resolves_when_condition_clears(self):
        """When biological condition returns to normal, anomaly should resolve."""
        db = SessionLocal()
        pond_id, sensor, m_run = _create_pond(db)
        t0 = datetime.now(timezone.utc)

        # Phase 1: create suppression
        _insert_bio_data(db, pond_id, sensor, m_run, t0,
                         expected_start=1.0, expected_end=2.0,
                         observed_start=1.0, observed_end=1.0)
        check_biological_anomalies(db, pond_id, t0)
        anomalies = _get_bio_anomalies(db, pond_id)
        open_count = sum(1 for a in anomalies if a.status == models.AnomalyStatus.OPEN)
        assert open_count > 0

        # Phase 2: clear old data and add healthy data
        db.query(models.SensorReading).filter(
            models.SensorReading.sensor_id == sensor.id
        ).delete()
        db.query(models.BiomassEstimate).filter(
            models.BiomassEstimate.pond_id == pond_id
        ).delete()
        db.commit()

        t1 = t0 + timedelta(hours=3)
        _insert_bio_data(db, pond_id, sensor, m_run, t1,
                         expected_start=1.0, expected_end=1.1,
                         observed_start=1.0, observed_end=1.08)
        check_biological_anomalies(db, pond_id, t1)

        # Anomalies that were OPEN should now be RESOLVED
        all_anomalies = _get_bio_anomalies(db, pond_id)
        still_open = [a for a in all_anomalies if a.status == models.AnomalyStatus.OPEN]
        assert len(still_open) == 0
        db.close()


class TestNegativeValues:
    def test_negative_biomass_suppressed(self):
        """Negative biomass readings should prevent detection entirely."""
        db = SessionLocal()
        pond_id, sensor, m_run = _create_pond(db)
        t0 = datetime.now(timezone.utc)

        for i in range(5):
            t = t0 - timedelta(hours=2) + timedelta(minutes=24 * i)
            db.add(models.BiomassEstimate(
                pond_id=pond_id, model_run_id=m_run.id, timestamp=t,
                biomass_g_per_l=1.0,
                light_factor=1.0, temp_factor=1.0, ph_factor=1.0, n_factor=1.0,
                growth_rate=0.05, method="test", confidence_score=0.9,
            ))
            db.add(models.SensorReading(
                pond_id=pond_id, sensor_id=sensor.id, timestamp=t,
                value=-0.5 if i == 2 else 1.0,
                quality_flag=models.QualityFlag.ok,
            ))
        db.commit()

        check_biological_anomalies(db, pond_id, t0)
        assert len(_get_bio_anomalies(db, pond_id)) == 0
        db.close()


class TestDeterminism:
    def test_same_input_same_output(self):
        """Running detection on identical data twice should produce identical anomalies."""
        db = SessionLocal()
        results = []
        for _ in range(2):
            pond_id, sensor, m_run = _create_pond(db)
            t0 = datetime(2026, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
            _insert_bio_data(db, pond_id, sensor, m_run, t0,
                             expected_start=1.0, expected_end=2.0,
                             observed_start=1.0, observed_end=1.0)
            check_biological_anomalies(db, pond_id, t0)
            anomalies = _get_bio_anomalies(db, pond_id)
            results.append(sorted([
                (a.anomaly_type.value, a.severity.value, a.confidence_score)
                for a in anomalies
            ]))

        assert results[0] == results[1]
        db.close()
