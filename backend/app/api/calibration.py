import uuid
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user, check_farm_isolation

router = APIRouter()

def calculate_calibration_equation(
    method: models.CalibrationMethod,
    raw_ref: float,
    expected_ref: float,
    sec_raw: Optional[float] = None,
    sec_exp: Optional[float] = None
):
    offset = expected_ref - raw_ref
    gain = 1.0
    
    if method == models.CalibrationMethod.SPAN or method == models.CalibrationMethod.LINEAR_REGRESSION:
        if raw_ref != 0:
            gain = expected_ref / raw_ref
            offset = 0.0
    elif method == models.CalibrationMethod.TWO_POINT:
        if sec_raw is not None and sec_exp is not None and (sec_raw != raw_ref):
            gain = (sec_exp - expected_ref) / (sec_raw - raw_ref)
            offset = expected_ref - (gain * raw_ref)
    
    pre_error = abs(raw_ref - expected_ref)
    post_error = abs((raw_ref * gain + offset) - expected_ref)
    
    formula = f"y = ({gain:.4f} * x) + ({offset:.4f})" if offset >= 0 else f"y = ({gain:.4f} * x) - ({abs(offset):.4f})"
    
    return {
        "offset_applied": offset,
        "gain_applied": gain,
        "pre_calibration_error": pre_error,
        "post_calibration_error": post_error,
        "equation_formula": formula
    }

@router.post("/calibrations/calculate", response_model=schemas.CalibrationCalculationResponse)
def calculate_calibration(payload: schemas.CalibrationCalculationRequest):
    res = calculate_calibration_equation(
        method=payload.calibration_method,
        raw_ref=payload.raw_reference_value,
        expected_ref=payload.expected_reference_value,
        sec_raw=payload.secondary_raw_value,
        sec_exp=payload.secondary_expected_value
    )
    return schemas.CalibrationCalculationResponse(
        calibration_method=payload.calibration_method,
        offset_applied=res["offset_applied"],
        gain_applied=res["gain_applied"],
        pre_calibration_error=res["pre_calibration_error"],
        post_calibration_error=res["post_calibration_error"],
        equation_formula=res["equation_formula"]
    )

@router.get("/calibrations", response_model=dict)
def get_calibrations(
    sensor_id: Optional[uuid.UUID] = None,
    pond_id: Optional[uuid.UUID] = None,
    farm_id: Optional[uuid.UUID] = None,
    status: Optional[models.CalibrationStatus] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    if pond_id and farm_id:
        pond = db.query(models.Pond).filter(models.Pond.id == pond_id, models.Pond.farm_id == farm_id).first()
        if not pond:
            raise HTTPException(status_code=404, detail="Pond does not belong to specified farm")
        check_farm_isolation(user, farm_id)
    elif pond_id:
        pond = db.query(models.Pond).filter(models.Pond.id == pond_id).first()
        if pond:
            check_farm_isolation(user, pond.farm_id)
    elif farm_id:
        check_farm_isolation(user, farm_id)
    elif user.role == models.UserRole.FARM_OPERATOR and user.assigned_farm_id:
        farm_id = user.assigned_farm_id

    query = db.query(models.SensorCalibrationRecord).options(
        joinedload(models.SensorCalibrationRecord.sensor).joinedload(models.Sensor.pond)
    )

    if sensor_id:
        query = query.filter(models.SensorCalibrationRecord.sensor_id == sensor_id)
    if status:
        query = query.filter(models.SensorCalibrationRecord.status == status)
    if pond_id:
        query = query.join(models.Sensor).filter(models.Sensor.pond_id == pond_id)
    elif farm_id:
        query = query.join(models.Sensor).join(models.Pond).filter(models.Pond.farm_id == farm_id)

    total = query.count()
    records = query.order_by(desc(models.SensorCalibrationRecord.calibrated_at))\
                   .offset((page - 1) * page_size)\
                   .limit(page_size).all()

    items = []
    for r in records:
        resp = schemas.SensorCalibrationResponse.model_validate(r)
        if r.sensor:
            resp.sensor_type = r.sensor.type.value if hasattr(r.sensor.type, 'value') else str(r.sensor.type)
            resp.sensor_unit = r.sensor.unit
            resp.pond_id = r.sensor.pond_id
            if r.sensor.pond:
                resp.pond_name = r.sensor.pond.name
        items.append(resp)

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_next": (page * page_size) < total,
        "items": items
    }

