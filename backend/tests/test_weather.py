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
