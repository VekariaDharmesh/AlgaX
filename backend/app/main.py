from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from typing import List, Optional
from datetime import datetime
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
