'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
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
  ChevronRight,
  Filter,
  Search,
  Maximize2,
  Eye,
  SlidersHorizontal,
  Navigation
} from 'lucide-react';
import { DEMO_FARMS, DEMO_PONDS, FarmDetails, Pond } from '@/lib/demo/ponds';

function FarmsPondsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'ponds' ? 'ponds' : searchParams.get('tab') === 'map' ? 'map' : 'overview';
  const initialFarm = searchParams.get('farm') || DEMO_FARMS[0].id;

  const [activeTab, setActiveTab] = useState<'overview' | 'farms' | 'ponds' | 'map'>(initialTab);
  const [activeFarmId, setActiveFarmId] = useState<string>(initialFarm);
  const [selectedPondStatus, setSelectedPondStatus] = useState<'All' | 'Healthy' | 'Attention'>('All');
  const [selectedFarmFilter, setSelectedFarmFilter] = useState<string>('All');
  const [pondSearchQuery, setPondSearchQuery] = useState<string>('');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'ponds') setActiveTab('ponds');
    else if (tab === 'farms') setActiveTab('farms');
    else if (tab === 'map') setActiveTab('map');
  }, [searchParams]);

  const activeFarm = useMemo(() => {
    return DEMO_FARMS.find(f => f.id === activeFarmId) || DEMO_FARMS[0];
  }, [activeFarmId]);

  // Ponds assigned to active farm
  const activeFarmPonds = useMemo(() => {
    return DEMO_PONDS.filter(p => p.farmId === activeFarm.id);
  }, [activeFarm.id]);

  // Filtered ponds in Ponds section
  const filteredPonds = useMemo(() => {
    return DEMO_PONDS.filter(pond => {
      const matchesStatus = selectedPondStatus === 'All' || pond.status === selectedPondStatus;
      const matchesFarm = selectedFarmFilter === 'All' || pond.farmId === selectedFarmFilter;
      const matchesSearch = 
        pond.name.toLowerCase().includes(pondSearchQuery.toLowerCase()) ||
        pond.species.toLowerCase().includes(pondSearchQuery.toLowerCase()) ||
        pond.speciesCommon.toLowerCase().includes(pondSearchQuery.toLowerCase()) ||
        pond.farmName.toLowerCase().includes(pondSearchQuery.toLowerCase());
      return matchesStatus && matchesFarm && matchesSearch;
    });
  }, [selectedPondStatus, selectedFarmFilter, pondSearchQuery]);

  const totalVolume = useMemo(() => {
    return DEMO_PONDS.reduce((sum, p) => sum + p.volumeLiters, 0);
  }, []);

  const totalSurfaceArea = useMemo(() => {
    return DEMO_PONDS.reduce((sum, p) => sum + p.areaSqM, 0);
  }, []);

  return (
    <div className="w-full space-y-8 pb-16 p-4 sm:p-6 text-slate-800">
      
      {/* 1. Header & Quick Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Cultivation Infrastructure
            </span>
            <span className="text-xs font-semibold text-slate-400">• Unified Facility & Pond Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Indian Cultivation Facilities & Ponds
          </h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm max-w-2xl">
            Integrated MRV control plane for registered Indian algae farms, high-rate raceways, and closed photobioreactors.
          </p>
        </div>

        {/* Global Infrastructure KPI Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-white border border-slate-200/90 px-3.5 py-2 rounded-2xl shadow-2xs">
            <div className="text-[10px] font-bold uppercase text-slate-400">Facilities</div>
            <div className="text-sm font-black text-slate-900 font-mono">6 Active</div>
          </div>
          <div className="bg-white border border-slate-200/90 px-3.5 py-2 rounded-2xl shadow-2xs">
            <div className="text-[10px] font-bold uppercase text-slate-400">Cultivation Ponds</div>
            <div className="text-sm font-black text-emerald-700 font-mono">{DEMO_PONDS.length} Units</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-2xl shadow-2xs">
            <div className="text-[10px] font-bold uppercase text-emerald-700">Total Volume</div>
            <div className="text-sm font-black text-emerald-900 font-mono">{(totalVolume).toLocaleString()} L</div>
          </div>
        </div>
      </div>

      {/* 2. Main Section Partition Toggle */}
      <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 flex flex-wrap gap-1.5 shadow-inner">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/70'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/60'
          }`}
        >
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>Unified Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('farms')}
          className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'farms'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/70'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/60'
          }`}
        >
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>Facilities & Farms (6)</span>
        </button>

        <button
          onClick={() => setActiveTab('ponds')}
          className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'ponds'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/70'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/60'
          }`}
        >
          <Droplets className="w-4 h-4 text-sky-600" />
          <span>Cultivation Ponds ({DEMO_PONDS.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('map')}
          className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'map'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/70'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/60'
          }`}
        >
          <Compass className="w-4 h-4 text-amber-600" />
          <span>Geographic Topology</span>
        </button>
      </div>

      {/* 3. VIEW: UNIFIED OVERVIEW (Farms & Ponds Partition side-by-side / stacked) */}
      {activeTab === 'overview' && (
        <div className="space-y-10">
          
          {/* Section A: Selected Facility Deep-Dive */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  Facility Partition: Regional Algae Sites
                </h2>
                <p className="text-xs text-slate-500">Select any facility to inspect live topography and associated cultivation units.</p>
              </div>
              <button
                onClick={() => setActiveTab('farms')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                Expand all farms <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Farm Selector Buttons */}
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
                    <h4 className="text-xs font-black truncate">{farm.name.replace(' Facility', '').replace(' Hub', '').replace(' Site', '').replace(' Centre', '')}</h4>
                    <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      {farm.location.split(',')[0]}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Flagship Active Farm Card */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-slate-950">
                <Image 
                  src={activeFarm.imageUrl} 
                  alt={activeFarm.name} 
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover opacity-90 brightness-[0.85]"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                
                {/* Overlay Header */}
                <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500/90 backdrop-blur-md text-white font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1.5 shadow">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                      VERIFIED MRV FACILITY
                    </span>
                    <span className="bg-slate-900/80 backdrop-blur-md text-slate-200 font-mono text-xs px-3 py-1 rounded-full border border-slate-700">
                      ID: {activeFarm.id}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {activeFarm.certifications.map((cert) => (
                      <span key={cert} className="bg-slate-900/80 backdrop-blur-md text-emerald-300 border border-emerald-500/30 font-semibold text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Award className="w-3 h-3 text-emerald-400" />
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Overlay Bottom Title */}
                <div className="absolute bottom-4 left-4 right-4 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-0.5">
                      <Map className="w-3.5 h-3.5" />
                      {activeFarm.location} ({activeFarm.coordinates.lat}°N, {activeFarm.coordinates.lng}°E)
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight">{activeFarm.name}</h3>
                    <p className="text-slate-300 text-xs mt-0.5 max-w-xl line-clamp-1">{activeFarm.description}</p>
                  </div>

                  <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-2xl p-2.5 text-right shrink-0">
                    <div className="text-[9px] uppercase font-bold text-slate-400">Annual Removal</div>
                    <div className="text-sm font-black text-emerald-400 font-mono">{activeFarm.annualCapacity}</div>
                  </div>
                </div>
              </div>

              {/* Farm Spec Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-slate-100 bg-slate-50/70 border-b border-slate-200 text-xs">
                <div className="p-3.5">
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" /> Footprint
                  </div>
                  <div className="text-xs font-black text-slate-900 mt-1 font-mono">{(activeFarm.totalAreaSqM).toLocaleString()} m²</div>
                </div>
                <div className="p-3.5">
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Sun className="w-3.5 h-3.5 text-amber-500" /> Climate
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-1 truncate">{activeFarm.climate.split('—')[0]}</div>
                </div>
                <div className="p-3.5">
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-yellow-500" /> Power
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-1 truncate">{activeFarm.energySource.split('(')[0]}</div>
                </div>
                <div className="p-3.5">
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-sky-500" /> Water Feed
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-1 truncate">{activeFarm.waterSource.split('&')[0]}</div>
                </div>
                <div className="p-3.5">
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-teal-500" /> Facility Lead
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-1 truncate">{activeFarm.manager}</div>
                </div>
                <div className="p-3.5">
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-purple-500" /> Commissioned
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-1">{activeFarm.operationalSince}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Ponds Partition */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-sky-600" />
                  Ponds Partition: Cultivation Units & Raceways ({activeFarmPonds.length})
                </h2>
                <p className="text-xs text-slate-500">Live kinetics, biomass concentration (g/L), nutrient availability, and sensor status for {activeFarm.name}.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('ponds')}
                  className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-xl border border-emerald-200 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Filter & Search Ponds
                </button>
              </div>
            </div>

            {/* Ponds Grid (Active Farm Ponds Only) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeFarmPonds.map((pond) => (
                <div 
                  key={pond.id} 
                  className={`group bg-white rounded-2xl border overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between ${
                    pond.farmId === activeFarmId 
                      ? 'border-emerald-400 ring-2 ring-emerald-500/10' 
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  {/* Pond Visual */}
                  <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                    <Image 
                      src={pond.imageUrl} 
                      alt={pond.name} 
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500 brightness-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                    
                    {/* Badges */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                      <span className="bg-slate-900/80 backdrop-blur-md text-slate-200 font-semibold text-[10px] px-2.5 py-0.5 rounded-md border border-slate-700">
                        {pond.pondType}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1 shadow ${
                        pond.status === 'Healthy' ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        {pond.status}
                      </span>
                    </div>

                    {/* Facility Tag & Name */}
                    <div className="absolute bottom-2.5 left-3 right-3 text-white">
                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                        <Building2 className="w-3 h-3" />
                        {pond.farmName.split(' ')[0]} Facility
                      </div>
                      <h4 className="font-black text-base leading-tight drop-shadow">{pond.name}</h4>
                      <p className="text-[11px] text-emerald-200 italic font-medium truncate drop-shadow">{pond.species} ({pond.speciesCommon})</p>
                    </div>
                  </div>

                  {/* Pond Biometrics */}
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
                        <div className={`text-xs font-black font-mono ${pond.nitrogen < 5 ? 'text-amber-600' : 'text-slate-900'}`}>{pond.nitrogen.toFixed(1)}</div>
                      </div>
                      <div className="pt-1.5 border-t border-slate-200/60">
                        <div className="text-[9px] text-slate-400 uppercase font-bold">CO₂ Inj.</div>
                        <div className="text-xs font-black text-emerald-700 font-mono">{pond.co2InjectionRate} kg/h</div>
                      </div>
                      <div className="pt-1.5 border-t border-slate-200/60">
                        <div className="text-[9px] text-slate-400 uppercase font-bold">Growth</div>
                        <div className="text-xs font-black text-emerald-700 font-mono">+{pond.dailyGrowthRate}%</div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-mono text-[11px] font-bold">{(pond.volumeLiters).toLocaleString()} L</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setActiveFarmId(pond.farmId); }}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
                        >
                          Focus Farm
                        </button>
                        <Link
                          href={`/ponds/${pond.id}`}
                          className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 text-xs"
                        >
                          Telemetry <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. VIEW: ALL FACILITIES & FARMS PARTITION */}
      {activeTab === 'farms' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">Regional Indian Facilities (6 Sites)</h2>
              <p className="text-xs sm:text-sm text-slate-500">Select any facility to review complete operational specifications, licenses, and pond allocations.</p>
            </div>
            <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
              Total Capacity: 1,285 t/yr
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DEMO_FARMS.map((farm) => {
              const assignedPonds = DEMO_PONDS.filter(p => p.farmId === farm.id);
              const isSelected = farm.id === activeFarmId;

              return (
                <div 
                  key={farm.id}
                  className={`bg-white rounded-3xl border overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between ${
                    isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
                  }`}
                >
                  <div>
                    {/* Facility Photo Header */}
                    <div className="relative h-48 w-full bg-slate-950 overflow-hidden">
                      <Image 
                        src={farm.imageUrl} 
                        alt={farm.name} 
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover opacity-90 brightness-[0.85] hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                      
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        <span className="bg-slate-900/80 backdrop-blur-md text-emerald-400 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-slate-700">
                          {farm.coordinates.lat.toFixed(2)}°N, {farm.coordinates.lng.toFixed(2)}°E
                        </span>
                        <span className="bg-emerald-500 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full shadow">
                          Active MRV
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <h3 className="font-black text-lg leading-tight">{farm.name}</h3>
                        <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1">
                          <Map className="w-3.5 h-3.5 text-emerald-400" />
                          {farm.location}
                        </p>
                      </div>
                    </div>

                    {/* Facility Spec List */}
                    <div className="p-5 space-y-4">
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {farm.description}
                      </p>

                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Capacity</span>
                          <span className="font-bold text-slate-900 font-mono">{farm.annualCapacity}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Footprint</span>
                          <span className="font-bold text-slate-900 font-mono">{(farm.totalAreaSqM).toLocaleString()} m²</span>
                        </div>
                        <div className="pt-2 border-t border-slate-200/60">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Power Source</span>
                          <span className="font-bold text-emerald-700 truncate block">{farm.energySource.split('(')[0]}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-200/60">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Facility Lead</span>
                          <span className="font-bold text-slate-900 truncate block">{farm.manager}</span>
                        </div>
                      </div>

                      {/* Associated Ponds Pills */}
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center justify-between">
                          <span>Connected Cultivation Ponds</span>
                          <span className="font-mono text-emerald-700">{assignedPonds.length} Units</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {assignedPonds.map((p) => (
                            <Link
                              key={p.id}
                              href={`/ponds/${p.id}`}
                              className="text-[11px] font-bold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200/70 transition-colors flex items-center gap-1"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'Healthy' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              {p.name}
                            </Link>
                          ))}
                          {assignedPonds.length === 0 && (
                            <span className="text-[11px] text-slate-400 italic">No direct ponds mapped</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      onClick={() => { setActiveFarmId(farm.id); setActiveTab('overview'); }}
                      className="text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
                    >
                      Focus in Overview
                    </button>
                    <Link
                      href={`/farms/${farm.id}`}
                      className="font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                    >
                      View Facility Details <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. VIEW: ALL CULTIVATION PONDS PARTITION */}
      {activeTab === 'ponds' && (
        <div className="space-y-6">
          
          {/* Controls & Search Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by pond name, algae strain, or farm..."
                value={pondSearchQuery}
                onChange={(e) => setPondSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              {/* Facility Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase">Farm:</span>
                <select
                  value={selectedFarmFilter}
                  onChange={(e) => setSelectedFarmFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none"
                >
                  <option value="All">All 6 Facilities</option>
                  {DEMO_FARMS.map(f => (
                    <option key={f.id} value={f.id}>{f.name.split(' ')[0]}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(['All', 'Healthy', 'Attention'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedPondStatus(status)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedPondStatus === status
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed Ponds Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPonds.map((pond) => (
              <div 
                key={pond.id}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-lg hover:border-emerald-400 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Pond Photo Header */}
                  <div className="relative h-48 w-full bg-slate-900 overflow-hidden">
                    <Image 
                      src={pond.imageUrl} 
                      alt={pond.name} 
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                    
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <span className="bg-slate-900/80 backdrop-blur-md text-slate-200 font-semibold text-[10px] px-2.5 py-0.5 rounded-md border border-slate-700">
                        {pond.pondType}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1 shadow ${
                        pond.status === 'Healthy' ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        {pond.status}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                        {pond.speciesCommon}
                      </div>
                      <h3 className="text-xl font-black tracking-tight">{pond.name}</h3>
                      <p className="text-xs text-slate-300 italic font-medium">{pond.species}</p>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {pond.farmName}
                      </span>
                      <span className="font-mono font-bold text-slate-700">
                        {(pond.volumeLiters).toLocaleString()} L
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {pond.description}
                    </p>

                    {/* Detailed Metric Matrix */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Biomass Density</span>
                        <div className="text-sm font-black text-slate-900 font-mono mt-0.5">
                          {pond.biomass.toFixed(2)} <span className="text-[10px] font-normal text-slate-500">g/L</span>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-semibold">+{pond.dailyGrowthRate}% /day</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Temperature</span>
                        <div className="text-sm font-black text-slate-900 font-mono mt-0.5">
                          {pond.temperature.toFixed(1)} <span className="text-[10px] font-normal text-slate-500">°C</span>
                        </div>
                        <span className="text-[10px] text-slate-500">Optimal (26-30°C)</span>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60">
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">pH Level</span>
                        <div className="text-sm font-black text-slate-900 font-mono mt-0.5">
                          {pond.ph.toFixed(1)}
                        </div>
                        <span className="text-[10px] text-slate-500">Target 7.8 - 8.4</span>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60">
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Nitrogen (N)</span>
                        <div className={`text-sm font-black font-mono mt-0.5 ${pond.nitrogen < 5 ? 'text-amber-600' : 'text-slate-900'}`}>
                          {pond.nitrogen.toFixed(1)} <span className="text-[10px] font-normal text-slate-500">mg/L</span>
                        </div>
                        <span className={`text-[10px] font-semibold ${pond.nitrogen < 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {pond.nitrogen < 5 ? '⚠️ Low' : '✓ Normal'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500 font-mono">
                    {pond.areaSqM} m² • {pond.depthCm} cm depth
                  </span>
                  <Link
                    href={`/ponds/${pond.id}`}
                    className="font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 text-xs"
                  >
                    Open Telemetry <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {filteredPonds.length === 0 && (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
              <Droplets className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-700 font-bold">No ponds match your search criteria</p>
              <button 
                onClick={() => { setSelectedPondStatus('All'); setSelectedFarmFilter('All'); setPondSearchQuery(''); }}
                className="mt-2 text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                Reset all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* 6. VIEW: GEOGRAPHIC TOPOLOGY & MAP */}
      {activeTab === 'map' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Compass className="w-5 h-5 text-emerald-600" />
                  National Cultivation Geolocation & Topography
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Spatial distribution of registered Indian algae MRV facilities across Gujarat, Tamil Nadu, Rajasthan, Kerala, and Odisha.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl self-start">
                6 Active GPS Nodes
              </span>
            </div>

            {/* Interactive Grid of Facilities on Map */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DEMO_FARMS.map((farm) => {
                const assignedPonds = DEMO_PONDS.filter(p => p.farmId === farm.id);
                return (
                  <div 
                    key={farm.id}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-400 bg-slate-50/50 hover:bg-white transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <h4 className="font-bold text-sm text-slate-900">{farm.name}</h4>
                      </div>
                      <span className="font-mono text-[11px] text-slate-400 font-bold">
                        {farm.coordinates.lat}°N, {farm.coordinates.lng}°E
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-1">{farm.location}</p>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60">
                      <span className="text-[11px] text-slate-500">{assignedPonds.length} Ponds</span>
                      <button
                        onClick={() => { setActiveFarmId(farm.id); setActiveTab('overview'); }}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                      >
                        Inspect Node →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function FarmsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Cultivation Hub...</div>}>
      <FarmsPondsContent />
    </Suspense>
  );
}
