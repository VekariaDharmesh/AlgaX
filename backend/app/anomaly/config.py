from pydantic import BaseModel

class SensorDetectionConfig(BaseModel):
    sensor_type: str
    minimum_value: float
    maximum_value: float
    max_rate_of_change_per_minute: float # magnitude
    stale_tolerance: float
    stale_duration_minutes: float
    dropout_duration_minutes: float

# Engineering thresholds for Phase 3.1
SENSOR_CONFIGS = {
    "temperature": SensorDetectionConfig(
        sensor_type="temperature",
        minimum_value=0.0,
        maximum_value=50.0,
        max_rate_of_change_per_minute=2.0, # 2 degrees per minute is unrealistic
        stale_tolerance=0.01,
        stale_duration_minutes=30.0,
        dropout_duration_minutes=15.0 # expected every few mins
    ),
    "ph": SensorDetectionConfig(
        sensor_type="ph",
        minimum_value=0.0,
        maximum_value=14.0,
        max_rate_of_change_per_minute=0.5,
        stale_tolerance=0.005,
        stale_duration_minutes=30.0,
        dropout_duration_minutes=15.0
    ),
    "nitrogen": SensorDetectionConfig(
        sensor_type="nitrogen",
        minimum_value=0.0,
        maximum_value=100.0,
        max_rate_of_change_per_minute=5.0,
        stale_tolerance=0.01,
        stale_duration_minutes=60.0,
        dropout_duration_minutes=15.0
    ),
    "dissolved_oxygen": SensorDetectionConfig(
        sensor_type="dissolved_oxygen",
        minimum_value=0.0,
        maximum_value=25.0,
        max_rate_of_change_per_minute=2.0,
        stale_tolerance=0.05,
        stale_duration_minutes=30.0,
        dropout_duration_minutes=15.0
    ),
    "light": SensorDetectionConfig(
        sensor_type="light",
        minimum_value=0.0,
        maximum_value=3000.0,
        max_rate_of_change_per_minute=500.0,
        stale_tolerance=1.0,
        stale_duration_minutes=60.0,
        dropout_duration_minutes=15.0
    ),
    "turbidity": SensorDetectionConfig(
        sensor_type="turbidity",
        minimum_value=0.0,
        maximum_value=1000.0,
        max_rate_of_change_per_minute=100.0,
        stale_tolerance=1.0,
        stale_duration_minutes=60.0,
        dropout_duration_minutes=15.0
    ),
    "water_level": SensorDetectionConfig(
        sensor_type="water_level",
        minimum_value=0.0,
        maximum_value=10.0,
        max_rate_of_change_per_minute=0.5,
        stale_tolerance=0.01,
        stale_duration_minutes=120.0,
        dropout_duration_minutes=15.0
    )
}
