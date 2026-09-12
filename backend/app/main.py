from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from . import models, schemas
from .database import get_db, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AlgaX API", version="0.4.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .api import imagery, cross_validation, evidence, weather, telemetry

app.include_router(imagery.router, prefix="/api", tags=["imagery"])
app.include_router(cross_validation.router, prefix="/api", tags=["cross-validation"])
app.include_router(evidence.router, prefix="/api", tags=["evidence"])
app.include_router(evidence.router, prefix="/api/v1", tags=["evidence-v1"])
app.include_router(weather.router, prefix="/api", tags=["weather"])
app.include_router(telemetry.router, prefix="/api", tags=["telemetry"])

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/ingest/reading", response_model=schemas.SensorReadingResponse)
def ingest_reading(reading: schemas.SensorReadingCreate, db: Session = Depends(get_db)):
    # Validate sensor exists
    sensor = db.query(models.Sensor).filter(models.Sensor.id == reading.sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
    
    # Validate pond matches
    if sensor.pond_id != reading.pond_id:
        raise HTTPException(status_code=400, detail="Sensor does not belong to specified pond")

    db_reading = models.SensorReading(**reading.model_dump())
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
    limit: int = 1000,
    db: Session = Depends(get_db)
):
    query = db.query(models.SensorReading)
    if pond_id:
        query = query.filter(models.SensorReading.pond_id == pond_id)
    elif farm_id:
        query = query.join(models.Pond, models.SensorReading.pond_id == models.Pond.id)\
                     .filter(models.Pond.farm_id == farm_id)
    
    if sensor_type:
        query = query.join(models.Sensor, models.SensorReading.sensor_id == models.Sensor.id)\
                     .filter(models.Sensor.type == sensor_type)
    
    if start_time:
        query = query.filter(models.SensorReading.timestamp >= start_time)
    if end_time:
        query = query.filter(models.SensorReading.timestamp <= end_time)
        
    readings = query.order_by(desc(models.SensorReading.timestamp)).limit(limit).all()
    return readings

@app.get("/api/sensors", response_model=List[schemas.SensorResponse])
def get_sensors(
    pond_id: Optional[uuid.UUID] = None,
    farm_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db)
):
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
async def inject_scenario(req: ScenarioRequest):
    # Forward to simulator control API
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post("http://localhost:8001/control/inject-scenario", json=req.model_dump(mode="json"))
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulator control failed: {str(e)}")
@app.get("/api/farms", response_model=List[schemas.FarmResponse])
def get_farms(db: Session = Depends(get_db)):
    return db.query(models.Farm).all()

@app.get("/api/ponds", response_model=List[schemas.PondResponse])
def get_ponds(farm_id: Optional[uuid.UUID] = None, db: Session = Depends(get_db)):
    query = db.query(models.Pond)
    if farm_id:
        query = query.filter(models.Pond.farm_id == farm_id)
    return query.all()

from .services import execute_model_run

class ModelRunRequest(schemas.BaseModel):
    pond_id: uuid.UUID
    period_start: datetime
    period_end: datetime

@app.post("/api/model/run", response_model=schemas.ModelRunResponse)
def trigger_model_run(req: ModelRunRequest, db: Session = Depends(get_db)):
    try:
        m_run = execute_model_run(db, req.pond_id, req.period_start, req.period_end)
        return m_run
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Model run failed: {str(e)}")

@app.get("/api/model/biomass", response_model=List[schemas.BiomassEstimateResponse])
def get_biomass_estimates(pond_id: uuid.UUID, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.BiomassEstimate).filter(models.BiomassEstimate.pond_id == pond_id)\
        .order_by(desc(models.BiomassEstimate.timestamp)).limit(limit).all()

@app.get("/api/model/carbon", response_model=List[schemas.CarbonEstimateResponse])
def get_carbon_estimates(pond_id: uuid.UUID, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.CarbonEstimate).filter(models.CarbonEstimate.pond_id == pond_id)\
        .order_by(desc(models.CarbonEstimate.period_end)).limit(limit).all()

import asyncio
from datetime import timedelta
from sqlalchemy.orm import Session
from .database import SessionLocal

async def model_loop():
    while True:
        await asyncio.sleep(5)
        try:
            db = SessionLocal()
            ponds = get_ponds(db=db)
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
            
            db.close()
        except Exception as e:
            print("Model loop error:", e)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(model_loop())

from sqlalchemy.orm import joinedload

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
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 50
):
    query = db.query(models.Anomaly).options(joinedload(models.Anomaly.explanation_record))
    if pond_id:
        query = query.filter(models.Anomaly.pond_id == pond_id)
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
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    limit: int = 50
):
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
    explanation = get_explanation_by_anomaly(db, str(anomaly_id))
    if not explanation:
        raise HTTPException(status_code=404, detail="Explanation not found for this anomaly")
    return explanation

@app.patch("/api/anomalies/{anomaly_id}/status", response_model=schemas.AnomalyResponse)
def update_anomaly_status(anomaly_id: uuid.UUID, status_update: schemas.AnomalyStatusUpdate, db: Session = Depends(get_db)):
    anomaly = db.query(models.Anomaly).filter(models.Anomaly.id == anomaly_id).first()
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly not found")
        
    try:
        anomaly.status = models.AnomalyStatus(status_update.status)
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

