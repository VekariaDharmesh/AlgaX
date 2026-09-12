from pydantic import BaseModel

class EnvDetectionConfig(BaseModel):
    # Minimum duration (minutes) a condition must persist to be flagged
    persistence_minutes: float = 30.0
    
    # Thresholds
    high_temp_threshold: float = 35.0
    low_do_threshold: float = 4.0
    low_nitrogen_threshold: float = 0.005
    ph_high_threshold: float = 9.5
    ph_low_threshold: float = 6.0
    
    # Trends (Rate of change per minute)
    temp_trend_threshold: float = 0.1 # 0.1 deg / min over 30 mins = 3 deg
    ph_trend_threshold: float = 0.05
    do_drop_trend: float = -0.1

ENV_CONFIG = EnvDetectionConfig()
