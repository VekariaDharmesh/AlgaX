import pytest
from uuid import uuid4
from datetime import datetime, timezone, timedelta
from app import models, services
from app.models import (
    TemporalAlignmentStatus,
    ValidationResultStatus,
    TemporalChangeClassification,
    QualityClassification,
    AnalysisStatus,
    Farm, Pond
)
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base

@pytest.fixture(scope="module")
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

@pytest.fixture(scope="module")
def setup_test_pond(db_session):
    farm_id = uuid4()
    pond_id = uuid4()
    farm = Farm(id=farm_id, name="Test Farm", location="Test Location")
    pond = Pond(id=pond_id, farm_id=farm_id, name="Test Pond")
    db_session.add(farm)
    db_session.add(pond)
    db_session.commit()
    return pond

def test_cross_validation_consistent(db_session, setup_test_pond):
    pond = setup_test_pond
    farm_id = pond.farm_id
    
    # Create Model Run & Biomass Estimates (INCREASE)
    base_time = datetime.now(timezone.utc) - timedelta(days=2)
    model_run = models.ModelRun(
        id=uuid4(), pond_id=pond.id, model_version="1.0",
        period_start=base_time, period_end=base_time + timedelta(days=1),
        parameters={}, provenance="test"
    )
    db_session.add(model_run)
    db_session.commit()
    
    b1 = models.BiomassEstimate(
        pond_id=pond.id, model_run_id=model_run.id, timestamp=base_time,
        biomass_g_per_l=1.0, light_factor=1, temp_factor=1, ph_factor=1, n_factor=1, growth_rate=0.1, method="test", confidence_score=0.9
    )
    b2 = models.BiomassEstimate(
        pond_id=pond.id, model_run_id=model_run.id, timestamp=base_time + timedelta(days=1),
        biomass_g_per_l=1.2, light_factor=1, temp_factor=1, ph_factor=1, n_factor=1, growth_rate=0.1, method="test", confidence_score=0.9
    )
    db_session.add_all([b1, b2])
    
    # Create Imagery records (INCREASE)
    img1 = models.ImageryRecord(
        farm_id=farm_id, pond_id=pond.id, source_type="DRONE", filename="t1.jpg", mime_type="image/jpeg",
        file_size_bytes=100, storage_reference="s1", sha256_hash="h1", processing_status="INGESTED", provenance={},
        capture_timestamp=base_time
    )
    img2 = models.ImageryRecord(
        farm_id=farm_id, pond_id=pond.id, source_type="DRONE", filename="t2.jpg", mime_type="image/jpeg",
        file_size_bytes=100, storage_reference="s2", sha256_hash="h2", processing_status="INGESTED", provenance={},
        capture_timestamp=base_time + timedelta(days=1)
    )
    db_session.add_all([img1, img2])
    db_session.commit()
    
    p1 = models.ImageryProcessing(
        imagery_id=img1.id, processing_version="1", processing_status="COMPLETED",
        original_sha256_hash="h1", quality_classification=QualityClassification.GOOD, quality_flags=[]
    )
    p2 = models.ImageryProcessing(
        imagery_id=img2.id, processing_version="1", processing_status="COMPLETED",
        original_sha256_hash="h2", quality_classification=QualityClassification.GOOD, quality_flags=[]
    )
    db_session.add_all([p1, p2])
    db_session.commit()
    
    a1 = models.ImageryAnalysis(
        imagery_id=img1.id, processing_id=p1.id, pond_id=pond.id, farm_id=farm_id, source_type="DRONE",
        analysis_version="1", roi_method="F", analysis_status=AnalysisStatus.READY,
        green_pixel_fraction=0.10, created_at=base_time
    )
    db_session.add(a1)
    db_session.commit()
    
    a2 = models.ImageryAnalysis(
        imagery_id=img2.id, processing_id=p2.id, pond_id=pond.id, farm_id=farm_id, source_type="DRONE",
        analysis_version="1", roi_method="F", analysis_status=AnalysisStatus.READY,
        green_pixel_fraction=0.20, baseline_analysis_id=a1.id,
        absolute_change=0.10, change_classification=TemporalChangeClassification.INCREASE,
        created_at=base_time + timedelta(days=1)
    )
    db_session.add(a2)
    db_session.commit()
    
    # Run Cross Validation
    cv = services.perform_cross_validation(db_session, pond.id, a2.id)
    assert cv.temporal_alignment_status == TemporalAlignmentStatus.GOOD
    assert cv.model_trend == TemporalChangeClassification.INCREASE
    assert cv.imagery_trend == TemporalChangeClassification.INCREASE
    assert cv.result_status == ValidationResultStatus.CONSISTENT
