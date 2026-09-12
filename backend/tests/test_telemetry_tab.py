import pytest
from datetime import datetime, timezone, timedelta
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app import models
from app.database import get_db

from app.main import app
from app import models
from app.database import SessionLocal, engine

client = TestClient(app)

def test_get_telemetry_and_sensors():
    db = SessionLocal()
    try:
        # Setup test farm, pond, sensor, and readings
        farm = models.Farm(id=uuid.uuid4(), name="Test Telemetry Farm")
        db.add(farm)
        db.commit()

        pond = models.Pond(id=uuid.uuid4(), farm_id=farm.id, name="Telemetry Pond A")
        db.add(pond)
        db.commit()

        sensor_temp = models.Sensor(
            id=uuid.uuid4(),
            pond_id=pond.id,
            type=models.SensorType.temperature,
            unit="°C",
            is_simulated=True
        )
        sensor_ph = models.Sensor(
            id=uuid.uuid4(),
            pond_id=pond.id,
            type=models.SensorType.ph,
            unit="pH",
            is_simulated=True
        )
        db.add_all([sensor_temp, sensor_ph])
        db.commit()

        now = datetime.now(timezone.utc)

        reading1 = models.SensorReading(
            id=uuid.uuid4(),
            sensor_id=sensor_temp.id,
            pond_id=pond.id,
            timestamp=now - timedelta(minutes=10),
            value=24.5,
            quality_flag=models.QualityFlag.ok,
            source_type=models.SourceType.simulated
        )
        reading2 = models.SensorReading(
            id=uuid.uuid4(),
            sensor_id=sensor_ph.id,
            pond_id=pond.id,
            timestamp=now - timedelta(minutes=5),
            value=7.8,
            quality_flag=models.QualityFlag.ok,
            source_type=models.SourceType.simulated
        )
        db.add_all([reading1, reading2])
        db.commit()

        # 1. Test GET /api/sensors
        res_sensors = client.get(f"/api/sensors?pond_id={pond.id}")
        assert res_sensors.status_code == 200
        sensors_data = res_sensors.json()
        assert len(sensors_data) >= 2

        # 2. Test GET /api/telemetry
        res_telemetry = client.get(f"/api/telemetry?pond_id={pond.id}")
        assert res_telemetry.status_code == 200
        telemetry_data = res_telemetry.json()
        assert len(telemetry_data) >= 2

        # Filter by farm_id
        res_farm_telemetry = client.get(f"/api/telemetry?farm_id={farm.id}")
        assert res_farm_telemetry.status_code == 200
        assert len(res_farm_telemetry.json()) >= 2

        # 3. Test GET /api/telemetry/stats
        res_stats = client.get(f"/api/telemetry/stats?pond_id={pond.id}&hours=24")
        assert res_stats.status_code == 200
        stats_data = res_stats.json()

        assert stats_data["total_readings"] >= 2
        assert "temperature" in stats_data["kpis"]
        assert stats_data["kpis"]["temperature"]["latest"] == 24.5
        assert stats_data["kpis"]["ph"]["latest"] == 7.8
        assert stats_data["data_source_label"] == "SIMULATED DATA"
        assert len(stats_data["sensor_health"]) >= 2
        assert stats_data["data_quality"]["completeness_pct"] == 100.0
    finally:
        db.close()

def test_telemetry_gap_detection():
    db = SessionLocal()
    try:
        farm = models.Farm(id=uuid.uuid4(), name="Gap Test Farm")
        db.add(farm)
        db.commit()

        pond = models.Pond(id=uuid.uuid4(), farm_id=farm.id, name="Gap Pond")
        db.add(pond)
        db.commit()

        sensor = models.Sensor(
            id=uuid.uuid4(),
            pond_id=pond.id,
            type=models.SensorType.dissolved_oxygen,
            unit="mg/L",
            is_simulated=True
        )
        db.add(sensor)
        db.commit()

        now = datetime.now(timezone.utc)
        # Create 2 readings 45 minutes apart (> 15 min gap)
        t1 = now - timedelta(minutes=60)
        t2 = now - timedelta(minutes=15)

        r1 = models.SensorReading(
            id=uuid.uuid4(), sensor_id=sensor.id, pond_id=pond.id, timestamp=t1, value=6.5
        )
        r2 = models.SensorReading(
            id=uuid.uuid4(), sensor_id=sensor.id, pond_id=pond.id, timestamp=t2, value=6.8
        )
        db.add_all([r1, r2])
        db.commit()

        res_stats = client.get(f"/api/telemetry/stats?pond_id={pond.id}&hours=24")
        assert res_stats.status_code == 200
        stats_data = res_stats.json()

        assert len(stats_data["data_gaps"]) >= 1
        assert stats_data["data_gaps"][0]["duration_minutes"] == 45.0
    finally:
        db.close()

def test_water_temperature_pipeline():
    db = SessionLocal()
    try:
        farm = models.Farm(id=uuid.uuid4(), name="Temperature Pipeline Farm")
        db.add(farm)
        db.commit()

        pond = models.Pond(id=uuid.uuid4(), farm_id=farm.id, name="Temperature Pond")
        db.add(pond)
        db.commit()

        sensor_temp = models.Sensor(
            id=uuid.uuid4(),
            pond_id=pond.id,
            type=models.SensorType.temperature,
            unit="°C",
            is_simulated=True
        )
        db.add(sensor_temp)
        db.commit()

        now = datetime.now(timezone.utc)

        r = models.SensorReading(
            id=uuid.uuid4(),
            sensor_id=sensor_temp.id,
            pond_id=pond.id,
            timestamp=now - timedelta(minutes=2),
            value=25.84,
            quality_flag=models.QualityFlag.ok,
            source_type=models.SourceType.simulated
        )
        db.add(r)
        db.commit()

        # Check telemetry endpoint
        res = client.get(f"/api/telemetry?pond_id={pond.id}")
        assert res.status_code == 200
        items = res.json()
        assert len(items) >= 1
        assert items[0]["value"] == 25.84

        # Check telemetry stats endpoint
        res_stats = client.get(f"/api/telemetry/stats?pond_id={pond.id}")
        assert res_stats.status_code == 200
        stats = res_stats.json()
        assert "temperature" in stats["kpis"]
        assert stats["kpis"]["temperature"]["latest"] == 25.84
        assert stats["kpis"]["temperature"]["unit"] == "°C"
    finally:
        db.close()


