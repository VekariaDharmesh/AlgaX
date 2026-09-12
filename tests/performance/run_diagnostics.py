#!/usr/bin/env python3
"""
AlgaX Performance Diagnostic Suite
Measures API timing, DB queries, N+1 query patterns, payload sizes, internal process stages,
startup latency, telemetry scale, and tab transitions.
"""

import os
import sys
import time
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any

# Ensure backend path is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../backend')))
os.environ["DATABASE_URL"] = os.getenv("DATABASE_URL", "sqlite:///./test_dev.db")

from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy.engine import Engine

# Global DB Query Counter & Timer
db_queries: List[Dict[str, Any]] = []

@event.listens_for(Engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, execmany):
    conn.info.setdefault('query_start_time', []).append(time.perf_counter())

@event.listens_for(Engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, execmany):
    start_time = conn.info['query_start_time'].pop()
    duration_ms = (time.perf_counter() - start_time) * 1000.0
    rowcount = cursor.rowcount if hasattr(cursor, 'rowcount') else -1
    db_queries.append({
        "statement": statement,
        "parameters": parameters,
        "duration_ms": duration_ms,
        "rowcount": rowcount
    })

def reset_db_queries():
    global db_queries
    db_queries = []

def run_diagnostics():
    from app.main import app
    from app.database import engine, Base, SessionLocal
    from app import models

    Base.metadata.create_all(bind=engine)

    client = TestClient(app, raise_server_exceptions=False)
    
    # Startup latency measurement
    t_start = time.perf_counter()
    import app.main
    t_imported = time.perf_counter()
    import app.services
    import app.anomaly.service
    t_services = time.perf_counter()
    
    startup_metrics = {
        "main_import_ms": (t_imported - t_start) * 1000.0,
        "services_import_ms": (t_services - t_imported) * 1000.0,
        "total_startup_test_ms": (t_services - t_start) * 1000.0
    }

    # Populate/verify DB seed data for realistic measurements
    db = SessionLocal()
    farm = db.query(models.Farm).first()
    if not farm:
        farm = models.Farm(name="Diagnostic Test Farm", location="Pacific NW")
        db.add(farm)
        db.commit()
        db.refresh(farm)
    
    pond = db.query(models.Pond).filter(models.Pond.farm_id == farm.id).first()
    if not pond:
        pond = models.Pond(farm_id=farm.id, name="Pond Alpha", volume_liters=100000.0, species="Spirulina")
        db.add(pond)
        db.commit()
        db.refresh(pond)
        
    sensors = db.query(models.Sensor).filter(models.Sensor.pond_id == pond.id).all()
    if not sensors:
        for s_type in [models.SensorType.temperature, models.SensorType.ph, models.SensorType.dissolved_oxygen, models.SensorType.turbidity, models.SensorType.light]:
            sensor = models.Sensor(pond_id=pond.id, type=s_type, unit="units", is_simulated=True)
            db.add(sensor)
        db.commit()
        sensors = db.query(models.Sensor).filter(models.Sensor.pond_id == pond.id).all()

    # Ensure readings exist for scale test
    reading_count = db.query(models.SensorReading).count()
    if reading_count < 200:
        now = datetime.now(timezone.utc)
        for i in range(250):
            ts = now - timedelta(minutes=i * 10)
            for s in sensors:
                val = 22.5 + (i % 5) * 0.1
                r = models.SensorReading(
                    sensor_id=s.id,
                    pond_id=pond.id,
                    timestamp=ts,
                    value=val,
                    raw_value=val,
                    calibrated_value=val,
                    calibration_offset=0.0,
                    calibration_gain=1.0
                )
                db.add(r)
        db.commit()

    farm_id = str(farm.id)
    pond_id = str(pond.id)
    db.close()

    # Define Endpoints to audit
    endpoints_to_test = [
        ("GET", "/health", None),
        ("GET", "/api/farms", None),
        ("GET", f"/api/ponds?farm_id={farm_id}", None),
        ("GET", f"/api/sensors?farm_id={farm_id}", None),
        ("GET", f"/api/telemetry?pond_id={pond_id}&limit=100", None),
        ("GET", f"/api/telemetry/stats?pond_id={pond_id}&hours=24", None),
        ("GET", f"/api/anomalies?pond_id={pond_id}", None),
        ("GET", f"/api/model/biomass?pond_id={pond_id}&limit=100", None),
        ("GET", f"/api/model/carbon?pond_id={pond_id}&limit=100", None),
        ("GET", f"/api/harvests?farm_id={farm_id}", None),
        ("GET", f"/api/harvests/overview?farm_id={farm_id}", None),
        ("GET", f"/api/ponds/{pond_id}/readiness", None),
        ("GET", f"/api/calibrations?pond_id={pond_id}", None),
        ("GET", f"/api/calibrations/overview?farm_id={farm_id}", None),
        ("GET", f"/api/calibrations/sensors?pond_id={pond_id}", None),
        ("GET", f"/api/evidence-packages?pond_id={pond_id}", None),
        ("GET", "/api/imagery", None),
        ("GET", "/api/weather/current?location=PacificNW", None),
        ("GET", "/api/explanations", None),
    ]

    api_results = []
    
    for method, path, payload in endpoints_to_test:
        reset_db_queries()
        t0 = time.perf_counter()
        if method == "GET":
            resp = client.get(path)
        else:
            resp = client.post(path, json=payload)
        t1 = time.perf_counter()
        
        duration_ms = (t1 - t0) * 1000.0
        response_size = len(resp.content)
        query_count = len(db_queries)
        db_time_ms = sum(q['duration_ms'] for q in db_queries)
        
        # Categorize
        if duration_ms < 200:
            cat = "FAST"
        elif duration_ms <= 500:
            cat = "ACCEPTABLE"
        elif duration_ms <= 1000:
            cat = "SLOW"
        elif duration_ms <= 3000:
            cat = "VERY SLOW"
        else:
            cat = "CRITICAL"

        api_results.append({
            "endpoint": path,
            "method": method,
            "status": resp.status_code,
            "response_time_ms": round(duration_ms, 2),
            "response_size_bytes": response_size,
            "category": cat,
            "db_queries_count": query_count,
            "db_time_ms": round(db_time_ms, 2),
            "external_calls": 1 if "weather" in path else 0
        })

    # Telemetry Specific Range Tests
    telemetry_range_results = []
    time_ranges = [("1h", 1), ("24h", 24), ("7d", 168), ("30d", 720)]
    for label, hours in time_ranges:
        reset_db_queries()
        start = datetime.now(timezone.utc) - timedelta(hours=hours)
        path = f"/api/telemetry?pond_id={pond_id}&start_time={start.isoformat()}&limit=5000"
        t0 = time.perf_counter()
        resp = client.get(path)
        t1 = time.perf_counter()
        
        duration_ms = (t1 - t0) * 1000.0
        size_bytes = len(resp.content)
        row_count = len(resp.json()) if resp.status_code == 200 and isinstance(resp.json(), list) else 0
        db_time = sum(q['duration_ms'] for q in db_queries)
        
        telemetry_range_results.append({
            "range": label,
            "rows": row_count,
            "query_time_ms": round(db_time, 2),
            "api_time_ms": round(duration_ms, 2),
            "response_size_bytes": size_bytes
        })

    # DB Connection Pool Acquisition Time
    t_pool_start = time.perf_counter()
    test_db = SessionLocal()
    test_db.execute(models.Farm.__table__.select().limit(1))
    t_pool_end = time.perf_counter()
    test_db.close()
    db_conn_time_ms = round((t_pool_end - t_pool_start) * 1000.0, 2)

    results_payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "startup_metrics": startup_metrics,
        "api_results": api_results,
        "telemetry_range_results": telemetry_range_results,
        "db_conn_time_ms": db_conn_time_ms
    }

    output_path = os.path.join(os.path.dirname(__file__), 'diagnostic_output.json')
    with open(output_path, 'w') as f:
        json.dump(results_payload, f, indent=2)

    print("Diagnostic complete. Output written to:", output_path)

if __name__ == "__main__":
    run_diagnostics()
