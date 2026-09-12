'use client';

import React from 'react';
import { TelemetryStatsResponse } from '@/lib/api';
import { Activity, ShieldCheck, Database, Radio, AlertTriangle } from 'lucide-react';

interface TelemetryStatusBannerProps {
  stats: TelemetryStatsResponse | null;
}

export function TelemetryStatusBanner({ stats }: TelemetryStatusBannerProps) {
  if (!stats) return null;

  const isSimulated = stats.is_simulated;
  const isHealthy = stats.offline_sensors === 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* 1. Telemetry System Status */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isHealthy ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
          }`}>
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">System Status</div>
            <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              {isHealthy ? 'Operational (100% Online)' : `${stats.active_sensors} Online / ${stats.offline_sensors} Offline`}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Data Source Banner */}
      <div className={`border rounded-2xl p-4 flex items-center justify-between shadow-2xs ${
        isSimulated ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isSimulated ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider opacity-70">Telemetry Data Source</div>
            <div className="text-sm font-extrabold flex items-center gap-1.5 mt-0.5">
              <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase tracking-wide ${
                isSimulated ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
              }`}>
                {stats.data_source_label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Data Freshness */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Data Freshness</div>
            <div className="text-sm font-extrabold text-slate-900 mt-0.5">
              {stats.last_received ? new Date(stats.last_received).toLocaleTimeString() : 'No data'}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Total Stream Readings */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Stream Count</div>
            <div className="text-sm font-extrabold text-slate-900 mt-0.5">
              {stats.total_readings.toLocaleString()} readings ({stats.data_quality.completeness_pct}% valid)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
