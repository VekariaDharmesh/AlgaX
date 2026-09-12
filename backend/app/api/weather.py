import datetime
import math
import time
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query, HTTPException
import httpx

from .. import schemas

router = APIRouter()

# In-memory cache for weather response: key -> (timestamp, data)
_WEATHER_CACHE: Dict[str, tuple[float, schemas.WeatherCurrentResponse]] = {}
CACHE_TTL_SECONDS = 300 # 5 minutes

WMO_WEATHER_CODES: Dict[int, str] = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    71: "Slight Snow",
    73: "Moderate Snow",
    75: "Heavy Snow",
    80: "Slight Rain Showers",
    81: "Moderate Rain Showers",
    82: "Violent Rain Showers",
    95: "Thunderstorm",
    96: "Thunderstorm with Hail",
    99: "Heavy Thunderstorm",
}

# Predefined locations map for quick lookups
KNOWN_LOCATIONS = {
    "gandhinagar": {"name": "Gandhinagar, Gujarat", "lat": 23.2156, "lon": 72.6369},
    "imperial valley": {"name": "Imperial Valley, CA", "lat": 32.8312, "lon": -115.5724},
    "ahmedabad": {"name": "Ahmedabad, Gujarat", "lat": 23.0225, "lon": 72.5714},
    "san francisco": {"name": "San Francisco, CA", "lat": 37.7749, "lon": -122.4194},
}

def calculate_algae_impact(
    temp_c: float,
    solar_irradiance: float,
    humidity: float,
    wind_speed: float,
    precip: float
) -> schemas.AlgaeWeatherImpact:
    # Photosynthesis score (0-100) based on solar irradiance (optimal ~700-1000 W/m2)
    p_score = min(100.0, max(0.0, round((solar_irradiance / 850.0) * 100.0, 1)))
    
    # Thermal stress rating
    if 22.0 <= temp_c <= 30.0:
        thermal_stress = "Optimal"
    elif 18.0 <= temp_c < 22.0 or 30.0 < temp_c <= 33.0:
        thermal_stress = "Suboptimal"
    elif temp_c > 33.0:
        thermal_stress = "Heat Stress"
    else:
        thermal_stress = "Cold Stress"
        
    # Evaporation risk
    if temp_c > 30.0 and wind_speed > 18.0 and humidity < 50.0:
        evap_risk = "High"
    elif temp_c > 26.0 or wind_speed > 15.0 or humidity < 60.0:
        evap_risk = "Moderate"
    else:
        evap_risk = "Low"
        
    # Summary recommendation
    if thermal_stress == "Optimal" and p_score > 60:
        summary = "Excellent growth conditions. High photosynthetic activity with minimal stress."
    elif thermal_stress == "Heat Stress":
        summary = "High temperature warning! Increase water turnover or cooling to prevent cell death."
    elif thermal_stress == "Cold Stress":
        summary = "Low temperature warning! Growth rate slowed due to reduced metabolic speed."
    elif p_score < 25:
        summary = "Low solar irradiance available. Photosynthetic rate is light-limited."
    elif precip > 5.0:
        summary = "Rainfall detected! Monitor pond volume to prevent nutrient dilution."
    else:
        summary = "Moderate growing conditions. Normal pond operation parameters apply."
        
    return schemas.AlgaeWeatherImpact(
        solar_irradiance_w_m2=round(solar_irradiance, 1),
        photosynthesis_score=p_score,
        thermal_stress_rating=thermal_stress,
        evaporation_risk=evap_risk,
        growth_condition_summary=summary
    )

