'use client';

import React from 'react';
import { TelemetryKpi } from '@/lib/api';
import { Thermometer, Sun, Droplets, FlaskConical, Waves, Sprout, Database } from 'lucide-react';

interface TelemetryKPICardsProps {
  kpis: Record<string, TelemetryKpi>;
  totalReadings: number;
  completenessPct: number;
}

export function TelemetryKPICards({ kpis, totalReadings, completenessPct }: TelemetryKPICardsProps) {
  const getMetricIcon = (type: string) => {
    switch (type) {
      case 'temperature':
        return <Thermometer className="w-5 h-5 text-rose-600" />;
      case 'ph':
        return <FlaskConical className="w-5 h-5 text-indigo-600" />;
      case 'light':
        return <Sun className="w-5 h-5 text-amber-500" />;
      case 'nitrogen':
        return <Droplets className="w-5 h-5 text-emerald-600" />;
      case 'dissolved_oxygen':
        return <Waves className="w-5 h-5 text-sky-600" />;
      case 'biomass':
      case 'turbidity':
        return <Sprout className="w-5 h-5 text-teal-600" />;
      default:
        return <Database className="w-5 h-5 text-slate-600" />;
    }
  };

  const getMetricLabel = (type: string) => {
    switch (type) {
      case 'temperature': return 'Water Temperature';
      case 'ph': return 'Water pH Balance';
      case 'light': return 'Solar Irradiance (PAR)';
      case 'nitrogen': return 'Aqueous Nitrogen';
      case 'dissolved_oxygen': return 'Dissolved Oxygen';
      case 'turbidity': return 'Optical Turbidity';
      case 'biomass': return 'Biomass Density';
      default: return type.replace('_', ' ').toUpperCase();
    }
  };

  const metricKeys = ['temperature', 'ph', 'light', 'nitrogen', 'dissolved_oxygen', 'biomass'];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {metricKeys.map((key) => {
        const kpi = kpis[key];

        if (!kpi) {
          return (
            <div key={key} className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">{getMetricLabel(key)}</span>
                {getMetricIcon(key)}
              </div>
              <div className="text-sm font-semibold text-slate-400 italic my-2">No readings</div>
              <div className="text-[10px] text-slate-400">Min: -- | Max: --</div>
            </div>
          );
        }

        return (
          <div key={key} className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{getMetricLabel(key)}</span>
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                {getMetricIcon(key)}
              </div>
            </div>

            <div className="my-2">
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {kpi.latest} <span className="text-xs font-bold text-slate-500 ml-0.5">{kpi.unit}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>Avg: <strong className="text-slate-800">{kpi.avg}</strong></span>
              <span>Range: <strong className="text-slate-800">{kpi.min} - {kpi.max}</strong></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
