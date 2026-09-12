import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func

from .. import models, schemas
from ..database import get_db
from ..model_engine import calculate_carbon_metrics

router = APIRouter()

@router.get("/harvests", response_model=dict)
def get_harvests(
    farm_id: Optional[uuid.UUID] = None,
    pond_id: Optional[uuid.UUID] = None,
    status: Optional[models.HarvestStatus] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(models.HarvestEvent).options(
        joinedload(models.HarvestEvent.biomass_fates),
        joinedload(models.HarvestEvent.pond),
        joinedload(models.HarvestEvent.farm)
    )
    
    if farm_id:
        query = query.filter(models.HarvestEvent.farm_id == farm_id)
    if pond_id:
        query = query.filter(models.HarvestEvent.pond_id == pond_id)
    if status:
        query = query.filter(models.HarvestEvent.status == status)

    total = query.count()
    items = query.order_by(desc(models.HarvestEvent.created_at))\
                 .offset((page - 1) * page_size)\
                 .limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_next": (page * page_size) < total,
        "items": [schemas.HarvestEventResponse.model_validate(item) for item in items]
    }

@router.get("/harvests/overview", response_model=schemas.HarvestOverviewKPIs)
def get_harvest_overview(
    farm_id: Optional[uuid.UUID] = None,
    pond_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.HarvestEvent)
    if farm_id:
        query = query.filter(models.HarvestEvent.farm_id == farm_id)
    if pond_id:
        query = query.filter(models.HarvestEvent.pond_id == pond_id)
        
    harvest_events = query.all()
    completed_events = [e for e in harvest_events if e.status == models.HarvestStatus.COMPLETED]

    total_harvested_kg = sum(e.actual_harvest_kg or 0.0 for e in completed_events)
    event_count = len(harvest_events)

    latest_harvest_date = None
    if completed_events:
        dates = [e.harvest_date for e in completed_events if e.harvest_date]
        if dates:
            latest_harvest_date = max(dates)

    # Current biomass lookup
    current_biomass_g_l = None
    harvestable_biomass_kg = None
    if pond_id:
        pond = db.query(models.Pond).filter(models.Pond.id == pond_id).first()
        latest_b = db.query(models.BiomassEstimate).filter(
            models.BiomassEstimate.pond_id == pond_id
        ).order_by(desc(models.BiomassEstimate.timestamp)).first()
        if latest_b:
            current_biomass_g_l = latest_b.biomass_g_per_l
            vol = (pond.volume_liters if pond and pond.volume_liters else 100000.0)
            harvestable_biomass_kg = (current_biomass_g_l * vol) / 1000.0
        pond_ids = [p.id for p in db.query(models.Pond).filter(models.Pond.farm_id == farm_id).all()]
        if pond_ids:
            latest_b_list = db.query(models.BiomassEstimate)\
                              .filter(models.BiomassEstimate.pond_id.in_(pond_ids))\
                              .order_by(desc(models.BiomassEstimate.timestamp))\
                              .limit(100).all()
            seen_ponds = set()
            latest_estimates = []
            for b in latest_b_list:
                if b.pond_id not in seen_ponds:
                    seen_ponds.add(b.pond_id)
                    latest_estimates.append(b.biomass_g_per_l)
            if latest_estimates:
                current_biomass_g_l = sum(latest_estimates) / len(latest_estimates)

    # Carbon associated calculation
    carbon_associated_kg = None
    if total_harvested_kg > 0:
        # Sum carbon metrics across completed events with defined fates
        total_retained = 0.0
        has_verified_fate = False
        for e in completed_events:
            for fate in e.biomass_fates:
                c_map = {"BIOCHAR": 0.8, "BIOPLASTICS": 0.5, "FUEL": 0.0}
                if fate.end_use_category.value in c_map:
                    factor = c_map[fate.end_use_category.value]
                    # gross CO2 = biomass_kg * 0.48 * 44/12
                    gross = fate.quantity_allocated_kg * 0.48 * (44.0 / 12.0)
                    total_retained += gross * factor
                    has_verified_fate = True
        if has_verified_fate:
            carbon_associated_kg = total_retained

    remaining_biomass_g_l = current_biomass_g_l

    return schemas.HarvestOverviewKPIs(
        current_biomass_g_l=current_biomass_g_l,
        harvestable_biomass_kg=harvestable_biomass_kg,
        total_harvested_kg=total_harvested_kg,
        latest_harvest_date=latest_harvest_date,
        harvest_event_count=event_count,
        period_harvested_kg=total_harvested_kg,
        remaining_biomass_g_l=remaining_biomass_g_l,
        carbon_associated_kg=carbon_associated_kg,
        harvestable_status="Biomass available for harvest planning"
    )

