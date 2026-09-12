from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from . import models, schemas
from .database import get_db, engine

app = FastAPI(title="AlgaeMRV API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    pond_id: uuid.UUID,
    sensor_type: Optional[models.SensorType] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    limit: int = 1000,
    db: Session = Depends(get_db)
):
    query = db.query(models.SensorReading).filter(models.SensorReading.pond_id == pond_id)
    
    if sensor_type:
        query = query.join(models.Sensor).filter(models.Sensor.type == sensor_type)
    
    if start_time:
        query = query.filter(models.SensorReading.timestamp >= start_time)
    if end_time:
        query = query.filter(models.SensorReading.timestamp <= end_time)
        
    readings = query.order_by(desc(models.SensorReading.timestamp)).limit(limit).all()
    return readings
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

@app.get("/api/anomalies", response_model=List[schemas.AnomalyResponse])
def get_anomalies(
    db: Session = Depends(get_db),
    pond_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    limit: int = 50
):
    query = db.query(models.Anomaly)
    if pond_id:
        query = query.filter(models.Anomaly.pond_id == pond_id)
    if status:
        query = query.filter(models.Anomaly.status == status)
        
    return query.order_by(desc(models.Anomaly.timestamp)).limit(limit).all()

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

@app.get("/api/anomalies/{anomaly_id}/explanation", response_model=schemas.AnomalyExplanationResponse)
def get_anomaly_explanation(anomaly_id: uuid.UUID, db: Session = Depends(get_db)):
    explanation = db.query(models.AnomalyExplanation).filter(models.AnomalyExplanation.anomaly_id == anomaly_id).first()
    if not explanation:
        raise HTTPException(status_code=404, detail="Explanation not found for this anomaly")
    return explanation

