'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ShoppingBag, 
  Plus, 
  PlusCircle, 
  Filter, 
  Search, 
  Calendar, 
  User, 
  Scale, 
  Leaf, 
  Zap, 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  X, 
  Clock, 
  RefreshCw, 
  FileText,
  MapPin,
  Layers,
  ChevronDown,
  ArrowUpRight,
  Database,
  Check,
  MoreHorizontal,
  Compass,
  FileCheck2,
  Lock,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Settings,
  Activity,
  Cpu
} from 'lucide-react';
import { 
  fetchFarms, 
  fetchPonds, 
  fetchHarvests, 
  fetchHarvestOverview, 
  fetchBiomassReadiness, 
  createHarvestEvent, 
  updateHarvestEvent, 
  addHarvestBiomassFate, 
  Farm, 
  Pond, 
  HarvestEvent, 
  HarvestOverviewKPIs, 
  BiomassReadiness, 
  HarvestStatus, 
  HarvestMethod, 
  EndUseCategory 
} from '@/lib/api';
import { DEMO_FARMS } from '@/lib/demo/ponds';
import { FACILITY_HARVEST_PROFILES, FarmHarvestProfile } from '@/lib/demo/facilityData';

export interface HarvestItem {
  id: string;
  date: string;
  rawDate: string;
  pond: string;
  pondId: string;
  biomassKg: number;
  method: string;
  status: 'Completed' | 'Pending' | 'Cancelled' | 'Planned';
  carbonLink: 'Verified' | 'Pending' | 'Not Linked';
  operator: string;
  notes?: string;
  batchCode: string;
  fates?: {
    category: string;
    kg: number;
    pct: number;
    destination: string;
  }[];
}

const DEFAULT_HARVEST_RECORDS: HarvestItem[] = FACILITY_HARVEST_PROFILES['farm-1'].records as HarvestItem[];

