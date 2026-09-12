import asyncio
import datetime
import logging
import math
import random
import uuid
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from .. import models
from ..database import SessionLocal
from ..services import execute_model_run
from ..anomaly.service import run_sensor_anomaly_detection, check_for_dropouts
from ..anomaly.env_detectors.engine import check_environmental_anomalies
from ..anomaly.bio_detectors.engine import check_biological_anomalies

logger = logging.getLogger("simulation_engine")

class PondSimulationState:
    def __init__(self, pond_id: uuid.UUID, farm_id: Optional[uuid.UUID] = None, name: str = "Pond"):
        self.pond_id = pond_id
        self.farm_id = farm_id
        self.name = name
        self.reset_to_baseline()

    def reset_to_baseline(self):
        """Restores the virtual pond state to healthy initial baseline."""
        self.simulated_time = datetime.datetime.now(datetime.timezone.utc)
        self.biomass = 0.5  # g/L
        self.nitrogen = 15.0  # mg/L
        self.temp_base = 25.0  # °C
        self.active_scenario = "healthy"  # healthy, nutrient_depletion, heatwave, sensor_dropout
        self.dropout_sensor_type: Optional[str] = None
        self.is_running = True
        self.speed_multiplier = 1  # 1x, 5x, 10x
        self.step_count = 0

    def to_dict(self) -> dict:
        return {
            "pond_id": str(self.pond_id),
            "farm_id": str(self.farm_id) if self.farm_id else None,
            "name": self.name,
            "simulated_time": self.simulated_time.isoformat(),
            "biomass": round(self.biomass, 4),
            "nitrogen": round(self.nitrogen, 2),
            "temp_base": round(self.temp_base, 2),
            "active_scenario": self.active_scenario,
            "dropout_sensor_type": self.dropout_sensor_type,
            "is_running": self.is_running,
            "speed_multiplier": self.speed_multiplier,
            "step_count": self.step_count,
            "provenance": "simulated"
        }


