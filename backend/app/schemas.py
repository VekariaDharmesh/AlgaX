from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from .models import SensorType, QualityFlag, SourceType, PondStatus, CalibrationStatus, CalibrationMethod

class SensorReadingCreate(BaseModel):
    sensor_id: UUID
    pond_id: UUID
    timestamp: datetime
    value: float
    raw_value: Optional[float] = None
    calibrated_value: Optional[float] = None
    calibration_offset: Optional[float] = None
    calibration_gain: Optional[float] = None
    quality_flag: QualityFlag = QualityFlag.ok
    source_type: SourceType = SourceType.simulated

class SensorReadingResponse(SensorReadingCreate):
    id: UUID
    class Config:
        from_attributes = True

class SensorBase(BaseModel):
    pond_id: UUID
    type: SensorType
    unit: str
    is_simulated: bool = True
    calibration_metadata: Optional[dict] = None
    last_calibrated_at: Optional[datetime] = None
    calibration_status: CalibrationStatus = CalibrationStatus.DRAFT

class SensorResponse(SensorBase):
    id: UUID
    class Config:
        from_attributes = True

class PondBase(BaseModel):
    farm_id: UUID
    name: str
    volume_liters: Optional[float] = None
    species: Optional[str] = None
    status: PondStatus = PondStatus.active

class PondResponse(PondBase):
    id: UUID
    created_at: datetime
    sensors: List[SensorResponse] = []
    class Config:
        from_attributes = True

class FarmBase(BaseModel):
    name: str
    location: Optional[str] = None
    owner_user_id: Optional[UUID] = None

class FarmResponse(FarmBase):
    id: UUID
    created_at: datetime
    ponds: List[PondResponse] = []
    class Config:
        from_attributes = True

class BiomassEstimateResponse(BaseModel):
    id: UUID
    pond_id: UUID
    model_run_id: UUID
    timestamp: datetime
    biomass_g_per_l: float
    light_factor: float
    temp_factor: float
    ph_factor: float
    n_factor: float
    growth_rate: float
    method: str
    confidence_score: float

    class Config:
        from_attributes = True

class CarbonEstimateResponse(BaseModel):
    id: UUID
    pond_id: UUID
    model_run_id: UUID
    period_start: datetime
    period_end: datetime
    gross_co2_kg: float
    retained_co2_kg: Optional[float]
    operational_emissions_kg: Optional[float]
    net_carbon_removed_kg: Optional[float]
    realized_c_fraction: float
    end_use: str
    permanence_horizon_label: Optional[str]
    confidence_score: float

    class Config:
        from_attributes = True

class ModelRunResponse(BaseModel):
    id: UUID
    pond_id: UUID
    model_version: str
    period_start: datetime
    period_end: datetime
    parameters: dict
    execution_timestamp: datetime
    status: str
    provenance: str

    biomass_estimates: List[BiomassEstimateResponse] = []
    carbon_estimates: List[CarbonEstimateResponse] = []

    class Config:
        from_attributes = True

class AnomalyBase(BaseModel):
    farm_id: Optional[UUID] = None
    pond_id: UUID
    sensor_id: Optional[UUID] = None
    sensor_type: Optional[str] = None
    timestamp: datetime
    detected_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    anomaly_type: str
    severity: str
    confidence_score: float
    observed_value: Optional[float] = None
    expected_value: Optional[float] = None
    deviation: Optional[float] = None
    description: str
    source_provenance: str
    status: str
    limiting_factor: Optional[str] = None
    explanation: Optional[dict] = None

class AnomalyResponse(AnomalyBase):
    id: UUID
    priority_score: int = 0
    class Config:
        from_attributes = True

class AnomalyExplanationBase(BaseModel):
    anomaly_id: UUID
    farm_id: Optional[UUID] = None
    pond_id: UUID
    summary: str
    details: str
    primary_factor: Optional[str] = None
    contributing_factors_json: list
    supporting_evidence_json: list
    contradicting_evidence_json: list
    confidence: float
    evidence_strength: str
    analysis_start: datetime
    analysis_end: datetime
    model_run_id: Optional[UUID] = None
    model_version: str
    explanation_version: str
    data_quality_notes: list
    uncertainty_notes: list

