import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models
from ..auth import get_current_user, require_farm_operator, check_farm_isolation
from .engine import simulation_manager

router = APIRouter(prefix="/simulation", tags=["simulation"])

class ScenarioInjectionRequest(BaseModel):
    pond_id: uuid.UUID
    scenario: str

class SimulationControlRequest(BaseModel):
    action: str  # "stop", "resume", "reset", "set_speed"
    speed: Optional[int] = None
    pond_id: Optional[uuid.UUID] = None
    farm_id: Optional[uuid.UUID] = None

class SimulationResetRequest(BaseModel):
    pond_id: Optional[uuid.UUID] = None

@router.get("/status")
def get_simulation_status(
    pond_id: Optional[str] = None,
    farm_id: Optional[str] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """Returns the live simulation state across virtual ponds, respecting farm isolation."""
    # Ensure ponds are loaded
    if not simulation_manager.pond_states:
        simulation_manager.initialize_ponds(db)

    parsed_farm_id = None
    if farm_id and farm_id.strip():
        try:
            parsed_farm_id = uuid.UUID(farm_id.strip())
        except ValueError:
            pass

    # Check isolation for operator
    if user.role == models.UserRole.FARM_OPERATOR and user.assigned_farm_id:
        parsed_farm_id = user.assigned_farm_id

    if pond_id and pond_id.strip():
        try:
            parsed_pond_id = uuid.UUID(pond_id.strip())
            pond = db.query(models.Pond).filter(models.Pond.id == parsed_pond_id).first()
            if not pond:
                raise HTTPException(status_code=404, detail="Pond not found")
            check_farm_isolation(user, pond.farm_id)
            state = simulation_manager.get_state(parsed_pond_id)
            if not state:
                return {"error": "Pond simulation state not initialized"}
            return state.to_dict()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid pond ID format")

    states = simulation_manager.get_all_states(farm_id=parsed_farm_id)
    return {
        "status": "ok",
        "count": len(states),
        "ponds": states,
        "disclosure": "SYNTHETIC_SIMULATION_DATA",
        "provenance": "simulated"
    }

@router.post("/scenario")
def inject_scenario(
    req: ScenarioInjectionRequest,
    db: Session = Depends(get_db),
    operator: models.User = Depends(require_farm_operator)
):
    """Sets the active scenario on a specific virtual pond (Healthy, Nutrient Depletion, Heatwave, Sensor Dropout)."""
    pond = db.query(models.Pond).filter(models.Pond.id == req.pond_id).first()
    if not pond:
        raise HTTPException(status_code=404, detail="Pond not found")

    check_farm_isolation(operator, pond.farm_id)

    try:
        updated_state = simulation_manager.inject_scenario(req.pond_id, req.scenario)
        # Advance 1 step immediately so state changes are immediately reflected
        simulation_manager.step_pond(db, req.pond_id)
        return updated_state
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/control")
def control_simulation(
    req: SimulationControlRequest,
    db: Session = Depends(get_db),
    operator: models.User = Depends(require_farm_operator)
):
    """Handles playback actions: speed change (1x, 5x, 10x), stop/pause, resume, reset."""
    if req.pond_id:
        pond = db.query(models.Pond).filter(models.Pond.id == req.pond_id).first()
        if not pond:
            raise HTTPException(status_code=404, detail="Pond not found")
        check_farm_isolation(operator, pond.farm_id)

    action = req.action.lower()
    if action == "stop":
        return simulation_manager.stop(req.pond_id)
    elif action == "resume" or action == "play":
        return simulation_manager.resume(req.pond_id)
    elif action == "reset":
        return simulation_manager.reset(req.pond_id)
    elif action == "set_speed":
        if req.speed is None:
            raise HTTPException(status_code=400, detail="Speed must be provided for set_speed action")
        try:
            return simulation_manager.set_speed(req.speed, req.pond_id)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported action: {req.action}")

@router.post("/reset")
def reset_simulation(
    req: SimulationResetRequest,
    db: Session = Depends(get_db),
    operator: models.User = Depends(require_farm_operator)
):
    """Restores virtual pond state(s) to baseline."""
    if req.pond_id:
        pond = db.query(models.Pond).filter(models.Pond.id == req.pond_id).first()
        if not pond:
            raise HTTPException(status_code=404, detail="Pond not found")
        check_farm_isolation(operator, pond.farm_id)

    return simulation_manager.reset(req.pond_id)
