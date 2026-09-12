'use client';

import React from 'react';
import { ModelInputProvenance } from '@/lib/api';
import { Cpu, ArrowRight, Shield, Zap, FileText, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface ModelInputsProvenanceProps {
  modelInputs: ModelInputProvenance | undefined;
}

export function ModelInputsProvenance({ modelInputs }: ModelInputsProvenanceProps) {
  if (!modelInputs) return null;

  const env = modelInputs.environmental_values || {};

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight">Telemetry $\rightarrow$ Scientific Model Provenance</h3>
            <p className="text-xs text-slate-300">
              Biomass yield & carbon accounting inputs produced from aggregated telemetry stream.
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Model Version: {modelInputs.model_version}
          </span>
        </div>
      </div>

      {/* Model Input Parameters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase block">Temperature Input</span>
          <span className="text-lg font-black text-white mt-0.5 block">
            {env.temperature !== undefined && env.temperature !== null ? `${env.temperature} °C` : 'N/A'}
          </span>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase block">pH Input</span>
          <span className="text-lg font-black text-white mt-0.5 block">
            {env.ph !== undefined && env.ph !== null ? `${env.ph} pH` : 'N/A'}
          </span>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase block">Irradiance (PAR)</span>
          <span className="text-lg font-black text-white mt-0.5 block">
            {env.light !== undefined && env.light !== null ? `${env.light} W/m²` : 'N/A'}
          </span>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase block">Nitrogen Concentration</span>
          <span className="text-lg font-black text-white mt-0.5 block">
            {env.nitrogen !== undefined && env.nitrogen !== null ? `${env.nitrogen} mg/L` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Pipeline Navigation Links */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
        <span className="text-slate-300">Trace data through AlgaX verification pipeline:</span>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/carbon?pond_id=${modelInputs.pond_id}`}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1.5 transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Carbon LCA</span>
          </Link>

          <Link
            href={`/reports?pond_id=${modelInputs.pond_id}`}
            className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center gap-1.5 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Reports</span>
          </Link>

          <Link
            href={`/evidence?pond_id=${modelInputs.pond_id}`}
            className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center gap-1.5 transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Evidence Chain</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