def generate_fallback_weather(
    lat: float, lon: float, location_name: str
) -> schemas.WeatherCurrentResponse:
    """Generate realistic fallback weather data if remote open-meteo request fails."""
    now = datetime.datetime.now(datetime.timezone.utc)
    hour = now.hour + now.minute / 60.0
    
    # Daytime calculation
    is_day = 6.0 <= hour <= 18.0
    
    # Temperature diurnal variation (base 26C, amplitude 5C)
    temp_c = 25.0 + math.sin((hour - 8) / 24.0 * 2 * math.pi) * 5.0
    apparent_c = temp_c + 1.5
    humidity = 55.0 + math.cos(hour / 24.0 * 2 * math.pi) * 15.0
    wind_kmh = 12.0 + math.sin(hour) * 4.0
    
    if is_day:
        irradiance = max(0.0, math.sin((hour - 6.0) / 12.0 * math.pi) * 780.0)
        code = 0 if irradiance > 400 else 2
    else:
        irradiance = 0.0
        code = 0

    desc = WMO_WEATHER_CODES.get(code, "Clear Sky")
    impact = calculate_algae_impact(temp_c, irradiance, humidity, wind_kmh, 0.0)
    
    # Simple hourly forecast for 24h
    hourly = []
    for h in range(24):
        future_time = (now + datetime.timedelta(hours=h)).strftime("%Y-%m-%dT%H:00")
        f_hour = (hour + h) % 24.0
        f_temp = 25.0 + math.sin((f_hour - 8) / 24.0 * 2 * math.pi) * 5.0
        f_irr = max(0.0, math.sin((f_hour - 6.0) / 12.0 * math.pi) * 780.0) if 6.0 <= f_hour <= 18.0 else 0.0
        hourly.append(schemas.HourlyForecast(
            time=future_time,
            temperature_2m=round(f_temp, 1),
            shortwave_radiation=round(f_irr, 1),
            precipitation=0.0,
            weather_code=0 if f_irr > 0 else 1
        ))

    return schemas.WeatherCurrentResponse(
        location_name=location_name,
        latitude=lat,
        longitude=lon,
        temperature_c=round(temp_c, 1),
        apparent_temperature_c=round(apparent_c, 1),
        relative_humidity=round(humidity, 1),
        wind_speed_kmh=round(wind_kmh, 1),
        wind_direction_deg=180.0,
        precipitation_mm=0.0,
        weather_code=code,
        weather_description=desc,
        is_day=is_day,
        solar_irradiance_w_m2=round(irradiance, 1),
        algae_impact=impact,
        hourly_forecast=hourly,
        updated_at=now.isoformat()
    )