@router.get("/calibrations/overview", response_model=schemas.CalibrationOverviewKPIs)
def get_calibration_overview(
    farm_id: Optional[uuid.UUID] = None,
    pond_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    if pond_id and farm_id:
        pond = db.query(models.Pond).filter(models.Pond.id == pond_id, models.Pond.farm_id == farm_id).first()
        if not pond:
            raise HTTPException(status_code=404, detail="Pond does not belong to specified farm")
        check_farm_isolation(user, farm_id)
    elif pond_id:
        pond = db.query(models.Pond).filter(models.Pond.id == pond_id).first()
        if pond:
            check_farm_isolation(user, pond.farm_id)
    elif farm_id:
        check_farm_isolation(user, farm_id)
    elif user.role == models.UserRole.FARM_OPERATOR and user.assigned_farm_id:
        farm_id = user.assigned_farm_id

    sensor_query = db.query(models.Sensor).options(joinedload(models.Sensor.pond))
    if pond_id:
        sensor_query = sensor_query.filter(models.Sensor.pond_id == pond_id)
    elif farm_id:
        sensor_query = sensor_query.join(models.Pond).filter(models.Pond.farm_id == farm_id)

    sensors = sensor_query.all()
    total_sensors = len(sensors)

    sensor_ids = [s.id for s in sensors]
    active_calibrated = 0
    pending_approval = 0
    calibration_due = 0
    drift_alerts = 0
    latest_date = None

    now = datetime.now(timezone.utc)

    if sensor_ids:
        # Calibrations query
        calib_records = db.query(models.SensorCalibrationRecord).filter(
            models.SensorCalibrationRecord.sensor_id.in_(sensor_ids)
        ).all()

        for r in calib_records:
            if r.status == models.CalibrationStatus.PENDING_APPROVAL:
                pending_approval += 1
            if r.calibrated_at:
                if latest_date is None or r.calibrated_at > latest_date:
                    latest_date = r.calibrated_at
            if r.pre_calibration_error and r.pre_calibration_error > 2.0:
                drift_alerts += 1

        for s in sensors:
            if s.calibration_status == models.CalibrationStatus.ACTIVE:
                active_calibrated += 1
            
            # Due check: if never calibrated or last calibrated > 30 days ago
            if not s.last_calibrated_at or (now - s.last_calibrated_at.replace(tzinfo=timezone.utc) > timedelta(days=30)):
                calibration_due += 1

    return schemas.CalibrationOverviewKPIs(
        total_sensors=total_sensors,
        active_calibrated_sensors=active_calibrated,
        pending_approval_count=pending_approval,
        calibration_due_count=calibration_due,
        drift_alert_count=drift_alerts,
        latest_calibration_date=latest_date
    )

@router.get("/sensors/calibration-status", response_model=List[schemas.SensorCalibrationStatusResponse])
def get_sensors_calibration_status(
    pond_id: Optional[uuid.UUID] = None,
    farm_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    if pond_id and farm_id:
        pond = db.query(models.Pond).filter(models.Pond.id == pond_id, models.Pond.farm_id == farm_id).first()
        if not pond:
            raise HTTPException(status_code=404, detail="Pond does not belong to specified farm")
        check_farm_isolation(user, farm_id)
    elif pond_id:
        pond = db.query(models.Pond).filter(models.Pond.id == pond_id).first()
        if pond:
            check_farm_isolation(user, pond.farm_id)
    elif farm_id:
        check_farm_isolation(user, farm_id)
    elif user.role == models.UserRole.FARM_OPERATOR and user.assigned_farm_id:
        farm_id = user.assigned_farm_id

    query = db.query(models.Sensor).options(joinedload(models.Sensor.pond))
    if pond_id:
        query = query.filter(models.Sensor.pond_id == pond_id)
    elif farm_id:
        query = query.join(models.Pond).filter(models.Pond.farm_id == farm_id)

    sensors = query.all()
    sensor_ids = [s.id for s in sensors]
    active_recs_map = {}
    if sensor_ids:
        active_recs = db.query(models.SensorCalibrationRecord).filter(
            models.SensorCalibrationRecord.sensor_id.in_(sensor_ids),
            models.SensorCalibrationRecord.status == models.CalibrationStatus.ACTIVE
        ).order_by(desc(models.SensorCalibrationRecord.calibrated_at)).all()
        for r in active_recs:
            if r.sensor_id not in active_recs_map:
                active_recs_map[r.sensor_id] = r

    results = []
    now = datetime.now(timezone.utc)

    for s in sensors:
        active_rec = active_recs_map.get(s.id)
        active_offset = active_rec.offset_applied if active_rec else 0.0
        active_gain = active_rec.gain_applied if active_rec else 1.0

        due = False
        if not s.last_calibrated_at:
            due = True
        else:
            last_cal = s.last_calibrated_at.astimezone(timezone.utc) if s.last_calibrated_at.tzinfo is not None else s.last_calibrated_at.replace(tzinfo=timezone.utc)
            if now - last_cal > timedelta(days=30):
                due = True

        drift = False
        if active_rec and active_rec.pre_calibration_error and active_rec.pre_calibration_error > 2.0:
            drift = True

        results.append(schemas.SensorCalibrationStatusResponse(
            sensor_id=s.id,
            pond_id=s.pond_id,
            pond_name=s.pond.name if s.pond else None,
            sensor_type=s.type,
            unit=s.unit,
            is_simulated=s.is_simulated,
            last_calibrated_at=s.last_calibrated_at,
            calibration_status=s.calibration_status or models.CalibrationStatus.DRAFT,
            active_offset=active_offset,
            active_gain=active_gain,
            drift_warning=drift,
            calibration_due=due
        ))

    return results

@router.post("/calibrations", response_model=schemas.SensorCalibrationResponse)
def create_calibration(
    payload: schemas.SensorCalibrationCreate,
    db: Session = Depends(get_db)
):
    sensor = db.query(models.Sensor).filter(models.Sensor.id == payload.sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")

    # Auto-calculate offset and gain if needed
    calc = calculate_calibration_equation(
        method=payload.calibration_method,
        raw_ref=payload.raw_reference_value,
        expected_ref=payload.expected_reference_value
    )

    offset = payload.offset_applied if payload.offset_applied != 0.0 else calc["offset_applied"]
    gain = payload.gain_applied if payload.gain_applied != 1.0 else calc["gain_applied"]
    pre_err = payload.pre_calibration_error if payload.pre_calibration_error is not None else calc["pre_calibration_error"]
    post_err = payload.post_calibration_error if payload.post_calibration_error is not None else calc["post_calibration_error"]

    now = datetime.now(timezone.utc)
    record = models.SensorCalibrationRecord(
        id=uuid.uuid4(),
        sensor_id=payload.sensor_id,
        performed_by=payload.performed_by,
        calibration_method=payload.calibration_method,
        reference_standard=payload.reference_standard,
        raw_reference_value=payload.raw_reference_value,
        expected_reference_value=payload.expected_reference_value,
        offset_applied=offset,
        gain_applied=gain,
        pre_calibration_error=pre_err,
        post_calibration_error=post_err,
        status=payload.status,
        notes=payload.notes,
        calibrated_at=now,
        valid_until=payload.valid_until or (now + timedelta(days=90))
    )

    db.add(record)

    if payload.status == models.CalibrationStatus.ACTIVE:
        # Supersede existing active calibrations
        db.query(models.SensorCalibrationRecord).filter(
            models.SensorCalibrationRecord.sensor_id == payload.sensor_id,
            models.SensorCalibrationRecord.id != record.id,
            models.SensorCalibrationRecord.status == models.CalibrationStatus.ACTIVE
        ).update({"status": models.CalibrationStatus.SUPERSEDED})

        sensor.last_calibrated_at = now
        sensor.calibration_status = models.CalibrationStatus.ACTIVE

    db.commit()
    db.refresh(record)

    resp = schemas.SensorCalibrationResponse.model_validate(record)
    resp.sensor_type = sensor.type.value if hasattr(sensor.type, 'value') else str(sensor.type)
    resp.sensor_unit = sensor.unit
    resp.pond_id = sensor.pond_id
    if sensor.pond:
        resp.pond_name = sensor.pond.name

    return resp

@router.get("/calibrations/{calibration_id}", response_model=schemas.SensorCalibrationResponse)
def get_calibration(
    calibration_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    record = db.query(models.SensorCalibrationRecord).options(
        joinedload(models.SensorCalibrationRecord.sensor).joinedload(models.Sensor.pond)
    ).filter(models.SensorCalibrationRecord.id == calibration_id).first()

    if not record:
        raise HTTPException(status_code=404, detail="Calibration record not found")

    resp = schemas.SensorCalibrationResponse.model_validate(record)
    if record.sensor:
        resp.sensor_type = record.sensor.type.value if hasattr(record.sensor.type, 'value') else str(record.sensor.type)
        resp.sensor_unit = record.sensor.unit
        resp.pond_id = record.sensor.pond_id
        if record.sensor.pond:
            resp.pond_name = record.sensor.pond.name

    return resp

@router.post("/calibrations/{calibration_id}/activate", response_model=schemas.SensorCalibrationResponse)
def activate_calibration(
    calibration_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    record = db.query(models.SensorCalibrationRecord).filter(models.SensorCalibrationRecord.id == calibration_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Calibration record not found")

    sensor = db.query(models.Sensor).filter(models.Sensor.id == record.sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")

    now = datetime.now(timezone.utc)

    # Supersede older active records for this sensor
    db.query(models.SensorCalibrationRecord).filter(
        models.SensorCalibrationRecord.sensor_id == sensor.id,
        models.SensorCalibrationRecord.id != record.id,
        models.SensorCalibrationRecord.status == models.CalibrationStatus.ACTIVE
    ).update({"status": models.CalibrationStatus.SUPERSEDED})

    record.status = models.CalibrationStatus.ACTIVE
    record.calibrated_at = now
    sensor.last_calibrated_at = now
    sensor.calibration_status = models.CalibrationStatus.ACTIVE

    db.commit()
    db.refresh(record)

    resp = schemas.SensorCalibrationResponse.model_validate(record)
    resp.sensor_type = sensor.type.value if hasattr(sensor.type, 'value') else str(sensor.type)
    resp.sensor_unit = sensor.unit
    resp.pond_id = sensor.pond_id
    if sensor.pond:
        resp.pond_name = sensor.pond.name

    return resp

@router.post("/calibrations/{calibration_id}/approve", response_model=schemas.SensorCalibrationResponse)
def approve_calibration(
    calibration_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    record = db.query(models.SensorCalibrationRecord).filter(models.SensorCalibrationRecord.id == calibration_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Calibration record not found")

    record.status = models.CalibrationStatus.APPROVED
    db.commit()
    db.refresh(record)

    sensor = db.query(models.Sensor).filter(models.Sensor.id == record.sensor_id).first()
    resp = schemas.SensorCalibrationResponse.model_validate(record)
    if sensor:
        resp.sensor_type = sensor.type.value if hasattr(sensor.type, 'value') else str(sensor.type)
        resp.sensor_unit = sensor.unit
        resp.pond_id = sensor.pond_id
        if sensor.pond:
            resp.pond_name = sensor.pond.name

    return resp
