'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Map, 
  Droplets, 
  ArrowRight, 
  Shield, 
  Activity, 
  Globe, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Sun, 
  Zap, 
  Award, 
  User, 
  Gauge, 
  Leaf, 
  Wind,
  Thermometer,
  Calendar
} from 'lucide-react';
import { fetchFarms } from '@/lib/api';
import { DEMO_FARM, DEMO_PONDS } from '@/lib/demo/ponds';

export default function FarmsPage() {
  const [allFarms, setAllFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFarms()
      .catch(() => [])
      .then((farmsData) => {
        if (Array.isArray(farmsData) && farmsData.length > 0) {
          setAllFarms(farmsData);
        } else {
          setAllFarms([]);
        }
        setLoading(false);
      });
  }, []);

  // Filter out test farms (those with auto-generated names) and limit display
  const otherFarms = useMemo(() => {
    return allFarms.filter(f =>
      f.name && 
      !f.name.match(/^Test Farm [a-f0-9]+$/i) &&
      !f.name.toLowerCase().includes('greenriver')
    ).slice(0, 10);
  }, [allFarms]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-slate-500 font-medium">Loading facility intelligence…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 p-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Facility Management
            </span>
            <span className="text-xs font-semibold text-slate-400">• Tenant Isolated</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Algae Cultivation Facilities
          </h1>
          <p className="text-slate-500 mt-1 text-sm max-w-2xl">
            Real-time topology, biometric monitoring, and carbon sequestration metrics across active cultivation ponds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/ponds"
            className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <Droplets className="w-4 h-4 text-emerald-600" />
            View All Ponds
          </Link>
          <Link
            href="/telemetry"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            Live Telemetry
          </Link>
        </div>
      </div>

      {/* Flagship Farm Featured Hero Card */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-lg transition-all">
        {/* Farm Hero Image & Top Overlay */}
        <div className="relative h-72 md:h-96 w-full overflow-hidden bg-slate-900">
          <img 
            src="/images/farm-hero.jpg" 
            alt="GreenRiver Algae Facility Aerial" 
            className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
          
          {/* Top Badges */}
          <div className="absolute top-6 left-6 right-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/90 backdrop-blur-md text-white font-bold text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                ACTIVE PRIMARY SITE
              </span>
              <span className="bg-slate-900/80 backdrop-blur-md text-slate-200 font-medium text-xs px-3 py-1.5 rounded-full border border-slate-700">
                Facility ID: {DEMO_FARM.id}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {DEMO_FARM.certifications.map((cert) => (
                <span key={cert} className="bg-sky-950/80 backdrop-blur-md text-sky-200 border border-sky-600/40 font-semibold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-sky-400" />
                  {cert}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom Title & Quick Stats */}
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <Map className="w-3.5 h-3.5" />
                  {DEMO_FARM.location} ({DEMO_FARM.coordinates.lat}°N, {Math.abs(DEMO_FARM.coordinates.lng)}°W)
                </div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight">{DEMO_FARM.name}</h2>
                <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl line-clamp-2">
                  {DEMO_FARM.description}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Annual Capacity</div>
                  <div className="text-base font-black text-emerald-400">{DEMO_FARM.annualCapacity}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Facility Metadata Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-slate-100 bg-slate-50/70 border-b border-slate-200">
          <div className="p-4">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" /> Total Footprint
            </div>
            <div className="text-base font-black text-slate-900 mt-1">{(DEMO_FARM.totalAreaSqM).toLocaleString()} m²</div>
            <div className="text-[10px] text-slate-500 font-medium">1.25 Hectares</div>
          </div>

          <div className="p-4">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-500" /> Climate Profile
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1 truncate">Hot Desert (BWh)</div>
            <div className="text-[10px] text-slate-500 font-medium">340+ sunny days/yr</div>
          </div>

          <div className="p-4">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-yellow-500" /> Power Source
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1">Solar PV 2.4 MW</div>
            <div className="text-[10px] text-emerald-600 font-bold">100% Zero-Carbon</div>
          </div>

          <div className="p-4">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-sky-500" /> Water System
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1 truncate">Recycled Canal</div>
            <div className="text-[10px] text-slate-500 font-medium">Closed-Loop Recirc</div>
          </div>

          <div className="p-4">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-teal-500" /> Facility Lead
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1">{DEMO_FARM.manager}</div>
            <div className="text-[10px] text-slate-500 font-medium">Bioengineering Head</div>
          </div>

          <div className="p-4">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-500" /> Operational Since
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1">March 2024</div>
            <div className="text-[10px] text-emerald-600 font-bold">99.8% Uptime</div>
          </div>
        </div>

        {/* Ponds Topology Section */}
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Droplets className="w-5 h-5 text-emerald-600" />
                Active Pond Topology & Cultivation Units ({DEMO_PONDS.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Individual raceway ponds and photobioreactors with real-time biometric instrumentation.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full self-start">
              Total Working Volume: {DEMO_PONDS.reduce((sum, p) => sum + p.volumeLiters, 0).toLocaleString()} L
            </span>
          </div>

          {/* Pond Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DEMO_PONDS.map((pond) => (
              <div 
                key={pond.id} 
                className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex flex-col"
              >
                {/* Pond Image */}
                <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                  <img 
                    src={`/images/ponds/${pond.id}.jpg`} 
                    alt={pond.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5 shadow ${
                      pond.status === 'Healthy' 
                        ? 'bg-emerald-500/90 text-white' 
                        : 'bg-amber-500/90 text-white'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      {pond.status}
                    </span>
                  </div>

                  {/* Pond Type Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="bg-slate-900/80 backdrop-blur-md text-slate-200 font-semibold text-[10px] px-2 py-0.5 rounded-md border border-slate-700">
                      {pond.pondType}
                    </span>
                  </div>

                  {/* Pond Name on Image */}
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h4 className="font-black text-lg leading-tight">{pond.name}</h4>
                    <p className="text-xs text-emerald-300 italic font-medium">{pond.species} ({pond.speciesCommon})</p>
                  </div>
                </div>

                {/* Pond Details & Telemetry Metrics */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {pond.description}
                  </p>

                  {/* 2x3 Metric Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Biomass</div>
                      <div className="text-sm font-black text-slate-900">{pond.biomass.toFixed(2)} <span className="text-[10px] font-normal text-slate-500">g/L</span></div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Temp</div>
                      <div className="text-sm font-black text-slate-900">{pond.temperature.toFixed(1)} <span className="text-[10px] font-normal text-slate-500">°C</span></div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">pH Level</div>
                      <div className="text-sm font-black text-slate-900">{pond.ph.toFixed(1)}</div>
                    </div>
                    <div className="pt-2 border-t border-slate-200/60">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Nitrogen</div>
                      <div className={`text-sm font-black ${pond.nitrogen < 5 ? 'text-amber-600' : 'text-slate-900'}`}>
                        {pond.nitrogen.toFixed(1)} <span className="text-[10px] font-normal text-slate-500">mg/L</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-200/60">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">CO₂ Rate</div>
                      <div className="text-sm font-black text-emerald-700">{pond.co2InjectionRate} <span className="text-[10px] font-normal text-slate-500">kg/h</span></div>
                    </div>
                    <div className="pt-2 border-t border-slate-200/60">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Growth</div>
                      <div className="text-sm font-black text-emerald-700">+{pond.dailyGrowthRate}%</div>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Vol: {(pond.volumeLiters).toLocaleString()} L</span>
                    <Link
                      href={`/ponds/${pond.id}`}
                      className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                    >
                      Pond Analytics <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Other Registered Facilities (if any) */}
      {otherFarms.length > 0 && (
        <div className="space-y-4 pt-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600" />
            Additional Registered Facilities ({otherFarms.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {otherFarms.map((f) => (
              <div key={f.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">{f.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">📍 {f.location || 'Location pending'}</p>
                  <span className="inline-block mt-2 text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {f.ponds?.length || 0} Ponds Registered
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  {f.status || 'ACTIVE'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
