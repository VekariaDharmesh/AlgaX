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

export async function fetchAnomalies() {
  const res = await fetch(`${API_BASE_URL}/anomalies?limit=5&status=OPEN`);
  if (!res.ok) throw new Error("Failed to fetch anomalies");
  return res.json();
}
