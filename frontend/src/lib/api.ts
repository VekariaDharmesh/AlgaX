export const API_BASE_URL = 'http://localhost:8000/api';

export async function fetchPonds() {
  const res = await fetch(`${API_BASE_URL}/ponds`);
  if (!res.ok) throw new Error('Failed to fetch ponds');
  return res.json();
}

export async function fetchTelemetry(pondId: string, limit: number = 50) {
  const res = await fetch(`${API_BASE_URL}/telemetry?pond_id=${pondId}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch telemetry');
  return res.json();
}

export async function injectScenario(pondId: string, scenario: string) {
  const res = await fetch(`${API_BASE_URL}/demo/inject-scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pond_id: pondId, scenario })
  });
  if (!res.ok) throw new Error('Failed to inject scenario');
  return res.json();
}

export async function fetchBiomassEstimates(pondId: string) {
  const res = await fetch(`${API_BASE_URL}/model/biomass?pond_id=${pondId}`);
  if (!res.ok) throw new Error("Failed to fetch biomass estimates");
  return res.json();
}

export async function fetchCarbonEstimates(pondId: string) {
  const res = await fetch(`${API_BASE_URL}/model/carbon?pond_id=${pondId}`);
  if (!res.ok) throw new Error("Failed to fetch carbon estimates");
  return res.json();
}

export async function fetchAnomalies(page: number = 1, pageSize: number = 50, status?: string) {
  let url = `${API_BASE_URL}/anomalies?page=${page}&page_size=${pageSize}`;
  if (status) {
    url += `&status=${status}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch anomalies");
  return res.json();
}

export async function fetchAnomaly(anomalyId: string) {
  const res = await fetch(`${API_BASE_URL}/anomalies/${anomalyId}`);
  if (!res.ok) throw new Error("Failed to fetch anomaly");
  return res.json();
}

export async function updateAnomalyStatus(anomalyId: string, status: string) {
  const res = await fetch(`${API_BASE_URL}/anomalies/${anomalyId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) throw new Error("Failed to update anomaly status");
  return res.json();
}

export async function fetchAnomalyExplanation(anomalyId: string) {
  const res = await fetch(`${API_BASE_URL}/anomalies/${anomalyId}/explanation`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error("Failed to fetch anomaly explanation");
  }
  return res.json();
}

export interface HourlyForecast {
  time: string;
  temperature_2m: number;
  shortwave_radiation: number;
  precipitation: number;
  weather_code: number;
}

export interface AlgaeWeatherImpact {
  solar_irradiance_w_m2: number;
  photosynthesis_score: number;
  thermal_stress_rating: 'Optimal' | 'Suboptimal' | 'Heat Stress' | 'Cold Stress';
  evaporation_risk: 'Low' | 'Moderate' | 'High';
  growth_condition_summary: string;
}

export interface WeatherData {
  location_name: string;
  latitude: number;
  longitude: number;
  temperature_c: number;
  apparent_temperature_c: number;
  relative_humidity: number;
  wind_speed_kmh: number;
  wind_direction_deg: number;
  precipitation_mm: number;
  weather_code: number;
  weather_description: string;
  is_day: boolean;
  solar_irradiance_w_m2: number;
  algae_impact: AlgaeWeatherImpact;
  hourly_forecast: HourlyForecast[];
  updated_at: string;
}

export interface WeatherSearchLocation {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

export async function fetchCurrentWeather(location?: string, lat?: number, lon?: number): Promise<WeatherData> {
  const params = new URLSearchParams();
  if (location) params.append('location', location);
  if (lat !== undefined) params.append('latitude', lat.toString());
  if (lon !== undefined) params.append('longitude', lon.toString());

  const res = await fetch(`${API_BASE_URL}/weather/current?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch weather');
  return res.json();
}

export async function searchWeatherLocations(query: string): Promise<WeatherSearchLocation[]> {
  const res = await fetch(`${API_BASE_URL}/weather/search?query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Failed to search locations');
  return res.json();
}

export interface HashVerificationResult {
  package_id: string;
  integrity_match: boolean;
  stored_hash: string;
  recomputed_hash: string;
  status: string;
  message: string;
  verified_at: string;
  sealed_at?: string;
  sealed_by?: string;
}

export async function verifyPackageHash(packageId: string, farmId?: string): Promise<HashVerificationResult> {
  const url = farmId ? `${API_BASE_URL}/evidence-packages/${packageId}/verify-hash?farm_id=${farmId}` : `${API_BASE_URL}/evidence-packages/${packageId}/verify-hash`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to verify package hash');
  return res.json();
}

export async function sealEvidencePackage(packageId: string, farmId?: string) {
  const url = farmId ? `${API_BASE_URL}/evidence-packages/${packageId}/seal?farm_id=${farmId}` : `${API_BASE_URL}/evidence-packages/${packageId}/seal`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to seal evidence package');
  }
  return res.json();
}

export async function fetchCanonicalJson(packageId: string) {
  const res = await fetch(`${API_BASE_URL}/evidence-packages/${packageId}/canonical-json`);
  if (!res.ok) throw new Error('Failed to fetch canonical JSON');
  return res.json();
}

export async function fetchReviewActions(packageId: string) {
  const res = await fetch(`${API_BASE_URL}/evidence-packages/${packageId}/review/actions`);
  if (!res.ok) throw new Error('Failed to fetch review actions');
  return res.json();
}

export async function submitReviewAction(packageId: string, action: string, note?: string) {
  const res = await fetch(`${API_BASE_URL}/evidence-packages/${packageId}/review/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, note })
  });
  if (!res.ok) throw new Error('Failed to submit review action');
  return res.json();
}


