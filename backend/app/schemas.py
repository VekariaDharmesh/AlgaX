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
