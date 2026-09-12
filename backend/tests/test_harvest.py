import pytest
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database import Base
from backend.app import models, schemas
from backend.app.api.harvest import create_harvest_event, add_harvest_biomass_fate, get_harvest_overview, get_biomass_readiness
from backend.app.evidence.service import generate_evidence_package
from backend.app.evidence.verifier import verify_package_hash
from fastapi import HTTPException

@pytest.fixture
def db_session():
    engine = create_engine('sqlite:///:memory:')
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Create Farm and Pond
    farm = models.Farm(id=uuid.uuid4(), name="Harvest Farm Test")
    pond = models.Pond(id=uuid.uuid4(), farm_id=farm.id, name="Harvest Pond A", volume_liters=100000.0)
    session.add_all([farm, pond])
    session.commit()

    # Create BiomassEstimate
    m_run = models.ModelRun(
        id=uuid.uuid4(),
        pond_id=pond.id,
        model_version="v1.0.0",
        period_start=datetime.now(timezone.utc) - timedelta(hours=1),
        period_end=datetime.now(timezone.utc),
        parameters={},
        provenance="test"
    )
    b_est = models.BiomassEstimate(
        id=uuid.uuid4(),
        pond_id=pond.id,
        model_run_id=m_run.id,
        timestamp=datetime.now(timezone.utc),
        biomass_g_per_l=2.5,
        light_factor=0.9,
        temp_factor=0.9,
        ph_factor=0.9,
        n_factor=0.9,
        growth_rate=0.05,
        method="monod-droop",
        confidence_score=0.85
    )
    session.add_all([m_run, b_est])
    session.commit()

    yield session
    session.close()

def test_biomass_readiness(db_session):
    pond = db_session.query(models.Pond).first()
    res = get_biomass_readiness(pond.id, db_session)
    assert res.biomass_g_per_l == 2.5
    assert res.readiness_label == "Biomass available for harvest planning"

def test_create_harvest_event(db_session):
    farm = db_session.query(models.Farm).first()
    pond = db_session.query(models.Pond).first()

    event_in = schemas.HarvestEventCreate(
        farm_id=farm.id,
        pond_id=pond.id,
        status=models.HarvestStatus.PLANNED,
        planned_date=datetime.now(timezone.utc),
        harvest_method=models.HarvestMethod.FILTRATION,
        operator="Test Operator",
        estimated_harvest_kg=250.0,
        notes="Test planned harvest"
    )

    event_res = create_harvest_event(event_in, db_session)
    assert event_res.status == models.HarvestStatus.PLANNED
    assert event_res.biomass_before_g_per_l == 2.5
    assert event_res.estimated_harvest_kg == 250.0

def test_biomass_fate_allocation_validation(db_session):
    farm = db_session.query(models.Farm).first()
    pond = db_session.query(models.Pond).first()

    event_in = schemas.HarvestEventCreate(
        farm_id=farm.id,
        pond_id=pond.id,
        status=models.HarvestStatus.COMPLETED,
        planned_date=datetime.now(timezone.utc),
        harvest_date=datetime.now(timezone.utc),
        harvest_method=models.HarvestMethod.CENTRIFUGATION,
        operator="Operator 1",
        estimated_harvest_kg=200.0,
        actual_harvest_kg=200.0
    )
    event_res = create_harvest_event(event_in, db_session)

    # Valid allocation
    fate_in = schemas.HarvestBiomassFateCreate(
        end_use_category=models.EndUseCategory.BIOCHAR,
        quantity_allocated_kg=150.0,
        allocation_pct=75.0,
        destination="Biochar Facility"
    )
    fate_res = add_harvest_biomass_fate(event_res.id, fate_in, db_session)
    assert fate_res.quantity_allocated_kg == 150.0

    # Over-allocation should fail
    excess_fate = schemas.HarvestBiomassFateCreate(
        end_use_category=models.EndUseCategory.BIOPLASTICS,
        quantity_allocated_kg=100.0,
        allocation_pct=50.0,
        destination="Plastic Facility"
    )
    with pytest.raises(HTTPException) as exc_info:
        add_harvest_biomass_fate(event_res.id, excess_fate, db_session)
    assert exc_info.value.status_code == 400

def test_evidence_package_harvest_integration(db_session):
    farm = db_session.query(models.Farm).first()
    pond = db_session.query(models.Pond).first()

    event_in = schemas.HarvestEventCreate(
        farm_id=farm.id,
        pond_id=pond.id,
        status=models.HarvestStatus.COMPLETED,
        planned_date=datetime.now(timezone.utc),
        harvest_date=datetime.now(timezone.utc),
        harvest_method=models.HarvestMethod.FILTRATION,
        operator="Test Operator",
        estimated_harvest_kg=300.0,
        actual_harvest_kg=300.0
    )
    create_harvest_event(event_in, db_session)

    # Generate Evidence Package
    start = datetime.now(timezone.utc) - timedelta(days=1)
    end = datetime.now(timezone.utc) + timedelta(days=1)

    pkg = generate_evidence_package(db_session, farm.id, pond.id, start, end)
    assert pkg.canonical_hash is not None
    assert len(pkg.harvest_evidence_json) == 1
    assert pkg.harvest_evidence_json[0]["actual_harvest_kg"] == 300.0

    # Verify SHA-256 integrity when sealed
    pkg.status = models.PackageStatus.SEALED
    v_res = verify_package_hash(pkg)
    assert v_res["integrity_match"] is True

def test_farm_isolation(db_session):
    farm = db_session.query(models.Farm).first()
    pond = db_session.query(models.Pond).first()

    # Create second farm
    farm_b = models.Farm(id=uuid.uuid4(), name="Farm B Isolation")
    pond_b = models.Pond(id=uuid.uuid4(), farm_id=farm_b.id, name="Pond B")
    db_session.add_all([farm_b, pond_b])
    db_session.commit()

    event_in = schemas.HarvestEventCreate(
        farm_id=farm.id,
        pond_id=pond.id,
        status=models.HarvestStatus.PLANNED,
        planned_date=datetime.now(timezone.utc),
        estimated_harvest_kg=100.0
    )
    create_harvest_event(event_in, db_session)

    overview_farm_b = get_harvest_overview(farm_id=farm_b.id, pond_id=None, db=db_session)
    assert overview_farm_b.harvest_event_count == 0
