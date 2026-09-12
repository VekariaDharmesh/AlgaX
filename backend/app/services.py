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
import json
from uuid import UUID
from datetime import datetime, timezone
import math
import numpy as np
from PIL import Image
import os

from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models import (
    ImageryAnalysis,
    ImageryProcessing,
    ImageryRecord,
    AnalysisStatus,
    TemporalChangeClassification,
    QualityClassification
)

def _load_image(file_path: str) -> Image.Image:
    if not os.path.exists(file_path):
        raise ValueError("Processed artifact not found")
    return Image.open(file_path).convert("RGB")

def _calculate_green_metrics(image: Image.Image, green_threshold: float = 0.05):
    img_array = np.array(image, dtype=np.float32)
    R = img_array[:, :, 0]
    G = img_array[:, :, 1]
    B = img_array[:, :, 2]
    
    mean_red = float(np.mean(R))
    mean_green = float(np.mean(G))
    mean_blue = float(np.mean(B))
    
    epsilon = 1e-6
    # green_dominance formula: (G - (R+B)/2) / (R + G + B + epsilon)
    denominator = R + G + B + epsilon
    dominance_matrix = (G - (R + B) / 2) / denominator
    
    # Calculate overall green dominance (mean of matrix)
    overall_dominance = float(np.mean(dominance_matrix))
    
    # Classification based on threshold
    green_mask = dominance_matrix > green_threshold
    green_pixels = np.sum(green_mask)
    total_pixels = img_array.shape[0] * img_array.shape[1]
    
    green_pixel_fraction = float(green_pixels / total_pixels)
    
    return {
        "mean_red": mean_red,
        "mean_green": mean_green,
        "mean_blue": mean_blue,
        "green_dominance": overall_dominance,
        "green_pixel_fraction": green_pixel_fraction,
        "dominance_matrix": dominance_matrix,
        "total_pixels": total_pixels
    }

def _calculate_spatial_grid(dominance_matrix: np.ndarray, grid_size: int = 3, green_threshold: float = 0.05):
    h, w = dominance_matrix.shape
    cell_h = h // grid_size
    cell_w = w // grid_size
    
    grid_data = []
    fractions = []
    
    for i in range(grid_size):
        for j in range(grid_size):
            r_start = i * cell_h
            r_end = (i + 1) * cell_h if i < grid_size - 1 else h
            c_start = j * cell_w
            c_end = (j + 1) * cell_w if j < grid_size - 1 else w
            
            cell_matrix = dominance_matrix[r_start:r_end, c_start:c_end]
            green_mask = cell_matrix > green_threshold
            green_pixels = np.sum(green_mask)
            total_pixels = cell_matrix.size
            
            fraction = float(green_pixels / total_pixels) if total_pixels > 0 else 0.0
            fractions.append(fraction)
            grid_data.append({
                "row": i,
                "col": j,
                "green_fraction": fraction
            })
            
    spatial_mean = float(np.mean(fractions))
    spatial_std = float(np.std(fractions))
    
    return grid_data, spatial_mean, spatial_std

