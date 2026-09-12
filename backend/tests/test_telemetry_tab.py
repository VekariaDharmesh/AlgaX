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

def test_metric_waveform_distinctness():
    from seed import seed_database
    seed_database(force=True)
    db = SessionLocal()
    try:
        pond = db.query(models.Pond).first()
        assert pond is not None

        res_stats = client.get(f"/api/telemetry/stats?pond_id={pond.id}&hours=24")
        assert res_stats.status_code == 200
        kpis = res_stats.json()["kpis"]

        assert "temperature" in kpis
        assert "ph" in kpis
        assert "light" in kpis
        assert "nitrogen" in kpis
        assert "dissolved_oxygen" in kpis
        assert "turbidity" in kpis
        assert "biomass" in kpis

        # Verify distinct KPI profiles across metrics
        assert kpis["light"]["min"] == 0.0
        assert kpis["light"]["max"] > 700.0
        assert kpis["temperature"]["min"] > 15.0 and kpis["temperature"]["max"] < 35.0
        assert kpis["ph"]["min"] >= 7.0 and kpis["ph"]["max"] <= 9.0
        assert kpis["nitrogen"]["min"] < kpis["nitrogen"]["max"]
        assert kpis["biomass"]["min"] < kpis["biomass"]["max"]

        # Fetch telemetry readings per metric
        res_telemetry = client.get(f"/api/telemetry?pond_id={pond.id}&limit=500")
        assert res_telemetry.status_code == 200
        readings = res_telemetry.json()
        assert len(readings) > 0

        sensors = db.query(models.Sensor).filter(models.Sensor.pond_id == pond.id).all()
        sensor_type_map = {str(s.id): s.type.value if hasattr(s.type, 'value') else str(s.type) for s in sensors}

        metric_readings = {}
        for r in readings:
            stype = sensor_type_map.get(str(r["sensor_id"]))
            if stype:
                if stype not in metric_readings:
                    metric_readings[stype] = []
                metric_readings[stype].append(r["value"])

        # Verify each metric has its own distinct array of values
        assert len(metric_readings["temperature"]) > 0
        assert len(metric_readings["light"]) > 0
        assert len(metric_readings["nitrogen"]) > 0
        assert len(metric_readings["dissolved_oxygen"]) > 0

        # Assert waveforms are not identical across metrics
        assert metric_readings["light"] != metric_readings["temperature"]
        assert metric_readings["nitrogen"] != metric_readings["biomass"]
        assert metric_readings["temperature"] != metric_readings["dissolved_oxygen"]
    finally:
        db.close()


