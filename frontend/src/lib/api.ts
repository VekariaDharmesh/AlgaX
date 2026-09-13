const envApiUrl = process.env.NEXT_PUBLIC_API_URL;
export const API_BASE_URL = envApiUrl
  ? (envApiUrl.startsWith('http://') || envApiUrl.startsWith('https://')
      ? (envApiUrl.endsWith('/api') ? envApiUrl : `${envApiUrl.replace(/\/$/, '')}/api`)
      : `https://${envApiUrl.replace(/\/$/, '')}${envApiUrl.endsWith('/api') ? '' : '/api'}`)
  : 'http://localhost:8000/api';

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

const cache = new Map<string, { data: any; timestamp: number }>();
const inFlightRequests = new Map<string, Promise<any>>();
const DEFAULT_TTL_MS = 10000;

export function clearApiCache(urlPrefix?: string) {
  if (urlPrefix) {
    for (const key of cache.keys()) {
      if (key.startsWith(urlPrefix)) cache.delete(key);
    }
  } else {
    cache.clear();
  }
}

async function fetchWithCache<T = any>(url: string, ttl: number = DEFAULT_TTL_MS, forceRefresh: boolean = false): Promise<T> {
  const now = Date.now();
  const cached = cache.get(url);

  if (!forceRefresh && cached && now - cached.timestamp < ttl) {
    return cached.data;
  }

  if (inFlightRequests.has(url)) {
    return inFlightRequests.get(url)!;
  }

  const promise = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${url} (status ${res.status})`);
      const data = await res.json();
      cache.set(url, { data, timestamp: Date.now() });
      return data;
    } catch (err: any) {
      if (cached) {
        console.warn(`Fetch failed for ${url}, returning stale cached data:`, err);
        return cached.data;
      }
      throw err;
    } finally {
      inFlightRequests.delete(url);
    }
  })();

  inFlightRequests.set(url, promise);
  return promise;
}

export async function fetchFarms(forceRefresh: boolean = false): Promise<Farm[]> {
  return fetchWithCache<Farm[]>(`${API_BASE_URL}/farms`, 60000, forceRefresh).catch((err) => {
    console.warn("fetchFarms failed, returning empty array:", err);
    return [];
  });
}

export async function fetchPonds(farmId?: string, forceRefresh: boolean = false): Promise<Pond[]> {
  const url = farmId ? `${API_BASE_URL}/ponds?farm_id=${farmId}` : `${API_BASE_URL}/ponds`;
  return fetchWithCache<Pond[]>(url, 60000, forceRefresh).catch((err) => {
    console.warn("fetchPonds failed, returning empty array:", err);
    return [];
  });
}

export async function fetchSensors(pondId?: string, farmId?: string, forceRefresh: boolean = false): Promise<Sensor[]> {
  const params = new URLSearchParams();
  if (pondId) params.append('pond_id', pondId);
  if (farmId) params.append('farm_id', farmId);
  const url = `${API_BASE_URL}/sensors?${params.toString()}`;
  return fetchWithCache<Sensor[]>(url, 30000, forceRefresh).catch((err) => {
    console.warn("fetchSensors failed, returning empty array:", err);
    return [];
  });
}

export async function fetchTelemetry(pondId?: string, farmId?: string, sensorType?: string, limit: number = 100, forceRefresh: boolean = false): Promise<SensorReading[]> {
  const params = new URLSearchParams();
  if (pondId) params.append('pond_id', pondId);
  if (farmId) params.append('farm_id', farmId);
  if (sensorType) params.append('sensor_type', sensorType);
  params.append('limit', limit.toString());
  const url = `${API_BASE_URL}/telemetry?${params.toString()}`;
  return fetchWithCache<SensorReading[]>(url, 10000, forceRefresh).catch((err) => {
    console.warn("fetchTelemetry failed, returning empty array:", err);
    return [];
  });
}

export async function fetchTelemetryStats(pondId?: string, farmId?: string, hours: number = 24, forceRefresh: boolean = false): Promise<TelemetryStatsResponse> {
  const params = new URLSearchParams();
  if (pondId) params.append('pond_id', pondId);
  if (farmId) params.append('farm_id', farmId);
  params.append('hours', hours.toString());
  const url = `${API_BASE_URL}/telemetry/stats?${params.toString()}`;
  return fetchWithCache<TelemetryStatsResponse>(url, 10000, forceRefresh).catch((err) => {
    console.warn("fetchTelemetryStats failed, returning fallback stats:", err);
    return {
      farm: { id: farmId, name: 'Facility' },
      pond: { id: pondId, name: 'Pond' },
      hours: hours,
      is_simulated: true,
      data_source_label: 'OFFLINE / FALLBACK',
      total_readings: 0,
      active_sensors: 0,
      stale_sensors: 0,
      offline_sensors: 0,
      kpis: {},
      sensor_health: [],
      data_quality: {
        total_readings: 0,
        ok_count: 0,
        outlier_count: 0,
        missing_count: 0,
        completeness_pct: 0.0,
        simulated_count: 0,
        measured_count: 0
      },
      data_gaps: [],
      recent_anomalies: []
    } as TelemetryStatsResponse;
  });
}

export interface SimulationPondState {
  pond_id: string;
  farm_id?: string;
  name: string;
  simulated_time: string;
  biomass: number;
  nitrogen: number;
  temp_base: number;
  active_scenario: string;
  dropout_sensor_type: string | null;
  is_running: boolean;
  speed_multiplier: number;
  step_count: number;
  provenance: string;
}

export interface SimulationStatusResponse {
  status: string;
  count: number;
  ponds: SimulationPondState[];
  disclosure: string;
  provenance: string;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    try {
      const role = localStorage.getItem('algax_active_role');
      if (role) {
        headers['X-AlgaX-Role'] = role;
      }
    } catch {
      // localStorage access
    }
  }
  return headers;
}

export async function fetchSimulationStatus(pondId?: string, farmId?: string): Promise<SimulationStatusResponse> {
  let url = `${API_BASE_URL}/simulation/status`;
  const params = new URLSearchParams();
  if (pondId && pondId.trim() !== '') params.append('pond_id', pondId.trim());
  if (farmId && farmId.trim() !== '') params.append('farm_id', farmId.trim());
  if (params.toString()) url += `?${params.toString()}`;

  try {
    const res = await fetch(url, { 
      cache: 'no-store',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      return {
        status: 'ok',
        count: 0,
        ponds: [],
        disclosure: 'SYNTHETIC_SIMULATION_DATA',
        provenance: 'simulated'
      };
    }
    return res.json();
  } catch (err) {
    return {
      status: 'ok',
      count: 0,
      ponds: [],
      disclosure: 'SYNTHETIC_SIMULATION_DATA',
      provenance: 'simulated'
    };
  }
}

export async function injectScenario(pondId: string, scenario: string) {
  clearApiCache();
  const res = await fetch(`${API_BASE_URL}/simulation/scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ pond_id: pondId, scenario })
  });
  if (!res.ok) {
    // Fallback to demo endpoint if needed
    const fallbackRes = await fetch(`${API_BASE_URL}/demo/inject-scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ pond_id: pondId, scenario })
    });
    if (!fallbackRes.ok) throw new Error('Failed to inject scenario');
    return fallbackRes.json();
  }
  return res.json();
}

export async function controlSimulation(
  action: 'stop' | 'resume' | 'reset' | 'set_speed',
  speed?: number,
  pondId?: string,
  farmId?: string
) {
  clearApiCache();
  const res = await fetch(`${API_BASE_URL}/simulation/control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ action, speed, pond_id: pondId, farm_id: farmId })
  });
  if (!res.ok) throw new Error(`Failed to perform simulation action: ${action}`);
  return res.json();
}

