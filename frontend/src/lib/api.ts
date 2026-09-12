export const API_BASE_URL = 'http://localhost:8000/api';

export interface Farm {
  id: string;
  name: string;
  location?: string;
  created_at?: string;
  ponds?: Pond[];
}

export interface Pond {
  id: string;
  farm_id: string;
  name: string;
  volume_liters?: number;
  species?: string;
  status: string;
  sensors?: Sensor[];
}

export interface Sensor {
  id: string;
  pond_id: string;
  type: string;
  unit: string;
  is_simulated: boolean;
}

export interface SensorReading {
  id: string;
  sensor_id: string;
  pond_id: string;
  timestamp: string;
  value: number;
  quality_flag: 'ok' | 'outlier' | 'missing' | 'interpolated';
  source_type: 'measured' | 'simulated';
}

export interface SensorHealth {
  id: string;
  pond_id: string;
  pond_name: string;
  type: string;
  unit: string;
  is_simulated: boolean;
  status: 'online' | 'stale' | 'offline';
  last_value?: number;
  last_seen?: string;
  reading_count: number;
  quality_flag: string;
}

export interface TelemetryKpi {
  latest: number;
  unit: string;
  min: number;
  max: number;
  avg: number;
  count: number;
  last_seen?: string;
}

export interface DataQualitySummary {
  total_readings: number;
  ok_count: number;
  outlier_count: number;
  missing_count: number;
  completeness_pct: number;
  simulated_count: number;
  measured_count: number;
  last_ingestion?: string;
}

export interface DataGap {
  start: string;
  end: string;
  duration_minutes: number;
  sensor_id: string;
  pond_id: string;
}

export interface ModelInputProvenance {
  pond_id: string;
  model_run_id?: string;
  model_version: string;
  execution_timestamp?: string;
  provenance: string;
  environmental_values: Record<string, number | null>;
}

export interface TelemetryStatsResponse {
  farm: { id?: string; name: string };
  pond: { id?: string; name: string };
  hours: number;
  is_simulated: boolean;
  data_source_label: string;
  last_received?: string;
  total_readings: number;
  active_sensors: number;
  stale_sensors: number;
  offline_sensors: number;
  kpis: Record<string, TelemetryKpi>;
  sensor_health: SensorHealth[];
  data_quality: DataQualitySummary;
  data_gaps: DataGap[];
  model_inputs?: ModelInputProvenance;
  recent_anomalies: any[];
}

export async function fetchFarms(): Promise<Farm[]> {
  const res = await fetch(`${API_BASE_URL}/farms`);
  if (!res.ok) throw new Error('Failed to fetch farms');
  return res.json();
}

export async function fetchPonds(farmId?: string): Promise<Pond[]> {
  const url = farmId ? `${API_BASE_URL}/ponds?farm_id=${farmId}` : `${API_BASE_URL}/ponds`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch ponds');
  return res.json();
}

export async function fetchSensors(pondId?: string, farmId?: string): Promise<Sensor[]> {
  const params = new URLSearchParams();
  if (pondId) params.append('pond_id', pondId);
  if (farmId) params.append('farm_id', farmId);

  const res = await fetch(`${API_BASE_URL}/sensors?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch sensors');
  return res.json();
}

export async function fetchTelemetry(pondId?: string, farmId?: string, sensorType?: string, limit: number = 100): Promise<SensorReading[]> {
  const params = new URLSearchParams();
  if (pondId) params.append('pond_id', pondId);
  if (farmId) params.append('farm_id', farmId);
  if (sensorType) params.append('sensor_type', sensorType);
  params.append('limit', limit.toString());

  const res = await fetch(`${API_BASE_URL}/telemetry?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch telemetry');
  return res.json();
}

export async function fetchTelemetryStats(pondId?: string, farmId?: string, hours: number = 24): Promise<TelemetryStatsResponse> {
  const params = new URLSearchParams();
  if (pondId) params.append('pond_id', pondId);
  if (farmId) params.append('farm_id', farmId);
  params.append('hours', hours.toString());

  const res = await fetch(`${API_BASE_URL}/telemetry/stats?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch telemetry stats');
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


