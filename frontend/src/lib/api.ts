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
