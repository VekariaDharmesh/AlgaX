'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  PlusCircle, 
  Shield, 
  FileText, 
  Check, 
  X, 
  ArrowRight, 
  Activity, 
  Filter, 
  Search, 
  Info,
  ChevronDown,
  Thermometer,
  Droplets,
  Wind,
  Sun,
  Eye,
  Crosshair,
  Maximize2,
  Plus,
  Minus,
  Play,
  RotateCcw,
  ExternalLink,
  MoreHorizontal,
  Layers,
  Database,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle,
  Sparkles,
  Award
} from 'lucide-react';
import { 
  fetchFarms, 
  fetchPonds, 
  fetchCalibrationOverview, 
  fetchSensorsCalibrationStatus,
  fetchCalibrations, 
  calculateCalibration, 
  createCalibration, 
  activateCalibration, 
  approveCalibration,
  Farm, 
  Pond, 
  CalibrationOverviewKPIs, 
  SensorCalibrationStatus, 
  SensorCalibrationRecord,
  CalibrationCalculationResponse
} from '@/lib/api';
import { DEMO_FARMS } from '@/lib/demo/ponds';
import { FACILITY_CALIBRATION_PROFILES, FarmCalibrationProfile } from '@/lib/demo/facilityData';

export interface SensorNode {
  id: string;
  code: string;
  name: string;
  type: 'temperature' | 'ph' | 'dissolved_oxygen' | 'turbidity' | 'light';
  unit: string;
  pond: string;
  currentValue: number;
  formattedValue: string;
  range: string;
  status: 'Active' | 'Pending' | 'Overdue' | 'Alert';
  isOnline: boolean;
  lastCalibrated: string;
  nextDue: string;
  dueInDays: number;
  offset: number;
  gain: number;
  referenceStandard: string;
  mapX: number; // percentage coordinate on map
  mapY: number;
}

const getSensorIcon = (type: string) => {
  switch (type) {
    case 'temperature': return Thermometer;
    case 'ph': return Droplets;
    case 'dissolved_oxygen': return Wind;
    case 'turbidity': return Eye;
    case 'light': return Sun;
    default: return Activity;
  }
};