@router.get("/ponds/{pond_id}/readiness", response_model=schemas.BiomassReadinessResponse)
def get_biomass_readiness(pond_id: uuid.UUID, db: Session = Depends(get_db)):
    pond = db.query(models.Pond).filter(models.Pond.id == pond_id).first()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")

    latest_b = db.query(models.BiomassEstimate).filter(
        models.BiomassEstimate.pond_id == pond_id
    ).order_by(desc(models.BiomassEstimate.timestamp)).first()

    if not latest_b:
        return schemas.BiomassReadinessResponse(
            pond_id=pond_id,
            pond_name=pond.name,
            biomass_g_per_l=0.5,
            timestamp=datetime.now(timezone.utc),
            readiness_label="Biomass available for harvest planning"
        )

    return schemas.BiomassReadinessResponse(
        pond_id=pond_id,
        pond_name=pond.name,
        biomass_g_per_l=latest_b.biomass_g_per_l,
        timestamp=latest_b.timestamp,
        model_run_id=latest_b.model_run_id,
        confidence_score=latest_b.confidence_score,
        readiness_label="Biomass available for harvest planning"
    )

@router.post("/harvests", response_model=schemas.HarvestEventResponse, status_code=201)
def create_harvest_event(event_in: schemas.HarvestEventCreate, db: Session = Depends(get_db)):
    pond = db.query(models.Pond).filter(models.Pond.id == event_in.pond_id).first()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")

    if pond.farm_id != event_in.farm_id:
        raise HTTPException(status_code=400, detail="Pond does not belong to specified farm")

    if event_in.estimated_harvest_kg < 0:
        raise HTTPException(status_code=400, detail="Estimated harvest quantity cannot be negative")

    # Fetch latest biomass estimate if not provided
    biomass_before = event_in.biomass_before_g_per_l
    model_run_id = event_in.model_run_id
    if biomass_before is None:
        latest_b = db.query(models.BiomassEstimate).filter(
            models.BiomassEstimate.pond_id == event_in.pond_id
        ).order_by(desc(models.BiomassEstimate.timestamp)).first()
        if latest_b:
            biomass_before = latest_b.biomass_g_per_l
            if not model_run_id:
                model_run_id = latest_b.model_run_id

    event = models.HarvestEvent(
        farm_id=event_in.farm_id,
        pond_id=event_in.pond_id,
        status=event_in.status,
        planned_date=event_in.planned_date,
        harvest_date=event_in.harvest_date,
        harvest_method=event_in.harvest_method,
        operator=event_in.operator,
        notes=event_in.notes,
        biomass_before_g_per_l=biomass_before,
        estimated_harvest_kg=event_in.estimated_harvest_kg,
        actual_harvest_kg=event_in.actual_harvest_kg,
        model_run_id=model_run_id
    )

    db.add(event)
    db.commit()
    db.refresh(event)

    return schemas.HarvestEventResponse.model_validate(event)

