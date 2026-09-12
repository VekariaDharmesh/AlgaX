import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.weather import calculate_algae_impact

client = TestClient(app)

def test_algae_impact_calculation():
    # Test optimal condition
    impact = calculate_algae_impact(temp_c=25.0, solar_irradiance=750.0, humidity=55.0, wind_speed=10.0, precip=0.0)
    assert impact.thermal_stress_rating == "Optimal"
    assert impact.photosynthesis_score > 70
    assert impact.evaporation_risk in ["Low", "Moderate"]
    
    # Test heat stress condition
    impact_heat = calculate_algae_impact(temp_c=35.0, solar_irradiance=900.0, humidity=40.0, wind_speed=25.0, precip=0.0)
    assert impact_heat.thermal_stress_rating == "Heat Stress"
    assert impact_heat.evaporation_risk == "High"

def test_get_current_weather_endpoint():
    response = client.get("/api/weather/current?location=Gandhinagar")
    assert response.status_code == 200
    data = response.json()
    assert "location_name" in data
    assert "temperature_c" in data
    assert "solar_irradiance_w_m2" in data
    assert "algae_impact" in data
    assert "hourly_forecast" in data
    assert len(data["hourly_forecast"]) > 0

def test_search_locations_endpoint():
    response = client.get("/api/weather/search?query=Gandhinagar")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "Gandhinagar" in data[0]["name"]

def test_weather_cache_performance():
    # First call (cache fill)
    res1 = client.get("/api/weather/current?location=PacificNW")
    assert res1.status_code == 200
    
    # Second call (must be fast cache hit)
    import time
    t0 = time.perf_counter()
    res2 = client.get("/api/weather/current?location=PacificNW")
    t1 = time.perf_counter()
    duration_ms = (t1 - t0) * 1000.0
    
    assert res2.status_code == 200
    assert duration_ms < 20.0, f"Cached weather call took {duration_ms}ms, expected < 20ms"
    assert res1.json()["location_name"] == res2.json()["location_name"]

def test_weather_cache_location_isolation():
    res_loc1 = client.get("/api/weather/current?location=Gandhinagar")
    res_loc2 = client.get("/api/weather/current?location=San%20Francisco")
    
    assert res_loc1.status_code == 200
    assert res_loc2.status_code == 200
    assert res_loc1.json()["location_name"] != res_loc2.json()["location_name"]
