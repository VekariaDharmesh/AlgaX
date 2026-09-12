from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from .. import schemas, models, services
from ..database import get_db
from sqlalchemy import desc

router = APIRouter()

@router.post("/cross-validation/run", response_model=schemas.CrossValidationRunResponse)
def trigger_cross_validation(pond_id: uuid.UUID, imagery_analysis_id: uuid.UUID, db: Session = Depends(get_db)):
    try:
        cv_run = services.perform_cross_validation(db, pond_id, imagery_analysis_id)
        return cv_run
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/cross-validation/{run_id}", response_model=schemas.CrossValidationRunResponse)
def get_cross_validation(run_id: uuid.UUID, db: Session = Depends(get_db)):
    cv_run = db.query(models.CrossValidationRun).filter(models.CrossValidationRun.id == run_id).first()
    if not cv_run:
        raise HTTPException(status_code=404, detail="Cross validation run not found")
    return cv_run

@router.get("/ponds/{pond_id}/cross-validation", response_model=List[schemas.CrossValidationRunResponse])
def get_pond_cross_validations(pond_id: uuid.UUID, limit: int = 50, db: Session = Depends(get_db)):
    runs = db.query(models.CrossValidationRun).filter(
        models.CrossValidationRun.pond_id == pond_id
    ).order_by(desc(models.CrossValidationRun.created_at)).limit(limit).all()
    return runs