class SimulationManager:
    def __init__(self):
        self.pond_states: Dict[str, PondSimulationState] = {}
        self.is_loop_running = False
        self._lock = asyncio.Lock()

    def initialize_ponds(self, db: Session):
        """Loads all existing ponds from the database into the simulation manager."""
        ponds = db.query(models.Pond).all()
        for p in ponds:
            pid_str = str(p.id)
            if pid_str not in self.pond_states:
                self.pond_states[pid_str] = PondSimulationState(p.id, p.farm_id, p.name)
        logger.info(f"SimulationManager initialized with {len(self.pond_states)} ponds.")

    def get_state(self, pond_id: uuid.UUID) -> Optional[PondSimulationState]:
        return self.pond_states.get(str(pond_id))

    def get_all_states(self, farm_id: Optional[uuid.UUID] = None) -> List[dict]:
        states = []
        for state in self.pond_states.values():
            if farm_id is None or state.farm_id == farm_id:
                states.append(state.to_dict())
        return states

    def inject_scenario(self, pond_id: uuid.UUID, scenario: str) -> dict:
        pid_str = str(pond_id)
        if pid_str not in self.pond_states:
            with SessionLocal() as db:
                self.initialize_ponds(db)
        
        state = self.pond_states.get(pid_str)
        if not state:
            raise ValueError(f"Pond {pond_id} not found in simulation state")

        scenario_norm = scenario.lower().replace(" ", "_").replace("-", "_")
        
        if scenario_norm in ["nutrient_depletion", "simulate_n_depletion"]:
            state.active_scenario = "nutrient_depletion"
            state.dropout_sensor_type = None
        elif scenario_norm in ["heatwave", "simulate_heatwave"]:
            state.active_scenario = "heatwave"
            state.dropout_sensor_type = None
        elif scenario_norm in ["sensor_dropout", "drop_temp_sensor"]:
            state.active_scenario = "sensor_dropout"
            state.dropout_sensor_type = "temperature"
        else:
            state.active_scenario = "healthy"
            state.dropout_sensor_type = None

        state.is_running = True
        return state.to_dict()

    def set_speed(self, speed: int, pond_id: Optional[uuid.UUID] = None) -> dict:
        valid_speeds = [1, 5, 10]
        if speed not in valid_speeds:
            raise ValueError(f"Speed must be one of {valid_speeds}")

        if pond_id:
            state = self.get_state(pond_id)
            if not state:
                raise ValueError(f"Pond {pond_id} not found")
            state.speed_multiplier = speed
            return state.to_dict()
        else:
            for s in self.pond_states.values():
                s.speed_multiplier = speed
            return {"status": "ok", "speed": speed}

    def stop(self, pond_id: Optional[uuid.UUID] = None) -> dict:
        if pond_id:
            state = self.get_state(pond_id)
            if not state:
                raise ValueError(f"Pond {pond_id} not found")
            state.is_running = False
            return state.to_dict()
        else:
            for s in self.pond_states.values():
                s.is_running = False
            return {"status": "ok", "action": "stopped"}

    def resume(self, pond_id: Optional[uuid.UUID] = None) -> dict:
        if pond_id:
            state = self.get_state(pond_id)
            if not state:
                raise ValueError(f"Pond {pond_id} not found")
            state.is_running = True
            return state.to_dict()
        else:
            for s in self.pond_states.values():
                s.is_running = True
            return {"status": "ok", "action": "resumed"}

    def reset(self, pond_id: Optional[uuid.UUID] = None) -> dict:
        if pond_id:
            state = self.get_state(pond_id)
            if not state:
                raise ValueError(f"Pond {pond_id} not found")
            state.reset_to_baseline()
            return state.to_dict()
        else:
            for s in self.pond_states.values():
                s.reset_to_baseline()
            return {"status": "ok", "action": "reset"}

    def step_pond(self, db: Session, pond_id: uuid.UUID) -> dict:
        """
        Advances the virtual pond physics, creates sensor readings in the database,
        triggers calibration, sensor anomaly detection, model execution, and biological/environmental anomalies.
        """
        pid_str = str(pond_id)
        state = self.pond_states.get(pid_str)
        if not state:
            return {}

        # Advance simulated time
        dt_minutes = 5 * state.speed_multiplier
        state.simulated_time += datetime.timedelta(minutes=dt_minutes)
        state.step_count += 1

        # Scenario-driven state updates
        if state.active_scenario == "heatwave":
            state.temp_base = min(36.5, state.temp_base + (0.35 * (dt_minutes / 5.0)))
        elif state.active_scenario == "nutrient_depletion":
            state.nitrogen = max(0.01, state.nitrogen - (0.45 * (dt_minutes / 5.0)))

        # Diurnal physics calculation
        hour = state.simulated_time.hour + (state.simulated_time.minute / 60.0)

        # Solar light curve
        if 6 <= hour <= 18:
            light = math.sin((hour - 6) / 12.0 * math.pi) * 2000.0
        else:
            light = 0.0

        # Temperature
        temp = state.temp_base + (math.sin((hour - 8) / 24.0 * 2 * math.pi) * 4.0)

        # Dissolved Oxygen
        do_base = 7.0
        do = max(1.0, do_base + (light / 2000.0 * 4.0) - 1.5)

        # pH
        ph = max(5.0, min(10.0, 7.5 + (light / 2000.0 * 1.5)))

        # Monod-Droop growth & nitrogen consumption
        lim_light = min(1.0, light / 500.0)
        lim_temp = 1.0 - abs(temp - 27.0) / 10.0 if 17.0 < temp < 37.0 else 0.1
        lim_n = state.nitrogen / (state.nitrogen + 2.0)

        growth_rate = 0.05 * lim_light * lim_temp * lim_n
        state.biomass += state.biomass * growth_rate * (dt_minutes / 60.0)
        state.nitrogen -= (state.biomass * growth_rate * (dt_minutes / 60.0)) * 0.08
        state.nitrogen = max(0.0, state.nitrogen)

        turbidity = state.biomass * 100.0
        conductivity = 1500.0
        water_level = 1.2

        env = {
            "temperature": temp,
            "ph": ph,
            "dissolved_oxygen": do,
            "turbidity": turbidity,
            "light": light,
            "nitrogen": state.nitrogen,
            "biomass": state.biomass,
            "conductivity": conductivity,
            "water_level": water_level,
        }

        # Ingest virtual sensors into the database
        sensors = db.query(models.Sensor).filter(models.Sensor.pond_id == pond_id).all()
        created_readings = []

        for sensor in sensors:
            stype = sensor.type.value
            
            # Scenario: Sensor Dropout
            if state.active_scenario == "sensor_dropout" and state.dropout_sensor_type == stype:
                continue  # Drop this sensor's readings

            base_val = env.get(stype, 0.0)
            noise = random.gauss(0, max(0.01, abs(base_val) * 0.015))
            raw_val = base_val + noise

            # Apply active calibration if present
            active_calib = db.query(models.SensorCalibrationRecord).filter(
                models.SensorCalibrationRecord.sensor_id == sensor.id,
                models.SensorCalibrationRecord.status == models.CalibrationStatus.ACTIVE
            ).order_by(desc(models.SensorCalibrationRecord.calibrated_at)).first()

            if active_calib:
                gain = active_calib.gain_applied if active_calib.gain_applied is not None else 1.0
                offset = active_calib.offset_applied if active_calib.offset_applied is not None else 0.0
                calibrated_val = (raw_val * gain) + offset
            else:
                gain = 1.0
                offset = 0.0
                calibrated_val = raw_val

            reading = models.SensorReading(
                sensor_id=sensor.id,
                pond_id=pond_id,
                timestamp=state.simulated_time,
                value=calibrated_val,
                raw_value=raw_val,
                calibrated_value=calibrated_val,
                calibration_gain=gain,
                calibration_offset=offset,
                quality_flag=models.QualityFlag.ok,
                source_type=models.SourceType.simulated
            )
            db.add(reading)
            created_readings.append(reading)

        db.commit()

        # Run sensor anomaly checks on newly ingested readings
        for r in created_readings:
            db.refresh(r)
            run_sensor_anomaly_detection(db, r)

        # Run model step, environmental & biological anomaly checks
        start_time = state.simulated_time - datetime.timedelta(hours=1)
        try:
            execute_model_run(db, pond_id, start_time, state.simulated_time)
        except Exception as e:
            logger.debug(f"Model step note for pond {pond_id}: {e}")

        try:
            check_environmental_anomalies(db, str(pond_id), state.simulated_time)
            check_biological_anomalies(db, str(pond_id), state.simulated_time)
            check_for_dropouts(db, state.simulated_time)
        except Exception as e:
            logger.debug(f"Anomaly check note for pond {pond_id}: {e}")

        return env


simulation_manager = SimulationManager()


async def run_simulation_loop():
    """Background loop that continuously runs the simulation for all active ponds."""
    while True:
        await asyncio.sleep(2.0)
        try:
            def sync_step():
                with SessionLocal() as db:
                    if not simulation_manager.pond_states:
                        simulation_manager.initialize_ponds(db)
                    
                    for pid_str, state in list(simulation_manager.pond_states.items()):
                        if state.is_running:
                            simulation_manager.step_pond(db, state.pond_id)

            await asyncio.to_thread(sync_step)
        except Exception as e:
            logger.error(f"Simulation loop tick error: {e}")
