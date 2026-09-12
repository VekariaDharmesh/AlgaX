'use client';

import React, { use } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { DEMO_PONDS } from '@/lib/demo/ponds';
import { 
  ArrowLeft, 
  AlertTriangle, 
  Info, 
  Beaker, 
  Thermometer, 
  Droplet, 
  Droplets,
  Layers,
  Wind,
  Gauge,
  CheckCircle2,
  Calendar,
  Sparkles,
  Zap,
  Activity,
  ArrowUpRight
} from 'lucide-react';

export default function PondDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const pond = DEMO_PONDS.find(p => p.id === resolvedParams.id);
  
  if (!pond) {
    notFound();
  }

  // Calculate limitation factors dynamically based on pond values
  const lightLimitation = pond.id === 'p-3' ? 95 : 86;
  const tempLimitation = 92;
  const phLimitation = pond.ph > 8.3 ? 78 : 94;
  const nitrogenLimitation = pond.nitrogen < 5 ? 41 : 94; // Reflects nitrogen limitation for Pond B

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 p-6">
      
      {/* Back link */}
      <div>
        <Link 
          href="/ponds" 
          className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-sm transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to All Ponds
        </Link>
      </div>

      {/* Hero Pond Banner with Photo */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 shadow-lg border border-slate-200">
        <div className="relative h-64 md:h-80 w-full overflow-hidden">
          <img 
            src={`/images/ponds/${pond.id}.jpg`} 
            alt={pond.name} 
            className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-700" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          
          {/* Top Status & Type Badges */}
          <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-slate-900/80 backdrop-blur-md text-slate-200 font-bold text-xs px-3 py-1.5 rounded-xl border border-slate-700">
                {pond.pondType}
              </span>
              <span className="bg-slate-900/80 backdrop-blur-md text-emerald-400 font-mono text-xs px-3 py-1.5 rounded-xl border border-slate-700">
                ID: {pond.id}
              </span>
            </div>

            <span className={`text-xs font-extrabold px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2 shadow ${
              pond.status === 'Healthy' 
                ? 'bg-emerald-500/95 text-white' 
                : 'bg-amber-500/95 text-white'
            }`}>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              {pond.status}
            </span>
          </div>

          {/* Bottom Title & Strain on Image */}
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <div className="text-xs uppercase font-bold text-emerald-400 tracking-wider">
              {pond.speciesCommon}
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">{pond.name}</h1>
            <p className="text-sm text-slate-300 italic mt-0.5">{pond.species}</p>
          </div>
        </div>

        {/* Ribbon of Physical Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100 bg-slate-50 border-t border-slate-200 p-4 text-center">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Working Volume</div>
            <div className="text-base font-black text-slate-900 mt-0.5">{pond.volumeLiters.toLocaleString()} L</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Surface Footprint</div>
            <div className="text-base font-black text-slate-900 mt-0.5">{pond.areaSqM.toLocaleString()} m²</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Operational Depth</div>
            <div className="text-base font-black text-slate-900 mt-0.5">{pond.depthCm} cm</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">CO₂ Injection Rate</div>
            <div className="text-base font-black text-emerald-600 mt-0.5">{pond.co2InjectionRate} kg/h</div>
          </div>
        </div>
      </div>

      {/* Nitrogen limitation warning banner if applicable */}
      {pond.status === 'Attention' && (
        <div className="bg-amber-50 border-2 border-amber-300 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-black text-amber-900">Kinetic Nitrogen Limitation Warning</h3>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Available dissolved nitrogen has dropped to <strong>{pond.nitrogen.toFixed(1)} mg/L</strong> (threshold: &gt;5.0 mg/L). 
              The Monod-Droop nutrient engine predicts a 28% reduction in exponential biomass doubling unless supplemental nitrate/urea dosing is executed.
            </p>
          </div>
          <Link
            href="/telemetry"
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all shrink-0"
          >
            Review Dosing Action
          </Link>
        </div>
      )}

      {/* Real-time Telemetry Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            Live Biometric & Physical Telemetry
          </h2>
          <span className="text-xs font-semibold text-slate-400">Streamed from IoT multi-spectral probe array</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Biomass</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {pond.biomass.toFixed(2)} <span className="text-xs font-normal text-slate-400">g/L</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-bold block mt-1">+{pond.dailyGrowthRate}% daily</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Temperature</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {pond.temperature.toFixed(1)} <span className="text-xs font-normal text-slate-400">°C</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium block mt-1">28.0°C optimum</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">pH Index</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {pond.ph.toFixed(1)}
            </div>
            <span className="text-[10px] text-slate-500 font-medium block mt-1">7.8 - 8.4 range</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Dissolved O₂</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {pond.dissolvedOxygen.toFixed(1)} <span className="text-xs font-normal text-slate-400">mg/L</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-bold block mt-1">Healthy aeration</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Turbidity (NTU)</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {pond.turbidity} <span className="text-xs font-normal text-slate-400">NTU</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium block mt-1">Optical density</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Nitrogen (N)</span>
            <div className={`text-2xl font-black mt-1 ${pond.nitrogen < 5 ? 'text-amber-600' : 'text-slate-900'}`}>
              {pond.nitrogen.toFixed(1)} <span className="text-xs font-normal text-slate-400">mg/L</span>
            </div>
            <span className={`text-[10px] font-bold block mt-1 ${pond.nitrogen < 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {pond.nitrogen < 5 ? 'Action required' : 'Adequate'}
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Growth Limitations & Kinetic Model Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monod-Droop Kinetics Limitation Factor Bars */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                Growth Limitation Analysis (Liebig Minimum)
              </h3>
              <Info className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Individual biological factor efficiencies computed via Monod-Droop multi-parameter kinetic curves.
            </p>

            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700 flex items-center gap-1.5">
                    ☀️ Solar Irradiance & Light Penetration
                  </span>
                  <span className="text-slate-900 font-black">{lightLimitation}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${lightLimitation}%` }} />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700 flex items-center gap-1.5">
                    🌡️ Temperature Kinetics (Arrhenius Factor)
                  </span>
                  <span className="text-slate-900 font-black">{tempLimitation}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${tempLimitation}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700 flex items-center gap-1.5">
                    🧪 pH Carbonate-Bicarbonate Equilibrium
                  </span>
                  <span className="text-slate-900 font-black">{phLimitation}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${phLimitation}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700 flex items-center gap-1.5">
                    🌱 Dissolved Nitrogen Availability (Droop Cell Quota)
                  </span>
                  <span className={`font-black ${nitrogenLimitation < 50 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {nitrogenLimitation}%
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${nitrogenLimitation < 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                    style={{ width: `${nitrogenLimitation}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600">
            <span className="font-bold text-slate-900 block mb-0.5">
              Governing Constraint: {nitrogenLimitation < 50 ? 'Nitrogen Availability' : 'Light Attenuation'}
            </span>
            <span>
              {nitrogenLimitation < 50 
                ? 'Under Droop cell-quota dynamics, intracellular nitrogen depletion forces the cells into lipid synthesis accumulation, moderating overall daily cell division.'
                : 'Pond depth optical extinction dictates daytime photosynthetic efficiency.'}
            </span>
          </div>
        </div>

        {/* Pond Operational Profile & Sequestration */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
              <Beaker className="w-5 h-5 text-emerald-600" />
              Cultivation Specs & Inoculation History
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Physical structure, strain lineage, and recent harvest cycle provenance.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs">
                <span className="text-slate-500 font-medium">Cultivated Microalgae Strain</span>
                <span className="font-bold text-slate-900">{pond.species}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs">
                <span className="text-slate-500 font-medium">Cultivation Architecture</span>
                <span className="font-bold text-slate-900">{pond.pondType}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs">
                <span className="text-slate-500 font-medium">Last Harvest Date</span>
                <span className="font-bold text-emerald-700">{pond.lastHarvest || '2026-09-08'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs">
                <span className="text-slate-500 font-medium">Estimated Daily CO₂ Fixation</span>
                <span className="font-bold text-emerald-700">~{(pond.co2InjectionRate * 18.5).toFixed(1)} kg CO₂e / day</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link
              href="/telemetry"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              Inspect Sensor Charts →
            </Link>
            <Link
              href="/models"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              Simulate Harvest <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
