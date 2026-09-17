'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  Square,
  FastForward,
  RotateCcw,
  AlertTriangle,
  Building2,
  Layers,
  Leaf,
  FlaskConical,
  Thermometer,
  Settings2,
  Search,
  CheckCircle2,
  X,
  Calendar,
  ChevronDown,
  Check,
  Activity,
  SlidersHorizontal,
  BarChart3,
  Lightbulb,
} from 'lucide-react';
import {
  fetchFarms,
  fetchPonds,
  fetchSimulationStatus,
  injectScenario,
  controlSimulation,
  resetSimulation,
  Farm,
  Pond,
  SimulationPondState,
} from '@/lib/api';
import { useRole } from '@/context/RoleContext';

export default function SimulationControlPage() {
  const { isFarmOperator } = useRole();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [selectedPondId, setSelectedPondId] = useState<string>('');
  const [simulationState, setSimulationState] = useState<SimulationPondState | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [messageTime, setMessageTime] = useState<string>('');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'configure' | 'run' | 'results' | 'insights'>('configure');

  // Load farms & ponds
  useEffect(() => {
    async function loadMeta() {
      try {
        const [farmData, pondData] = await Promise.all([fetchFarms(), fetchPonds()]);
        setFarms(farmData);
        setPonds(pondData);

        if (farmData.length > 0) {
          setSelectedFarmId(farmData[0].id);
          const availablePonds = pondData.filter((p) => p.farm_id === farmData[0].id);
          if (availablePonds.length > 0) {
            setSelectedPondId(availablePonds[0].id);
          }
        }
      } catch (err) {
        console.error('Failed loading metadata for simulation:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMeta();
  }, []);

  // Handle farm change
  const handleFarmChange = (farmId: string) => {
    setSelectedFarmId(farmId);
    const availablePonds = ponds.filter((p) => p.farm_id === farmId);
    if (availablePonds.length > 0) {
      setSelectedPondId(availablePonds[0].id);
    } else {
      setSelectedPondId('');
      setSimulationState(null);
    }
  };

  // Poll simulation status for the selected pond
  const pollStatus = useCallback(async () => {
    if (!selectedPondId) return;
    try {
      const res = await fetchSimulationStatus(selectedPondId);
      if (res && res.ponds && res.ponds.length > 0) {
        const found = res.ponds.find((p) => p.pond_id === selectedPondId) || res.ponds[0];
        setSimulationState(found);
      } else if ((res as any).pond_id) {
        setSimulationState(res as any);
      }
    } catch (err) {
      console.warn('Error polling simulation status:', err);
    }
  }, [selectedPondId]);

  useEffect(() => {
    pollStatus();
    const interval = setInterval(pollStatus, 2500);
    return () => clearInterval(interval);
  }, [pollStatus]);

  // Handle scenario activation
  const handleRunScenario = async (scenarioKey: string, scenarioLabel: string) => {
    if (!selectedPondId) return;
    setActionLoading(true);
    try {
      await injectScenario(selectedPondId, scenarioKey);
      setActionMessage(`Scenario "${scenarioLabel}" activated successfully. Subsequent telemetry will reflect this scenario.`);
      setMessageTime(
        new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      );
      await pollStatus();
    } catch (err: any) {
      console.error('Failed to inject scenario:', err);
      setActionMessage(`Failed to activate scenario: ${err.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle playback speed
  const handleSetSpeed = async (speed: number) => {
    if (!selectedPondId) return;
    setActionLoading(true);
    try {
      await controlSimulation('set_speed', speed, selectedPondId);
      await pollStatus();
    } catch (err) {
      console.error('Failed to set speed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle stop / resume
  const handleTogglePlay = async () => {
    if (!selectedPondId || !simulationState) return;
    setActionLoading(true);
    try {
      const action = simulationState.is_running ? 'stop' : 'resume';
      await controlSimulation(action, undefined, selectedPondId);
      await pollStatus();
    } catch (err) {
      console.error('Failed to toggle play state:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle reset
  const handleReset = async () => {
    if (!selectedPondId) return;
    setActionLoading(true);
    try {
      await resetSimulation(selectedPondId);
      setActionMessage('Virtual farm reset to healthy baseline state.');
      setMessageTime(
        new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      );
      await pollStatus();
    } catch (err) {
      console.error('Failed to reset simulation:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const selectedFarm = farms.find((f) => f.id === selectedFarmId);
  const selectedPond = ponds.find((p) => p.id === selectedPondId);

  const activeScenario = simulationState?.active_scenario || 'healthy';
  const isRunning = simulationState?.is_running ?? true;
  const currentSpeed = simulationState?.speed_multiplier ?? 1;

  const formattedSimulatedTime = simulationState?.simulated_time
    ? new Date(simulationState.simulated_time).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
      }) + ' UTC'
    : 'Sep 12, 10:57 PM UTC';

  const scenariosList = [
    {
      id: 'healthy',
      title: 'Healthy Pond',
      icon: Leaf,
      iconBg: 'bg-emerald-50 text-emerald-600',
      description: 'Normal baseline biological behavior with diurnal cycles and standard nutrient consumption.',
    },
    {
      id: 'nutrient_depletion',
      title: 'Nutrient Depletion',
      icon: FlaskConical,
      iconBg: 'bg-teal-50 text-teal-600',
      description: 'Nitrogen decreases over time → growth slows → limitation increases → biological anomaly is triggered.',
    },
    {
      id: 'heatwave',
      title: 'Heatwave',
      icon: Thermometer,
      iconBg: 'bg-rose-50 text-rose-600',
      description: 'Temperature rises above 35°C → thermal stress increases → biological and environmental anomalies appear.',
    },
    {
      id: 'sensor_dropout',
      title: 'Sensor Dropout',
      icon: Settings2,
      iconBg: 'bg-emerald-50 text-emerald-600',
      description: 'Selected sensor (temperature) stops producing readings → missing data state and sensor anomaly triggered.',
    },
  ];

  const filteredScenarios = useMemo(() => {
    if (!searchQuery.trim()) return scenariosList;
    return scenariosList.filter(
      (s) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, scenariosList]);

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Simulation</h1>
            <span className="text-[11px] font-extrabold text-slate-600 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md">
              AlgaX v5.1
            </span>
          </div>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            Run synthetic simulations to test, analyze, and optimize algae cultivation scenarios.
          </p>
        </div>

        {/* Tab Stepper Pills */}
        <div className="flex items-center bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 shadow-2xs self-start md:self-auto">
          <button
            onClick={() => setActiveTab('configure')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'configure'
                ? 'bg-white text-emerald-800 shadow-sm border border-emerald-100'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeTab === 'configure' ? 'bg-emerald-600' : 'bg-slate-400'}`} />
            Configure
          </button>
          <button
            onClick={() => setActiveTab('run')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'run'
                ? 'bg-white text-emerald-800 shadow-sm border border-emerald-100'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            Run
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'results'
                ? 'bg-white text-emerald-800 shadow-sm border border-emerald-100'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Results
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'insights'
                ? 'bg-white text-emerald-800 shadow-sm border border-emerald-100'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            Insights
          </button>
        </div>
      </div>

      {/* Synthetic Simulation Environment Disclosure Banner */}
      {!bannerDismissed && (
        <div className="bg-[#fef9ee] border border-[#fde68a] rounded-2xl p-4 flex items-start justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-1 rounded-lg text-amber-700 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-xs text-amber-950 leading-relaxed">
              <span className="font-extrabold text-amber-900 block sm:inline mr-1.5">
                Synthetic Simulation Environment
              </span>
              All data generated on this page is synthetic mathematical simulation for testing and demonstration. Readings feed directly into the real-time telemetry pipeline, Monod-Droop growth models, and anomaly detection engines labeled with provenance{' '}
              <span className="bg-[#fef3c7] text-[#92400e] border border-[#fde68a] px-1.5 py-0.5 rounded font-mono font-bold text-[10px]">
                simulated
              </span>
              .
            </div>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-amber-700/60 hover:text-amber-900 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Simulation Configuration Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
        {/* Card Header: Title, Subtitle, Time & Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Simulation Configuration</h2>
            <p className="text-slate-500 text-xs font-medium mt-0.5">
              Select facility and pond, set parameters, and run simulation scenarios.
            </p>
          </div>

          <div className="flex items-center gap-4 self-start md:self-auto">
            {/* Current Simulated Time */}
            <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200/80 rounded-2xl px-3.5 py-2 shadow-2xs">
              <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block leading-tight">
                  Current Simulated Time
                </span>
                <span className="font-mono font-black text-xs text-slate-900 leading-tight">
                  {formattedSimulatedTime}
                </span>
              </div>
            </div>

            {/* Status */}
            <div className="flex flex-col justify-center px-1">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block leading-tight">
                Status
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isRunning ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <span className="text-xs font-black text-slate-900 leading-tight">
                  {isRunning ? 'Running' : 'Stopped'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dropdown Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Facility / Farm Card */}
          <div className="relative rounded-2xl border border-slate-200 hover:border-slate-300 p-3.5 flex items-center gap-3.5 bg-slate-50/40 transition-all">
            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl shrink-0 border border-slate-200/60">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Facility / Farm
              </label>
              <select
                value={selectedFarmId}
                onChange={(e) => handleFarmChange(e.target.value)}
                disabled={isFarmOperator && farms.length === 1}
                className="w-full bg-transparent font-bold text-xs sm:text-sm text-slate-900 border-none outline-none cursor-pointer pr-6 truncate"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} {f.location ? `(${f.location})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 pointer-events-none" />
          </div>

          {/* Target Pond Card */}
          <div className="relative rounded-2xl border border-slate-200 hover:border-slate-300 p-3.5 flex items-center gap-3.5 bg-slate-50/40 transition-all">
            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl shrink-0 border border-slate-200/60">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Target Pond
              </label>
              <select
                value={selectedPondId}
                onChange={(e) => setSelectedPondId(e.target.value)}
                className="w-full bg-transparent font-bold text-xs sm:text-sm text-slate-900 border-none outline-none cursor-pointer pr-6 truncate"
              >
                {ponds
                  .filter((p) => !selectedFarmId || p.farm_id === selectedFarmId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.species ? `• ${p.species}` : ''}
                    </option>
                  ))}
              </select>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 pointer-events-none" />
          </div>
        </div>

        {/* 4 Virtual Environmental KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Virtual Biomass */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/80 flex items-center justify-center shrink-0">
              <Leaf className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block truncate">
                Virtual Biomass
              </span>
              <span className="text-base font-black text-slate-900 block truncate mt-0.5">
                {simulationState?.biomass ?? 0.5} g/L
              </span>
            </div>
          </div>

          {/* Virtual Nitrogen */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 border border-teal-100/80 flex items-center justify-center shrink-0">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block truncate">
                Virtual Nitrogen
              </span>
              <span className="text-base font-black text-slate-900 block truncate mt-0.5">
                {simulationState?.nitrogen ?? 13.65} mg/L
              </span>
            </div>
          </div>

          {/* Base Temperature */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 border border-slate-200/60 flex items-center justify-center shrink-0">
              <Thermometer className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block truncate">
                Base Temperature
              </span>
              <span className="text-base font-black text-slate-900 block truncate mt-0.5">
                {simulationState?.temp_base ?? 25.7} °C
              </span>
            </div>
          </div>

          {/* Active Scenario */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/80 flex items-center justify-center shrink-0">
              <Settings2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block truncate">
                Active Scenario
              </span>
              <span className="text-sm font-black text-emerald-700 capitalize block truncate mt-0.5">
                {activeScenario.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Playback Controls Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1 border-t border-slate-100">
          <div>
            <h3 className="text-xs font-black text-slate-900">Playback Controls</h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Control the simulation speed and execution.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Speed 1x */}
            <button
              onClick={() => handleSetSpeed(1)}
              disabled={actionLoading}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                currentSpeed === 1
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" /> 1x
            </button>

            {/* Speed 5x */}
            <button
              onClick={() => handleSetSpeed(5)}
              disabled={actionLoading}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                currentSpeed === 5
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              <Play className="w-3.5 h-3.5" /> 5x
            </button>

            {/* Speed 10x */}
            <button
              onClick={() => handleSetSpeed(10)}
              disabled={actionLoading}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                currentSpeed === 10
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              <Play className="w-3.5 h-3.5" /> 10x
            </button>

            {/* Stop / Resume */}
            <button
              onClick={handleTogglePlay}
              disabled={actionLoading}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                isRunning
                  ? 'bg-[#fff1f2] hover:bg-[#ffe4e6] text-[#e11d48] border border-[#fecdd3]'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}
            >
              {isRunning ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" /> Stop
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" /> Resume
                </>
              )}
            </button>

            {/* Reset */}
            <button
              onClick={handleReset}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black border border-slate-200 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </div>

        {/* Action Success Status Notification */}
        {actionMessage && (
          <div className="bg-[#f0fdf4] border border-[#bbf7d0] text-[#166534] rounded-2xl px-4 py-3 text-xs font-semibold flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-[#dcfce7] flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 text-[#166534] stroke-[3]" />
              </div>
              <span>{actionMessage}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium shrink-0">
              {messageTime && <span>{messageTime}</span>}
              <button
                onClick={() => setActionMessage(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Simulation Scenarios Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
        {/* Section Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Simulation Scenarios</h2>
            <p className="text-slate-500 text-xs font-medium mt-0.5">
              Predefined scenarios to test different environmental and operational conditions.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search scenarios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
            />
          </div>
        </div>

        {/* 4 Scenario Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredScenarios.map((scenario) => {
            const isCardActive = activeScenario === scenario.id;
            const Icon = scenario.icon;

            return (
              <div
                key={scenario.id}
                className={`rounded-2xl p-4.5 border transition-all flex flex-col justify-between ${
                  isCardActive
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl shrink-0 ${scenario.iconBg}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{scenario.title}</h4>
                    </div>

                    {isCardActive && (
                      <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-100/80 border border-emerald-200/80 px-2 py-0.5 rounded-full shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        Active
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-normal mb-5 min-h-[48px]">
                    {scenario.description}
                  </p>
                </div>

                <button
                  onClick={() => handleRunScenario(scenario.id, scenario.title)}
                  disabled={actionLoading}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isCardActive
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  <Play className={`w-3.5 h-3.5 ${isCardActive ? 'fill-current' : ''}`} />
                  {isCardActive ? 'Scenario Active (Click to Re-run)' : 'Run Scenario'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
