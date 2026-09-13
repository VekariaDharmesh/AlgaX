import asyncio
from contextlib import asynccontextmanager
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, and_

from . import models, schemas
from .database import get_db, engine, SessionLocal
from .api import imagery, cross_validation, evidence, weather, telemetry, harvest, calibration, users, auth_routes
from .auth import ensure_default_users, require_farm_operator, get_current_user, check_farm_isolation
from .simulation import router as simulation_router, simulation_manager, run_simulation_loop

import os
import sys

models.Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure default users and seed database if empty
    with Session(engine) as db:
        ensure_default_users(db)
    
    is_test = "pytest" in sys.modules or os.environ.get("TESTING") == "1"
    model_task = None
    sim_task = None

    if not is_test:
        try:
            try:
                from seed import seed_database
            except ImportError:
                from ..seed import seed_database
            await asyncio.to_thread(seed_database)
        except Exception as e:
            print("Auto-seed note:", e)
        
        # Launch background continuous worker tasks in production/dev
        model_task = asyncio.create_task(model_loop())
        sim_task = asyncio.create_task(run_simulation_loop())
    
    try:
        yield
    finally:
        # Shutdown cleanly
        if model_task:
            model_task.cancel()
        if sim_task:
            sim_task.cancel()

app = FastAPI(title="AlgaX API", version="0.4.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/api", tags=["auth"])
app.include_router(users.router, prefix="/api", tags=["users"])
app.include_router(imagery.router, prefix="/api", tags=["imagery"])
app.include_router(cross_validation.router, prefix="/api", tags=["cross-validation"])
app.include_router(evidence.router, prefix="/api", tags=["evidence"])
app.include_router(evidence.router, prefix="/api/v1", tags=["evidence-v1"])
app.include_router(weather.router, prefix="/api", tags=["weather"])
app.include_router(telemetry.router, prefix="/api", tags=["telemetry"])
app.include_router(harvest.router, prefix="/api", tags=["harvest"])
app.include_router(calibration.router, prefix="/api", tags=["calibration"])
app.include_router(simulation_router, prefix="/api", tags=["simulation"])

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/ingest/reading", response_model=schemas.SensorReadingResponse)
def ingest_reading(
    reading: schemas.SensorReadingCreate, 
    db: Session = Depends(get_db),
    operator: models.User = Depends(require_farm_operator)
):
    # Validate sensor exists
    sensor = db.query(models.Sensor).filter(models.Sensor.id == reading.sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
    
    # Validate pond matches
    if sensor.pond_id != reading.pond_id:
        raise HTTPException(status_code=400, detail="Sensor does not belong to specified pond")

    data = reading.model_dump()
    raw_val = data.get("raw_value") if data.get("raw_value") is not None else data.get("value")
    data["raw_value"] = raw_val

    active_calib = db.query(models.SensorCalibrationRecord).filter(
        models.SensorCalibrationRecord.sensor_id == sensor.id,
        models.SensorCalibrationRecord.status == models.CalibrationStatus.ACTIVE
    ).order_by(desc(models.SensorCalibrationRecord.calibrated_at)).first()

    if active_calib:
        gain = active_calib.gain_applied if active_calib.gain_applied is not None else 1.0
        offset = active_calib.offset_applied if active_calib.offset_applied is not None else 0.0
        calibrated_val = (raw_val * gain) + offset
        data["calibrated_value"] = calibrated_val
        data["calibration_offset"] = offset
        data["calibration_gain"] = gain
        data["value"] = calibrated_val
    else:
        data["calibrated_value"] = raw_val
        data["calibration_offset"] = 0.0
        data["calibration_gain"] = 1.0

    db_reading = models.SensorReading(**data)
    db.add(db_reading)
    db.commit()
    db.refresh(db_reading)
    
    # Phase 3.1: Trigger Sensor Anomaly Detection
    from .anomaly.service import run_sensor_anomaly_detection
    run_sensor_anomaly_detection(db, db_reading)
    
    return db_reading

@app.get("/api/telemetry", response_model=List[schemas.SensorReadingResponse])
def get_telemetry(
    pond_id: Optional[uuid.UUID] = None,
    farm_id: Optional[uuid.UUID] = None,
    sensor_type: Optional[models.SensorType] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    limit: int = Query(200, ge=1, le=2000),
    page: int = Query(1, ge=1),
    downsample: bool = Query(False),
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

    offset = (page - 1) * limit
    if sensor_type:
        query = db.query(models.SensorReading).join(models.Sensor, models.SensorReading.sensor_id == models.Sensor.id)\
                  .filter(models.Sensor.type == sensor_type)
        if pond_id:
            query = query.filter(models.SensorReading.pond_id == pond_id)
        elif farm_id:
            query = query.join(models.Pond, models.SensorReading.pond_id == models.Pond.id)\
                         .filter(models.Pond.farm_id == farm_id)
        if start_time:
            query = query.filter(models.SensorReading.timestamp >= start_time)
        if end_time:
            query = query.filter(models.SensorReading.timestamp <= end_time)
        readings = query.order_by(desc(models.SensorReading.timestamp)).offset(offset).limit(limit).all()
    else:
        # Fetch sensors in target scope
        sensor_q = db.query(models.Sensor)
        if pond_id:
            sensor_q = sensor_q.filter(models.Sensor.pond_id == pond_id)
        elif farm_id:
            sensor_q = sensor_q.join(models.Pond, models.Sensor.pond_id == models.Pond.id)\
                               .filter(models.Pond.farm_id == farm_id)
        sensors = sensor_q.all()
        
        sensor_ids = [s.id for s in sensors]
        if not sensor_ids:
            return []
            
        sq = db.query(models.SensorReading).filter(models.SensorReading.sensor_id.in_(sensor_ids))
        if start_time:
            sq = sq.filter(models.SensorReading.timestamp >= start_time)
        if end_time:
            sq = sq.filter(models.SensorReading.timestamp <= end_time)
        readings = sq.order_by(desc(models.SensorReading.timestamp)).offset(offset).limit(limit).all()
        if not readings:
            readings = db.query(models.SensorReading).filter(models.SensorReading.sensor_id.in_(sensor_ids))\
                         .order_by(desc(models.SensorReading.timestamp)).offset(offset).limit(limit).all()

    if downsample and len(readings) > 200:
        step = max(1, len(readings) // 200)
        readings = readings[::step][:200]

    return readings


@app.get("/api/sensors", response_model=List[schemas.SensorResponse])
def get_sensors(
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

    query = db.query(models.Sensor)
    if pond_id:
        query = query.filter(models.Sensor.pond_id == pond_id)
    elif farm_id:
        query = query.join(models.Pond, models.Sensor.pond_id == models.Pond.id)\
                     .filter(models.Pond.farm_id == farm_id)
    return query.all()

import httpx

class ScenarioRequest(schemas.BaseModel):
    pond_id: uuid.UUID
    scenario: str

@app.post("/api/demo/inject-scenario")
def inject_scenario(req: ScenarioRequest, db: Session = Depends(get_db), user: models.User = Depends(require_farm_operator)):
    pond = db.query(models.Pond).filter(models.Pond.id == req.pond_id).first()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")
    check_farm_isolation(user, pond.farm_id)
    try:
        updated_state = simulation_manager.inject_scenario(req.pond_id, req.scenario)
        simulation_manager.step_pond(db, req.pond_id)
        return {"status": "ok", "scenario": req.scenario, "pond_id": str(req.pond_id), "state": updated_state}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulator control failed: {str(e)}")
@app.get("/api/farms", response_model=List[schemas.FarmResponse])
def get_farms(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    query = db.query(models.Farm).options(joinedload(models.Farm.ponds).joinedload(models.Pond.sensors))
    if user.role == models.UserRole.FARM_OPERATOR and user.assigned_farm_id:
        query = query.filter(models.Farm.id == user.assigned_farm_id)
    return query.all()

@app.get("/api/farms/{farm_id}", response_model=schemas.FarmResponse)
def get_farm(farm_id: uuid.UUID, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    farm = db.query(models.Farm).options(joinedload(models.Farm.ponds).joinedload(models.Pond.sensors)).filter(models.Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    check_farm_isolation(user, farm.id)
    return farm

@app.get("/api/ponds", response_model=List[schemas.PondResponse])
def get_ponds(farm_id: Optional[uuid.UUID] = None, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    check_farm_isolation(user, farm_id)
    query = db.query(models.Pond).options(joinedload(models.Pond.sensors))
    if farm_id:
        query = query.filter(models.Pond.farm_id == farm_id)
    elif user.role == models.UserRole.FARM_OPERATOR and user.assigned_farm_id:
        query = query.filter(models.Pond.farm_id == user.assigned_farm_id)
    return query.all()

@app.get("/api/ponds/{pond_id}", response_model=schemas.PondResponse)
def get_pond(
    pond_id: uuid.UUID,
    farm_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    pond = db.query(models.Pond).options(joinedload(models.Pond.sensors)).filter(models.Pond.id == pond_id).first()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")
    if farm_id and pond.farm_id != farm_id:
        raise HTTPException(status_code=404, detail="Pond does not belong to the specified farm")
    check_farm_isolation(user, pond.farm_id)
    return pond

@app.post("/api/ponds", response_model=schemas.PondResponse, status_code=201)
def create_pond(
    pond_in: schemas.PondCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_farm_operator)
):
    farm = db.query(models.Farm).filter(models.Farm.id == pond_in.farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Target farm not found")
    check_farm_isolation(user, pond_in.farm_id)

    pond = models.Pond(
        farm_id=pond_in.farm_id,
        name=pond_in.name,
        volume_liters=pond_in.volume_liters,
        species=pond_in.species,
        status=pond_in.status or models.PondStatus.active
    )
    db.add(pond)
    db.commit()
    db.refresh(pond)
    return pond

@app.put("/api/ponds/{pond_id}", response_model=schemas.PondResponse)
def update_pond(
    pond_id: uuid.UUID,
    pond_in: schemas.PondUpdate,
    farm_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_farm_operator)
):
    pond = db.query(models.Pond).filter(models.Pond.id == pond_id).first()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")
    if farm_id and pond.farm_id != farm_id:
        raise HTTPException(status_code=403, detail="Cross-farm modification rejected: Pond belongs to another farm")
    check_farm_isolation(user, pond.farm_id)

    if pond_in.name is not None:
        pond.name = pond_in.name
    if pond_in.volume_liters is not None:
        pond.volume_liters = pond_in.volume_liters
    if pond_in.species is not None:
        pond.species = pond_in.species
    if pond_in.status is not None:
        pond.status = pond_in.status

    db.commit()
    db.refresh(pond)
    return pond

@app.delete("/api/ponds/{pond_id}")
def delete_pond(
    pond_id: uuid.UUID,
    farm_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_farm_operator)
):
    pond = db.query(models.Pond).filter(models.Pond.id == pond_id).first()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")
    if farm_id and pond.farm_id != farm_id:
        raise HTTPException(status_code=403, detail="Cross-farm deletion rejected: Pond belongs to another farm")
    check_farm_isolation(user, pond.farm_id)

    # Remove associated sensors & readings before deleting pond
    sensors = db.query(models.Sensor).filter(models.Sensor.pond_id == pond.id).all()
    for s in sensors:
        db.query(models.SensorReading).filter(models.SensorReading.sensor_id == s.id).delete()
        db.delete(s)
    db.delete(pond)
    db.commit()
    return {"status": "ok", "message": f"Pond {pond_id} deleted successfully"}

from .services import execute_model_run

class ModelRunRequest(schemas.BaseModel):
    pond_id: uuid.UUID
    period_start: datetime
    period_end: datetime

@app.post("/api/model/run", response_model=schemas.ModelRunResponse)
def trigger_model_run(req: ModelRunRequest, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    pond = db.query(models.Pond).filter(models.Pond.id == req.pond_id).first()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")
    check_farm_isolation(user, pond.farm_id)
    try:
        m_run = execute_model_run(db, req.pond_id, req.period_start, req.period_end)
        return m_run
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Model run failed: {str(e)}")

@app.get("/api/model/biomass", response_model=List[schemas.BiomassEstimateResponse])
def get_biomass_estimates(
    pond_id: uuid.UUID,
    farm_id: Optional[uuid.UUID] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    pond = db.query(models.Pond).filter(models.Pond.id == pond_id).first()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")
    if farm_id and pond.farm_id != farm_id:
        raise HTTPException(status_code=404, detail="Pond does not belong to specified farm")
    check_farm_isolation(user, pond.farm_id)
    return db.query(models.BiomassEstimate).filter(models.BiomassEstimate.pond_id == pond_id)\
        .order_by(desc(models.BiomassEstimate.timestamp)).limit(limit).all()

@app.get("/api/model/carbon", response_model=List[schemas.CarbonEstimateResponse])
def get_carbon_estimates(
    pond_id: uuid.UUID,
    farm_id: Optional[uuid.UUID] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    pond = db.query(models.Pond).filter(models.Pond.id == pond_id).first()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")
    if farm_id and pond.farm_id != farm_id:
        raise HTTPException(status_code=404, detail="Pond does not belong to specified farm")
    check_farm_isolation(user, pond.farm_id)
    return db.query(models.CarbonEstimate).filter(models.CarbonEstimate.pond_id == pond_id)\
        .order_by(desc(models.CarbonEstimate.period_end)).limit(limit).all()

import asyncio
from datetime import timedelta
from sqlalchemy.orm import Session
from .database import SessionLocal

async def model_loop():
    while True:
        await asyncio.sleep(30)
        try:
            def sync_job():
                db = SessionLocal()
                try:
                    # Query ponds directly — get_ponds requires auth context
                    ponds = db.query(models.Pond).all()
                    if ponds:
                        end_time = datetime.now(timezone.utc)
                        start_time = end_time - timedelta(hours=1)
                        for p in ponds:
                            execute_model_run(db, p.id, start_time, end_time)
                            
                            # Phase 3.2: Check Environmental Anomalies
                            from .anomaly.env_detectors.engine import check_environmental_anomalies
                            check_environmental_anomalies(db, p.id, end_time)
                            
                            # Phase 3.3: Check Biological Anomalies
                            from .anomaly.bio_detectors.engine import check_biological_anomalies
                            check_biological_anomalies(db, p.id, end_time)
                    
                    # Phase 3.1: Check for sensor dropouts
                    from .anomaly.service import check_for_dropouts
                    check_for_dropouts(db)
                finally:
                    db.close()

            await asyncio.to_thread(sync_job)
        except Exception as e:
            print("Model loop error:", e)



def calculate_priority_score(anomaly: models.Anomaly) -> int:
    score = 0
    # Base score on domain
    if anomaly.source_provenance == "biological_engine":
        score += 50
    elif anomaly.source_provenance == "environmental_engine":
        score += 30
    else:
        score += 10
        
    # Modifier for severity
    if anomaly.severity.value == "CRITICAL":
        score += 40
    elif anomaly.severity.value == "HIGH":
        score += 20
    elif anomaly.severity.value == "MEDIUM":
        score += 10
        
    # Status modifier
    if anomaly.status.value == "OPEN":
        score += 10
    elif anomaly.status.value == "INVESTIGATING":
        score += 5
    elif anomaly.status.value == "RESOLVED":
        score -= 20
        
    return max(0, min(100, score))

@app.get("/api/anomalies", response_model=schemas.PaginatedAnomalyResponse)
def get_anomalies(
    db: Session = Depends(get_db),
    pond_id: Optional[uuid.UUID] = None,
    farm_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
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

    query = db.query(models.Anomaly).options(joinedload(models.Anomaly.explanation_record))
    if pond_id:
        query = query.filter(models.Anomaly.pond_id == pond_id)
    elif farm_id:
        query = query.join(models.Pond, models.Anomaly.pond_id == models.Pond.id).filter(models.Pond.farm_id == farm_id)

    if status:
        query = query.filter(models.Anomaly.status == status)
        
    total = query.count()
    items = query.order_by(desc(models.Anomaly.timestamp)).offset((page - 1) * page_size).limit(page_size).all()
    
    for item in items:
        item.priority_score = calculate_priority_score(item)
        
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_next": (page * page_size) < total,
        "items": items
    }

@app.get("/api/ponds/{pond_id}/anomalies", response_model=List[schemas.AnomalyResponse])
def get_pond_anomalies(
    pond_id: uuid.UUID,
    farm_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    limit: int = 50,
    user: models.User = Depends(get_current_user)
):
    pond = db.query(models.Pond).filter(models.Pond.id == pond_id).first()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")
    if farm_id and pond.farm_id != farm_id:
        raise HTTPException(status_code=404, detail="Pond does not belong to specified farm")
    check_farm_isolation(user, pond.farm_id)
    query = db.query(models.Anomaly).filter(models.Anomaly.pond_id == pond_id)
    if status:
        query = query.filter(models.Anomaly.status == status)
    return query.order_by(desc(models.Anomaly.timestamp)).limit(limit).all()

@app.get("/api/anomalies/{anomaly_id}", response_model=schemas.AnomalyResponseWithExplanation)
def get_anomaly(anomaly_id: uuid.UUID, db: Session = Depends(get_db)):
    anomaly = db.query(models.Anomaly).options(joinedload(models.Anomaly.explanation_record)).filter(models.Anomaly.id == anomaly_id).first()
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly not found")
    anomaly.priority_score = calculate_priority_score(anomaly)
    return anomaly

@app.get("/api/anomalies/{anomaly_id}/explanation", response_model=schemas.AnomalyExplanationResponse)
def get_anomaly_explanation(anomaly_id: uuid.UUID, db: Session = Depends(get_db)):
    from .anomaly.explanation.service import get_explanation_by_anomaly
    explanation = get_explanation_by_anomaly(db, anomaly_id)
    if not explanation:
        raise HTTPException(status_code=404, detail="Explanation not found for this anomaly")
    return explanation

@app.patch("/api/anomalies/{anomaly_id}/status", response_model=schemas.AnomalyResponse)
def update_anomaly_status(anomaly_id: uuid.UUID, status_update: schemas.AnomalyStatusUpdate, db: Session = Depends(get_db)):
    anomaly = db.query(models.Anomaly).filter(models.Anomaly.id == anomaly_id).first()
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly not found")
        
    try:
        status_val = status_update.status.upper() if isinstance(status_update.status, str) else status_update.status
        anomaly.status = models.AnomalyStatus(status_val)
        if anomaly.status == models.AnomalyStatus.RESOLVED:
            anomaly.resolved_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(anomaly)
        anomaly.priority_score = calculate_priority_score(anomaly)
        return anomaly
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status value")

@app.get("/api/explanations", response_model=List[schemas.AnomalyExplanationResponse])
def get_explanations(
    db: Session = Depends(get_db),
    pond_id: Optional[uuid.UUID] = None,
    farm_id: Optional[uuid.UUID] = None,
    evidence_strength: Optional[models.EvidenceStrength] = None,
    limit: int = 100,
):
    from .anomaly.explanation.service import get_explanations as _get_explanations
    return _get_explanations(
        db=db,
        pond_id=str(pond_id) if pond_id else None,
        farm_id=str(farm_id) if farm_id else None,
        evidence_strength=evidence_strength,
        limit=limit,
    )

