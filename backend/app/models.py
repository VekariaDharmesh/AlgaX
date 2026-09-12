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

class ImagerySourceType(str, enum.Enum):
    SIMULATED = "SIMULATED"
    DRONE = "DRONE"
    SATELLITE = "SATELLITE"

class ImageryProcessingStatus(str, enum.Enum):
    INGESTED = "INGESTED"

class ImageryRecord(Base):
    __tablename__ = "imagery_record"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farm_id = Column(UUID(as_uuid=True), ForeignKey("farm.id"), nullable=False)
    pond_id = Column(UUID(as_uuid=True), ForeignKey("pond.id"), nullable=False)
    source_type = Column(Enum(ImagerySourceType), nullable=False)
    capture_timestamp = Column(DateTime(timezone=True), nullable=True)
    ingestion_timestamp = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    
    filename = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    file_size_bytes = Column(Float, nullable=False)
    storage_reference = Column(String, nullable=False)
    sha256_hash = Column(String, nullable=False)
    width_px = Column(Float, nullable=True)
    height_px = Column(Float, nullable=True)
    resolution_meters = Column(Float, nullable=True)
    
    processing_status = Column(Enum(ImageryProcessingStatus), default=ImageryProcessingStatus.INGESTED)
    provenance = Column(JSON, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc))

class QualityClassification(str, enum.Enum):
    GOOD = "GOOD"
    REVIEW = "REVIEW"
    UNSUITABLE = "UNSUITABLE"

class ImageQualityFlag(str, enum.Enum):
    BLUR = "BLUR"
    TOO_DARK = "TOO_DARK"
    TOO_BRIGHT = "TOO_BRIGHT"
    LOW_CONTRAST = "LOW_CONTRAST"
    OVEREXPOSED = "OVEREXPOSED"
    UNDEREXPOSED = "UNDEREXPOSED"
    LOW_RESOLUTION = "LOW_RESOLUTION"
    CORRUPTED = "CORRUPTED"
    UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT"
    MISSING_PIXELS = "MISSING_PIXELS"

class ImageryProcessing(Base):
    __tablename__ = "imagery_processing"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    imagery_id = Column(UUID(as_uuid=True), ForeignKey("imagery_record.id"), nullable=False)
    processing_version = Column(String, nullable=False)
    processing_status = Column(String, nullable=False)
    
    processed_storage_reference = Column(String, nullable=True)
    original_sha256_hash = Column(String, nullable=False)
    processed_sha256_hash = Column(String, nullable=True)
    
    original_width_px = Column(Float, nullable=True)
    original_height_px = Column(Float, nullable=True)
    processed_width_px = Column(Float, nullable=True)
    processed_height_px = Column(Float, nullable=True)
    
    color_space = Column(String, nullable=True)
    orientation_corrected = Column(Boolean, nullable=False, default=False)
    resize_applied = Column(Boolean, nullable=False, default=False)
    
    quality_classification = Column(Enum(QualityClassification), nullable=True)
    quality_flags = Column(JSON, nullable=False, default=list)
    quality_metrics = Column(JSON, nullable=True)
    
    preprocessing_metadata = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc))
    
    imagery_record = relationship("ImageryRecord", backref=backref("processings", cascade="all, delete-orphan"))


class AnalysisStatus(str, enum.Enum):
    READY = "READY"
    REVIEW = "REVIEW"
    BLOCKED = "BLOCKED"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"

class TemporalChangeClassification(str, enum.Enum):
    INCREASE = "INCREASE"
    DECREASE = "DECREASE"
    STABLE = "STABLE"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"

class ImageryAnalysis(Base):
    __tablename__ = "imagery_analysis"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    imagery_id = Column(UUID(as_uuid=True), ForeignKey("imagery_record.id"), nullable=False)
    processing_id = Column(UUID(as_uuid=True), ForeignKey("imagery_processing.id"), nullable=False)
    pond_id = Column(UUID(as_uuid=True), ForeignKey("pond.id"), nullable=False)
    farm_id = Column(UUID(as_uuid=True), ForeignKey("farm.id"), nullable=False)
    source_type = Column(Enum(ImagerySourceType), nullable=False)
    
    analysis_version = Column(String, nullable=False)
    roi_method = Column(String, nullable=False)
    
    mean_red = Column(Float, nullable=True)
    mean_green = Column(Float, nullable=True)
    mean_blue = Column(Float, nullable=True)
    green_dominance = Column(Float, nullable=True)
    green_pixel_fraction = Column(Float, nullable=True)
    valid_pixel_fraction = Column(Float, nullable=True)
    spatial_mean = Column(Float, nullable=True)
    spatial_std = Column(Float, nullable=True)
    grid_data = Column(JSON, nullable=True)
    
    analysis_status = Column(Enum(AnalysisStatus), nullable=False, default=AnalysisStatus.READY)
    
    baseline_analysis_id = Column(UUID(as_uuid=True), ForeignKey("imagery_analysis.id"), nullable=True)
    absolute_change = Column(Float, nullable=True)
    relative_change = Column(Float, nullable=True)
    change_classification = Column(Enum(TemporalChangeClassification), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc))
    
    imagery_record = relationship("ImageryRecord", backref=backref("analyses", cascade="all, delete-orphan"))
    processing_record = relationship("ImageryProcessing", backref=backref("analyses", cascade="all, delete-orphan"))
    baseline_analysis = relationship("ImageryAnalysis", remote_side=[id], backref=backref("comparisons", cascade="all, delete-orphan"))


