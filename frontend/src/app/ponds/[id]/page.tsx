'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DEMO_PONDS, DEMO_FARMS, Pond } from '@/lib/demo/ponds';
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
  ArrowRight,
  MapPin,
  Copy,
  ExternalLink,
  X,
  Play,
  Sun,
  FlaskConical,
  TreePine,
  Maximize2,
  RefreshCcw,
  Check,
  Video,
  ShoppingBag,
  BarChart2,
  Sliders,
  Radio,
  Clock,
  ChevronDown,
  Leaf
} from 'lucide-react';

export default function PondDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const paramIdStr = String(resolvedParams.id || '');

  // UI Interactive States
  const [timeframe, setTimeframe] = useState<'1H' | '24H' | '7D' | '30D'>('1H');
  const [impactPeriod, setImpactPeriod] = useState<'This Period' | 'This Month' | 'All Time'>('This Period');
  const [isLiveFeedOpen, setIsLiveFeedOpen] = useState(false);
  const [isHarvestModalOpen, setIsHarvestModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Calendar Date Range Picker State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [startDate, setStartDate] = useState('2026-09-12');
  const [endDate, setEndDate] = useState('2026-09-18');
  const [activeDateRange, setActiveDateRange] = useState<string | null>(null);

  // Harvest Simulation State
  const [harvestWeight, setHarvestWeight] = useState<string>('450');
  const [harvestMethod, setHarvestMethod] = useState<string>('CENTRIFUGATION');
  const [harvestSubmitting, setHarvestSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleApplyPresetDate = (presetName: string, start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setActiveDateRange(`${presetName}`);
    setIsCalendarOpen(false);
    showToast(`Applied ${presetName} range: ${start} to ${end}`);
  };

  const handleApplyCustomDateRange = () => {
    if (!startDate || !endDate) {
      showToast('Please select both start and end dates.');
      return;
    }
    setActiveDateRange(`${startDate} – ${endDate}`);
    setIsCalendarOpen(false);
    showToast(`Applied custom date range: ${startDate} to ${endDate}`);
  };

  const handleClearDateRange = () => {
    setActiveDateRange(null);
    setIsCalendarOpen(false);
    showToast('Reset to real-time live telemetry streaming.');
  };

  // Search by exact ID, or name slug match
  let pond = DEMO_PONDS.find(p => 
    p.id === paramIdStr || 
    p.name.toLowerCase().replace(/\s+/g, '_') === paramIdStr.toLowerCase() ||
    paramIdStr.toLowerCase().includes(p.name.toLowerCase().replace('pond ', ''))
  );

  if (!pond) {
    // Generate a fallback pond object based on the ID/UUID so clicking any backend pond opens full details!
    let hash = 0;
    for (let i = 0; i < paramIdStr.length; i++) {
      hash = (hash << 5) - hash + paramIdStr.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % DEMO_PONDS.length;
    const basePond = DEMO_PONDS[idx] || DEMO_PONDS[0];

    pond = {
      ...basePond,
      id: paramIdStr,
    };
  }

  // Find farm details
  const farm = DEMO_FARMS.find(f => f.id === pond.farmId) || DEMO_FARMS[0];

  // Specific pond coordinates
  const latStr = farm.coordinates.lat.toFixed(4);
  const lngStr = farm.coordinates.lng.toFixed(4);

  // Determine actual pond image URL
  const pondImageUrl = pond.imageUrl || `/images/ponds/${pond.name.toLowerCase().replace(/\s+/g, '_')}.jpg`;

  // Calculate limitation factors dynamically
  const lightLimitation = pond.id === 'p-3' ? 95 : 86;
  const tempLimitation = 92;
  const phLimitation = pond.ph > 8.3 ? 78 : 94;
  const nitrogenLimitation = pond.nitrogen < 5 ? 41 : 94;

  // Copy coordinates handler
  const handleCopyCoordinates = () => {
    const coordsText = `Lat ${latStr}° N, Long ${lngStr}° E`;
    navigator.clipboard.writeText(coordsText);
    showToast(`Copied coordinates to clipboard: ${coordsText}`);
  };

  // Submit Harvest Simulation
  const handleSimulateHarvestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHarvestSubmitting(true);
    setTimeout(() => {
      setHarvestSubmitting(false);
      setIsHarvestModalOpen(false);
      showToast(`Harvest simulated successfully! ${harvestWeight} kg biomass logged for ${pond.name}.`);
    }, 1000);
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
          href="/farms?tab=ponds" 
          className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-2xs transition-all hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Ponds Overview
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Facility:</span>
          <Link
            href={`/farms?farm=${farm.id}`}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-1.5 rounded-xl border border-emerald-200/80 transition-all flex items-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            {farm.name}
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. HERO POND BANNER WITH PHOTO & METRICS RIBBON (Matches User Mockup) */}
      {/* ========================================================================= */}
      <div className="rounded-3xl overflow-hidden bg-slate-900 border border-slate-200 shadow-sm relative">
        <div className="relative h-72 md:h-80 w-full overflow-hidden">
          <img 
            src={pondImageUrl} 
            alt={pond.name} 
            className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-700" 
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/images/ponds/pond_narmada.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/30" />
          
          {/* Top Pill Badges Row */}
          <div className="absolute top-6 left-6 right-6 flex items-center justify-between flex-wrap gap-2 z-10">
            <div className="flex items-center gap-2.5">
              {/* Architecture Pill */}
              <span className="bg-emerald-100/90 backdrop-blur-md text-emerald-950 font-bold text-xs px-3.5 py-1.5 rounded-xl border border-emerald-300/60 shadow-xs">
                {pond.pondType || 'High-Salinity Raceway'}
              </span>

              {/* ID Pill */}
              <span className="bg-slate-900/80 backdrop-blur-md text-slate-200 font-mono text-xs px-3.5 py-1.5 rounded-xl border border-slate-700/80">
                ID: {pond.id}
              </span>
            </div>

            {/* Health Status Pill */}
            <span className={`text-xs font-black px-4 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2 shadow-xs border ${
              pond.status === 'Healthy' 
                ? 'bg-emerald-500/90 text-white border-emerald-400/50' 
                : 'bg-amber-500/90 text-white border-amber-400/50'
            }`}>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              {pond.status}
            </span>
          </div>

          {/* Main Title & Quote Box on Image */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-4 z-10">
            <div className="text-white space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                <Activity className="w-4 h-4" />
                <span>Microalgae Bio-Sequestration Unit</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight drop-shadow-md">
                {pond.name}
              </h1>
              <p className="text-sm md:text-base text-slate-200 italic font-medium">
                {pond.species} ({pond.speciesCommon})
              </p>
              
              <div className="flex items-center gap-4 text-xs text-slate-300 pt-1 font-medium flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  {farm.location}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Operational
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Last updated: 12 Sep 2026, 08:48 PM
                </span>
              </div>
            </div>

            {/* Quote Box (Right Side) */}
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/80 p-4 rounded-2xl max-w-xs shrink-0 hidden lg:flex items-center gap-3 text-white">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                <Leaf className="w-6 h-6" />
              </div>
              <div className="text-xs">
                <p className="italic font-medium text-slate-200">"Algae today, a better tomorrow."</p>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5 block">AlgaX MRV Platform</span>
              </div>
            </div>
          </div>
        </div>

        {/* PHYSICAL METRICS RIBBON BAR */}
        <div className="bg-white border-t border-slate-200 p-4 lg:px-6 grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
          {/* Working Volume */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
              <Droplet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Working Volume</span>
              <span className="text-lg font-black text-slate-900 leading-tight">
                {pond.volumeLiters.toLocaleString()} L
              </span>
            </div>
          </div>

          {/* Surface Footprint */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Surface Footprint</span>
              <span className="text-lg font-black text-slate-900 leading-tight">
                {pond.areaSqM.toLocaleString()} m²
              </span>
            </div>
          </div>

          {/* Operational Depth */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Operational Depth</span>
              <span className="text-lg font-black text-slate-900 leading-tight">
                {pond.depthCm} cm
              </span>
            </div>
          </div>

          {/* CO2 Injection Rate */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">CO₂ Injection Rate</span>
              <span className="text-lg font-black text-emerald-700 leading-tight">
                {pond.co2InjectionRate} kg/h
              </span>
            </div>
          </div>

          {/* View Live Feed Action Button */}
          <div className="col-span-2 md:col-span-1 flex justify-end">
            <button 
              onClick={() => setIsLiveFeedOpen(true)}
              className="w-full md:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 group"
            >
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>View Live Feed</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Nitrogen limitation alert if status is Attention */}
      {pond.status === 'Attention' && (
        <div className="bg-amber-50 border-2 border-amber-300 p-5 rounded-2xl flex items-start gap-4 shadow-2xs">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-black text-amber-900">Kinetic Nitrogen Limitation Warning</h3>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Available dissolved nitrogen has dropped to <strong>{pond.nitrogen.toFixed(1)} mg/L</strong> (threshold: &gt;5.0 mg/L). 
              The Monod-Droop nutrient engine predicts a 28% reduction in exponential biomass doubling unless supplemental nitrate/urea dosing is executed.
            </p>
          </div>
          <Link
            href="/monitoring"
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0"
          >
            Review Dosing Action
          </Link>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MIDDLE SECTION: LIVE SENSOR DATA GRID (6 CARDS) + POND LOCATION MAP */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left (2 Cols): Live Sensor Data Section (Matches uploaded image media_1789745502017.png) */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-sm space-y-5">
          
          {/* Section Header Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Live Sensor Data
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Streaming real-time from IoT multi-spectral probe array
                </p>
              </div>
            </div>

            {/* Right Controls: Live Badge + Timeframe Pills + Calendar Icon */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Live Badge */}
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50/90 px-3 py-1 rounded-full border border-emerald-200/80 flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live
              </span>

              {/* Segmented Timeframe Selector (1H, 6H, 24H, 7D) */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/70 text-xs font-bold">
                {(['1H', '6H', '24H', '7D'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => {
                      setTimeframe(tf as any);
                      showToast(`Sensor timeframe set to ${tf}`);
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      timeframe === tf 
                        ? 'bg-emerald-100 text-emerald-950 font-black shadow-2xs border border-emerald-300/80' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              {/* Interactive Calendar Icon Button & Range Popover */}
              <div className="relative">
                <button 
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                  className={`p-1.5 border rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 ${
                    activeDateRange ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  title="Select Date Range"
                >
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  {activeDateRange ? (
                    <span className="text-[11px] font-extrabold flex items-center gap-1">
                      <span>{activeDateRange}</span>
                      <X 
                        className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700 ml-0.5" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearDateRange();
                        }}
                      />
                    </span>
                  ) : null}
                </button>

                {/* Calendar Date Range Picker Popover */}
                {isCalendarOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsCalendarOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-white border border-slate-200 rounded-3xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 text-slate-800">
                      
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <h4 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-emerald-600" />
                          Select Telemetry Date Range
                        </h4>
                        <button onClick={() => setIsCalendarOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Quick Presets */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Quick Presets</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button 
                            onClick={() => handleApplyPresetDate('Today', '2026-09-18', '2026-09-18')}
                            className="px-2.5 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-bold rounded-xl border border-slate-200/80 transition-colors text-left"
                          >
                            Today
                          </button>
                          <button 
                            onClick={() => handleApplyPresetDate('Yesterday', '2026-09-17', '2026-09-17')}
                            className="px-2.5 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-bold rounded-xl border border-slate-200/80 transition-colors text-left"
                          >
                            Yesterday
                          </button>
                          <button 
                            onClick={() => handleApplyPresetDate('Last 7 Days', '2026-09-11', '2026-09-18')}
                            className="px-2.5 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-bold rounded-xl border border-slate-200/80 transition-colors text-left"
                          >
                            Last 7 Days
                          </button>
                          <button 
                            onClick={() => handleApplyPresetDate('Last 30 Days', '2026-08-19', '2026-09-18')}
                            className="px-2.5 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-bold rounded-xl border border-slate-200/80 transition-colors text-left"
                          >
                            Last 30 Days
                          </button>
                        </div>
                      </div>

                      {/* Custom Range Inputs */}
                      <div className="space-y-2 pt-1 border-t border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Custom Range</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Start Date</label>
                            <input 
                              type="date" 
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">End Date</label>
                            <input 
                              type="date" 
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        {activeDateRange ? (
                          <button 
                            onClick={handleClearDateRange}
                            className="text-xs font-bold text-rose-600 hover:underline"
                          >
                            Reset to Live
                          </button>
                        ) : <div />}

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setIsCalendarOpen(false)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleApplyCustomDateRange}
                            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                          >
                            Apply Range
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 6 SENSOR CARDS GRID (3 Cols x 2 Rows) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* CARD 1: BIOMASS */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3.5">
              {/* Top Row: Icon + Title & Top Right Status Pill */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                    <Leaf className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 leading-none">Biomass</h3>
                    <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">g/L</span>
                  </div>
                </div>

                {/* Status Pill Box */}
                <button 
                  onClick={() => showToast('Biomass sensor operating within nominal range.')}
                  className="bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-900 px-2.5 py-1 rounded-xl border border-emerald-200/70 text-[10px] flex items-center gap-1.5 transition-colors text-left shrink-0"
                >
                  <Leaf className="w-3 h-3 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-black block leading-tight">Stable</span>
                    <span className="text-[9px] text-emerald-700 font-medium block leading-tight">Normal range</span>
                  </div>
                  <span className="text-slate-400 font-bold ml-0.5 text-[11px]">›</span>
                </button>
              </div>

              {/* Value + Trend Row */}
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 tracking-tight">{pond.biomass.toFixed(2)}</span>
                  <span className="text-xs font-bold text-slate-500">g/L</span>
                </div>
                <div className="text-right">
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200/80 inline-flex items-center gap-1">
                    <span>↗ 10.8%</span>
                  </span>
                  <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">vs last hour</span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Sensor Online</span>
                </div>

                <div className="flex items-center gap-1 text-[9px] font-semibold text-slate-400">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>03:15 AM, 12 Sep</span>
                </div>

                <button 
                  onClick={() => showToast(`Opening Biomass telemetry details for ${pond.name}...`)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 shadow-2xs flex items-center gap-1 transition-all"
                >
                  <BarChart2 className="w-3 h-3 text-slate-500" />
                  <span>View Details</span>
                  <span>›</span>
                </button>
              </div>
            </div>

            {/* CARD 2: TEMPERATURE */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                    <Thermometer className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 leading-none">Temperature</h3>
                    <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">°C</span>
                  </div>
                </div>

                <button 
                  onClick={() => showToast('Temperature kinetics within target envelope.')}
                  className="bg-amber-50/80 hover:bg-amber-100/80 text-amber-900 px-2.5 py-1 rounded-xl border border-amber-200/70 text-[10px] flex items-center gap-1.5 transition-colors text-left shrink-0"
                >
                  <Thermometer className="w-3 h-3 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-black block leading-tight">Within range</span>
                    <span className="text-[9px] text-amber-700 font-medium block leading-tight">Optimal: 28.0°C</span>
                  </div>
                  <span className="text-slate-400 font-bold ml-0.5 text-[11px]">›</span>
                </button>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 tracking-tight">{pond.temperature.toFixed(1)}</span>
                  <span className="text-xs font-bold text-slate-500">°C</span>
                </div>
                <div className="text-right">
                  <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-rose-200/80 inline-flex items-center gap-1">
                    <span>↗ 0.4%</span>
                  </span>
                  <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">vs last hour</span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Sensor Online</span>
                </div>

                <div className="flex items-center gap-1 text-[9px] font-semibold text-slate-400">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>03:15 AM, 12 Sep</span>
                </div>

                <button 
                  onClick={() => showToast(`Opening Temperature telemetry details...`)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 shadow-2xs flex items-center gap-1 transition-all"
                >
                  <BarChart2 className="w-3 h-3 text-slate-500" />
                  <span>View Details</span>
                  <span>›</span>
                </button>
              </div>
            </div>

            {/* CARD 3: PH INDEX */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
                    <Droplet className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 leading-none">pH Index</h3>
                    <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">pH</span>
                  </div>
                </div>

                <button 
                  onClick={() => showToast('pH Carbonate-Bicarbonate equilibrium ideal.')}
                  className="bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-900 px-2.5 py-1 rounded-xl border border-emerald-200/70 text-[10px] flex items-center gap-1.5 transition-colors text-left shrink-0"
                >
                  <Droplet className="w-3 h-3 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-black block leading-tight">Ideal range</span>
                    <span className="text-[9px] text-emerald-700 font-medium block leading-tight">7.8 – 8.4</span>
                  </div>
                  <span className="text-slate-400 font-bold ml-0.5 text-[11px]">›</span>
                </button>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 tracking-tight">{pond.ph.toFixed(1)}</span>
                </div>
                <div className="text-right">
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200/80 inline-flex items-center gap-1">
                    <span>↗ 0.1%</span>
                  </span>
                  <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">vs last hour</span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Sensor Online</span>
                </div>

                <div className="flex items-center gap-1 text-[9px] font-semibold text-slate-400">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>03:15 AM, 12 Sep</span>
                </div>

                <button 
                  onClick={() => showToast(`Opening pH telemetry details...`)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 shadow-2xs flex items-center gap-1 transition-all"
                >
                  <BarChart2 className="w-3 h-3 text-slate-500" />
                  <span>View Details</span>
                  <span>›</span>
                </button>
              </div>
            </div>

            {/* CARD 4: DISSOLVED O2 */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 leading-none">Dissolved O₂</h3>
                    <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">mg/L</span>
                  </div>
                </div>

                <button 
                  onClick={() => showToast('Dissolved oxygen aeration healthy.')}
                  className="bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-900 px-2.5 py-1 rounded-xl border border-emerald-200/70 text-[10px] flex items-center gap-1.5 transition-colors text-left shrink-0"
                >
                  <Droplets className="w-3 h-3 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-black block leading-tight">Healthy aeration</span>
                    <span className="text-[9px] text-emerald-700 font-medium block leading-tight">Good range</span>
                  </div>
                  <span className="text-slate-400 font-bold ml-0.5 text-[11px]">›</span>
                </button>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 tracking-tight">{pond.dissolvedOxygen.toFixed(1)}</span>
                  <span className="text-xs font-bold text-slate-500">mg/L</span>
                </div>
                <div className="text-right">
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200/80 inline-flex items-center gap-1">
                    <span>↗ 3.2%</span>
                  </span>
                  <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">vs last hour</span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Sensor Online</span>
                </div>

                <div className="flex items-center gap-1 text-[9px] font-semibold text-slate-400">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>03:15 AM, 12 Sep</span>
                </div>

                <button 
                  onClick={() => showToast(`Opening Dissolved Oxygen telemetry details...`)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 shadow-2xs flex items-center gap-1 transition-all"
                >
                  <BarChart2 className="w-3 h-3 text-slate-500" />
                  <span>View Details</span>
                  <span>›</span>
                </button>
              </div>
            </div>

            {/* CARD 5: TURBIDITY */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-100 flex items-center justify-center shrink-0">
                    <Gauge className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 leading-none">Turbidity</h3>
                    <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">NTU</span>
                  </div>
                </div>

                <button 
                  onClick={() => showToast('Turbidity optical density within normal range.')}
                  className="bg-slate-100/90 hover:bg-slate-200/90 text-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 text-[10px] flex items-center gap-1.5 transition-colors text-left shrink-0"
                >
                  <Gauge className="w-3 h-3 text-cyan-600 shrink-0" />
                  <div>
                    <span className="font-black block leading-tight">Normal range</span>
                    <span className="text-[9px] text-slate-500 font-medium block leading-tight">Optical density</span>
                  </div>
                  <span className="text-slate-400 font-bold ml-0.5 text-[11px]">›</span>
                </button>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 tracking-tight">{pond.turbidity}</span>
                  <span className="text-xs font-bold text-slate-500">NTU</span>
                </div>
                <div className="text-right">
                  <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-rose-200/80 inline-flex items-center gap-1">
                    <span>↘ 6.1%</span>
                  </span>
                  <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">vs last hour</span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Sensor Online</span>
                </div>

                <div className="flex items-center gap-1 text-[9px] font-semibold text-slate-400">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>03:15 AM, 12 Sep</span>
                </div>

                <button 
                  onClick={() => showToast(`Opening Turbidity telemetry details...`)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 shadow-2xs flex items-center gap-1 transition-all"
                >
                  <BarChart2 className="w-3 h-3 text-slate-500" />
                  <span>View Details</span>
                  <span>›</span>
                </button>
              </div>
            </div>

            {/* CARD 6: NITROGEN (N) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                    <Leaf className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 leading-none">Nitrogen (N)</h3>
                    <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">mg/L</span>
                  </div>
                </div>

                <button 
                  onClick={() => showToast('Nitrogen nutrient quota adequate for growth.')}
                  className="bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-900 px-2.5 py-1 rounded-xl border border-emerald-200/70 text-[10px] flex items-center gap-1.5 transition-colors text-left shrink-0"
                >
                  <Leaf className="w-3 h-3 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-black block leading-tight">Adequate</span>
                    <span className="text-[9px] text-emerald-700 font-medium block leading-tight">Good for growth</span>
                  </div>
                  <span className="text-slate-400 font-bold ml-0.5 text-[11px]">›</span>
                </button>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1">
                  <span className={`text-3xl font-black tracking-tight ${pond.nitrogen < 5 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {pond.nitrogen.toFixed(1)}
                  </span>
                  <span className="text-xs font-bold text-slate-500">mg/L</span>
                </div>
                <div className="text-right">
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200/80 inline-flex items-center gap-1">
                    <span>↗ 2.5%</span>
                  </span>
                  <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">vs last hour</span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Sensor Online</span>
                </div>

                <div className="flex items-center gap-1 text-[9px] font-semibold text-slate-400">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>03:15 AM, 12 Sep</span>
                </div>

                <button 
                  onClick={() => showToast(`Opening Nitrogen telemetry details...`)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 shadow-2xs flex items-center gap-1 transition-all"
                >
                  <BarChart2 className="w-3 h-3 text-slate-500" />
                  <span>View Details</span>
                  <span>›</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Right (1 Col): Pond Location & Map Preview Box */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Pond Location
            </h3>
            <Link 
              href="/farms?tab=map" 
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>View on Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Map Preview Graphic */}
          <div className="relative h-44 rounded-2xl overflow-hidden border border-slate-200 shadow-inner group">
            <img 
              src="/images/farms/kutch.jpg" 
              alt="Satellite Location Map" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-95" 
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/ponds/pond_narmada.jpg';
              }}
            />
            <div className="absolute inset-0 bg-slate-900/30" />

            {/* Location Pin Card Overlay */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-950/90 backdrop-blur-md text-white p-2.5 rounded-2xl border border-slate-700 shadow-xl flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-emerald-500 text-white shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="font-black text-xs block">{pond.name}</span>
                <span className="text-[10px] text-slate-300 font-medium block">{farm.location}</span>
              </div>
            </div>

            {/* Expand map button */}
            <Link 
              href="/farms?tab=map" 
              className="absolute top-3 right-3 p-1.5 rounded-xl bg-white/80 hover:bg-white text-slate-800 shadow-xs backdrop-blur-md transition-all"
              title="Expand map view"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Coordinates Bar + Copy Button */}
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

      {/* ========================================================================= */}
      {/* 3. BOTTOM SECTION: 3 PANELS GRID (Liebig, Cultivation Specs, Environmental Impact) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Panel 1: Growth Limitation Analysis (Liebig Minimum) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                Growth Limitation Analysis (Liebig Minimum)
              </h3>
              <Info className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Factor efficiencies computed via Monod-Droop multi-parameter kinetic curves.
            </p>

            <div className="space-y-4">
              {/* Light Bar */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700 flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-500" /> Solar Irradiance & Light Penetration
                  </span>
                  <span className="text-slate-900 font-black">{lightLimitation}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${lightLimitation}%` }} />
                </div>
              </div>
              
              {/* Temp Bar */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700 flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-rose-500" /> Temperature Kinetics (Arrhenius Factor)
                  </span>
                  <span className="text-slate-900 font-black">{tempLimitation}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${tempLimitation}%` }} />
                </div>
              </div>

              {/* pH Bar */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700 flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-purple-500" /> pH Carbonate-Bicarbonate Equilibrium
                  </span>
                  <span className="text-slate-900 font-black">{phLimitation}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${phLimitation}%` }} />
                </div>
              </div>

              {/* Nitrogen Bar */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700 flex items-center gap-1.5">
                    <Leaf className="w-3.5 h-3.5 text-emerald-600" /> Dissolved Nitrogen Availability (Droop Cell Quota)
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

          {/* Governing Constraint Box */}
          <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 text-xs text-slate-700 flex items-start gap-2.5">
            <Leaf className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 block mb-0.5">
                Governing Constraint: {nitrogenLimitation < 50 ? 'Nitrogen Availability' : 'Light Attenuation'}
              </span>
              <p className="text-[11px] text-slate-600 leading-snug">
                {nitrogenLimitation < 50 
                  ? 'Under Droop cell-quota dynamics, intracellular nitrogen depletion forces the cells into lipid synthesis accumulation, moderating overall daily cell division.'
                  : 'Pond depth optical extinction dictates daytime photosynthetic efficiency.'}
              </p>
            </div>
          </div>
        </div>

        {/* Panel 2: Cultivation Specs & Inoculation History */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Beaker className="w-5 h-5 text-emerald-600" />
                Cultivation Specs & Inoculation History
              </h3>
              <Info className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Physical structure, strain lineage, and recent harvest cycle provenance.
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-medium">Cultivated Microalgae Strain</span>
                <span className="font-bold text-slate-900">{pond.species}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-medium">Cultivation Architecture</span>
                <span className="font-bold text-slate-900">{pond.pondType}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-medium">Last Harvest Date</span>
                <span className="font-bold text-emerald-700">{pond.lastHarvest || '2026-08-27'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-medium">Estimated Daily CO₂ Fixation</span>
                <span className="font-bold text-emerald-700">~{(pond.co2InjectionRate * 18.5).toFixed(1)} kg CO₂e / day</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-medium">Inoculation Date</span>
                <span className="font-bold text-slate-900">2026-06-14</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-medium">Current Cycle</span>
                <span className="font-bold text-slate-900">Cycle 4 (Day 18)</span>
              </div>
            </div>
          </div>

          {/* Buttons Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
            >
              <span>View Full History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsHarvestModalOpen(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <span>Simulate Harvest 🌾</span>
            </button>

            <button 
              onClick={() => showToast(`Analytics loaded for ${pond.name}.`)}
              className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all"
              title="Open analytics"
            >
              <BarChart2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Panel 3: Environmental Impact */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <TreePine className="w-5 h-5 text-emerald-600" />
                Environmental Impact
              </h3>

              {/* Period Dropdown */}
              <select 
                value={impactPeriod}
                onChange={(e) => setImpactPeriod(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="This Period">This Period</option>
                <option value="This Month">This Month</option>
                <option value="All Time">All Time</option>
              </select>
            </div>

            {/* Circular Ring Gauge (1,188 kg CO2 Removed) */}
            <div className="py-2 flex flex-col items-center justify-center relative">
              <div className="relative w-36 h-36 flex items-center justify-center">
                {/* SVG Progress Circle */}
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="#e2e8f0" strokeWidth="8" fill="none" />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    stroke="#15803d" 
                    strokeWidth="8" 
                    fill="none" 
                    strokeDasharray="251.2" 
                    strokeDashoffset="62.8" 
                    strokeLinecap="round" 
                  />
                </svg>

                {/* Center Content */}
                <div className="absolute text-center space-y-0.5">
                  <Leaf className="w-5 h-5 text-emerald-600 mx-auto" />
                  <div className="text-xl font-black text-slate-900">1,188 kg</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">CO₂ Removed</div>
                </div>
              </div>
            </div>

            {/* 3 Breakdown Stats Grid */}
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 font-bold block uppercase">CO₂ Fixed</span>
                <span className="text-xs font-black text-slate-900">2,140 kg</span>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 font-bold block uppercase">Retained</span>
                <span className="text-xs font-black text-slate-900">1,284 kg</span>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                <span className="text-[9px] text-slate-400 font-bold block uppercase">Operational</span>
                <span className="text-xs font-black text-slate-900">96 kg</span>
              </div>
            </div>
          </div>

          {/* Trees Equivalence Box */}
          <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 text-xs font-bold text-emerald-900 flex items-center justify-center gap-2">
            <TreePine className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Equivalent to 54 trees planted this period!</span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: LIVE FEED MODAL STREAM */}
      {/* ========================================================================= */}
      {isLiveFeedOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl text-white">
            
            {/* Header */}
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">{pond.name} — Live IoT Telemetry Feed</h3>
                  <p className="text-xs text-slate-400">Multi-spectral PBR camera feed & continuous waveform</p>
                </div>
              </div>
              
              <button 
                onClick={() => setIsLiveFeedOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video / Animation Screen */}
            <div className="relative h-96 bg-slate-950 flex items-center justify-center overflow-hidden">
              <img 
                src={pondImageUrl} 
                alt="Pond Feed" 
                className="w-full h-full object-cover opacity-60" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/ponds/pond_narmada.jpg';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/50" />

              {/* Streaming Overlay Elements */}
              <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-mono font-bold px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span>REC LIVE • 1080p 60FPS</span>
              </div>

              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs font-mono bg-slate-950/80 backdrop-blur-md p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-4 text-slate-300">
                  <span>Biomass: <strong className="text-white">{pond.biomass.toFixed(2)} g/L</strong></span>
                  <span>Temp: <strong className="text-white">{pond.temperature.toFixed(1)}°C</strong></span>
                  <span>pH: <strong className="text-white">{pond.ph.toFixed(1)}</strong></span>
                </div>
                <span className="text-emerald-400 font-bold">SHA-256 Telemetry Hash Sealed</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button 
                onClick={() => setIsLiveFeedOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Close Stream
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: HARVEST SIMULATION MODAL */}
      {/* ========================================================================= */}
      {isHarvestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl">
            
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">Simulate Harvest Event</h3>
                  <p className="text-xs text-slate-300">Log biomass extraction for {pond.name}</p>
                </div>
              </div>
              
              <button 
                onClick={() => setIsHarvestModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSimulateHarvestSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Harvested Biomass (kg dry wt)</label>
                <input 
                  type="number" 
                  value={harvestWeight}
                  onChange={(e) => setHarvestWeight(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  required 
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Harvest Method</label>
                <select 
                  value={harvestMethod}
                  onChange={(e) => setHarvestMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="CENTRIFUGATION">Centrifugation (High Purity)</option>
                  <option value="FILTRATION">Membrane Filtration</option>
                  <option value="FLOCCULATION">Bio-Flocculation</option>
                </select>
              </div>

              <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200/80 text-xs text-emerald-900">
                <span className="font-bold block mb-0.5">Estimated Net Carbon Fixation:</span>
                <span>~{((Number(harvestWeight) || 0) * 0.48 * (44 / 12)).toFixed(1)} kg CO₂e locked</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsHarvestModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={harvestSubmitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {harvestSubmitting ? 'Simulating...' : 'Execute Harvest Event'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: INOCULATION & HARVEST HISTORY MODAL */}
      {/* ========================================================================= */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl">
            
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">{pond.name} — Full Inoculation & Harvest History</h3>
                  <p className="text-xs text-slate-300">Historical growth cycle provenance</p>
                </div>
              </div>
              
              <button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-96 overflow-y-auto divide-y divide-slate-100">
              <div className="pt-2 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 block">Cycle 4 (Current) — Inoculated 2026-06-14</span>
                  <span className="text-slate-500 text-[11px]">{pond.species} • High-Density Cultivation</span>
                </div>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">Active Growth</span>
              </div>

              <div className="pt-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 block">Harvest Event #08 — 2026-08-27</span>
                  <span className="text-slate-500 text-[11px]">Yield: 480 kg dry biomass (Centrifugation)</span>
                </div>
                <span className="font-mono font-bold text-slate-700">844 kg CO₂e Locked</span>
              </div>

              <div className="pt-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 block">Harvest Event #07 — 2026-07-15</span>
                  <span className="text-slate-500 text-[11px]">Yield: 420 kg dry biomass (Membrane Filtration)</span>
                </div>
                <span className="font-mono font-bold text-slate-700">739 kg CO₂e Locked</span>
              </div>

              <div className="pt-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 block">Cycle 3 Inoculation — 2026-04-10</span>
                  <span className="text-slate-500 text-[11px]">Seed strain batch #C-2026-04</span>
                </div>
                <span className="font-bold text-slate-500">Archived</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-slate-800 transition-colors"
              >
                Close History
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