def perform_visual_analysis(db: Session, processing_id: UUID) -> ImageryAnalysis:
    processing = db.query(ImageryProcessing).filter(ImageryProcessing.id == processing_id).first()
    if not processing:
        raise ValueError("Imagery processing record not found")
        
    imagery = db.query(ImageryRecord).filter(ImageryRecord.id == processing.imagery_id).first()
    
    # 1. Quality Gating
    if processing.quality_classification == QualityClassification.UNSUITABLE:
        # Create a blocked analysis record
        analysis = ImageryAnalysis(
            imagery_id=imagery.id,
            processing_id=processing.id,
            pond_id=imagery.pond_id,
            farm_id=imagery.farm_id,
            source_type=imagery.source_type,
            analysis_version="4.3.0",
            roi_method="FULL_IMAGE",
            analysis_status=AnalysisStatus.BLOCKED
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)
        return analysis
        
    status = AnalysisStatus.READY
    if processing.quality_classification == QualityClassification.REVIEW:
        status = AnalysisStatus.REVIEW
        
    # 2. Load Processed Image
    try:
        image = _load_image(processing.processed_storage_reference)
    except Exception as e:
        # If file is missing or unreadable
        raise ValueError(f"Failed to load processed image: {str(e)}")
        
    # 3. Metrics Extraction
    green_threshold = 0.05
    metrics = _calculate_green_metrics(image, green_threshold=green_threshold)
    
    # 4. Spatial Grid
    grid_data, spatial_mean, spatial_std = _calculate_spatial_grid(
        metrics["dominance_matrix"], 
        grid_size=3, 
        green_threshold=green_threshold
    )
    
    # 5. Temporal Comparison
    # Find baseline (most recent analysis for same pond and source type)
    # Important: Check created_at strictly less than this one (which doesn't exist yet, so just most recent)
    baseline = db.query(ImageryAnalysis).filter(
        ImageryAnalysis.pond_id == imagery.pond_id,
        ImageryAnalysis.source_type == imagery.source_type,
        ImageryAnalysis.analysis_status.in_([AnalysisStatus.READY, AnalysisStatus.REVIEW])
    ).order_by(desc(ImageryAnalysis.created_at)).first()
    
    abs_change = None
    rel_change = None
    change_class = None
    
    if baseline and baseline.green_pixel_fraction is not None:
        abs_change = metrics["green_pixel_fraction"] - baseline.green_pixel_fraction
        if baseline.green_pixel_fraction > 0:
            rel_change = abs_change / baseline.green_pixel_fraction
        else:
            rel_change = 0.0 if abs_change == 0 else float("inf")
            
        # Classify change (+/- 5 percentage points)
        if abs_change > 0.05:
            change_class = TemporalChangeClassification.INCREASE
        elif abs_change < -0.05:
            change_class = TemporalChangeClassification.DECREASE
        else:
            change_class = TemporalChangeClassification.STABLE
    
    # 6. Persist
    analysis = ImageryAnalysis(
        imagery_id=imagery.id,
        processing_id=processing.id,
        pond_id=imagery.pond_id,
        farm_id=imagery.farm_id,
        source_type=imagery.source_type,
        analysis_version="4.3.0",
        roi_method="FULL_IMAGE",
        
        mean_red=metrics["mean_red"],
        mean_green=metrics["mean_green"],
        mean_blue=metrics["mean_blue"],
        green_dominance=metrics["green_dominance"],
        green_pixel_fraction=metrics["green_pixel_fraction"],
        valid_pixel_fraction=1.0, # Using full image as ROI
        
        spatial_mean=spatial_mean,
        spatial_std=spatial_std,
        grid_data=grid_data,
        
        analysis_status=status,
        
        baseline_analysis_id=baseline.id if baseline else None,
        absolute_change=abs_change,
        relative_change=rel_change,
        change_classification=change_class
    )
    
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    
    return analysis