export async function resetSimulation(pondId?: string) {
  clearApiCache();
  const res = await fetch(`${API_BASE_URL}/simulation/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ pond_id: pondId })
  });
  if (!res.ok) throw new Error('Failed to reset simulation');
  return res.json();
}

export async function fetchBiomassEstimates(pondId: string, forceRefresh: boolean = false) {
  const url = `${API_BASE_URL}/model/biomass?pond_id=${pondId}`;
  return fetchWithCache(url, 15000, forceRefresh).catch((err) => {
    console.warn("fetchBiomassEstimates failed, returning empty array:", err);
    return [];
  });
}

export async function fetchCarbonEstimates(pondId: string, forceRefresh: boolean = false) {
  const url = `${API_BASE_URL}/model/carbon?pond_id=${pondId}`;
  return fetchWithCache(url, 15000, forceRefresh).catch((err) => {
    console.warn("fetchCarbonEstimates failed, returning empty array:", err);
    return [];
  });
}

export async function fetchAnomalies(page: number = 1, pageSize: number = 50, status?: string, forceRefresh: boolean = false) {
  let url = `${API_BASE_URL}/anomalies?page=${page}&page_size=${pageSize}`;
  if (status) {
    url += `&status=${status}`;
  }
  return fetchWithCache(url, 10000, forceRefresh).catch((err) => {
    console.warn("fetchAnomalies failed, returning empty items:", err);
    return { total: 0, page: page, page_size: pageSize, has_next: false, items: [] };
  });
}

export async function fetchAnomaly(anomalyId: string) {
  const res = await fetch(`${API_BASE_URL}/anomalies/${anomalyId}`);
  if (!res.ok) throw new Error("Failed to fetch anomaly");
  return res.json();
}

export async function updateAnomalyStatus(anomalyId: string, status: string) {
  clearApiCache(`${API_BASE_URL}/anomalies`);
  const res = await fetch(`${API_BASE_URL}/anomalies/${anomalyId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) throw new Error("Failed to update anomaly status");
  return res.json();
}

export async function fetchAnomalyExplanation(anomalyId: string, forceRefresh: boolean = false) {
  const url = `${API_BASE_URL}/anomalies/${anomalyId}/explanation`;
  return fetchWithCache(url, 60000, forceRefresh);
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

export async function fetchCurrentWeather(location?: string, lat?: number, lon?: number, forceRefresh: boolean = false): Promise<WeatherData> {
  const params = new URLSearchParams();
  if (location) params.append('location', location);
  if (lat !== undefined) params.append('latitude', lat.toString());
  if (lon !== undefined) params.append('longitude', lon.toString());

  const url = `${API_BASE_URL}/weather/current?${params.toString()}`;
  return fetchWithCache<WeatherData>(url, 900000, forceRefresh).catch((err) => {
    console.warn("fetchCurrentWeather failed, returning default fallback weather:", err);
    return {
      location_name: location || 'Gandhinagar, India',
      latitude: lat ?? 23.2156,
      longitude: lon ?? 72.6369,
      temperature_c: 28.0,
      apparent_temperature_c: 29.5,
      relative_humidity: 55.0,
      wind_speed_kmh: 12.0,
      wind_direction_deg: 180.0,
      precipitation_mm: 0.0,
      weather_code: 0,
      weather_description: 'Clear Sky',
      is_day: true,
      solar_irradiance_w_m2: 650.0,
      algae_impact: {
        solar_irradiance_w_m2: 650.0,
        photosynthesis_score: 76.5,
        thermal_stress_rating: 'Optimal',
        evaporation_risk: 'Low',
        growth_condition_summary: 'Excellent growth conditions. High photosynthetic activity with minimal stress.'
      },
      hourly_forecast: [],
      updated_at: new Date().toISOString()
    } as WeatherData;
  });
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

export type HarvestStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type HarvestMethod = 'FILTRATION' | 'CENTRIFUGATION' | 'FLOCCULATION' | 'SKIMMING' | 'OTHER';
export type EndUseCategory = 'BIOCHAR' | 'BIOPLASTICS' | 'FUEL' | 'ANIMAL_FEED' | 'UNSPECIFIED';

export interface HarvestBiomassFate {
  id: string;
  harvest_event_id: string;
  end_use_category: EndUseCategory;
  quantity_allocated_kg: number;
  allocation_pct: number;
  destination: string;
  processing_info?: string;
  retention_info?: string;
  notes?: string;
  created_at: string;
}

export interface HarvestEvent {
  id: string;
  farm_id: string;
  pond_id: string;
  status: HarvestStatus;
  planned_date: string;
  harvest_date?: string;
  harvest_method: HarvestMethod;
  operator: string;
  notes?: string;
  biomass_before_g_per_l?: number;
  estimated_harvest_kg: number;
  actual_harvest_kg?: number;
  unit: string;
  model_run_id?: string;
  created_at: string;
  updated_at: string;
  biomass_fates: HarvestBiomassFate[];
}

export interface HarvestOverviewKPIs {
  current_biomass_g_l?: number;
  harvestable_biomass_kg?: number;
  total_harvested_kg: number;
  latest_harvest_date?: string;
  harvest_event_count: number;
  period_harvested_kg: number;
  remaining_biomass_g_l?: number;
  carbon_associated_kg?: number;
  harvestable_status: string;
}

export interface BiomassReadiness {
  pond_id: string;
  pond_name: string;
  biomass_g_per_l: number;
  timestamp: string;
  model_run_id?: string;
  model_version: string;
  confidence_score: number;
  readiness_label: string;
}

export async function fetchHarvests(farmId?: string, pondId?: string, status?: string, page: number = 1, pageSize: number = 50, forceRefresh: boolean = false) {
  const params = new URLSearchParams();
  if (farmId) params.append('farm_id', farmId);
  if (pondId) params.append('pond_id', pondId);
  if (status) params.append('status', status);
  params.append('page', page.toString());
  params.append('page_size', pageSize.toString());
  const url = `${API_BASE_URL}/harvests?${params.toString()}`;
  return fetchWithCache(url, 15000, forceRefresh);
}

export async function fetchHarvestOverview(farmId?: string, pondId?: string, forceRefresh: boolean = false): Promise<HarvestOverviewKPIs> {
  const params = new URLSearchParams();
  if (farmId) params.append('farm_id', farmId);
  if (pondId) params.append('pond_id', pondId);
  const url = `${API_BASE_URL}/harvests/overview?${params.toString()}`;
  return fetchWithCache<HarvestOverviewKPIs>(url, 15000, forceRefresh);
}

export async function fetchBiomassReadiness(pondId: string, forceRefresh: boolean = false): Promise<BiomassReadiness> {
  const url = `${API_BASE_URL}/ponds/${pondId}/readiness`;
  return fetchWithCache<BiomassReadiness>(url, 15000, forceRefresh);
}

export async function createHarvestEvent(eventData: Partial<HarvestEvent>): Promise<HarvestEvent> {
  clearApiCache(`${API_BASE_URL}/harvests`);
  const res = await fetch(`${API_BASE_URL}/harvests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create harvest event');
  }
  return res.json();
}

export async function updateHarvestEvent(harvestId: string, updateData: Partial<HarvestEvent>): Promise<HarvestEvent> {
  clearApiCache(`${API_BASE_URL}/harvests`);
  const res = await fetch(`${API_BASE_URL}/harvests/${harvestId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update harvest event');
  }
  return res.json();
}

export async function addHarvestBiomassFate(harvestId: string, fateData: Partial<HarvestBiomassFate>): Promise<HarvestBiomassFate> {
  clearApiCache(`${API_BASE_URL}/harvests`);
  const res = await fetch(`${API_BASE_URL}/harvests/${harvestId}/fate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fateData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to add biomass fate');
  }
  return res.json();
}

// Calibration API & Types
export interface SensorCalibrationRecord {
  id: string;
  sensor_id: string;
  performed_by: string;
  calibration_method: 'ZERO_POINT' | 'SPAN' | 'TWO_POINT' | 'LINEAR_REGRESSION' | 'OFFSET_ADJUST';
  reference_standard?: string;
  raw_reference_value: number;
  expected_reference_value: number;
  offset_applied: number;
  gain_applied: number;
  pre_calibration_error?: number;
  post_calibration_error?: number;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'SUPERSEDED';
  notes?: string;
  calibrated_at: string;
  valid_until?: string;
  sensor_type?: string;
  sensor_unit?: string;
  pond_id?: string;
  pond_name?: string;
}

export interface CalibrationOverviewKPIs {
  total_sensors: number;
  active_calibrated_sensors: number;
  pending_approval_count: number;
  calibration_due_count: number;
  drift_alert_count: number;
  latest_calibration_date?: string;
}

export interface SensorCalibrationStatus {
  sensor_id: string;
  pond_id: string;
  pond_name?: string;
  sensor_type: string;
  unit: string;
  is_simulated: boolean;
  last_calibrated_at?: string;
  calibration_status: string;
  active_offset: number;
  active_gain: number;
  drift_warning: boolean;
  calibration_due: boolean;
}

export interface CalibrationCalculationRequest {
  calibration_method: string;
  raw_reference_value: number;
  expected_reference_value: number;
  secondary_raw_value?: number;
  secondary_expected_value?: number;
}

export interface CalibrationCalculationResponse {
  calibration_method: string;
  offset_applied: number;
  gain_applied: number;
  pre_calibration_error: number;
  post_calibration_error: number;
  equation_formula: string;
}

export async function fetchCalibrations(sensorId?: string, pondId?: string, status?: string, page: number = 1, pageSize: number = 50, forceRefresh: boolean = false) {
  const params = new URLSearchParams();
  if (sensorId) params.append('sensor_id', sensorId);
  if (pondId) params.append('pond_id', pondId);
  if (status) params.append('status', status);
  params.append('page', page.toString());
  params.append('page_size', pageSize.toString());
  const url = `${API_BASE_URL}/calibrations?${params.toString()}`;
  return fetchWithCache(url, 15000, forceRefresh);
}

export async function fetchCalibrationOverview(farmId?: string, pondId?: string, forceRefresh: boolean = false): Promise<CalibrationOverviewKPIs> {
  const params = new URLSearchParams();
  if (farmId) params.append('farm_id', farmId);
  if (pondId) params.append('pond_id', pondId);
  const url = `${API_BASE_URL}/calibrations/overview?${params.toString()}`;
  return fetchWithCache<CalibrationOverviewKPIs>(url, 15000, forceRefresh);
}

export async function fetchSensorsCalibrationStatus(farmId?: string, pondId?: string, forceRefresh: boolean = false): Promise<SensorCalibrationStatus[]> {
  const params = new URLSearchParams();
  if (farmId) params.append('farm_id', farmId);
  if (pondId) params.append('pond_id', pondId);
  const url = `${API_BASE_URL}/sensors/calibration-status?${params.toString()}`;
  return fetchWithCache<SensorCalibrationStatus[]>(url, 15000, forceRefresh);
}

export async function calculateCalibration(data: CalibrationCalculationRequest): Promise<CalibrationCalculationResponse> {
  const res = await fetch(`${API_BASE_URL}/calibrations/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to calculate calibration equation');
  return res.json();
}

export async function createCalibration(data: Partial<SensorCalibrationRecord>): Promise<SensorCalibrationRecord> {
  clearApiCache(`${API_BASE_URL}/calibrations`);
  clearApiCache(`${API_BASE_URL}/sensors`);
  const res = await fetch(`${API_BASE_URL}/calibrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create calibration record');
  }
  return res.json();
}

export async function activateCalibration(calibrationId: string): Promise<SensorCalibrationRecord> {
  clearApiCache(`${API_BASE_URL}/calibrations`);
  clearApiCache(`${API_BASE_URL}/sensors`);
  const res = await fetch(`${API_BASE_URL}/calibrations/${calibrationId}/activate`, {
    method: 'POST'
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to activate calibration');
  }
  return res.json();
}

export async function approveCalibration(calibrationId: string): Promise<SensorCalibrationRecord> {
  clearApiCache(`${API_BASE_URL}/calibrations`);
  const res = await fetch(`${API_BASE_URL}/calibrations/${calibrationId}/approve`, {
    method: 'POST'
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to approve calibration');
  }
  return res.json();
}

export async function fetchImagery(farmId?: string, pondId?: string, forceRefresh: boolean = false): Promise<any[]> {
  const params = new URLSearchParams();
  if (farmId) params.append('farm_id', farmId);
  if (pondId) params.append('pond_id', pondId);
  const url = `${API_BASE_URL}/imagery?${params.toString()}`;
  return fetchWithCache<any[]>(url, 15000, forceRefresh).catch((err) => {
    console.warn("fetchImagery failed, returning empty array:", err);
    return [];
  });
}