@router.get("/harvests/{harvest_id}", response_model=schemas.HarvestEventResponse)
def get_harvest_event(harvest_id: uuid.UUID, db: Session = Depends(get_db)):
    event = db.query(models.HarvestEvent).options(
        joinedload(models.HarvestEvent.biomass_fates),
        joinedload(models.HarvestEvent.pond),
        joinedload(models.HarvestEvent.farm)
    ).filter(models.HarvestEvent.id == harvest_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Harvest event not found")

    return schemas.HarvestEventResponse.model_validate(event)

@router.patch("/harvests/{harvest_id}", response_model=schemas.HarvestEventResponse)
def update_harvest_event(
    harvest_id: uuid.UUID,
    update_in: schemas.HarvestEventUpdate,
    db: Session = Depends(get_db)
):
    event = db.query(models.HarvestEvent).options(
        joinedload(models.HarvestEvent.biomass_fates)
    ).filter(models.HarvestEvent.id == harvest_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Harvest event not found")

    if update_in.actual_harvest_kg is not None:
        if update_in.actual_harvest_kg < 0:
            raise HTTPException(status_code=400, detail="Actual harvest quantity cannot be negative")
        event.actual_harvest_kg = update_in.actual_harvest_kg

    if update_in.status is not None:
        event.status = update_in.status
        if update_in.status == models.HarvestStatus.COMPLETED and not event.harvest_date:
            event.harvest_date = datetime.now(timezone.utc)

    if update_in.harvest_date is not None:
        event.harvest_date = update_in.harvest_date

    if update_in.biomass_before_g_per_l is not None:
        event.biomass_before_g_per_l = update_in.biomass_before_g_per_l

    if update_in.notes is not None:
        event.notes = update_in.notes

    if update_in.operator is not None:
        event.operator = update_in.operator

    if update_in.harvest_method is not None:
        event.harvest_method = update_in.harvest_method

    db.commit()
    db.refresh(event)

    return schemas.HarvestEventResponse.model_validate(event)

@router.post("/harvests/{harvest_id}/fate", response_model=schemas.HarvestBiomassFateResponse, status_code=201)
def add_harvest_biomass_fate(
    harvest_id: uuid.UUID,
    fate_in: schemas.HarvestBiomassFateCreate,
    db: Session = Depends(get_db)
):
    event = db.query(models.HarvestEvent).options(
        joinedload(models.HarvestEvent.biomass_fates)
    ).filter(models.HarvestEvent.id == harvest_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Harvest event not found")

    if fate_in.quantity_allocated_kg <= 0:
        raise HTTPException(status_code=400, detail="Allocated quantity must be positive")

    available_kg = event.actual_harvest_kg if event.actual_harvest_kg is not None else event.estimated_harvest_kg
    existing_allocated = sum(f.quantity_allocated_kg for f in event.biomass_fates)

    if (existing_allocated + fate_in.quantity_allocated_kg) > (available_kg + 0.001):
        raise HTTPException(
            status_code=400,
            detail=f"Total allocated biomass ({existing_allocated + fate_in.quantity_allocated_kg:.1f} kg) exceeds harvested biomass ({available_kg:.1f} kg)"
        )

    fate = models.HarvestBiomassFate(
        harvest_event_id=harvest_id,
        end_use_category=fate_in.end_use_category,
        quantity_allocated_kg=fate_in.quantity_allocated_kg,
        allocation_pct=fate_in.allocation_pct,
        destination=fate_in.destination,
        processing_info=fate_in.processing_info,
        retention_info=fate_in.retention_info,
        notes=fate_in.notes
    )

    db.add(fate)
    db.commit()
    db.refresh(fate)

    # Trigger CarbonEstimate update if end-use is specified
    end_use_str = fate_in.end_use_category.value.lower()
    if end_use_str in ["biochar", "bioplastics", "fuel"]:
        # Find recent carbon estimate for this pond or create one
        recent_c = db.query(models.CarbonEstimate).filter(
            models.CarbonEstimate.pond_id == event.pond_id
        ).order_by(desc(models.CarbonEstimate.period_end)).first()
        
        if recent_c:
            pond = db.query(models.Pond).filter(models.Pond.id == event.pond_id).first()
            vol = pond.volume_liters if pond and pond.volume_liters else 100000.0
            metrics = calculate_carbon_metrics(
                delta_biomass_g_l=0.1,
                volume_liters=vol,
                carbon_fraction=0.48,
                end_use=end_use_str,
                operational_emissions=recent_c.operational_emissions_kg or 0.0
            )
            recent_c.end_use = end_use_str
            recent_c.retained_co2_kg = metrics["retained_co2_kg"]
            recent_c.net_carbon_removed_kg = metrics["net_carbon_removed_kg"]
            db.commit()

    return schemas.HarvestBiomassFateResponse.model_validate(fate)
