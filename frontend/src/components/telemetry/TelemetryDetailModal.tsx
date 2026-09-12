'use client';

import React from 'react';
import { SensorReading } from '@/lib/api';
import { X, Database, ShieldCheck, Cpu, ArrowUpRight, FileText, Activity } from 'lucide-react';
import Link from 'next/link';

interface TelemetryDetailModalProps {
  reading: SensorReading | null;
  sensorInfo?: { type: string; unit: string };
  pondName?: string;
  farmName?: string;
  onClose: () => void;
}

export function TelemetryDetailModal({
  reading,
  sensorInfo,
  pondName = 'Pond A-1',
  farmName = 'GreenRiver Algae Facility',
  onClose,
}: TelemetryDetailModalProps) {
  if (!reading) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Telemetry Reading Inspection</h3>
            <p className="text-xs font-medium text-slate-500">ID: {reading.id}</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-400 font-semibold block">Metric Type</span>
              <span className="font-bold text-slate-900 uppercase">
                {sensorInfo ? sensorInfo.type.replace('_', ' ') : 'Sensor'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block">Measured Value</span>
              <span className="font-black text-slate-900 text-sm">
                {reading.value} {sensorInfo?.unit}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block">Timestamp</span>
              <span className="font-semibold text-slate-800">
                {new Date(reading.timestamp).toLocaleString()}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block">Data Source</span>
              <span className="font-extrabold text-indigo-700 uppercase">{reading.source_type}</span>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block">Quality Flag</span>
              <span className="font-bold text-emerald-700 uppercase">{reading.quality_flag}</span>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block">Pond / Facility</span>
              <span className="font-semibold text-slate-800">
                {pondName} ({farmName})
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60">
            <span className="text-slate-400 font-semibold block mb-1">Sensor Hardware ID</span>
            <code className="bg-white border border-slate-200 px-2 py-1 rounded text-[11px] font-mono text-slate-700 block truncate">
              {reading.sensor_id}
            </code>
          </div>
        </div>

        {/* Provenance Connections */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-700">Audit & Provenance Pipeline:</span>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/carbon?pond_id=${reading.pond_id}`}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center justify-between transition-colors"
            >
              <span>Carbon LCA Run</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            <Link
              href={`/anomalies?pond_id=${reading.pond_id}`}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center justify-between transition-colors"
            >
              <span>Anomaly Logs</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