export default function HarvestsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [activeFarmId, setActiveFarmId] = useState<string>('farm-1');
  const [selectedFarm, setSelectedFarm] = useState(FACILITY_HARVEST_PROFILES['farm-1'].farmName);
  const [selectedPond, setSelectedPond] = useState(FACILITY_HARVEST_PROFILES['farm-1'].defaultPond);
  const [showFarmDropdown, setShowFarmDropdown] = useState(false);
  const [showPondDropdown, setShowPondDropdown] = useState(false);

  const activeFarmProfile: FarmHarvestProfile = useMemo(() => {
    return FACILITY_HARVEST_PROFILES[activeFarmId] || FACILITY_HARVEST_PROFILES['farm-1'];
  }, [activeFarmId]);

  // Table filter tabs
  const [filterTab, setFilterTab] = useState<'All' | 'Planned' | 'Completed' | 'Cancelled'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [harvestRecords, setHarvestRecords] = useState<HarvestItem[]>(DEFAULT_HARVEST_RECORDS);

  // Selected item for stepper display & details
  const [activeHarvestForStepper, setActiveHarvestForStepper] = useState<HarvestItem>(DEFAULT_HARVEST_RECORDS[0]);

  const handleSelectFarm = (farmId: string) => {
    setActiveFarmId(farmId);
    const profile = FACILITY_HARVEST_PROFILES[farmId] || FACILITY_HARVEST_PROFILES['farm-1'];
    setSelectedFarm(profile.farmName);
    setSelectedPond(profile.defaultPond);
    setHarvestRecords(profile.records as HarvestItem[]);
    if (profile.records.length > 0) {
      setActiveHarvestForStepper(profile.records[0] as HarvestItem);
    }
    setShowFarmDropdown(false);
  };

  // Modals
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showTraceabilityModal, setShowTraceabilityModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetailHarvest, setSelectedDetailHarvest] = useState<HarvestItem | null>(null);
  const [showAddFateModal, setShowAddFateModal] = useState(false);
  const [showLearnMoreModal, setShowLearnMoreModal] = useState(false);

  // Form states for Plan Harvest
  const [planPond, setPlanPond] = useState('Pond Narmada');
  const [planDate, setPlanDate] = useState('2026-09-18');
  const [planMethod, setPlanMethod] = useState('Centrifuge');
  const [planBiomassKg, setPlanBiomassKg] = useState(850);
  const [planOperator, setPlanOperator] = useState('Dharmesh V.');
  const [planNotes, setPlanNotes] = useState('');

  // Form states for Record Harvest
  const [recordPond, setRecordPond] = useState('Pond Narmada');
  const [recordDate, setRecordDate] = useState('2026-09-12');
  const [recordMethod, setRecordMethod] = useState('Centrifuge');
  const [recordActualKg, setRecordActualKg] = useState(1020);
  const [recordOperator, setRecordOperator] = useState('Dharmesh V.');
  const [recordMoisturePct, setRecordMoisturePct] = useState(78.5);
  const [recordNotes, setRecordNotes] = useState('');

  // Form states for Fate
  const [fateHarvestId, setFateHarvestId] = useState('HV-2026-013');
  const [fateCategory, setFateCategory] = useState<'BIOCHAR' | 'BIOPLASTICS' | 'BIOFUEL' | 'ANIMAL_FEED'>('BIOPLASTICS');
  const [fateQuantityKg, setFateQuantityKg] = useState(500);
  const [fateDestination, setFateDestination] = useState('BioPolymers Mfg.');

  // Load farms & ponds from backend if available
  useEffect(() => {
    fetchFarms().then(res => {
      if (res && res.length > 0) setFarms(res);
    }).catch(() => {});

    fetchPonds().then(res => {
      if (res && res.length > 0) setPonds(res);
    }).catch(() => {});
  }, []);

  // Filtered harvest records
  const filteredRecords = useMemo(() => {
    return harvestRecords.filter(item => {
      if (filterTab !== 'All' && item.status.toLowerCase() !== filterTab.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.id.toLowerCase().includes(q) ||
          item.pond.toLowerCase().includes(q) ||
          item.method.toLowerCase().includes(q) ||
          item.operator.toLowerCase().includes(q) ||
          item.batchCode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [harvestRecords, filterTab, searchQuery]);

  // Handle Plan Harvest Submit
  const handlePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `HV-2026-0${14 + harvestRecords.length - 5}`;
    const newRecord: HarvestItem = {
      id: newId,
      date: new Date(planDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      rawDate: new Date(planDate).toISOString(),
      pond: planPond,
      pondId: planPond.toLowerCase().replace(' ', '-'),
      biomassKg: planBiomassKg,
      method: planMethod,
      status: 'Planned',
      carbonLink: 'Pending',
      operator: planOperator,
      batchCode: `ALGX-26-${planDate.slice(5).replace('-', '')}-${planPond.slice(-1)}`,
      notes: planNotes || 'Scheduled extraction cycle.'
    };
    setHarvestRecords([newRecord, ...harvestRecords]);
    setShowPlanModal(false);
  };

  // Handle Record Harvest Submit
  const handleRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `HV-2026-0${14 + harvestRecords.length - 5}`;
    const newRecord: HarvestItem = {
      id: newId,
      date: new Date(recordDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      rawDate: new Date(recordDate).toISOString(),
      pond: recordPond,
      pondId: recordPond.toLowerCase().replace(' ', '-'),
      biomassKg: recordActualKg,
      method: recordMethod,
      status: 'Completed',
      carbonLink: 'Verified',
      operator: recordOperator,
      batchCode: `ALGX-26-${recordDate.slice(5).replace('-', '')}-${recordPond.slice(-1)}`,
      notes: recordNotes || `Measured yield with moisture content ${recordMoisturePct}%.`
    };
    setHarvestRecords([newRecord, ...harvestRecords]);
    setActiveHarvestForStepper(newRecord);
    setShowRecordModal(false);
  };

  // Open details
  const handleViewDetails = (item: HarvestItem) => {
    setSelectedDetailHarvest(item);
    setActiveHarvestForStepper(item);
    setShowDetailModal(true);
  };

  return (
    <div className="w-full space-y-6 pb-16 p-4 sm:p-6 text-slate-800">
      
      {/* 1. Page Header & Top-Right Dropdowns */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Harvest & Traceability
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            Turn biomass into verified climate impact.
          </p>
        </div>

        {/* Top-Right Dropdown Selectors matching Reference */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          
          {/* Farm Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowFarmDropdown(!showFarmDropdown);
                setShowPondDropdown(false);
              }}
              className="flex items-center gap-2 bg-white border border-slate-200/90 hover:border-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 shadow-2xs transition-all cursor-pointer"
            >
              <span>{selectedFarm}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showFarmDropdown && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                {DEMO_FARMS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => handleSelectFarm(f.id)}
                    className={`w-full text-left px-3.5 py-2 font-bold transition-colors flex items-center justify-between ${
                      activeFarmId === f.id ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{f.name}</span>
                    {activeFarmId === f.id && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pond Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowPondDropdown(!showPondDropdown);
                setShowFarmDropdown(false);
              }}
              className="flex items-center gap-2 bg-white border border-slate-200/90 hover:border-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 shadow-2xs transition-all cursor-pointer"
            >
              <span>{selectedPond}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showPondDropdown && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                {activeFarmProfile.ponds.map(p => (
                  <button
                    key={p}
                    onClick={() => {
                      setSelectedPond(p);
                      setShowPondDropdown(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 font-bold transition-colors flex items-center justify-between ${
                      selectedPond === p ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{p}</span>
                    {selectedPond === p && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 2. Top Section: 3 Cards Grid (Pond Photo Card, Biomass Snapshot, New Harvest CTA) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Card 1: Pond Photo Aerial Visual Card */}
        <div className="relative rounded-2xl overflow-hidden shadow-xs border border-slate-200/90 min-h-[260px] flex flex-col justify-between p-5 group bg-slate-900">
          {/* Background Aerial Photo of Selected Farm */}
          <div className="absolute inset-0 z-0">
            <Image 
              src={activeFarmProfile.imageUrl} 
              alt={activeFarmProfile.farmName} 
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover object-center group-hover:scale-105 transition-transform duration-700 brightness-[0.82]"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
          </div>

          {/* Top Status Badge */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Operational</span>
            </div>
            <span className="text-[10px] font-mono text-slate-300 bg-slate-950/60 backdrop-blur-md px-2 py-0.5 rounded border border-white/10">
              {activeFarmProfile.location.split(',')[0]}
            </span>
          </div>

          {/* Bottom Pond Information & View on Map CTA */}
          <div className="relative z-10 flex items-end justify-between gap-3 pt-8">
            <div className="space-y-1.5 text-white">
              <h3 className="text-xl sm:text-2xl font-black tracking-tight drop-shadow-sm">
                {selectedPond}
              </h3>
              
              <div className="space-y-1 text-[11px] font-medium text-slate-200 drop-shadow-sm">
                <div className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Open Raceway • {activeFarmProfile.farmName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">⊞</span>
                  <span>Footprint <strong className="text-white font-mono">{activeFarmProfile.areaHa} ha</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Location <span className="font-mono text-slate-100">{activeFarmProfile.coordinates.lat.toFixed(3)}° N, {activeFarmProfile.coordinates.lng.toFixed(3)}° E</span></span>
                </div>
              </div>
            </div>

            {/* View on Map Button */}
            <button
              onClick={() => setShowMapModal(true)}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 active:scale-95 backdrop-blur-md border border-white/25 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-white" />
              <span>View on Map</span>
            </button>
          </div>
        </div>

        {/* Card 2: Biomass Snapshot Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-black text-slate-900 tracking-tight">
              Biomass Snapshot
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">
              Updated 10:24 AM
            </span>
          </div>

          {/* Metric Rows */}
          <div className="space-y-3.5">
            
            {/* Metric 1: Harvestable Biomass */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700">Harvestable Biomass</span>
                  <span className="font-mono font-bold text-slate-900">{activeFarmProfile.harvestablePct}%</span>
                </div>
                {/* Progress bar matching reference */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${activeFarmProfile.harvestablePct}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">{activeFarmProfile.harvestablePct}% of estimated batch yield</span>
              </div>
            </div>

            {/* Metric 2: Current Biomass Density */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shrink-0">
                <Leaf className="w-4 h-4" />
              </div>
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block">Current Biomass (Density)</span>
                  <span className="text-lg font-black text-slate-900 font-mono tracking-tight">{activeFarmProfile.biomassDensity.toFixed(2)} g/L</span>
                </div>

                {/* Mini SVG Sparkline & Trend Badge */}
                <div className="flex flex-col items-end gap-0.5">
                  <svg className="w-16 h-5" viewBox="0 0 60 20" fill="none">
                    <path
                      d="M2 16 L 15 14 L 28 15 L 42 8 L 58 4"
                      stroke="#10b981"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                    ↑ {activeFarmProfile.densityTrend} <span className="font-normal text-slate-400">vs last week</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Metric 3: Last Harvest */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50/80 border border-blue-200/60 flex items-center justify-center text-blue-600 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block">Last Harvest</span>
                <span className="text-xs font-black text-slate-900 font-mono">{activeFarmProfile.lastHarvestDate}</span>
              </div>
            </div>

            {/* Metric 4: Traceability Status */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block">Traceability Status</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-black text-slate-900">Active</span>
                  </div>
                </div>
                <span className="text-[10px] font-medium text-slate-400">All harvests linked to LCA</span>
              </div>
            </div>

          </div>

        </div>

        {/* Card 3: New Harvest CTA Action Card */}
        <div className="rounded-2xl p-5 shadow-xs border border-emerald-900/40 relative overflow-hidden flex flex-col justify-between bg-gradient-to-br from-slate-950 via-[#0a2318] to-slate-950 text-white">
          
          {/* Subtle algae background glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-1">
            <h3 className="text-lg font-black tracking-tight text-white">
              New Harvest
            </h3>
            <p className="text-xs font-medium text-slate-300">
              Create a planned harvest or record a completed one.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="relative z-10 space-y-2.5 pt-4">
            
            {/* Action 1: Plan Harvest (White Elevated Button) */}
            <button
              onClick={() => setShowPlanModal(true)}
              className="w-full bg-white hover:bg-slate-100 text-slate-950 rounded-xl p-3 shadow-md flex items-center gap-3 transition-all active:scale-[0.98] text-left group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-900 block">Plan Harvest</span>
                <span className="text-[10px] font-medium text-slate-500">Schedule and allocate biomass</span>
              </div>
            </button>

            {/* Action 2: Record Harvest (Dark Frosted Button) */}
            <button
              onClick={() => setShowRecordModal(true)}
              className="w-full bg-white/10 hover:bg-white/15 border border-white/15 text-white rounded-xl p-3 shadow-sm flex items-center gap-3 transition-all active:scale-[0.98] text-left group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-white block">Record Harvest</span>
                <span className="text-[10px] font-medium text-slate-300">Add actual harvest data</span>
              </div>
            </button>

          </div>

        </div>

      </div>

      {/* 3. Bottom Section: Harvest Records Table (Left 65%) & From Harvest to Impact (Right 35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Harvest Records Table (8 cols on desktop) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          
          {/* Header & Controls matching reference */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Harvest Records
              </h2>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Filter Pills: All | Planned | Completed | Cancelled */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(['All', 'Planned', 'Completed', 'Cancelled'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setFilterTab(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterTab === tab
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search harvests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-36 sm:w-44 transition-all"
                />
              </div>

              {/* Calendar Icon Button */}
              <button 
                onClick={() => setFilterTab('All')}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
                title="Filter by Date"
              >
                <Calendar className="w-4 h-4" />
              </button>

            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold text-[11px]">
                  <th className="pb-3 pl-1">Harvest ID</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Pond</th>
                  <th className="pb-3">Biomass (kg)</th>
                  <th className="pb-3">Method</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Carbon Link</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400 font-medium">
                      No harvest records found matching filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((item) => {
                    const isSelected = activeHarvestForStepper.id === item.id;
                    return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${
                          isSelected ? 'bg-slate-50/60' : ''
                        }`}
                        onClick={() => setActiveHarvestForStepper(item)}
                      >
                        
                        {/* Harvest ID */}
                        <td className="py-3.5 pl-1 font-black text-slate-900 font-mono">
                          {item.id}
                        </td>

                        {/* Date */}
                        <td className="py-3.5 text-slate-600 font-medium whitespace-nowrap">
                          {item.date}
                        </td>

                        {/* Pond */}
                        <td className="py-3.5 font-bold text-slate-800">
                          {item.pond}
                        </td>

                        {/* Biomass (kg) */}
                        <td className="py-3.5 font-mono font-black text-slate-900">
                          {item.biomassKg.toLocaleString()}
                        </td>

                        {/* Method */}
                        <td className="py-3.5 text-slate-600">
                          {item.method}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold">
                            <span className={`w-2 h-2 rounded-full ${
                              item.status === 'Completed' ? 'bg-emerald-600' :
                              item.status === 'Pending' || item.status === 'Planned' ? 'bg-amber-500' :
                              'bg-rose-500'
                            }`} />
                            <span className={
                              item.status === 'Completed' ? 'text-slate-900' :
                              item.status === 'Pending' || item.status === 'Planned' ? 'text-amber-800' :
                              'text-rose-700'
                            }>
                              {item.status}
                            </span>
                          </span>
                        </td>

                        {/* Carbon Link Badge */}
                        <td className="py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold">
                            <span className={`w-2 h-2 rounded-full ${
                              item.carbonLink === 'Verified' ? 'bg-emerald-600' :
                              item.carbonLink === 'Pending' ? 'bg-amber-500' :
                              'bg-slate-500'
                            }`} />
                            <span className={
                              item.carbonLink === 'Verified' ? 'text-slate-900' :
                              item.carbonLink === 'Pending' ? 'text-amber-800' :
                              'text-slate-600'
                            }>
                              {item.carbonLink}
                            </span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 text-right pr-2 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(item);
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer"
                            >
                              View
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(item);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer matching reference: 1–5 of 5 < 1 > */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium">
            <span>1–{filteredRecords.length} of {harvestRecords.length}</span>
            <div className="flex items-center gap-1">
              <button className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 disabled:opacity-50">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white font-bold text-xs">
                1
              </button>
              <button className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 disabled:opacity-50">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: From Harvest to Impact (4 cols on desktop) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          
          {/* Header */}
          <div className="pb-2 border-b border-slate-100">
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              From Harvest to Impact
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Track biomass through the full value chain.
            </p>
          </div>

          {/* Vertical Traceability Stepper with connected lines matching reference */}
          <div className="relative py-2 space-y-5">
            
            {/* Step 1: Harvest */}
            <div className="relative flex items-start gap-3.5 group">
              {/* Connecting Line Downward */}
              <div className="absolute left-4 top-8 w-0.5 h-10 bg-emerald-500" />
              
              {/* Step Icon */}
              <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shrink-0 z-10 shadow-2xs">
                <Leaf className="w-4 h-4" />
              </div>

              {/* Step Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900">Harvest</h4>
                  <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-700 mt-0.5">
                  {activeHarvestForStepper.id} • {activeHarvestForStepper.biomassKg.toLocaleString()} kg
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {activeHarvestForStepper.date}
                </p>
              </div>
            </div>

            {/* Step 2: Processing */}
            <div className="relative flex items-start gap-3.5 group">
              {/* Connecting Line Downward */}
              <div className="absolute left-4 top-8 w-0.5 h-10 bg-emerald-500" />

              {/* Step Icon */}
              <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shrink-0 z-10 shadow-2xs">
                <Settings className="w-4 h-4" />
              </div>

              {/* Step Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900">Processing</h4>
                  <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-700 mt-0.5">
                  {activeHarvestForStepper.method}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {activeHarvestForStepper.date}
                </p>
              </div>
            </div>

            {/* Step 3: End Use */}
            <div className="relative flex items-start gap-3.5 group">
              {/* Connecting Line Downward */}
              <div className="absolute left-4 top-8 w-0.5 h-10 bg-slate-200" />

              {/* Step Icon */}
              <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shrink-0 z-10 shadow-2xs">
                <Database className="w-4 h-4" />
              </div>

              {/* Step Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900">End Use</h4>
                  {activeHarvestForStepper.fates && activeHarvestForStepper.fates.length > 0 ? (
                    <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-amber-500 text-amber-500 flex items-center justify-center text-[10px] font-bold">
                      <Clock className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
                <p className="text-xs font-bold text-slate-700 mt-0.5">
                  {activeHarvestForStepper.fates && activeHarvestForStepper.fates.length > 0 
                    ? `${activeHarvestForStepper.fates[0].category} (${activeHarvestForStepper.fates[0].pct}%)`
                    : 'Pending assignment'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {activeHarvestForStepper.fates && activeHarvestForStepper.fates.length > 0 
                    ? activeHarvestForStepper.fates[0].destination
                    : 'Awaiting end-use data'}
                </p>
              </div>
            </div>

            {/* Step 4: Carbon Accounting */}
            <div className="relative flex items-start gap-3.5 group">
              {/* Step Icon */}
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 z-10 shadow-2xs">
                <Activity className="w-4 h-4" />
              </div>

              {/* Step Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900">Carbon Accounting</h4>
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                </div>
                <div className="mt-1">
                  <span className="inline-block bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-black">
                    Pending
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Will be included in next LCA run
                </p>
              </div>
            </div>

          </div>

          {/* Bottom Button: View Full Traceability */}
          <button
            onClick={() => setShowTraceabilityModal(true)}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 text-slate-700" />
            <span>View Full Traceability</span>
          </button>

        </div>

      </div>

      {/* 4. Bottom Banner: Data-backed climate action */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/70 flex items-center justify-center text-blue-600 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-slate-900">
              Data-backed climate action
            </h4>
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 mt-0.5">
              Each harvest record links to evidence, processing data, end-use allocation and LCA calculations.
            </p>
          </div>
        </div>

        <button 
          onClick={() => setShowLearnMoreModal(true)}
          className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors self-start sm:self-auto shrink-0 cursor-pointer"
        >
          <span>Learn more</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: PLAN HARVEST MODAL                              */}
      {/* ======================================================== */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Plan New Harvest</h3>
                  <p className="text-xs text-slate-500">Schedule raceway biomass extraction</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPlanModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePlanSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Raceway / Pond</label>
                  <select 
                    value={planPond} 
                    onChange={(e) => setPlanPond(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {activeFarmProfile.ponds.map((pName: string) => (
                      <option key={pName} value={pName}>{pName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Scheduled Date</label>
                  <input 
                    type="date"
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500/20"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Harvest Extraction Method</label>
                  <select 
                    value={planMethod} 
                    onChange={(e) => setPlanMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="Centrifuge">Centrifuge (High Speed Continuous)</option>
                    <option value="Filtration">Filtration (Screen Membrane)</option>
                    <option value="Dewatering">Dewatering (Screw Press)</option>
                    <option value="Flocculation">Auto-Flocculation & Skim</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Planned Target Biomass (kg)</label>
                  <input 
                    type="number"
                    value={planBiomassKg}
                    onChange={(e) => setPlanBiomassKg(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-emerald-500/20"
                    min={100}
                    step={10}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Assigned Lead Operator</label>
                <input 
                  type="text"
                  value={planOperator}
                  onChange={(e) => setPlanOperator(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Operational Directives & Notes</label>
                <textarea 
                  value={planNotes}
                  onChange={(e) => setPlanNotes(e.target.value)}
                  placeholder="e.g., Pre-flush raceway intake, calibrate gravimetric scale..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Save Harvest Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: RECORD HARVEST MODAL                            */}
      {/* ======================================================== */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Record Completed Harvest</h3>
                  <p className="text-xs text-slate-500">Log verified actual biomass yield</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRecordModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pond / Source</label>
                  <select 
                    value={recordPond} 
                    onChange={(e) => setRecordPond(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {activeFarmProfile.ponds.map((pName: string) => (
                      <option key={pName} value={pName}>{pName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Execution Date</label>
                  <input 
                    type="date"
                    value={recordDate}
                    onChange={(e) => setRecordDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500/20"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Method</label>
                  <select 
                    value={recordMethod} 
                    onChange={(e) => setRecordMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="Centrifuge">Centrifuge</option>
                    <option value="Filtration">Filtration</option>
                    <option value="Dewatering">Dewatering</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Actual Yield (kg)</label>
                  <input 
                    type="number"
                    value={recordActualKg}
                    onChange={(e) => setRecordActualKg(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-emerald-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Moisture (%)</label>
                  <input 
                    type="number"
                    value={recordMoisturePct}
                    onChange={(e) => setRecordMoisturePct(Number(e.target.value))}
                    step={0.1}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Verified Operator</label>
                <input 
                  type="text"
                  value={recordOperator}
                  onChange={(e) => setRecordOperator(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes & Gravimetric Scale Check</label>
                <textarea 
                  value={recordNotes}
                  onChange={(e) => setRecordNotes(e.target.value)}
                  placeholder="Scale calibration checked. Zero offset confirmed before tare..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Record & Link to LCA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: VIEW ON MAP INTERACTIVE MODAL                   */}
      {/* ======================================================== */}
      {showMapModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-base font-black text-slate-900">{selectedPond} — {activeFarmProfile.farmName}</h3>
                  <p className="text-xs text-slate-500 font-mono">{activeFarmProfile.coordinates.lat.toFixed(3)}° N, {activeFarmProfile.coordinates.lng.toFixed(3)}° E • Footprint: {activeFarmProfile.areaHa} ha</p>
                </div>
              </div>
              <button onClick={() => setShowMapModal(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Satellite Map Visual with overlays */}
            <div className="relative rounded-2xl overflow-hidden h-72 border border-slate-200 bg-slate-950">
              <Image 
                src={activeFarmProfile.imageUrl} 
                alt={activeFarmProfile.farmName} 
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover brightness-90"
              />
              <div className="absolute inset-0 bg-slate-950/20" />

              {/* Raceway Marker 1 */}
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500/90 text-slate-950 font-bold px-3 py-1.5 rounded-full border-2 border-white text-xs shadow-lg flex items-center gap-1.5 animate-bounce">
                <span className="w-2 h-2 rounded-full bg-white"></span>
                <span>{selectedPond} (Active Cultivation Unit)</span>
              </div>

              {/* Coordinates Badge */}
              <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-[11px] font-mono border border-white/10">
                Lat: {activeFarmProfile.coordinates.lat.toFixed(4)} • Lon: {activeFarmProfile.coordinates.lng.toFixed(4)} • {activeFarmProfile.location}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 text-xs">
              <span className="text-slate-500">Facility Capacity: {activeFarmProfile.annualCapacity} • MRV Verified</span>
              <button 
                onClick={() => setShowMapModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 cursor-pointer"
              >
                Close Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: FULL TRACEABILITY & CARBON MRV AUDIT LEDGER     */}
      {/* ======================================================== */}
      {showTraceabilityModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Cryptographic Traceability Ledger</h3>
                  <p className="text-xs text-slate-500 font-mono">Record: {activeHarvestForStepper.id} • Batch: {activeHarvestForStepper.batchCode}</p>
                </div>
              </div>
              <button onClick={() => setShowTraceabilityModal(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cryptographic Ledger Breakdown */}
            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 font-mono">
                <div className="flex justify-between text-slate-500">
                  <span>Audit Merkle Root Hash:</span>
                  <span className="font-bold text-slate-800">0x7f8a9b2c...4d3e2f10</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Optical Sensor Signature:</span>
                  <span className="font-bold text-slate-800">VERIFIED (52.88 g/L at harvest)</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Carbon Removal Allocation:</span>
                  <span className="font-bold text-emerald-700">1.19 t CO₂e (ISO 14064-2 Compliant)</span>
                </div>
              </div>

              {/* 4 Value Chain Milestones */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-900">1. Atmospheric CO₂ Fixation via Photosynthesis</span>
                  </div>
                  <span className="font-mono text-emerald-700 font-bold">+2.14 t CO₂e</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-900">2. Dewatering & Off-Gas Centrifuge Deductions</span>
                  </div>
                  <span className="font-mono text-slate-600 font-bold">−0.86 t CO₂e</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-900">3. Durable Bioplastic Fate Locking</span>
                  </div>
                  <span className="font-mono text-emerald-700 font-bold">1.28 t CO₂e</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-900">4. Parasitic Operational Energy Deduction</span>
                  </div>
                  <span className="font-mono text-slate-600 font-bold">−0.10 t CO₂e</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <Link 
                href="/carbon"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                Open Carbon Waterfall Dashboard →
              </Link>
              <button 
                onClick={() => setShowTraceabilityModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: HARVEST RECORD DETAIL MODAL                     */}
      {/* ======================================================== */}
      {showDetailModal && selectedDetailHarvest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {selectedDetailHarvest.id} — Harvest Details
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Batch Code: {selectedDetailHarvest.batchCode}
                </p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block font-medium">Execution Date:</span>
                  <span className="font-bold text-slate-900">{selectedDetailHarvest.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Pond Location:</span>
                  <span className="font-bold text-slate-900">{selectedDetailHarvest.pond}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Extraction Method:</span>
                  <span className="font-bold text-slate-900">{selectedDetailHarvest.method}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Measured Yield:</span>
                  <span className="font-mono font-black text-slate-900">{selectedDetailHarvest.biomassKg} kg</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Execution Status:</span>
                  <span className="font-bold text-emerald-700">{selectedDetailHarvest.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Carbon Accounting Link:</span>
                  <span className="font-bold text-emerald-700">{selectedDetailHarvest.carbonLink}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-bold block mb-1">Operational Audit Notes:</span>
                <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium">
                  {selectedDetailHarvest.notes || 'No operational deviations recorded.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6: LEARN MORE MODAL                                */}
      {/* ======================================================== */}
      {showLearnMoreModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900">MRV Biomass Traceability Protocol</h3>
              </div>
              <button onClick={() => setShowLearnMoreModal(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              AlgaX MRV enforces strict chain-of-custody tracking from pond optical sensor telemetry, through mechanical centrifugation, to downstream durable carbon fate. Each kilogram of harvested biomass is cryptographically hashed and linked with physical weigh-scale receipts.
            </p>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowLearnMoreModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