def perform_cross_validation(db: Session, pond_id: uuid.UUID, imagery_analysis_id: uuid.UUID) -> models.CrossValidationRun:
    from sqlalchemy import desc
    analysis = db.query(models.ImageryAnalysis).filter(models.ImageryAnalysis.id == imagery_analysis_id).first()
    if not analysis:
        raise ValueError("Imagery analysis not found")
    
    # 1. Temporal Alignment
    imagery_record = db.query(models.ImageryRecord).filter(models.ImageryRecord.id == analysis.imagery_id).first()
    end_time = imagery_record.capture_timestamp if imagery_record.capture_timestamp else analysis.created_at
    
    start_time = None
    if analysis.baseline_analysis_id:
        baseline_record = db.query(models.ImageryRecord).join(models.ImageryAnalysis, models.ImageryRecord.id == models.ImageryAnalysis.imagery_id).filter(models.ImageryAnalysis.id == analysis.baseline_analysis_id).first()
        if baseline_record:
            start_time = baseline_record.capture_timestamp if baseline_record.capture_timestamp else baseline_record.created_at
        else:
            baseline_analysis = db.query(models.ImageryAnalysis).filter(models.ImageryAnalysis.id == analysis.baseline_analysis_id).first()
            if baseline_analysis:
                start_time = baseline_analysis.created_at
        
    temporal_alignment = models.TemporalAlignmentStatus.GOOD
    if not start_time:
        temporal_alignment = models.TemporalAlignmentStatus.INSUFFICIENT_EVIDENCE
        start_time = end_time  # fallback just for queries
    
    # 2. Extract Model Evidence
    model_run = db.query(models.ModelRun).filter(
        models.ModelRun.pond_id == pond_id,
        models.ModelRun.period_start <= end_time,
        models.ModelRun.period_end >= start_time
    ).order_by(desc(models.ModelRun.execution_timestamp)).first()
    
    model_trend = None
    model_change_rel = None
    if model_run and temporal_alignment != models.TemporalAlignmentStatus.INSUFFICIENT_EVIDENCE:
        start_biomass = db.query(models.BiomassEstimate).filter(
            models.BiomassEstimate.model_run_id == model_run.id,
            models.BiomassEstimate.timestamp >= start_time
        ).order_by(models.BiomassEstimate.timestamp.asc()).first()
        
        end_biomass = db.query(models.BiomassEstimate).filter(
            models.BiomassEstimate.model_run_id == model_run.id,
            models.BiomassEstimate.timestamp <= end_time
        ).order_by(models.BiomassEstimate.timestamp.desc()).first()
        
        if start_biomass and end_biomass and start_biomass.biomass_g_per_l > 0:
            model_change_rel = (end_biomass.biomass_g_per_l - start_biomass.biomass_g_per_l) / start_biomass.biomass_g_per_l
            if model_change_rel > 0.05:
                model_trend = models.TemporalChangeClassification.INCREASE
            elif model_change_rel < -0.05:
                model_trend = models.TemporalChangeClassification.DECREASE
            else:
                model_trend = models.TemporalChangeClassification.STABLE
        else:
            model_trend = models.TemporalChangeClassification.INSUFFICIENT_EVIDENCE
    else:
        model_trend = models.TemporalChangeClassification.INSUFFICIENT_EVIDENCE
        
    imagery_trend = analysis.change_classification
    
    # 3. Consistency Engine
    result_status = models.ValidationResultStatus.INSUFFICIENT_EVIDENCE
    confidence = models.ValidationConfidence.LOW
    summary = "Insufficient evidence to perform cross-validation."
    
    if temporal_alignment == models.TemporalAlignmentStatus.GOOD and model_trend != models.TemporalChangeClassification.INSUFFICIENT_EVIDENCE and imagery_trend and imagery_trend != models.TemporalChangeClassification.INSUFFICIENT_EVIDENCE:
        if model_trend == imagery_trend:
            result_status = models.ValidationResultStatus.CONSISTENT
            confidence = models.ValidationConfidence.HIGH
            summary = "Available sensor, model and imagery evidence show directionally consistent change during the selected window."
        elif model_trend == models.TemporalChangeClassification.STABLE or imagery_trend == models.TemporalChangeClassification.STABLE:
            result_status = models.ValidationResultStatus.PARTIALLY_CONSISTENT
            confidence = models.ValidationConfidence.MEDIUM
            summary = "Evidence is partially consistent; one source indicates stability while the other indicates change."
        else:
            result_status = models.ValidationResultStatus.INCONSISTENT
            confidence = models.ValidationConfidence.HIGH
            summary = "Modelled biomass and imagery-derived green coverage show contradictory directional trends during the comparison window."
    
    cv_run = models.CrossValidationRun(
        farm_id=analysis.farm_id,
        pond_id=pond_id,
        model_run_id=model_run.id if model_run else None,
        imagery_analysis_id=analysis.id,
        comparison_window_start=start_time,
        comparison_window_end=end_time,
        model_trend=model_trend,
        imagery_trend=imagery_trend,
        model_change=model_change_rel,
        imagery_change=analysis.absolute_change,
        temporal_alignment_status=temporal_alignment,
        result_status=result_status,
        confidence=confidence,
        evidence_summary=summary,
        provenance_json={
            "imagery_source": "Phase 4.3 Visual Analysis",
            "model_source": "Phase 2 Biological Model",
            "thresholds": {"model_change_significant": 0.05}
        },
        engine_version="4.4.0"
    )
    
    db.add(cv_run)
    db.commit()
    db.refresh(cv_run)
    return cv_run
