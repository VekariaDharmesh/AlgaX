'use client';

import React from 'react';
import { DataQualitySummary, DataGap } from '@/lib/api';
import { ShieldCheck, AlertCircle, AlertTriangle, CheckCircle2, FileSearch } from 'lucide-react';

interface DataQualityDashboardProps {
  quality: DataQualitySummary | undefined;
  gaps: DataGap[];
}

export function DataQualityDashboard({ quality, gaps }: DataQualityDashboardProps) {
  if (!quality) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Quality Breakdown Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4 lg:col-span-1">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Data Quality Index
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Ingestion validity, outlier detection, and stream completeness.
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-700">Completeness Score</span>
            <span className="text-emerald-700">{quality.completeness_pct}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${quality.completeness_pct}%` }}
            ></div>
            <div
              className="bg-amber-500 h-full transition-all duration-500"
              style={{
                width: `${
                  (quality.outlier_count / max(1, quality.total_readings)) * 100
                }%`,
              }}
            ></div>
            <div
              className="bg-rose-500 h-full transition-all duration-500"
              style={{
                width: `${
                  (quality.missing_count / max(1, quality.total_readings)) * 100
                }%`,
              }}
            ></div>
          </div>
        </div>

        {/* Stat Badges */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-3">
            <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Valid Readings</div>
            <div className="text-lg font-black text-emerald-900 mt-0.5">{quality.ok_count}</div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-3">
            <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Outliers / Drift</div>
            <div className="text-lg font-black text-amber-900 mt-0.5">{quality.outlier_count}</div>
          </div>

          <div className="bg-rose-50/70 border border-rose-200/60 rounded-xl p-3">
            <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Missing / Dropouts</div>
            <div className="text-lg font-black text-rose-900 mt-0.5">{quality.missing_count}</div>
          </div>

          <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Evaluated</div>
            <div className="text-lg font-black text-slate-900 mt-0.5">{quality.total_readings}</div>
          </div>
        </div>
      </div>

      {/* 2. Telemetry Data Gaps Detector */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4 lg:col-span-2">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Telemetry Data Gap Log (&gt;15 min dropouts)
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Identified intervals where expected sensor transmissions were missing or delayed.
            </p>
          </div>
        </div>

        {gaps.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-2 px-3">Gap Start</th>
                  <th className="py-2 px-3">Gap End</th>
                  <th className="py-2 px-3">Duration</th>
                  <th className="py-2 px-3 text-right">Impact Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {gaps.map((gap, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {new Date(gap.start).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {new Date(gap.end).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-amber-700">
                      {gap.duration_minutes} min
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-500">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Dropout Detected
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs font-semibold text-slate-400">
            No telemetry data gaps detected in the selected timeframe. Data stream is continuous.
          </div>
        )}
      </div>
    </div>
  );
}

function max(a: number, b: number) {
  return a > b ? a : b;
}
