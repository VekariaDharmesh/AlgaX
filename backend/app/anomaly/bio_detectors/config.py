from pydantic import BaseModel


class BioDetectionConfig(BaseModel):
    """Configuration for Phase 3.3 Biological Anomaly Detection.

    All thresholds are scientifically motivated and tunable.
    Relative deviation = (observed - expected) / expected.
    Growth rates are cumulative over the observation window (dimensionless ratio).
    """

    # --- Observation Window ---
    observation_window_hours: float = 2.0
    min_readings_required: int = 3  # Minimum sensor readings to attempt detection

    # --- Biomass Deviation Thresholds (relative) ---
    # Suppression: observed significantly below expected
    suppression_threshold: float = -0.25  # -25%
    # Acceleration: observed significantly above expected
    acceleration_threshold: float = 0.40  # +40%
    # Absolute floor: ignore deviations smaller than this in g/L
    absolute_deviation_threshold: float = 0.05  # g/L

    # --- Growth Rate Mismatch ---
    # Plateau: expected growth rate (relative) vs near-zero observed
    plateau_expected_growth_min: float = 0.03  # model expects >= 3% growth over window
    plateau_observed_growth_max: float = 0.01  # but observed is < 1%

    # Decline: observed negative growth while model expects positive/flat
    decline_observed_threshold: float = -0.03  # observed shrinks > 3%
    decline_expected_threshold: float = -0.01  # while expected doesn't shrink much

    # --- Harvest Guard ---
    # A drop exceeding this ratio in the observation window is treated as
    # a likely harvest event and suppressed from BIOMASS_DECLINE.
    harvest_drop_ratio: float = 0.40  # 40% instant drop = likely harvest

    # --- Severity Graduation ---
    # Deviation magnitude boundaries for graduated severity
    severity_low_threshold: float = 0.15       # |deviation| > 15%  → LOW
    severity_medium_threshold: float = 0.30    # |deviation| > 30%  → MEDIUM
    severity_high_threshold: float = 0.50      # |deviation| > 50%  → HIGH
    severity_critical_threshold: float = 0.75  # |deviation| > 75%  → CRITICAL

    # --- Confidence Scaling ---
    # Base confidence, scaled down when fewer readings are available
    base_confidence: float = 0.90
    min_confidence: float = 0.50
    # Number of readings for "full confidence"
    full_confidence_readings: int = 12


BIO_CONFIG = BioDetectionConfig()
