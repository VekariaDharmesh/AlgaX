from pydantic import BaseModel

class BioDetectionConfig(BaseModel):
    # Detection window in hours
    observation_window_hours: float = 2.0
    
    # Deviation thresholds (relative deviation = (observed - expected) / expected)
    suppression_threshold: float = -0.4  # Observed is 40% less than expected
    acceleration_threshold: float = 0.5  # Observed is 50% more than expected
    
    # Absolute deviation if expected is near zero
    absolute_deviation_threshold: float = 0.1 # g/L
    
    # Growth mismatch thresholds
    # Compare observed growth rate vs expected growth rate
    growth_rate_mismatch_threshold: float = 0.05 # diff in growth rate

BIO_CONFIG = BioDetectionConfig()
