'use client';

import React from 'react';
import { Activity, RefreshCw, Filter, Clock, CheckCircle2, Sliders } from 'lucide-react';
import { Farm, Pond } from '@/lib/api';

interface TelemetryHeaderProps {
  farms: Farm[];
  ponds: Pond[];
  selectedFarmId: string;
  selectedPondId: string;
  selectedHours: number;
  autoRefresh: boolean;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  onFarmChange: (id: string) => void;
  onPondChange: (id: string) => void;
  onHoursChange: (hours: number) => void;
  onRefresh: () => void;
  onToggleAutoRefresh: (val: boolean) => void;
}

const TIME_RANGES = [
  { label: 'Last 1h', hours: 1 },
  { label: 'Last 6h', hours: 6 },
  { label: 'Last 24h', hours: 24 },
  { label: 'Last 7d', hours: 168 },
  { label: 'Last 30d', hours: 720 },
];

export function TelemetryHeader({
  farms,
  ponds,
  selectedFarmId,
  selectedPondId,
  selectedHours,
  autoRefresh,
  isRefreshing,
  lastUpdated,
  onFarmChange,
  onPondChange,
  onHoursChange,
  onRefresh,
  onToggleAutoRefresh,
}: TelemetryHeaderProps) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                Telemetry Workspace
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Real-Time Engine
                </span>
              </h1>
              <p className="text-sm font-medium text-slate-500 mt-0.5">
                Continuous IoT sensor telemetry, environmental parameter dynamics, and data quality validation.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onToggleAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              autoRefresh
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
            Auto-Refresh (5s)
          </button>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Farm Select */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Farm:</span>
            <select
              value={selectedFarmId}
              onChange={(e) => onFarmChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All Farms</option>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Pond Select */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Pond:</span>
            <select
              value={selectedPondId}
              onChange={(e) => onPondChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All Ponds</option>
              {ponds.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Selector Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70">
            {TIME_RANGES.map((tr) => (
              <button
                key={tr.hours}
                onClick={() => onHoursChange(tr.hours)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  selectedHours === tr.hours
                    ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tr.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Last sync: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Syncing...'}</span>
        </div>
      </div>
    </div>
  );
}
