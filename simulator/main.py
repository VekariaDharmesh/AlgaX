import asyncio
import os
import random
import datetime
import math
import uuid
import httpx
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("simulator")

app = FastAPI(title="Simulator Control API")

# Fetch config from Backend
API_URL = os.environ.get("API_URL", "http://localhost:8000")
SPEED = int(os.environ.get("SIMULATOR_SPEED", 5))

class PondState:
    def __init__(self, pond_id: uuid.UUID):
        self.pond_id = pond_id
        self.time = datetime.datetime.now(datetime.timezone.utc).replace(hour=8, minute=0, second=0, microsecond=0)
        self.biomass = 0.5  # g/L
        self.nitrogen = 15.0 # mg/L
        self.temp_base = 25.0
        self.active_scenario = None
        self.scenario_start_time = None
        self.dropout_sensor_type = None

class Simulator:
    def __init__(self):
        self.ponds = {}
        self.sensors = {}
        self.is_running = False
        seed_val = os.environ.get("SIMULATOR_SEED")
        if seed_val:
            random.seed(int(seed_val))
    def load_config(self):
        import httpx
        try:
            resp = httpx.get("http://localhost:8000/api/ponds")
            resp.raise_for_status()
            ponds = resp.json()
            for p in ponds:
                pid = p["id"]
                self.ponds[pid] = PondState(pid)
                self.sensors[pid] = []
                for s in p.get("sensors", []):
                    self.sensors[pid].append({"id": s["id"], "type": s["type"]})
            logger.info(f"Loaded {len(self.ponds)} ponds and their sensors from API.")
        except Exception as e:
            logger.error(f"Failed to load config from API: {e}")

    async def step_pond(self, state: PondState):
        # Advance time 5 minutes simulated
        dt_minutes = 5
        state.time += datetime.timedelta(minutes=dt_minutes)
        
        # Scenarios
        if state.active_scenario == "heatwave":
            state.temp_base = min(35.0, state.temp_base + 0.1)
        elif state.active_scenario == "nutrient_depletion":
            # nitrogen drops faster
            state.nitrogen = max(0.1, state.nitrogen - 0.2)
            
        # Diurnal behavior
        hour = state.time.hour + state.time.minute / 60.0
        
        # Light (simple curve peak at noon)
        if 6 <= hour <= 18:
            light = math.sin((hour - 6) / 12.0 * math.pi) * 2000
        else:
            light = 0
            
        # Temperature (lags light by ~2 hours)
        temp = state.temp_base + (math.sin((hour - 8) / 24.0 * 2 * math.pi) * 5)
        
        # Dissolved Oxygen (increases during day due to photosynthesis, decreases at night)
        do_base = 7.0
        do = do_base + (light / 2000.0 * 4.0) - 2.0  # simple heuristic
        
        # pH (increases during day as CO2 is consumed)
        ph = 7.5 + (light / 2000.0 * 1.5)
        
        # Growth and Nutrient Feedback
        # Monod-Droop basic approximation
        lim_light = min(1.0, light / 500.0)
        lim_temp = 1.0 - abs(temp - 27.0) / 10.0 if 17 < temp < 37 else 0.1
        lim_n = state.nitrogen / (state.nitrogen + 2.0) # Half saturation const
        
        growth_rate = 0.05 * lim_light * lim_temp * lim_n # Base rate * limitations
        
        # Biomass evolves
        state.biomass += state.biomass * growth_rate * (dt_minutes / 60.0)
        
        # Nitrogen consumed by growth
        state.nitrogen -= (state.biomass * growth_rate * (dt_minutes / 60.0)) * 0.08
        state.nitrogen = max(0.0, state.nitrogen)
        
        # Turbidity proxy from biomass
        turbidity = state.biomass * 100
        
        return {
            "temperature": temp,
            "ph": ph,
            "dissolved_oxygen": do,
            "turbidity": turbidity,
            "light": light,
            "nitrogen": state.nitrogen,
            "biomass": state.biomass
        }

    async def run(self):
        self.is_running = True
        self.load_config()
        
        async with httpx.AsyncClient() as client:
            while self.is_running:
                for pond_id, state in self.ponds.items():
                    env = await self.step_pond(state)
                    
                    # Generate sensor readings
                    if pond_id in self.sensors:
                        for sensor in self.sensors[pond_id]:
                            s_type = sensor["type"]
                            
                            if state.dropout_sensor_type == s_type:
                                continue # Simulate dropout, no reading
                                
                            val = env.get(s_type, 0.0)
                            
                            # Add noise
                            noise = random.gauss(0, val * 0.02)
                            val_noisy = val + noise
                            
                            payload = {
                                "sensor_id": str(sensor["id"]),
                                "pond_id": str(pond_id),
                                "timestamp": state.time.isoformat(),
                                "value": val_noisy,
                                "quality_flag": "ok",
                                "source_type": "simulated"
                            }
                            
                            try:
                                await client.post(f"{API_URL}/api/ingest/reading", json=payload)
                            except Exception as e:
                                logger.error(f"Failed to post reading: {e}")
                
                # Real-world pause (affected by SPEED multiplier)
                # 5 simulated minutes = 300 seconds. 
                # If speed is 10x, we wait 30 seconds real time? Actually let's just tick faster for demo
                # Tick every 2 seconds real time = 5 minutes simulated time
                await asyncio.sleep(2.0 / SPEED)

sim = Simulator()

class ScenarioReq(BaseModel):
    pond_id: uuid.UUID
    scenario: str

@app.post("/control/inject-scenario")
async def inject_scenario(req: ScenarioReq):
    pid_str = str(req.pond_id)
    if pid_str not in sim.ponds:
        return {"error": "Pond not found"}
        
    state = sim.ponds[pid_str]
    logger.info(f"Injecting scenario {req.scenario} into pond {req.pond_id}")
    
    if req.scenario == "nutrient_depletion":
        state.active_scenario = "nutrient_depletion"
    elif req.scenario == "heatwave":
        state.active_scenario = "heatwave"
    elif req.scenario == "sensor_dropout":
        state.active_scenario = "sensor_dropout"
        state.dropout_sensor_type = "temperature" # arbitrary choice
    else:
        state.active_scenario = None
        state.dropout_sensor_type = None
        
    return {"status": "ok", "scenario": req.scenario}

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(sim.run())
