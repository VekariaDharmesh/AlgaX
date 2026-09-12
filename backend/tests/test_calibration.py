import pytest
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database import Base
from backend.app import models, schemas
from backend.app.api.calibration import (
    calculate_calibration, get_sensors_calibration_status, create_calibration,
    activate_calibration, approve_calibration, get_calibration_overview
)
from backend.app.main import ingest_reading
from backend.app.evidence.service import generate_evidence_package
from backend.app.evidence.verifier import verify_package_hash

@pytest.fixture
def db_session():
    engine = create_engine('sqlite:///:memory:')
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Create Farm, Pond, and Sensor
    farm = models.Farm(id=uuid.uuid4(), name="Calibration Farm")
    pond = models.Pond(id=uuid.uuid4(), farm_id=farm.id, name="Calibration Pond 1", volume_liters=100000.0)
    sensor = models.Sensor(
        id=uuid.uuid4(),
        pond_id=pond.id,
        type=models.SensorType.ph,
        unit="pH",
        is_simulated=False,
        calibration_status=models.CalibrationStatus.DRAFT
    )
    session.add_all([farm, pond, sensor])
    session.commit()

    yield session
    session.close()

def test_calibration_equation_calculator():
    # Zero Point (Offset shift: expected 7.00 - raw 7.30 = -0.30)
    req_zero = schemas.CalibrationCalculationRequest(
        calibration_method=models.CalibrationMethod.ZERO_POINT,
        raw_reference_value=7.30,
        expected_reference_value=7.00
    )
    res_zero = calculate_calibration(req_zero)
    assert res_zero.offset_applied == pytest.approx(-0.30)
    assert res_zero.gain_applied == 1.0
    assert res_zero.pre_calibration_error == pytest.approx(0.30)

    # Two Point (Gain and Offset shift)
    req_two = schemas.CalibrationCalculationRequest(
        calibration_method=models.CalibrationMethod.TWO_POINT,
        raw_reference_value=4.20,
        expected_reference_value=4.00,
        secondary_raw_value=7.30,
        secondary_expected_value=7.00
    )
    res_two = calculate_calibration(req_two)
    # Gain = (7.0 - 4.0) / (7.3 - 4.2) = 3.0 / 3.1 = 0.9677419
    assert res_two.gain_applied == pytest.approx(0.9677419, abs=1e-4)

def test_sensor_calibration_flow(db_session):
    sensor = db_session.query(models.Sensor).first()
    pond = db_session.query(models.Pond).first()

    # Initial status check
    statuses = get_sensors_calibration_status(pond_id=pond.id, db=db_session)
    assert len(statuses) == 1
    assert statuses[0].calibration_status == models.CalibrationStatus.DRAFT
    assert statuses[0].calibration_due is True

    # Create new ACTIVE calibration
    calib_in = schemas.SensorCalibrationCreate(
        sensor_id=sensor.id,
        performed_by="QA Tech 1",
        calibration_method=models.CalibrationMethod.ZERO_POINT,
        reference_standard="NIST Buffer pH 7.00",
        raw_reference_value=7.25,
        expected_reference_value=7.00,
        offset_applied=-0.25,
        gain_applied=1.0,
        status=models.CalibrationStatus.ACTIVE,
        notes="Zero point shift applied"
    )

    record = create_calibration(calib_in, db_session)
    assert record.offset_applied == pytest.approx(-0.25)
    assert record.status == models.CalibrationStatus.ACTIVE

    # Verify Sensor updated
    db_session.refresh(sensor)
    assert sensor.calibration_status == models.CalibrationStatus.ACTIVE
    assert sensor.last_calibrated_at is not None

def test_raw_telemetry_preservation_and_calibrated_ingest(db_session):
    sensor = db_session.query(models.Sensor).first()
    pond = db_session.query(models.Pond).first()

    # Apply calibration offset -0.50
    calib_in = schemas.SensorCalibrationCreate(
        sensor_id=sensor.id,
        performed_by="Tech 2",
        calibration_method=models.CalibrationMethod.OFFSET_ADJUST,
        reference_standard="Standard Bath",
        raw_reference_value=25.5,
        expected_reference_value=25.0,
        offset_applied=-0.50,
        gain_applied=1.0,
        status=models.CalibrationStatus.ACTIVE
    )
    create_calibration(calib_in, db_session)

    # Ingest reading with raw_value 25.5
    reading_in = schemas.SensorReadingCreate(
        sensor_id=sensor.id,
        pond_id=pond.id,
        timestamp=datetime.now(timezone.utc),
        value=25.5,
        source_type=models.SourceType.measured
    )

    reading = ingest_reading(reading_in, db_session)

    # Verify permanent raw_value preservation and dynamic calibrated_value calculation
    assert reading.raw_value == 25.5
    assert reading.calibrated_value == 25.0 # 25.5 - 0.50
    assert reading.value == 25.0
    assert reading.calibration_offset == -0.50

def test_evidence_package_calibration_chain(db_session):
    farm = db_session.query(models.Farm).first()
    pond = db_session.query(models.Pond).first()
    sensor = db_session.query(models.Sensor).first()

    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=1)
    end_date = now + timedelta(days=1)

    # Ingest telemetry
    r = models.SensorReading(
        id=uuid.uuid4(),
        sensor_id=sensor.id,
        pond_id=pond.id,
        timestamp=now,
        value=7.0,
        raw_value=7.25,
        calibrated_value=7.0,
        quality_flag=models.QualityFlag.ok,
        source_type=models.SourceType.measured
    )
    db_session.add(r)

    # Add calibration record
    calib_in = schemas.SensorCalibrationCreate(
        sensor_id=sensor.id,
        performed_by="Inspector 1",
        calibration_method=models.CalibrationMethod.ZERO_POINT,
        reference_standard="Buffer",
        raw_reference_value=7.25,
        expected_reference_value=7.00,
        status=models.CalibrationStatus.ACTIVE
    )
    create_calibration(calib_in, db_session)

    # Generate evidence package
    pkg = generate_evidence_package(db_session, farm.id, pond.id, start_date, end_date)
    assert pkg is not None
    assert pkg.canonical_hash is not None
    assert len(pkg.calibration_evidence_json) > 0

    # Verify hash integrity
    verification = verify_package_hash(pkg)
    assert verification["integrity_match"] is True