export default function CalibrationPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [activeFarmId, setActiveFarmId] = useState<string>('farm-1');
  const [selectedFarm, setSelectedFarm] = useState(FACILITY_CALIBRATION_PROFILES['farm-1'].farmName);
  const [selectedPond, setSelectedPond] = useState(FACILITY_CALIBRATION_PROFILES['farm-1'].defaultPond);
  const [showFarmDropdown, setShowFarmDropdown] = useState(false);
  const [showPondDropdown, setShowPondDropdown] = useState(false);

  const activeFarmProfile: FarmCalibrationProfile = useMemo(() => {
    return FACILITY_CALIBRATION_PROFILES[activeFarmId] || FACILITY_CALIBRATION_PROFILES['farm-1'];
  }, [activeFarmId]);

  // Selected sensor node in map & inspector
  const [selectedSensorId, setSelectedSensorId] = useState<string>(FACILITY_CALIBRATION_PROFILES['farm-1'].sensors[0].id);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'Overview' | 'Calibration' | 'Verification' | 'History'>('Overview');

  const handleSelectFarm = (farmId: string) => {
    setActiveFarmId(farmId);
    const profile = FACILITY_CALIBRATION_PROFILES[farmId] || FACILITY_CALIBRATION_PROFILES['farm-1'];
    setSelectedFarm(profile.farmName);
    setSelectedPond(profile.defaultPond);
    if (profile.sensors.length > 0) {
      setSelectedSensorId(profile.sensors[0].id);
    }
    setShowFarmDropdown(false);
  };

  // Bottom Table Filter & Search
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Pending' | 'Overdue' | 'Alerts'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // Modals
  const [showCalibrateModal, setShowCalibrateModal] = useState(false);
  const [showOffsetModal, setShowOffsetModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPondDetailModal, setShowPondDetailModal] = useState(false);

  // Map Zoom Level
  const [mapZoom, setMapZoom] = useState(1);

  // Calibration Form State
  const [calibRawValue, setCalibRawValue] = useState<number>(24.68);
  const [calibExpectedValue, setCalibExpectedValue] = useState<number>(25.00);
  const [calibStandard, setCalibStandard] = useState('NIST Calibrated Buffer 25.0°C');
  const [calibTechnician, setCalibTechnician] = useState('Dharmesh V.');
  const [calibNotes, setCalibNotes] = useState('');
  const [submittingCalib, setSubmittingCalib] = useState(false);

  // Verification Simulation State
  const [verifying, setVerifying] = useState(false);
  const [verificationPassed, setVerificationPassed] = useState<boolean | null>(null);

  // Quick Offset/Gain form state
  const [manualOffset, setManualOffset] = useState(0.12);
  const [manualGain, setManualGain] = useState(0.998);

  const selectedSensor = useMemo(() => {
    return activeFarmProfile.sensors.find(s => s.id === selectedSensorId) || activeFarmProfile.sensors[0];
  }, [activeFarmProfile, selectedSensorId]);

  const SensorIcon = useMemo(() => {
    return getSensorIcon(selectedSensor.type);
  }, [selectedSensor.type]);

  // Filtered sensor nodes for table
  const filteredSensors = useMemo(() => {
    return activeFarmProfile.sensors.filter(s => {
      if (statusFilter === 'Active' && s.status !== 'Active') return false;
      if (statusFilter === 'Pending' && s.status !== 'Pending') return false;
      if (statusFilter === 'Overdue' && s.status !== 'Overdue') return false;
      if (statusFilter === 'Alerts' && s.status !== 'Alert') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.id.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.pond.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeFarmProfile, statusFilter, searchQuery]);

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedRowIds.length === filteredSensors.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(filteredSensors.map(s => s.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedRowIds.includes(id)) {
      setSelectedRowIds(selectedRowIds.filter(i => i !== id));
    } else {
      setSelectedRowIds([...selectedRowIds, id]);
    }
  };

  // Run Verification Simulation
  const handleRunVerification = () => {
    setVerifying(true);
    setVerificationPassed(null);
    setShowVerifyModal(true);
    setTimeout(() => {
      setVerifying(false);
      setVerificationPassed(true);
    }, 1200);
  };

  // Handle Calibrate Submit
  const handleCalibrateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCalib(true);
    setTimeout(() => {
      setSubmittingCalib(false);
      setShowCalibrateModal(false);
      alert(`Calibration successfully applied to ${selectedSensor.code} (${selectedSensor.name}). New offset: ${(calibExpectedValue - calibRawValue).toFixed(4)}.`);
    }, 600);
  };

  return (
    <div className="w-full space-y-6 pb-16 p-4 sm:p-6 text-slate-800">
      
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold tracking-wider uppercase text-slate-400 block mb-1">
            SENSOR MANAGEMENT
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Sensor Calibration & Verification
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            Maintain accurate sensor data for reliable carbon accounting.
          </p>
        </div>

        {/* Top-Right Dropdown Controls */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          
          {/* Farm Selector */}
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span>Farm</span>
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
          </div>

          {/* Pond Selector */}
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span>Pond</span>
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
      </div>

      {/* 2. Top Section: Interactive Pond Map (Left) & Sensor Inspector Action Center (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Interactive Pond Map with Sensor Nodes (6 cols) */}
        <div className="lg:col-span-6 bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-xs relative min-h-[340px] flex flex-col justify-between p-4 group select-none">
          {/* Background Aerial Pond Image of Selected Farm */}
          <div 
            className="absolute inset-0 transition-transform duration-500"
            style={{ transform: `scale(${mapZoom})` }}
          >
            <Image 
              src={activeFarmProfile.imageUrl} 
              alt={activeFarmProfile.farmName} 
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover brightness-[0.88] contrast-[1.05]"
              priority
            />
            <div className="absolute inset-0 bg-slate-950/20" />
          </div>

          {/* Floating Top-Left Pond Badge Card matching Reference */}
          <div className="relative z-10 self-start bg-slate-900/85 backdrop-blur-md border border-white/15 text-white p-3.5 rounded-2xl shadow-lg max-w-xs space-y-1">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-black tracking-tight flex items-center gap-1.5">
                {selectedPond}
                <Maximize2 className="w-3 h-3 text-slate-400" />
              </h3>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">{activeFarmProfile.sensors.length} sensors online • {activeFarmProfile.location.split(',')[0]}</p>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 pt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Calibrated & Active</span>
            </div>
            <button
              onClick={() => setShowPondDetailModal(true)}
              className="text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1 pt-1 transition-colors cursor-pointer"
            >
              <span>View details</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Floating Top-Right Map Controls */}
          <div className="relative z-10 self-end flex flex-col items-center gap-1 bg-slate-900/80 backdrop-blur-md border border-white/15 p-1 rounded-xl shadow-md text-white">
            <button 
              onClick={() => setMapZoom(1)} 
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer" 
              title="Reset View"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setMapZoom(Math.min(mapZoom + 0.2, 1.8))} 
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer" 
              title="Zoom In"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setMapZoom(Math.max(mapZoom - 0.2, 0.8))} 
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer" 
              title="Zoom Out"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Interactive Sensor Nodes positioned on the pond */}
          {activeFarmProfile.sensors.map((node) => {
            const isSelected = selectedSensorId === node.id;
            return (
              <button
                key={node.id}
                onClick={() => setSelectedSensorId(node.id)}
                style={{ left: `${node.mapX}%`, top: `${node.mapY}%` }}
                className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold transition-all shadow-md cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white border-2 border-emerald-400 ring-4 ring-emerald-400/30 scale-110'
                    : 'bg-slate-900/85 hover:bg-slate-900 text-white/90 border border-white/20 hover:scale-105'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500'}`} />
                <span>{node.code}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Selected Sensor Inspector & Calibration Action Center (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          
          {/* Header of Inspector */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shrink-0">
                <SensorIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 tracking-tight font-mono">
                    {selectedSensor.code}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Online
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  {selectedSensor.name} | {selectedSensor.pond}
                </p>
              </div>
            </div>

            <button 
              onClick={() => setShowHistoryModal(true)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs matching Reference: Overview | Calibration | Verification | History */}
          <div className="flex items-center gap-6 border-b border-slate-100 text-xs font-bold">
            {(['Overview', 'Calibration', 'Verification', 'History'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveInspectorTab(tab)}
                className={`pb-2.5 transition-all relative cursor-pointer ${
                  activeInspectorTab === tab
                    ? 'text-slate-900 font-black'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span>{tab}</span>
                {activeInspectorTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Main Inspector Body */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 py-1">
            
            {/* Left & Center: Metric Stats (7 cols) */}
            <div className="sm:col-span-7 space-y-4">
              
              {/* Current Value Display */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <SensorIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block">Current Value</span>
                  <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                    {selectedSensor.formattedValue}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium block mt-1">
                    Parameter Range: <strong className="text-slate-600 font-mono">{selectedSensor.range}</strong>
                  </span>
                </div>
              </div>

              {/* Status and Calibration Schedule */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] font-medium block">Last Calibrated</span>
                  <span className="font-mono font-bold text-slate-900 mt-0.5 block">{selectedSensor.lastCalibrated}</span>
                  
                  <span className="text-slate-400 text-[11px] font-medium block mt-3">Status</span>
                  <div className="flex items-center gap-1.5 mt-0.5 font-bold text-slate-900 text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Active</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] font-medium block">Next Due</span>
                  <span className="font-mono font-bold text-slate-900 mt-0.5 block">{selectedSensor.nextDue}</span>
                  <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    In {selectedSensor.dueInDays} days
                  </span>

                  <span className="text-slate-400 text-[11px] font-medium block mt-2">Sensor ID</span>
                  <span className="font-mono font-bold text-slate-700 text-[11px] mt-0.5 block">{selectedSensor.id}</span>
                </div>
              </div>

            </div>

            {/* Right: 4 Action Buttons Stack (5 cols) matching Reference */}
            <div className="sm:col-span-5 flex flex-col justify-center gap-2">
              
              {/* Button 1: Calibrate Now (Dark filled primary) */}
              <button
                onClick={() => setShowCalibrateModal(true)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Calibrate Now</span>
              </button>

              {/* Button 2: Apply Offset / Gain */}
              <button
                onClick={() => setShowOffsetModal(true)}
                className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs py-2.5 px-3 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-slate-600" />
                <span>Apply Offset / Gain</span>
              </button>

              {/* Button 3: Run Verification */}
              <button
                onClick={handleRunVerification}
                className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs py-2.5 px-3 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                <span>Run Verification</span>
              </button>

              {/* Button 4: View Full History */}
              <button
                onClick={() => setShowHistoryModal(true)}
                className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs py-2.5 px-3 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-slate-600" />
                <span>View Full History</span>
              </button>

            </div>

          </div>

        </div>

      </div>

      {/* 3. Bottom Section: All Sensors Table (Left 65%) & Calibration Workflow (Right 35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: All Sensors Table (8 cols on desktop) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            {/* Filter Pills with Badge Counts */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(['All', 'Active', 'Pending', 'Overdue', 'Alerts'] as const).map(tab => {
                const isSelected = statusFilter === tab;
                const count = tab === 'All' 
                  ? activeFarmProfile.sensors.length 
                  : activeFarmProfile.sensors.filter(s => s.status === tab).length;
                return (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                    }`}
                  >
                    <span>{tab === 'All' ? 'All Sensors' : tab}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input & Filter Button */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search sensors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-40 sm:w-48 transition-all"
                />
              </div>

              <button className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold text-[11px]">
                  <th className="pb-3 pl-1 w-6">
                    <input 
                      type="checkbox" 
                      checked={selectedRowIds.length === filteredSensors.length && filteredSensors.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="pb-3">Sensor ID</th>
                  <th className="pb-3">Parameter</th>
                  <th className="pb-3">Pond</th>
                  <th className="pb-3">Current Value</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Last Calibrated</th>
                  <th className="pb-3">Next Due</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredSensors.map((sensor) => {
                  const isChecked = selectedRowIds.includes(sensor.id);
                  const isSelected = selectedSensorId === sensor.id;
                  return (
                    <tr 
                      key={sensor.id}
                      onClick={() => setSelectedSensorId(sensor.id)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                        isSelected ? 'bg-slate-50/70' : ''
                      }`}
                    >
                      <td className="py-3 pl-1" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => toggleSelectRow(sensor.id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 font-black text-slate-900 font-mono">
                        {sensor.id}
                      </td>

                      <td className="py-3 font-semibold text-slate-800">
                        {sensor.name.replace(' Sensor', '')}
                      </td>

                      <td className="py-3 text-slate-600">
                        {sensor.pond}
                      </td>

                      <td className="py-3 font-mono font-bold text-slate-900">
                        {sensor.formattedValue}
                      </td>

                      <td className="py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-900">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span>Active</span>
                        </span>
                      </td>

                      <td className="py-3 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                        {sensor.lastCalibrated}
                      </td>

                      <td className="py-3 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                        {sensor.nextDue}
                      </td>

                      <td className="py-3 text-right pr-2 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSensorId(sensor.id);
                              setShowCalibrateModal(true);
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold rounded-lg text-xs transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                          >
                            <Crosshair className="w-3 h-3 text-slate-600" />
                            <span>Calibrate</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSensorId(sensor.id);
                              setShowHistoryModal(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-400 font-medium">
            <span>Showing {filteredSensors.length} of 5 monitored sensors</span>
            <span className="font-mono">100% Calibrated Compliance</span>
          </div>

        </div>

        {/* Right: Calibration Workflow (4 cols on desktop) matching Reference */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          
          <div className="pb-2 border-b border-slate-100">
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              Calibration Workflow
            </h2>
          </div>

          {/* Stepper with 4 Connected Stages */}
          <div className="relative py-2 space-y-5">
            
            {/* Step 1: Select Sensor */}
            <div className="relative flex items-start gap-3.5 group">
              <div className="absolute left-3.5 top-8 w-0.5 h-10 bg-slate-200" />
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 z-10 shadow-2xs">
                1
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">Select Sensor</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                  Choose a sensor from the map or list
                </p>
              </div>
            </div>

            {/* Step 2: Apply Calibration */}
            <div className="relative flex items-start gap-3.5 group">
              <div className="absolute left-3.5 top-8 w-0.5 h-10 bg-slate-200" />
              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0 z-10 shadow-2xs">
                2
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-700">Apply Calibration</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                  Set offset/gain or run auto-calibration
                </p>
              </div>
            </div>

            {/* Step 3: Verify */}
            <div className="relative flex items-start gap-3.5 group">
              <div className="absolute left-3.5 top-8 w-0.5 h-10 bg-slate-200" />
              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0 z-10 shadow-2xs">
                3
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-700">Verify</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                  Check sensor output and stability
                </p>
              </div>
            </div>

            {/* Step 4: Save & Link */}
            <div className="relative flex items-start gap-3.5 group">
              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0 z-10 shadow-2xs">
                4
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-700">Save & Link</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                  Store record to evidence chain
                </p>
              </div>
            </div>

          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => setShowCalibrateModal(true)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Start Calibration for {selectedSensor.code}</span>
            </button>
          </div>

        </div>

      </div>

      {/* 4. Bottom Banner: Traceable by Design */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/70 flex items-center justify-center text-blue-600 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-slate-900">
              Traceable by Design
            </h4>
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 mt-0.5">
              All calibration records are immutably stored and linked to the evidence chain for audit and carbon accounting.
            </p>
          </div>
        </div>

        <Link 
          href="/evidence"
          className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl shadow-2xs transition-colors self-start sm:self-auto shrink-0"
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-600" />
          <span>View Evidence Chain</span>
        </Link>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: CALIBRATE NOW WIZARD MODAL                      */}
      {/* ======================================================== */}
      {showCalibrateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                  <Crosshair className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Calibrate Sensor: {selectedSensor.code}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedSensor.name} ({selectedSensor.id}) • {selectedSensor.pond}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowCalibrateModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCalibrateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Standard Reference Solution / Source</label>
                <input 
                  type="text"
                  value={calibStandard}
                  onChange={(e) => setCalibStandard(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Raw Sensor Reading ({selectedSensor.unit})</label>
                  <input 
                    type="number"
                    step="any"
                    value={calibRawValue}
                    onChange={(e) => setCalibRawValue(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-emerald-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Expected Standard Value ({selectedSensor.unit})</label>
                  <input 
                    type="number"
                    step="any"
                    value={calibExpectedValue}
                    onChange={(e) => setCalibExpectedValue(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-emerald-500/20"
                    required
                  />
                </div>
              </div>

              {/* Mathematical Equation Preview */}
              <div className="p-3 bg-slate-900 text-white rounded-2xl font-mono text-center space-y-1">
                <span className="text-[10px] text-slate-400 block font-sans uppercase font-bold">Solved Dynamic Equation</span>
                <span className="text-emerald-400 font-bold block text-sm">
                  y = (1.0000 · x) {calibExpectedValue >= calibRawValue ? '+' : '−'} {Math.abs(calibExpectedValue - calibRawValue).toFixed(4)}
                </span>
                <span className="text-[10px] text-slate-400 block font-sans">
                  Pre-cal residual error: {Math.abs(calibExpectedValue - calibRawValue).toFixed(4)} {selectedSensor.unit}
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Certified Technician / Operator</label>
                <input 
                  type="text"
                  value={calibTechnician}
                  onChange={(e) => setCalibTechnician(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Method Justification / Notes</label>
                <textarea 
                  value={calibNotes}
                  onChange={(e) => setCalibNotes(e.target.value)}
                  placeholder="Buffer lot numbers, temperature equilibrium time..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCalibrateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCalib}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  {submittingCalib ? 'Applying...' : 'Apply & Store in Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: APPLY OFFSET / GAIN QUICK MODAL                 */}
      {/* ======================================================== */}
      {showOffsetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-slate-900" />
                <h3 className="text-base font-black text-slate-900">Manual Linear Offset / Gain</h3>
              </div>
              <button onClick={() => setShowOffsetModal(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Gain Multiplier (m)</label>
                <input 
                  type="number"
                  step="0.0001"
                  value={manualGain}
                  onChange={(e) => setManualGain(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Additive Offset (b)</label>
                <input 
                  type="number"
                  step="0.0001"
                  value={manualOffset}
                  onChange={(e) => setManualOffset(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>

              <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-center text-xs">
                y = ({manualGain.toFixed(4)} · x) + {manualOffset.toFixed(4)}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setShowOffsetModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600">
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowOffsetModal(false);
                  alert('Offset and Gain parameters updated successfully.');
                }}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold"
              >
                Apply Parameters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: RUN VERIFICATION SIMULATION MODAL               */}
      {/* ======================================================== */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900">3-Point Output Verification</h3>
              </div>
              <button onClick={() => setShowVerifyModal(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {verifying ? (
                <div className="py-8 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
                  <p className="font-bold text-slate-700">Sampling sensor response across 3 test points...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl space-y-1">
                    <div className="flex items-center gap-1.5 font-black text-emerald-800 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Verification Succeeded (100% Pass)</span>
                    </div>
                    <p className="text-[11px] text-emerald-700">
                      Sensor {selectedSensor.code} conforms to ISO 14064-2 MRV drift tolerance (&lt; 0.5% full scale).
                    </p>
                  </div>

                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                      <span>Low Point (20% Span):</span>
                      <strong className="text-emerald-700">PASS (0.02% error)</strong>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                      <span>Mid Point (50% Span):</span>
                      <strong className="text-emerald-700">PASS (0.01% error)</strong>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                      <span>High Point (80% Span):</span>
                      <strong className="text-emerald-700">PASS (0.03% error)</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button 
                onClick={() => setShowVerifyModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: CALIBRATION AUDIT HISTORY MODAL                 */}
      {/* ======================================================== */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-800" />
                <h3 className="text-base font-black text-slate-900">Calibration Audit Ledger: {selectedSensor.code}</h3>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {[
                { date: 'Sep 01, 2026', tech: 'Dharmesh V.', method: 'NIST Zero Point', offset: '+0.1200', gain: '0.9980', status: 'ACTIVE' },
                { date: 'Aug 10, 2026', tech: 'Marcus Vance', method: 'Two Point Span', offset: '+0.0850', gain: '1.0010', status: 'SUPERSEDED' },
                { date: 'Jul 20, 2026', tech: 'Elena Rostova', method: 'Factory Baseline', offset: '0.0000', gain: '1.0000', status: 'SUPERSEDED' },
              ].map((rec, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <span>{rec.date}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-black ${
                        rec.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {rec.status}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">Technician: {rec.tech} • Method: {rec.method}</p>
                  </div>
                  <div className="font-mono text-right font-bold text-slate-800">
                    <div>Offset: {rec.offset}</div>
                    <div>Gain: {rec.gain}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button onClick={() => setShowHistoryModal(false)} className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: POND OVERVIEW MODAL                             */}
      {/* ======================================================== */}
      {showPondDetailModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">{selectedPond} — Instrument Topology</h3>
              <button onClick={() => setShowPondDetailModal(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl">
                <div>
                  <span className="text-slate-400 block font-medium">Working Volume:</span>
                  <strong className="text-slate-900 font-mono">120,000 Liters</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Surface Area:</span>
                  <strong className="text-slate-900 font-mono">12.5 Hectares</strong>
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed">
                Pond instrumentation comprises 5 continuous optical and electrochemical probes with 5-minute sampling rates, fully calibrated to NIST traceable references.
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button onClick={() => setShowPondDetailModal(false)} className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
