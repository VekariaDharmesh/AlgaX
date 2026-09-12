from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import uuid
import statistics

from . import models, schemas
from .model_engine import run_model_step, calculate_carbon_metrics, DEFAULT_PARAMS, MODEL_VERSION

def aggregate_snapshot(db: Session, pond_id: uuid.UUID, start_time: datetime, end_time: datetime) -> dict:
    readings = db.query(models.SensorReading).join(models.Sensor).filter(
        models.SensorReading.pond_id == pond_id,
        models.SensorReading.timestamp >= start_time,
        models.SensorReading.timestamp < end_time,
        models.SensorReading.quality_flag != models.QualityFlag.outlier
    ).all()
    
    # group by sensor type
    grouped = {}
    for r in readings:
        t = r.sensor.type.value
        if t not in grouped: grouped[t] = []
        grouped[t].append(r.value)
        
    snapshot = {}
    for t, vals in grouped.items():
        # Using median for robustness against spikes
        snapshot[t] = statistics.median(vals)
        
    return snapshot

def execute_model_run(db: Session, pond_id: uuid.UUID, period_start: datetime, period_end: datetime) -> models.ModelRun:
    pond = db.query(models.Pond).filter(models.Pond.id == pond_id).first()
    if not pond:
        raise ValueError("Pond not found")
        
    snapshot_data = aggregate_snapshot(db, pond_id, period_start, period_end)
    
    # Create Snapshot DB record
    snapshot = models.EnvironmentalSnapshot(
        pond_id=pond_id,
        timestamp=period_end,
        temperature=snapshot_data.get("temperature"),
        ph=snapshot_data.get("ph"),
        nitrogen=snapshot_data.get("nitrogen"),
        dissolved_oxygen=snapshot_data.get("dissolved_oxygen"),
        light=snapshot_data.get("light"),
        turbidity=snapshot_data.get("turbidity"),
        water_level=snapshot_data.get("water_level"),
        provenance="aggregated"
    )
    db.add(snapshot)
    
    # Get previous biomass
    prev_biomass_est = db.query(models.BiomassEstimate).filter(
        models.BiomassEstimate.pond_id == pond_id
    ).order_by(models.BiomassEstimate.timestamp.desc()).first()
    
    current_biomass = prev_biomass_est.biomass_g_per_l if prev_biomass_est else 0.5
    
    dt_hours = (period_end - period_start).total_seconds() / 3600.0
    
    # Run model
    model_output = run_model_step(snapshot_data, current_biomass, DEFAULT_PARAMS, dt_hours)
    
    # Carbon calc
    carbon_metrics = calculate_carbon_metrics(
        delta_biomass_g_l=model_output["delta_biomass"],
        volume_liters=pond.volume_liters or 100000.0,
        carbon_fraction=model_output["carbon_fraction"],
        end_use="unspecified", # Phase 2 defaults to unspecified
        operational_emissions=0.0
    )
    
    # Create ModelRun
    m_run = models.ModelRun(
        pond_id=pond_id,
        model_version=MODEL_VERSION,
        period_start=period_start,
        period_end=period_end,
        parameters=DEFAULT_PARAMS,
        status=models.ModelRunStatus.success,
        provenance="simulated"
    )
    db.add(m_run)
    db.flush() # get ID
    
    # Create Estimates
    b_est = models.BiomassEstimate(
        pond_id=pond_id,
        model_run_id=m_run.id,
        timestamp=period_end,
        biomass_g_per_l=model_output["new_biomass"],
        light_factor=model_output["light_factor"],
        temp_factor=model_output["temperature_factor"],
        ph_factor=model_output["ph_factor"],
        n_factor=model_output["nitrogen_factor"],
        growth_rate=model_output["growth_rate"],
        method="monod-droop",
        confidence_score=0.85 # Preliminary confidence scoring
    )
    db.add(b_est)
    
    c_est = models.CarbonEstimate(
        pond_id=pond_id,
        model_run_id=m_run.id,
        period_start=period_start,
        period_end=period_end,
        gross_co2_kg=carbon_metrics["gross_co2_kg"],
        retained_co2_kg=carbon_metrics["retained_co2_kg"],
        operational_emissions_kg=carbon_metrics["operational_emissions_kg"],
        net_carbon_removed_kg=carbon_metrics["net_carbon_removed_kg"],
        realized_c_fraction=carbon_metrics["realized_c_fraction"],
        end_use="unspecified",
        permanence_horizon_label="N/A",
        confidence_score=0.85
    )
    db.add(c_est)
    
    db.commit()
    db.refresh(m_run)
    return m_run
