import uuid
import datetime
import enum
from sqlalchemy import Column, String, Float, Boolean, ForeignKey, DateTime, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from .database import Base

class PondStatus(str, enum.Enum):
    active = "active"
    harvested = "harvested"
    offline = "offline"

class SensorType(str, enum.Enum):
    temperature = "temperature"
    ph = "ph"
    dissolved_oxygen = "dissolved_oxygen"
    turbidity = "turbidity"
    light = "light"
    conductivity = "conductivity"
    water_level = "water_level"
    nitrogen = "nitrogen"
    biomass = "biomass"

class QualityFlag(str, enum.Enum):
    ok = "ok"
    outlier = "outlier"
    missing = "missing"
    interpolated = "interpolated"

class SourceType(str, enum.Enum):
    measured = "measured"
    simulated = "simulated"

class Farm(Base):
    __tablename__ = "farm"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    location = Column(String, nullable=True)
    owner_user_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))

    ponds = relationship("Pond", back_populates="farm")

class Pond(Base):
    __tablename__ = "pond"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farm_id = Column(UUID(as_uuid=True), ForeignKey("farm.id"), nullable=False)
    name = Column(String, nullable=False)
    volume_liters = Column(Float, nullable=True)
    species = Column(String, nullable=True)
    status = Column(Enum(PondStatus), default=PondStatus.active)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))

    farm = relationship("Farm", back_populates="ponds")
    sensors = relationship("Sensor", back_populates="pond")

class Sensor(Base):
    __tablename__ = "sensor"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pond_id = Column(UUID(as_uuid=True), ForeignKey("pond.id"), nullable=False)
    type = Column(Enum(SensorType), nullable=False)
    unit = Column(String, nullable=False)
    is_simulated = Column(Boolean, nullable=False, default=True)
    calibration_metadata = Column(JSON, nullable=True)

    pond = relationship("Pond", back_populates="sensors")
    readings = relationship("SensorReading", back_populates="sensor")

class SensorReading(Base):
    __tablename__ = "sensor_reading"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sensor_id = Column(UUID(as_uuid=True), ForeignKey("sensor.id"), nullable=False)
    pond_id = Column(UUID(as_uuid=True), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    value = Column(Float, nullable=False)
    quality_flag = Column(Enum(QualityFlag), nullable=False, default=QualityFlag.ok)
    source_type = Column(Enum(SourceType), nullable=False, default=SourceType.simulated)

    sensor = relationship("Sensor", back_populates="readings")

class ModelRunStatus(str, enum.Enum):
    success = "success"
    failed = "failed"

class EnvironmentalSnapshot(Base):
    __tablename__ = "environmental_snapshot"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pond_id = Column(UUID(as_uuid=True), ForeignKey("pond.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    temperature = Column(Float, nullable=True)
    ph = Column(Float, nullable=True)
    nitrogen = Column(Float, nullable=True)
    dissolved_oxygen = Column(Float, nullable=True)
    light = Column(Float, nullable=True)
    turbidity = Column(Float, nullable=True)
    water_level = Column(Float, nullable=True)
    provenance = Column(String, default="aggregated")

class ModelRun(Base):
    __tablename__ = "model_run"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pond_id = Column(UUID(as_uuid=True), ForeignKey("pond.id"), nullable=False)
    model_version = Column(String, nullable=False)
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    parameters = Column(JSON, nullable=False)
    execution_timestamp = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))
    status = Column(Enum(ModelRunStatus), default=ModelRunStatus.success)
    provenance = Column(String, nullable=False)

    biomass_estimates = relationship("BiomassEstimate", back_populates="model_run")
    carbon_estimates = relationship("CarbonEstimate", back_populates="model_run")

class BiomassEstimate(Base):
    __tablename__ = "biomass_estimate"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pond_id = Column(UUID(as_uuid=True), ForeignKey("pond.id"), nullable=False)
    model_run_id = Column(UUID(as_uuid=True), ForeignKey("model_run.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    biomass_g_per_l = Column(Float, nullable=False)
    light_factor = Column(Float, nullable=False)
    temp_factor = Column(Float, nullable=False)
    ph_factor = Column(Float, nullable=False)
    n_factor = Column(Float, nullable=False)
    growth_rate = Column(Float, nullable=False)
    method = Column(String, nullable=False)
    confidence_score = Column(Float, nullable=False)

    model_run = relationship("ModelRun", back_populates="biomass_estimates")

class CarbonEstimate(Base):
    __tablename__ = "carbon_estimate"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pond_id = Column(UUID(as_uuid=True), ForeignKey("pond.id"), nullable=False)
    model_run_id = Column(UUID(as_uuid=True), ForeignKey("model_run.id"), nullable=False)
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    gross_co2_kg = Column(Float, nullable=False)
    retained_co2_kg = Column(Float, nullable=True)
    operational_emissions_kg = Column(Float, nullable=True)
    net_carbon_removed_kg = Column(Float, nullable=True)
    realized_c_fraction = Column(Float, nullable=False)
    end_use = Column(String, nullable=False, default="unspecified")
    permanence_horizon_label = Column(String, nullable=True)
    confidence_score = Column(Float, nullable=False)

    model_run = relationship("ModelRun", back_populates="carbon_estimates")