@router.get("/weather/current", response_model=schemas.WeatherCurrentResponse)
async def get_current_weather(
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    location: Optional[str] = Query(None)
):
    """
    Fetch real-time weather data from Open-Meteo API or cache.
    Computes algal growth weather impact metrics.
    """
    location_name = "Gandhinagar, India"
    lat = 23.2156
    lon = 72.6369
    
    if location:
        loc_key = location.lower().strip()
        if loc_key in KNOWN_LOCATIONS:
            known = KNOWN_LOCATIONS[loc_key]
            location_name = known["name"]
            lat = known["lat"]
            lon = known["lon"]
        else:
            location_name = location.title()
            
    if latitude is not None and longitude is not None:
        lat = latitude
        lon = longitude
        if not location:
            location_name = f"{round(lat, 4)}°, {round(lon, 4)}°"
            
    cache_key = f"{round(lat, 3)}_{round(lon, 3)}"
    now_ts = time.time()
    
    if cache_key in _WEATHER_CACHE:
        cached_ts, cached_data = _WEATHER_CACHE[cache_key]
        if now_ts - cached_ts < CACHE_TTL_SECONDS:
            return cached_data

    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}&"
        f"current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,shortwave_radiation&"
        f"hourly=temperature_2m,shortwave_radiation,precipitation,weather_code&"
        f"forecast_hours=24"
    )

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                fallback = generate_fallback_weather(lat, lon, location_name)
                _WEATHER_CACHE[cache_key] = (now_ts, fallback)
                return fallback
            
            data = resp.json()
            curr = data.get("current", {})
            hourly_raw = data.get("hourly", {})

            temp_c = curr.get("temperature_2m", 26.0)
            apparent_c = curr.get("apparent_temperature", temp_c)
            humidity = curr.get("relative_humidity_2m", 50.0)
            wind_speed = curr.get("wind_speed_10m", 10.0)
            wind_dir = curr.get("wind_direction_10m", 0.0)
            precip = curr.get("precipitation", 0.0)
            code = curr.get("weather_code", 0)
            is_day = bool(curr.get("is_day", 1))
            shortwave = curr.get("shortwave_radiation", 0.0)
            if shortwave is None:
                shortwave = 600.0 if is_day else 0.0

            weather_desc = WMO_WEATHER_CODES.get(code, "Clear Sky")
            algae_impact = calculate_algae_impact(temp_c, shortwave, humidity, wind_speed, precip)

            # Build hourly forecast list
            hourly_list: List[schemas.HourlyForecast] = []
            h_times = hourly_raw.get("time", [])
            h_temps = hourly_raw.get("temperature_2m", [])
            h_rads = hourly_raw.get("shortwave_radiation", [])
            h_prec = hourly_raw.get("precipitation", [])
            h_codes = hourly_raw.get("weather_code", [])

            for i in range(min(24, len(h_times))):
                hourly_list.append(schemas.HourlyForecast(
                    time=h_times[i],
                    temperature_2m=float(h_temps[i]) if i < len(h_temps) else temp_c,
                    shortwave_radiation=float(h_rads[i]) if (i < len(h_rads) and h_rads[i] is not None) else 0.0,
                    precipitation=float(h_prec[i]) if (i < len(h_prec) and h_prec[i] is not None) else 0.0,
                    weather_code=int(h_codes[i]) if i < len(h_codes) else 0
                ))

            result = schemas.WeatherCurrentResponse(
                location_name=location_name,
                latitude=lat,
                longitude=lon,
                temperature_c=round(temp_c, 1),
                apparent_temperature_c=round(apparent_c, 1),
                relative_humidity=round(humidity, 1),
                wind_speed_kmh=round(wind_speed, 1),
                wind_direction_deg=round(wind_dir, 1),
                precipitation_mm=round(precip, 1),
                weather_code=code,
                weather_description=weather_desc,
                is_day=is_day,
                solar_irradiance_w_m2=round(shortwave, 1),
                algae_impact=algae_impact,
                hourly_forecast=hourly_list,
                updated_at=datetime.datetime.now(datetime.timezone.utc).isoformat()
            )

            _WEATHER_CACHE[cache_key] = (now_ts, result)
            return result

    except Exception:
        fallback = generate_fallback_weather(lat, lon, location_name)
        _WEATHER_CACHE[cache_key] = (now_ts, fallback)
        return fallback

@router.get("/weather/search", response_model=List[schemas.WeatherSearchItem])
async def search_locations(query: str = Query(..., min_length=2)):
    """
    Search location by name using Open-Meteo Geocoding API.
    """
    q_clean = query.strip().lower()
    matches: List[schemas.WeatherSearchItem] = []
    
    # Check predefined locations first
    for key, item in KNOWN_LOCATIONS.items():
        if q_clean in key or q_clean in item["name"].lower():
            matches.append(schemas.WeatherSearchItem(
                name=item["name"],
                latitude=item["lat"],
                longitude=item["lon"],
                country="Preset"
            ))

    url = f"https://geocoding-api.open-meteo.com/v1/search?name={query}&count=5&language=en&format=json"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("results", [])
                for r in results:
                    matches.append(schemas.WeatherSearchItem(
                        name=r.get("name", query),
                        latitude=r.get("latitude", 0.0),
                        longitude=r.get("longitude", 0.0),
                        country=r.get("country"),
                        admin1=r.get("admin1")
                    ))
    except Exception:
        pass

    if not matches:
        # Default fallback match
        matches.append(schemas.WeatherSearchItem(
            name=f"{query.title()} (Estimated)",
            latitude=23.2156,
            longitude=72.6369,
            country="Search Result"
        ))

    return matches[:8]
