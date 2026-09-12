'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  Calendar,
  Compass,
  Building2,
  ChevronRight
} from 'lucide-react';
import { fetchFarms } from '@/lib/api';
import { DEMO_FARMS, DEMO_PONDS, FarmDetails } from '@/lib/demo/ponds';

export default function FarmsPage() {
  const [activeFarmId, setActiveFarmId] = useState<string>(DEMO_FARMS[0].id);
  const [allFarms, setAllFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFarms()
      .catch(() => [])
      .then((farmsData) => {
        if (Array.isArray(farmsData) && farmsData.length > 0) {
          setAllFarms(farmsData);
        } else {
          setAllFarms(DEMO_FARMS);
        }
        setLoading(false);
      });
  }, []);

  const activeFarm = useMemo(() => {
    return DEMO_FARMS.find(f => f.id === activeFarmId) || DEMO_FARMS[0];
  }, [activeFarmId]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 p-4 sm:p-6 text-slate-800">
      
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Facility Management
            </span>
            <span className="text-xs font-semibold text-slate-400">• 6 Regional Sites</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Indian Algae Cultivation Facilities
          </h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm max-w-2xl">
            Real-time topology, biometric monitoring, and carbon sequestration metrics across active cultivation ponds in India.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/ponds"
            className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-2"
          >
            <Droplets className="w-4 h-4 text-emerald-600" />
            View All Ponds
          </Link>
          <Link
            href="/telemetry"
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            Live Telemetry
          </Link>
        </div>
      </div>

      {/* 2. Facility Switcher Tabs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {DEMO_FARMS.map((farm) => {
          const isSelected = farm.id === activeFarmId;
          return (
            <button
              key={farm.id}
              onClick={() => setActiveFarmId(farm.id)}
              className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-[1.02]'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {farm.coordinates.lat.toFixed(1)}°N
                </span>
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500'}`} />
              </div>
              <h4 className="text-xs font-black truncate">{farm.name.replace(' Facility', '').replace(' Hub', '').replace(' Site', '')}</h4>
              <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                {farm.location.split(',')[0]}
              </p>
            </button>
          );
        })}
      </div>

      {/* 3. Flagship Selected Farm Hero Card */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm transition-all">
        
        {/* Farm Hero Image & Top Overlay */}
        <div className="relative h-72 md:h-80 w-full overflow-hidden bg-slate-950">
          <Image 
            src={activeFarm.imageUrl} 
            alt={activeFarm.name} 
            fill
            className="object-cover opacity-90 hover:scale-105 transition-transform duration-700 brightness-[0.85]"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          
          {/* Top Badges */}
          <div className="absolute top-5 left-5 right-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/90 backdrop-blur-md text-white font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1.5 shadow">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                ACTIVE MRV SITE
              </span>
              <span className="bg-slate-900/80 backdrop-blur-md text-slate-200 font-mono text-xs px-3 py-1 rounded-full border border-slate-700">
                Facility ID: {activeFarm.id}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {activeFarm.certifications.map((cert) => (
                <span key={cert} className="bg-slate-900/80 backdrop-blur-md text-emerald-300 border border-emerald-500/30 font-semibold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                  {cert}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom Title & Quick Stats */}
          <div className="absolute bottom-5 left-5 right-5 text-white">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <Map className="w-3.5 h-3.5" />
                  {activeFarm.location} ({activeFarm.coordinates.lat}°N, {activeFarm.coordinates.lng}°E)
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{activeFarm.name}</h2>
                <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl line-clamp-2">
                  {activeFarm.description}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Annual Removal Capacity</div>
                  <div className="text-base font-black text-emerald-400 font-mono">{activeFarm.annualCapacity}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Facility Metadata Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-slate-100 bg-slate-50/70 border-b border-slate-200 text-xs">
          <div className="p-4">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" /> Total Footprint
            </div>
            <div className="text-sm font-black text-slate-900 mt-1 font-mono">{(activeFarm.totalAreaSqM).toLocaleString()} m²</div>
            <div className="text-[10px] text-slate-500 font-medium">1.85 Hectares</div>
          </div>

          <div className="p-4">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-500" /> Climate Profile
            </div>
            <div className="text-xs font-bold text-slate-900 mt-1 truncate">{activeFarm.climate}</div>
            <div className="text-[10px] text-slate-500 font-medium">340+ sunny days/yr</div>
          </div>

          <div className="p-4">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-yellow-500" /> Power Source
            </div>
            <div className="text-xs font-bold text-slate-900 mt-1 truncate">{activeFarm.energySource}</div>
            <div className="text-[10px] text-emerald-700 font-bold">100% Zero-Carbon</div>
          </div>

          <div className="p-4">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-sky-500" /> Water Inflow
            </div>
            <div className="text-xs font-bold text-slate-900 mt-1 truncate">{activeFarm.waterSource}</div>
            <div className="text-[10px] text-slate-500 font-medium">Recirculating Loop</div>
          </div>

          <div className="p-4">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-teal-500" /> Facility Lead
            </div>
            <div className="text-xs font-bold text-slate-900 mt-1">{activeFarm.manager}</div>
            <div className="text-[10px] text-slate-500 font-medium">Operations Lead</div>
          </div>

          <div className="p-4">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-500" /> Commissioned
            </div>
            <div className="text-xs font-bold text-slate-900 mt-1">{activeFarm.operationalSince}</div>
            <div className="text-[10px] text-emerald-700 font-bold">99.8% Uptime</div>
          </div>
        </div>

        {/* Ponds Topology Section */}
        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Droplets className="w-5 h-5 text-emerald-600" />
                Active Pond Topology & Cultivation Units ({DEMO_PONDS.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Regional Indian raceway ponds and photobioreactors instrumented with live optical & multi-gas sensors.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl self-start font-mono">
              Working Volume: {DEMO_PONDS.reduce((sum, p) => sum + p.volumeLiters, 0).toLocaleString()} L
            </span>
          </div>

          {/* Pond Cards Grid (6 Indian Ponds) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {DEMO_PONDS.map((pond) => (
              <div 
                key={pond.id} 
                className="group bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between"
              >
                {/* Pond Image */}
                <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                  <Image 
                    src={pond.imageUrl} 
                    alt={pond.name} 
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500 brightness-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                  
                  {/* Status Badge */}
                  <div className="absolute top-2.5 right-2.5">
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1 shadow ${
                      pond.status === 'Healthy' 
                        ? 'bg-emerald-500/90 text-white' 
                        : 'bg-amber-500/90 text-white'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      {pond.status}
                    </span>
                  </div>

                  {/* Pond Type Badge */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className="bg-slate-900/80 backdrop-blur-md text-slate-200 font-semibold text-[10px] px-2.5 py-0.5 rounded-md border border-slate-700">
                      {pond.pondType}
                    </span>
                  </div>

                  {/* Pond Name on Image */}
                  <div className="absolute bottom-2.5 left-3 right-3 text-white">
                    <h4 className="font-black text-base leading-tight drop-shadow">{pond.name}</h4>
                    <p className="text-[11px] text-emerald-300 italic font-medium truncate drop-shadow">{pond.species} ({pond.speciesCommon})</p>
                  </div>
                </div>

                {/* Pond Details & Telemetry Metrics */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {pond.description}
                  </p>

                  {/* 2x3 Metric Grid */}
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center text-xs">
                    <div>
                      <div className="text-[9px] text-slate-400 uppercase font-bold">Biomass</div>
                      <div className="text-xs font-black text-slate-900 font-mono">{pond.biomass.toFixed(2)} <span className="text-[9px] font-normal text-slate-500">g/L</span></div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-400 uppercase font-bold">Temp</div>
                      <div className="text-xs font-black text-slate-900 font-mono">{pond.temperature.toFixed(1)}°C</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-400 uppercase font-bold">pH</div>
                      <div className="text-xs font-black text-slate-900 font-mono">{pond.ph.toFixed(1)}</div>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200/60">
                      <div className="text-[9px] text-slate-400 uppercase font-bold">Nitrogen</div>
                      <div className="text-xs font-black text-slate-900 font-mono">{pond.nitrogen.toFixed(1)}</div>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200/60">
                      <div className="text-[9px] text-slate-400 uppercase font-bold">CO₂ Rate</div>
                      <div className="text-xs font-black text-emerald-700 font-mono">{pond.co2InjectionRate} kg/h</div>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200/60">
                      <div className="text-[9px] text-slate-400 uppercase font-bold">Growth</div>
                      <div className="text-xs font-black text-emerald-700 font-mono">+{pond.dailyGrowthRate}%</div>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-mono text-[11px] font-bold">{(pond.volumeLiters).toLocaleString()} Liters</span>
                    <Link
                      href={`/ponds/${pond.id}`}
                      className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 text-xs"
                    >
                      Inspect Pond <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
