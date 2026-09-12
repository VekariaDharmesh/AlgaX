import uuid
import datetime
import enum
from sqlalchemy import Column, String, Float, Boolean, ForeignKey, DateTime, Enum, JSON
from sqlalchemy.orm import relationship, backref
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

class AnomalyType(str, enum.Enum):
    OUT_OF_RANGE = "OUT_OF_RANGE"
    SUDDEN_SPIKE = "SUDDEN_SPIKE"
    SUDDEN_DROP = "SUDDEN_DROP"
    RATE_OF_CHANGE = "RATE_OF_CHANGE"
    STALE_VALUE = "STALE_VALUE"
    SENSOR_DROPOUT = "SENSOR_DROPOUT"
    ENVIRONMENTAL = "ENVIRONMENTAL" # For 3.2
    TEMPERATURE_STRESS = "TEMPERATURE_STRESS"
    OXYGEN_STRESS = "OXYGEN_STRESS"
    PH_INSTABILITY = "PH_INSTABILITY"
    NUTRIENT_DEPLETION = "NUTRIENT_DEPLETION"
    WATER_LEVEL_ANOMALY = "WATER_LEVEL_ANOMALY"
    LIGHT_ANOMALY = "LIGHT_ANOMALY"
    ENVIRONMENTAL_COMBINATION = "ENVIRONMENTAL_COMBINATION"
    GROWTH_SUPPRESSION = "GROWTH_SUPPRESSION"
    GROWTH_ACCELERATION = "GROWTH_ACCELERATION"
    BIOMASS_DEVIATION = "BIOMASS_DEVIATION"
    EXPECTED_GROWTH_MISMATCH = "EXPECTED_GROWTH_MISMATCH"
    BIOMASS_PLATEAU = "BIOMASS_PLATEAU"
    BIOMASS_DECLINE = "BIOMASS_DECLINE"
    BIOLOGICAL_RESPONSE_MISMATCH = "BIOLOGICAL_RESPONSE_MISMATCH"

class AnomalySeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class AnomalyStatus(str, enum.Enum):
    OPEN = "OPEN"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"

class Anomaly(Base):
    __tablename__ = "anomaly"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farm_id = Column(UUID(as_uuid=True), ForeignKey("farm.id"), nullable=True)
    pond_id = Column(UUID(as_uuid=True), ForeignKey("pond.id"), nullable=False)
    sensor_id = Column(UUID(as_uuid=True), ForeignKey("sensor.id"), nullable=True)
    sensor_type = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False) # Event time
    detected_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    anomaly_type = Column(Enum(AnomalyType), nullable=False)
    severity = Column(Enum(AnomalySeverity), nullable=False)
    confidence_score = Column(Float, nullable=False)
    
    observed_value = Column(Float, nullable=True)
    expected_value = Column(Float, nullable=True)
    deviation = Column(Float, nullable=True)
    
    description = Column(String, nullable=False)
    source_provenance = Column(String, nullable=False)
    status = Column(Enum(AnomalyStatus), nullable=False, default=AnomalyStatus.OPEN)
    
    # Phase 3.2/3.4 
    limiting_factor = Column(String, nullable=True)
    explanation = Column(JSON, nullable=True)

class EvidenceStrength(str, enum.Enum):
    INSUFFICIENT = "INSUFFICIENT"
    WEAK = "WEAK"
    MODERATE = "MODERATE"
    STRONG = "STRONG"

class AnomalyExplanation(Base):
    __tablename__ = "anomaly_explanation"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    anomaly_id = Column(UUID(as_uuid=True), ForeignKey("anomaly.id"), nullable=False, unique=True)
    farm_id = Column(UUID(as_uuid=True), ForeignKey("farm.id"), nullable=True)
    pond_id = Column(UUID(as_uuid=True), ForeignKey("pond.id"), nullable=False)
    
    summary = Column(String, nullable=False)
    details = Column(String, nullable=False)
    
    primary_factor = Column(String, nullable=True)
    contributing_factors_json = Column(JSON, nullable=False, default=list)
    supporting_evidence_json = Column(JSON, nullable=False, default=list)
    contradicting_evidence_json = Column(JSON, nullable=False, default=list)
    
    confidence = Column(Float, nullable=False)
    evidence_strength = Column(Enum(EvidenceStrength), nullable=False)
    
    analysis_start = Column(DateTime(timezone=True), nullable=False)
    analysis_end = Column(DateTime(timezone=True), nullable=False)
    
    model_run_id = Column(UUID(as_uuid=True), ForeignKey("model_run.id"), nullable=True)
    model_version = Column(String, nullable=False)
    explanation_version = Column(String, nullable=False)
    
    data_quality_notes = Column(JSON, nullable=False, default=list)
    uncertainty_notes = Column(JSON, nullable=False, default=list)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))

    anomaly = relationship("Anomaly", backref=backref("explanation_record", uselist=False))

