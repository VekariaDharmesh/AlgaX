'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { DEMO_FARMS, DEMO_PONDS, FarmDetails } from '@/lib/demo/ponds';
import { 
  ArrowLeft, 
  MapPin, 
  Building2, 
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
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  Copy, 
  Maximize2, 
  BarChart2, 
  Droplet, 
  Droplets, 
  TreePine, 
  Info,
  Clock,
  Sparkles,
  FlaskConical,
  Shield
} from 'lucide-react';

export default function FarmDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const paramIdStr = String(resolvedParams.id || '');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [impactPeriod, setImpactPeriod] = useState<'This Period' | 'This Month' | 'All Time'>('This Period');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Find farm by ID or slug match
  let farm = DEMO_FARMS.find(f => 
    f.id === paramIdStr || 
    f.name.toLowerCase().replace(/\s+/g, '_') === paramIdStr.toLowerCase() ||
    paramIdStr.toLowerCase().includes(f.name.toLowerCase().replace(' facility', '').replace(' hub', '').replace(' site', ''))
  );

  if (!farm) {
    farm = DEMO_FARMS[0];
  }

  // Ponds assigned to this farm
  const farmPonds = DEMO_PONDS.filter(p => p.farmId === farm.id);

  // Formatted Coordinates
  const latStr = farm.coordinates.lat.toFixed(4);
  const lngStr = farm.coordinates.lng.toFixed(4);

  const handleCopyCoordinates = () => {
    const coordsText = `Lat ${latStr}° N, Long ${lngStr}° E`;
    navigator.clipboard.writeText(coordsText);
    showToast(`Copied facility coordinates to clipboard: ${coordsText}`);
  };

  return (
    <div className="w-full max-w-[1550px] mx-auto space-y-6 pb-20 text-slate-800 relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <Link 
          href="/farms?tab=farms" 
          className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-2xs transition-all hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to All Facilities
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Total Ponds:</span>
          <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
            {farmPonds.length} Active Raceway Units
          </span>
        </div>
      </div>

      {/* HERO FACILITY BANNER */}
      <div className="rounded-3xl overflow-hidden bg-slate-900 border border-slate-200 shadow-sm relative">
        <div className="relative h-72 md:h-80 w-full overflow-hidden">
          <img 
            src={farm.imageUrl} 
            alt={farm.name} 
            className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-700" 
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/images/farms/kutch.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/30" />
          
          {/* Top Badges */}
          <div className="absolute top-6 left-6 right-6 flex items-center justify-between flex-wrap gap-2 z-10">
            <div className="flex items-center gap-2.5">
              <span className="bg-emerald-100/90 backdrop-blur-md text-emerald-950 font-bold text-xs px-3.5 py-1.5 rounded-xl border border-emerald-300/60 shadow-xs">
                Industrial Cultivation Hub
              </span>
              <span className="bg-slate-900/80 backdrop-blur-md text-slate-200 font-mono text-xs px-3.5 py-1.5 rounded-xl border border-slate-700/80">
                ID: {farm.id}
              </span>
            </div>

            <span className="text-xs font-black px-4 py-1.5 rounded-full bg-emerald-500/90 text-white border border-emerald-400/50 backdrop-blur-md flex items-center gap-2 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Operational Facility
            </span>
          </div>

          {/* Title & Info on Image */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-4 z-10">
            <div className="text-white space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                <Building2 className="w-4 h-4" />
                <span>MRV Certified Bio-Sequestration Site</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight drop-shadow-md">
                {farm.name}
              </h1>
              <p className="text-sm md:text-base text-slate-200 font-medium">
                📍 {farm.location}
              </p>
              
              <div className="flex items-center gap-4 text-xs text-slate-300 pt-1 font-medium flex-wrap">
                <span className="flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  {farm.climate}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  Manager: {farm.manager}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Active since: {farm.operationalSince}
                </span>
              </div>
            </div>

            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/80 p-4 rounded-2xl max-w-xs shrink-0 hidden lg:flex items-center gap-3 text-white">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div className="text-xs">
                <p className="italic font-medium text-slate-200">"Scientific Carbon Verification Hub"</p>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5 block">SHA-256 Hashed Audit Trail</span>
              </div>
            </div>
          </div>
        </div>

        {/* METRICS RIBBON BAR */}
        <div className="bg-white border-t border-slate-200 p-4 lg:px-6 grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Total Area</span>
              <span className="text-lg font-black text-slate-900 leading-tight">
                {farm.totalAreaSqM.toLocaleString()} m²
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Annual Capacity</span>
              <span className="text-lg font-black text-slate-900 leading-tight">
                {farm.annualCapacity}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Raceway Ponds</span>
              <span className="text-lg font-black text-slate-900 leading-tight">
                {farmPonds.length} Active Ponds
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Energy Source</span>
              <span className="text-base font-black text-emerald-700 leading-tight">
                {farm.energySource}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION: FACILITY PONDS ROSTER + SATELLITE MAP */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Assigned Ponds Roster Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Droplets className="w-5 h-5 text-emerald-600" />
                Raceway Ponds Roster
              </h2>
              <p className="text-xs text-slate-500">Live telemetry and biological models for all ponds in {farm.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {farmPonds.map((p) => (
              <div 
                key={p.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {p.pondType}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-1">{p.name}</h3>
                    <p className="text-xs text-slate-500 italic">{p.species}</p>
                  </div>

                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                    p.status === 'Healthy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {p.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-center text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Biomass</span>
                    <span className="font-black text-slate-900">{p.biomass.toFixed(2)} g/L</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Temp</span>
                    <span className="font-black text-slate-900">{p.temperature.toFixed(1)} °C</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">pH</span>
                    <span className="font-black text-slate-900">{p.ph.toFixed(1)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-400">ID: {p.id}</span>
                  <Link 
                    href={`/ponds/${p.id}`}
                    className="text-xs font-black text-emerald-700 hover:text-emerald-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>View Pond Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Location Map */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Facility Location
            </h3>
            <Link 
              href="/farms?tab=map" 
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>View Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="relative h-48 rounded-2xl overflow-hidden border border-slate-200 shadow-inner group">
            <img 
              src={farm.imageUrl} 
              alt="Satellite Map" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-95" 
            />
            <div className="absolute inset-0 bg-slate-900/30" />

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-950/90 backdrop-blur-md text-white p-3 rounded-2xl border border-slate-700 shadow-xl flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500 text-white shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="font-black text-xs block">{farm.name}</span>
                <span className="text-[10px] text-slate-300 font-medium block">{farm.location}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs font-mono">
            <div className="text-slate-600 font-semibold">
              <span>Lat <strong>{latStr}° N</strong></span>
              <span className="mx-2 text-slate-300">|</span>
              <span>Long <strong>{lngStr}° E</strong></span>
            </div>
            
            <button 
              onClick={handleCopyCoordinates}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors"
              title="Copy GPS coordinates"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION: 3 PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Panel 1: Kinetics Analysis */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Growth Limitations & Kinetic Envelopes
          </h3>
          <p className="text-xs text-slate-500">Aggregated kinetic factor efficiency curves for facility microclimates.</p>

          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700">☀️ Solar Penetration</span>
                <span className="text-slate-900 font-black">88%</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '88%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700">🌡️ Thermal Kinetics</span>
                <span className="text-slate-900 font-black">92%</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '92%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-700">🧪 pH Carbonate Equilibrium</span>
                <span className="text-slate-900 font-black">81%</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '81%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Panel 2: Specifications & Certifications */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-3.5">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            Facility Specifications & Certifications
          </h3>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 font-medium">Facility Manager</span>
              <span className="font-bold text-slate-900">{farm.manager}</span>
            </div>
            <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 font-medium">Water Source</span>
              <span className="font-bold text-slate-900">{farm.waterSource}</span>
            </div>
            <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 font-medium">Elevation</span>
              <span className="font-bold text-slate-900">{farm.elevation}</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 font-medium">MRV Certifications</span>
              <div className="flex items-center gap-1 flex-wrap justify-end">
                {farm.certifications.map(c => (
                  <span key={c} className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Panel 3: Environmental Impact */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <TreePine className="w-5 h-5 text-emerald-600" />
              Environmental Impact
            </h3>
            <select 
              value={impactPeriod}
              onChange={(e) => setImpactPeriod(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-2.5 py-1 focus:outline-none"
            >
              <option value="This Period">This Period</option>
              <option value="This Month">This Month</option>
              <option value="All Time">All Time</option>
            </select>
          </div>

          <div className="py-2 flex flex-col items-center justify-center relative">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#e2e8f0" strokeWidth="8" fill="none" />
                <circle cx="50" cy="50" r="40" stroke="#15803d" strokeWidth="8" fill="none" strokeDasharray="251.2" strokeDashoffset="50" strokeLinecap="round" />
              </svg>
              <div className="absolute text-center space-y-0.5">
                <Leaf className="w-5 h-5 text-emerald-600 mx-auto" />
                <div className="text-xl font-black text-slate-900">4,850 kg</div>
                <div className="text-[9px] text-slate-400 font-bold uppercase">CO₂ Removed</div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 text-xs font-bold text-emerald-900 flex items-center justify-center gap-2">
            <TreePine className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Equivalent to 220 trees planted this period!</span>
          </div>
        </div>

      </div>

    </div>
  );
}