class AnomalyExplanationResponse(AnomalyExplanationBase):
    id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

class AnomalyResponseWithExplanation(AnomalyResponse):
    explanation_record: Optional[AnomalyExplanationResponse] = None

class PaginatedAnomalyResponse(BaseModel):
    total: int
    page: int
    page_size: int
    has_next: bool
    items: List[AnomalyResponseWithExplanation]

class AnomalyStatusUpdate(BaseModel):
    status: str

class ImageryRecordBase(BaseModel):
    farm_id: UUID
    pond_id: UUID
    source_type: str
    capture_timestamp: Optional[datetime] = None
    ingestion_timestamp: Optional[datetime] = None
    filename: str
    mime_type: str
    file_size_bytes: int
    storage_reference: str
    sha256_hash: str
    width_px: Optional[int] = None
    height_px: Optional[int] = None
    resolution_meters: Optional[float] = None
    processing_status: str
    provenance: dict

class ImageryRecordResponse(ImageryRecordBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ImageryProcessingCreate(BaseModel):
    processing_version: str
    original_sha256_hash: str
    original_width_px: Optional[float] = None
    original_height_px: Optional[float] = None

class ImageryProcessingResponse(BaseModel):
    id: UUID
    imagery_id: UUID
    processing_version: str
    processing_status: str
    processed_storage_reference: Optional[str] = None
    original_sha256_hash: str
    processed_sha256_hash: Optional[str] = None
    original_width_px: Optional[float] = None
    original_height_px: Optional[float] = None
    processed_width_px: Optional[float] = None
    processed_height_px: Optional[float] = None
    color_space: Optional[str] = None
    orientation_corrected: bool
    resize_applied: bool
    quality_classification: Optional[str] = None
    quality_flags: list = []
    quality_metrics: Optional[dict] = None
    preprocessing_metadata: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class QualityAssessmentResponse(BaseModel):
    quality_classification: Optional[str] = None
    quality_flags: list = []
    quality_metrics: Optional[dict] = None

class ImageryAnalysisResponse(BaseModel):
    id: UUID
    imagery_id: UUID
    processing_id: UUID
    pond_id: UUID
    farm_id: UUID
    source_type: str
    analysis_version: str
    roi_method: str
    
    mean_red: Optional[float] = None
    mean_green: Optional[float] = None
    mean_blue: Optional[float] = None
    green_dominance: Optional[float] = None
    green_pixel_fraction: Optional[float] = None
    valid_pixel_fraction: Optional[float] = None
    spatial_mean: Optional[float] = None
    spatial_std: Optional[float] = None
    grid_data: Optional[dict] = None
    
    analysis_status: str
    
    baseline_analysis_id: Optional[UUID] = None
    absolute_change: Optional[float] = None
    relative_change: Optional[float] = None
    change_classification: Optional[str] = None
    
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CrossValidationRunResponse(BaseModel):
    id: UUID
    farm_id: UUID
    pond_id: UUID
    model_run_id: Optional[UUID] = None
    imagery_analysis_id: Optional[UUID] = None
    comparison_window_start: Optional[datetime] = None
    comparison_window_end: Optional[datetime] = None
    model_trend: Optional[str] = None
    imagery_trend: Optional[str] = None
    model_change: Optional[float] = None
    imagery_change: Optional[float] = None
    temporal_alignment_status: str
    result_status: str
    confidence: str
    evidence_summary: str
    provenance_json: dict
    engine_version: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class EvidencePackageBase(BaseModel):
    reporting_period_start: datetime
    reporting_period_end: datetime
    
class EvidencePackageCreate(EvidencePackageBase):
    pass

class EvidencePackageResponse(EvidencePackageBase):
    id: UUID
    farm_id: UUID
    pond_id: UUID
    package_version: str
    status: str
    completeness: str
    review_state: str
    
    sensor_evidence_json: list
    model_evidence_json: list
    carbon_evidence_json: list
    anomaly_evidence_json: list
    imagery_evidence_json: list
    cross_validation_evidence_json: list
    limitations_json: list
    
    canonical_hash: Optional[str] = None
    sealed_at: Optional[datetime] = None
    sealed_by: Optional[str] = None
    contains_simulated_data: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ReviewActionCreate(BaseModel):
    action: str
    note: Optional[str] = None

class ReviewActionResponse(BaseModel):
    id: UUID
    package_id: UUID
    actor: str
    action: str
    note: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Real-Time Weather Schemas
class HourlyForecast(BaseModel):
    time: str
    temperature_2m: float
    shortwave_radiation: Optional[float] = 0.0
    precipitation: Optional[float] = 0.0
    weather_code: int = 0

class AlgaeWeatherImpact(BaseModel):
    solar_irradiance_w_m2: float
    photosynthesis_score: float
    thermal_stress_rating: str
    evaporation_risk: str
    growth_condition_summary: str

class WeatherCurrentResponse(BaseModel):
    location_name: str
    latitude: float
    longitude: float
    temperature_c: float
    apparent_temperature_c: float
    relative_humidity: float
    wind_speed_kmh: float
    wind_direction_deg: float
    precipitation_mm: float
    weather_code: int
    weather_description: str
    is_day: bool
    solar_irradiance_w_m2: float
    algae_impact: AlgaeWeatherImpact
    hourly_forecast: List[HourlyForecast] = []
    updated_at: str

class WeatherSearchItem(BaseModel):
    name: str
    latitude: float
    longitude: float
    country: Optional[str] = None
    admin1: Optional[str] = None

# Phase 6 Reporting & Verification Schemas
class HashVerificationResponse(BaseModel):
    package_id: UUID
    integrity_match: bool
    stored_hash: str
    recomputed_hash: str
    status: str
    message: str
    verified_at: datetime
    sealed_at: Optional[datetime] = None
    sealed_by: Optional[str] = None

class CanonicalJsonBundleResponse(BaseModel):
    package_id: UUID
    canonical_hash: str
    payload: dict

# Harvest Workspace Schemas
from .models import HarvestStatus, HarvestMethod, EndUseCategory

class HarvestBiomassFateBase(BaseModel):
    end_use_category: EndUseCategory = EndUseCategory.UNSPECIFIED
    quantity_allocated_kg: float
    allocation_pct: float = 100.0
    destination: str = "Storage"
    processing_info: Optional[str] = None
    retention_info: Optional[str] = None
    notes: Optional[str] = None

class HarvestBiomassFateCreate(HarvestBiomassFateBase):
    pass

class HarvestBiomassFateResponse(HarvestBiomassFateBase):
    id: UUID
    harvest_event_id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

class HarvestEventBase(BaseModel):
    farm_id: UUID
    pond_id: UUID
    planned_date: datetime
    harvest_method: HarvestMethod = HarvestMethod.FILTRATION
    operator: str = "Operator"
    notes: Optional[str] = None
    estimated_harvest_kg: float = 0.0

class HarvestEventCreate(HarvestEventBase):
    status: HarvestStatus = HarvestStatus.PLANNED
    harvest_date: Optional[datetime] = None
    actual_harvest_kg: Optional[float] = None
    biomass_before_g_per_l: Optional[float] = None
    model_run_id: Optional[UUID] = None

class HarvestEventUpdate(BaseModel):
    status: Optional[HarvestStatus] = None
    harvest_date: Optional[datetime] = None
    actual_harvest_kg: Optional[float] = None
    biomass_before_g_per_l: Optional[float] = None
    notes: Optional[str] = None
    operator: Optional[str] = None
    harvest_method: Optional[HarvestMethod] = None

class HarvestEventResponse(HarvestEventBase):
    id: UUID
    status: HarvestStatus
    harvest_date: Optional[datetime] = None
    biomass_before_g_per_l: Optional[float] = None
    actual_harvest_kg: Optional[float] = None
    unit: str = "kg"
    model_run_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    biomass_fates: List[HarvestBiomassFateResponse] = []

    class Config:
        from_attributes = True

class HarvestOverviewKPIs(BaseModel):
    current_biomass_g_l: Optional[float] = None
    harvestable_biomass_kg: Optional[float] = None
    total_harvested_kg: float = 0.0
    latest_harvest_date: Optional[datetime] = None
    harvest_event_count: int = 0
    period_harvested_kg: float = 0.0
    remaining_biomass_g_l: Optional[float] = None
    carbon_associated_kg: Optional[float] = None
    harvestable_status: str = "Biomass available for harvest planning"

class BiomassReadinessResponse(BaseModel):
    pond_id: UUID
    pond_name: str
    biomass_g_per_l: float
    timestamp: datetime
    model_run_id: Optional[UUID] = None
    model_version: str = "v1.0.0"
    confidence_score: float = 0.85
    readiness_label: str = "Biomass available for harvest planning"

# Calibration Workspace Schemas
class SensorCalibrationBase(BaseModel):
    sensor_id: UUID
    performed_by: str = "Technician"
    calibration_method: CalibrationMethod = CalibrationMethod.ZERO_POINT
    reference_standard: Optional[str] = None
    raw_reference_value: float
    expected_reference_value: float
    offset_applied: float = 0.0
    gain_applied: float = 1.0
    pre_calibration_error: Optional[float] = None
    post_calibration_error: Optional[float] = None
    notes: Optional[str] = None
    valid_until: Optional[datetime] = None

class SensorCalibrationCreate(SensorCalibrationBase):
    status: CalibrationStatus = CalibrationStatus.DRAFT

class SensorCalibrationUpdate(BaseModel):
    status: Optional[CalibrationStatus] = None
    performed_by: Optional[str] = None
    calibration_method: Optional[CalibrationMethod] = None
    reference_standard: Optional[str] = None
    raw_reference_value: Optional[float] = None
    expected_reference_value: Optional[float] = None
    offset_applied: Optional[float] = None
    gain_applied: Optional[float] = None
    notes: Optional[str] = None
    valid_until: Optional[datetime] = None

class SensorCalibrationResponse(SensorCalibrationBase):
    id: UUID
    status: CalibrationStatus
    calibrated_at: datetime
    created_at: datetime
    updated_at: datetime
    sensor_type: Optional[str] = None
    sensor_unit: Optional[str] = None
    pond_id: Optional[UUID] = None
    pond_name: Optional[str] = None

    class Config:
        from_attributes = True

class CalibrationCalculationRequest(BaseModel):
    calibration_method: CalibrationMethod = CalibrationMethod.ZERO_POINT
    raw_reference_value: float
    expected_reference_value: float
    secondary_raw_value: Optional[float] = None
    secondary_expected_value: Optional[float] = None

class CalibrationCalculationResponse(BaseModel):
    calibration_method: CalibrationMethod
    offset_applied: float
    gain_applied: float
    pre_calibration_error: float
    post_calibration_error: float
    equation_formula: str

class SensorCalibrationStatusResponse(BaseModel):
    sensor_id: UUID
    pond_id: UUID
    pond_name: Optional[str] = None
    sensor_type: SensorType
    unit: str
    is_simulated: bool
    last_calibrated_at: Optional[datetime] = None
    calibration_status: CalibrationStatus
    active_offset: float = 0.0
    active_gain: float = 1.0
    drift_warning: bool = False
    calibration_due: bool = False

class CalibrationOverviewKPIs(BaseModel):
    total_sensors: int = 0
    active_calibrated_sensors: int = 0
    pending_approval_count: int = 0
    calibration_due_count: int = 0
    drift_alert_count: int = 0
    latest_calibration_date: Optional[datetime] = None



