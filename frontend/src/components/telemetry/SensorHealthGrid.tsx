'use client';

import React from 'react';
import { SensorHealth } from '@/lib/api';
import { Cpu, CheckCircle2, Clock, AlertTriangle, XCircle, Radio } from 'lucide-react';

interface SensorHealthGridProps {
  sensors: SensorHealth[];
}

export function SensorHealthGrid({ sensors }: SensorHealthGridProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Online
          </span>
        );
      case 'stale':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
            <Clock className="w-3 h-3 text-amber-600" />
            Stale
          </span>
        );
      case 'offline':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
            <XCircle className="w-3 h-3 text-rose-600" />
            Offline
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-600" />
            Sensor Hardware & Device Operational Health
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Operational status, connectivity status, reading frequencies, and device metadata across ponds.
          </p>
        </div>

        <div className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
          Total Devices: <strong className="text-slate-900">{sensors.length}</strong>
        </div>
      </div>

      {sensors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sensors.map((s) => (
            <div key={s.id} className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-slate-300 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    {s.type.replace('_', ' ')}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                    Pond: <strong className="text-slate-700">{s.pond_name}</strong>
                  </div>
                </div>
                {getStatusBadge(s.status)}
              </div>

              <div className="bg-white border border-slate-200/60 rounded-lg p-2.5 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Latest Value</div>
                  <div className="text-base font-black text-slate-900">
                    {s.last_value !== undefined && s.last_value !== null ? s.last_value : '--'}{' '}
                    <span className="text-xs font-semibold text-slate-500">{s.unit}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Readings</div>
                  <div className="text-xs font-bold text-slate-700">{s.reading_count}</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 pt-1">
                <span>Last seen:</span>
                <span className="font-semibold text-slate-700">
                  {s.last_seen ? new Date(s.last_seen).toLocaleTimeString() : 'Never'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs font-semibold text-slate-400">
          No hardware sensors detected for selected pond/farm.
        </div>
      )}
    </div>
  );
}
