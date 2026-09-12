'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchFarms,
  fetchPonds,
  fetchSensors,
  fetchTelemetry,
  fetchTelemetryStats,
  Farm,
  Pond,
  Sensor,
  SensorReading,
  TelemetryStatsResponse,
} from '@/lib/api';
import { TelemetryHeader } from '@/components/telemetry/TelemetryHeader';
import { TelemetryStatusBanner } from '@/components/telemetry/TelemetryStatusBanner';
import { TelemetryKPICards } from '@/components/telemetry/TelemetryKPICards';
import { TelemetryChartsSection } from '@/components/telemetry/TelemetryChartsSection';
import { CombinedEnvironmentChart } from '@/components/telemetry/CombinedEnvironmentChart';
import { SensorHealthGrid } from '@/components/telemetry/SensorHealthGrid';
import { DataQualityDashboard } from '@/components/telemetry/DataQualityDashboard';
import { RecentReadingsTable } from '@/components/telemetry/RecentReadingsTable';
import { ModelInputsProvenance } from '@/components/telemetry/ModelInputsProvenance';
import { TelemetryDetailModal } from '@/components/telemetry/TelemetryDetailModal';
import { AlertCircle, RefreshCw, Activity, Database, Play } from 'lucide-react';
import Link from 'next/link';

export default function TelemetryPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [selectedPondId, setSelectedPondId] = useState<string>('');
  const [selectedHours, setSelectedHours] = useState<number>(24);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  const [stats, setStats] = useState<TelemetryStatsResponse | null>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [selectedReading, setSelectedReading] = useState<SensorReading | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Map sensor ID -> { type, unit }
  const sensorsMap: Record<string, { type: string; unit: string }> = {};
  sensors.forEach((s) => {
    sensorsMap[s.id] = { type: s.type, unit: s.unit };
  });

  // Initial Load: Farms & Ponds
  useEffect(() => {
    async function loadMeta() {
      try {
        const [farmData, pondData] = await Promise.all([fetchFarms(), fetchPonds()]);
        setFarms(farmData);
        setPonds(pondData);
        if (farmData.length > 0) {
          setSelectedFarmId(farmData[0].id);
        }
        if (pondData.length > 0) {
          setSelectedPondId(pondData[0].id);
        }
      } catch (err: any) {
        console.error('Failed loading metadata:', err);
        setError('Failed to load farms and ponds from backend API.');
      }
    }
    loadMeta();
  }, []);

  // Filter ponds when farm changes
  const handleFarmChange = (farmId: string) => {
    setSelectedFarmId(farmId);
    const availablePonds = ponds.filter((p) => !farmId || p.farm_id === farmId);
    if (availablePonds.length > 0) {
      setSelectedPondId(availablePonds[0].id);
    } else {
      setSelectedPondId('');
    }
  };

  // Main Telemetry Data Fetcher
  const loadTelemetryData = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const [statsData, readingsData, sensorsData] = await Promise.all([
        fetchTelemetryStats(selectedPondId || undefined, selectedFarmId || undefined, selectedHours),
        fetchTelemetry(selectedPondId || undefined, selectedFarmId || undefined, undefined, 500),
        fetchSensors(selectedPondId || undefined, selectedFarmId || undefined),
      ]);

      setStats(statsData);
      setReadings(readingsData);
      setSensors(sensorsData);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Failed fetching telemetry:', err);
      setError(err.message || 'Error communicating with telemetry API.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedPondId, selectedFarmId, selectedHours]);

  useEffect(() => {
    loadTelemetryData();
  }, [loadTelemetryData]);

  // Auto-refresh interval (5s)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadTelemetryData();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadTelemetryData]);

  const selectedPondObj = ponds.find((p) => p.id === selectedPondId);
  const selectedFarmObj = farms.find((f) => f.id === selectedFarmId);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* 1. Header & Filters */}
      <TelemetryHeader
        farms={farms}
        ponds={ponds.filter((p) => !selectedFarmId || p.farm_id === selectedFarmId)}
        selectedFarmId={selectedFarmId}
        selectedPondId={selectedPondId}
        selectedHours={selectedHours}
        autoRefresh={autoRefresh}
        isRefreshing={isRefreshing}
        lastUpdated={lastUpdated}
        onFarmChange={handleFarmChange}
        onPondChange={(id) => setSelectedPondId(id)}
        onHoursChange={(h) => setSelectedHours(h)}
        onRefresh={loadTelemetryData}
        onToggleAutoRefresh={(val) => setAutoRefresh(val)}
      />

      {/* 2. Loading State */}
      {loading ? (
        <div className="py-24 text-center space-y-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <div className="text-sm font-bold text-slate-800">Streaming IoT Telemetry Data...</div>
          <p className="text-xs text-slate-400">Connecting to telemetry database and simulator engine.</p>
        </div>
      ) : error ? (
        /* Error State */
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-base">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            Telemetry API Error
          </div>
          <p className="text-xs font-medium text-rose-700">{error}</p>
          <button
            onClick={loadTelemetryData}
            className="px-4 py-2 bg-rose-700 text-white rounded-xl text-xs font-bold hover:bg-rose-800 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      ) : readings.length === 0 ? (
        /* Empty State */
        <div className="py-20 text-center bg-white border border-slate-200/80 rounded-2xl p-8 shadow-2xs space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
            <Database className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">No Telemetry Stream Available</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">
              No active IoT readings found for {selectedPondObj ? selectedPondObj.name : 'selected pond'}. Enable the background simulator to generate live telemetry data.
            </p>
          </div>
          <Link
            href="/simulation"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Start Telemetry Simulator</span>
          </Link>
        </div>
      ) : (
        /* Main Telemetry Dashboard Content */
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* 3. Status Banner */}
          <TelemetryStatusBanner stats={stats} />

          {/* 4. KPI Cards */}
          <TelemetryKPICards
            kpis={stats?.kpis || {}}
            totalReadings={stats?.total_readings || 0}
            completenessPct={stats?.data_quality.completeness_pct || 100}
          />

          {/* 5. Time-Series Telemetry Charts */}
          <TelemetryChartsSection
            readings={readings}
            sensorsMap={sensorsMap}
            kpis={stats?.kpis || {}}
            anomalies={stats?.recent_anomalies || []}
          />

          {/* 6. Combined Environmental Multi-Variable Overview */}
          <CombinedEnvironmentChart readings={readings} sensorsMap={sensorsMap} />

          {/* 7. Model Input Provenance Card */}
          <ModelInputsProvenance modelInputs={stats?.model_inputs} />

          {/* 8. Sensor Hardware Operational Health Grid */}
          <SensorHealthGrid sensors={stats?.sensor_health || []} />

          {/* 9. Data Quality & Data Gap Dashboard */}
          <DataQualityDashboard quality={stats?.data_quality} gaps={stats?.data_gaps || []} />

          {/* 10. Searchable/Sortable Readings Table */}
          <RecentReadingsTable
            readings={readings}
            sensorsMap={sensorsMap}
            onSelectReading={(r) => setSelectedReading(r)}
          />
        </div>
      )}

      {/* 11. Telemetry Detail Modal Drawer */}
      <TelemetryDetailModal
        reading={selectedReading}
        sensorInfo={selectedReading ? sensorsMap[selectedReading.sensor_id] : undefined}
        pondName={selectedPondObj?.name}
        farmName={selectedFarmObj?.name}
        onClose={() => setSelectedReading(null)}
      />
    </div>
  );
}