class TemporalAlignmentStatus(str, enum.Enum):
    GOOD = "GOOD"
    REVIEW = "REVIEW"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"

class ValidationResultStatus(str, enum.Enum):
    CONSISTENT = "CONSISTENT"
    PARTIALLY_CONSISTENT = "PARTIALLY_CONSISTENT"
    INCONSISTENT = "INCONSISTENT"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"

class ValidationConfidence(str, enum.Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class CrossValidationRun(Base):
    __tablename__ = "cross_validation_run"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farm_id = Column(UUID(as_uuid=True), ForeignKey("farm.id"), nullable=False)
    pond_id = Column(UUID(as_uuid=True), ForeignKey("pond.id"), nullable=False)
    model_run_id = Column(UUID(as_uuid=True), ForeignKey("model_run.id"), nullable=True)
    imagery_analysis_id = Column(UUID(as_uuid=True), ForeignKey("imagery_analysis.id"), nullable=True)
    
    comparison_window_start = Column(DateTime(timezone=True), nullable=True)
    comparison_window_end = Column(DateTime(timezone=True), nullable=True)
    
    model_trend = Column(Enum(TemporalChangeClassification), nullable=True)
    imagery_trend = Column(Enum(TemporalChangeClassification), nullable=True)
    
    model_change = Column(Float, nullable=True)
    imagery_change = Column(Float, nullable=True)
    
    temporal_alignment_status = Column(Enum(TemporalAlignmentStatus), nullable=False)
    result_status = Column(Enum(ValidationResultStatus), nullable=False)
    confidence = Column(Enum(ValidationConfidence), nullable=False)
    
    evidence_summary = Column(String, nullable=False)
    provenance_json = Column(JSON, nullable=False)
    engine_version = Column(String, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))

class PackageStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    READY_FOR_REVIEW = "READY_FOR_REVIEW"
    INCOMPLETE = "INCOMPLETE"

class CompletenessClassification(str, enum.Enum):
    COMPLETE = "COMPLETE"
    PARTIAL = "PARTIAL"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"

class ReviewState(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_REVIEW = "IN_REVIEW"
    NEEDS_ATTENTION = "NEEDS_ATTENTION"
    READY_FOR_EXTERNAL_REVIEW = "READY_FOR_EXTERNAL_REVIEW"
    CLOSED = "CLOSED"

class ReviewActionType(str, enum.Enum):
    START_REVIEW = "START_REVIEW"
    FLAG_FOR_ATTENTION = "FLAG_FOR_ATTENTION"
    MARK_REVIEWED = "MARK_REVIEWED"
    REQUEST_MORE_EVIDENCE = "REQUEST_MORE_EVIDENCE"
    CLOSE_REVIEW = "CLOSE_REVIEW"

class EvidencePackage(Base):
    __tablename__ = "evidence_package"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    farm_id = Column(UUID(as_uuid=True), ForeignKey("farm.id"), nullable=False)
    pond_id = Column(UUID(as_uuid=True), ForeignKey("pond.id"), nullable=False)
    
    reporting_period_start = Column(DateTime(timezone=True), nullable=False)
    reporting_period_end = Column(DateTime(timezone=True), nullable=False)
    
    package_version = Column(String, nullable=False, default="5.1.0")
    status = Column(Enum(PackageStatus, create_type=False), nullable=False, default=PackageStatus.DRAFT)
    completeness = Column(Enum(CompletenessClassification, create_type=False), nullable=False, default=CompletenessClassification.INSUFFICIENT_EVIDENCE)
    review_state = Column(Enum(ReviewState, create_type=False), nullable=False, default=ReviewState.NOT_STARTED)
    
    sensor_evidence_json = Column(JSON, nullable=False, default=list)
    model_evidence_json = Column(JSON, nullable=False, default=list)
    carbon_evidence_json = Column(JSON, nullable=False, default=list)
    anomaly_evidence_json = Column(JSON, nullable=False, default=list)
    imagery_evidence_json = Column(JSON, nullable=False, default=list)
    cross_validation_evidence_json = Column(JSON, nullable=False, default=list)
    limitations_json = Column(JSON, nullable=False, default=list)
    
    canonical_hash = Column(String, nullable=True)
    contains_simulated_data = Column(Boolean, nullable=False, default=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc))

class ReviewAction(Base):
    __tablename__ = "review_action"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    package_id = Column(UUID(as_uuid=True), ForeignKey("evidence_package.id"), nullable=False)
    actor = Column(String, nullable=False)
    action = Column(Enum(ReviewActionType, create_type=False), nullable=False)
    note = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))

