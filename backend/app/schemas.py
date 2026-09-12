from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from .models import SensorType, QualityFlag, SourceType, PondStatus

class SensorReadingCreate(BaseModel):
    sensor_id: UUID
    pond_id: UUID
    timestamp: datetime
    value: float
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
