import pytest
from uuid import uuid4
import numpy as np
from PIL import Image
import os
from unittest.mock import patch
from app.services import _calculate_green_metrics, _calculate_spatial_grid, perform_visual_analysis
from app.models import QualityClassification, ImagerySourceType, Farm, Pond
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base
from fastapi.testclient import TestClient
from app.main import app

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
    
    from app.database import get_db
    def override_get_db():
        try:
            yield session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    
    yield session
    
    session.close()
    app.dependency_overrides.clear()

@pytest.fixture(scope="module")
def client():
    return TestClient(app)

@pytest.fixture(scope="module")
def test_pond(db_session):
    farm_id = uuid4()
    pond_id = uuid4()
    farm = Farm(id=farm_id, name="Test Farm", location="Test Location")
    pond = Pond(id=pond_id, farm_id=farm_id, name="Test Pond")
    db_session.add(farm)
    db_session.add(pond)
    db_session.commit()
    return pond

def create_mock_image(color="blue", size=(100, 100)):

    if color == "blue":
        return Image.new("RGB", size, (0, 0, 255))
    elif color == "green":
        return Image.new("RGB", size, (0, 255, 0))
    elif color == "mixed":
        # half green, half blue
        img = Image.new("RGB", size, (0, 0, 255))
        draw = img.load()
        for x in range(size[0]//2):
            for y in range(size[1]):
                draw[x, y] = (0, 255, 0)
        return img
    return Image.new("RGB", size, (0,0,0))

def test_calculate_green_metrics():
    # Pure blue image
    img_blue = create_mock_image("blue")
    metrics_blue = _calculate_green_metrics(img_blue, green_threshold=0.05)
    assert metrics_blue["mean_blue"] == 255.0
    assert metrics_blue["mean_green"] == 0.0
    assert metrics_blue["green_pixel_fraction"] == 0.0

    # Pure green image
    img_green = create_mock_image("green")
    metrics_green = _calculate_green_metrics(img_green, green_threshold=0.05)
    assert metrics_green["mean_green"] == 255.0
    assert metrics_green["green_pixel_fraction"] == 1.0
    assert metrics_green["green_dominance"] > 0.05
    
    # Mixed image
    img_mixed = create_mock_image("mixed")
    metrics_mixed = _calculate_green_metrics(img_mixed, green_threshold=0.05)
    assert 0.45 < metrics_mixed["green_pixel_fraction"] < 0.55

def test_calculate_spatial_grid():
    img_mixed = create_mock_image("mixed", size=(300, 300))
    metrics_mixed = _calculate_green_metrics(img_mixed, green_threshold=0.05)
    grid_data, spatial_mean, spatial_std = _calculate_spatial_grid(metrics_mixed["dominance_matrix"], grid_size=3, green_threshold=0.05)
    
    assert len(grid_data) == 9
    
    # Left side should be green (fraction ~ 1.0)
    # Right side should be blue (fraction ~ 0.0)
    # Middle might be split if size=300 and split at 150 (cell width=100)
    # Column 0: x=0 to 100 -> Green (fraction=1.0)
    # Column 1: x=100 to 200 -> Half Green (100 to 150 is Green, 150 to 200 is Blue -> fraction=0.5)
    # Column 2: x=200 to 300 -> Blue (fraction=0.0)
    
    for cell in grid_data:
        if cell["col"] == 0:
            assert cell["green_fraction"] == 1.0
        elif cell["col"] == 1:
            assert cell["green_fraction"] == 0.5
        elif cell["col"] == 2:
            assert cell["green_fraction"] == 0.0

@patch("app.services._load_image")
def test_perform_visual_analysis_blocked(mock_load, client, db_session, test_pond):
    # Setup imagery
    from app.models import ImageryRecord, ImageryProcessing, ImagerySourceType
    imagery_id = uuid4()
    imagery = ImageryRecord(
        id=imagery_id,
        farm_id=test_pond.farm_id,
        pond_id=test_pond.id,
        source_type=ImagerySourceType.SIMULATED,
        filename="test.jpg",
        mime_type="image/jpeg",
        file_size_bytes=1000,
        storage_reference="test",
        sha256_hash="test",
        provenance={}
    )
    db_session.add(imagery)
    
    processing_id = uuid4()
    processing = ImageryProcessing(
        id=processing_id,
        imagery_id=imagery_id,
        processing_version="4.2.0",
        processing_status="COMPLETED",
        quality_classification=QualityClassification.UNSUITABLE,
        original_sha256_hash="test"
    )
    db_session.add(processing)
    db_session.commit()
    
    # Analyze
    analysis = perform_visual_analysis(db_session, processing_id)
    assert analysis.analysis_status == "BLOCKED"
    mock_load.assert_not_called()

@patch("app.services._load_image")
def test_temporal_comparison(mock_load, client, db_session, test_pond):
    # First image analysis (baseline)
    from app.models import ImageryRecord, ImageryProcessing, ImageryAnalysis, AnalysisStatus
    
    im1 = ImageryRecord(
        id=uuid4(), farm_id=test_pond.farm_id, pond_id=test_pond.id,
        source_type=ImagerySourceType.SIMULATED, filename="t1.jpg", mime_type="image/jpeg",
        file_size_bytes=1000, storage_reference="t1", sha256_hash="h1", provenance={}
    )
    p1 = ImageryProcessing(
        id=uuid4(), imagery_id=im1.id, processing_version="4.2.0", processing_status="COMPLETED",
        quality_classification=QualityClassification.GOOD, original_sha256_hash="h1"
    )
    a1 = ImageryAnalysis(
        imagery_id=im1.id, processing_id=p1.id, pond_id=test_pond.id, farm_id=test_pond.farm_id,
        source_type=ImagerySourceType.SIMULATED, analysis_version="4.3.0", roi_method="FULL_IMAGE",
        green_pixel_fraction=0.30, analysis_status=AnalysisStatus.READY
    )
    db_session.add_all([im1, p1, a1])
    db_session.commit()
    
    # Second image
    im2 = ImageryRecord(
        id=uuid4(), farm_id=test_pond.farm_id, pond_id=test_pond.id,
        source_type=ImagerySourceType.SIMULATED, filename="t2.jpg", mime_type="image/jpeg",
        file_size_bytes=1000, storage_reference="t2", sha256_hash="h2", provenance={}
    )
    p2 = ImageryProcessing(
        id=uuid4(), imagery_id=im2.id, processing_version="4.2.0", processing_status="COMPLETED",
        quality_classification=QualityClassification.GOOD, original_sha256_hash="h2",
        processed_storage_reference="test_ref"
    )
    db_session.add_all([im2, p2])
    db_session.commit()
    
    # Mock image 2 as half green (so green_pixel_fraction ~ 0.5)
    mock_load.return_value = create_mock_image("mixed", (100, 100))
    
    analysis = perform_visual_analysis(db_session, p2.id)
    
    assert analysis.baseline_analysis_id == a1.id
    # Absolute change: 0.50 - 0.30 = 0.20
    assert abs(analysis.absolute_change - 0.20) < 0.05
    # Relative change: 0.20 / 0.30 = ~0.66
    assert abs(analysis.relative_change - 0.66) < 0.05
    assert analysis.change_classification == "INCREASE"
