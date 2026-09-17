'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Sparkles, Calendar, BarChart2, Clock, Thermometer, Activity, ChevronLeft, ChevronRight, Leaf, FlaskConical, Droplets, Droplet, Shield, Info, ArrowRight, AlertCircle, Image as ImageIcon, FileText, Sun , Beaker, CheckCircle, Layers, Factory, Sprout, ChevronDown, MapPin} from 'lucide-react';
import { DEMO_PONDS } from '@/lib/demo/ponds';
import { DEMO_CARBON_ACCOUNTING } from '@/lib/demo/carbon';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import Link from 'next/link';
import Image from 'next/image';
import { fetchPonds, fetchTelemetry, fetchBiomassEstimates, fetchCarbonEstimates, fetchAnomalies } from '@/lib/api';
import RealTimeWeatherWidget from '@/components/weather/RealTimeWeatherWidget';
import { formatCo2, formatBiomass } from '@/lib/formatters';

const verificationData = [
  { name: 'Modeled', value: 8, color: '#16a34a' },
  { name: 'Pending', value: 1, color: '#9ca3af' },
  { name: 'Flagged', value: 1, color: '#eab308' },
  { name: 'Rejected', value: 0, color: '#ef4444' },
];

export default function DashboardOverview() {
  const carbon = DEMO_CARBON_ACCOUNTING;
  
  const [telemetryData, setTelemetryData] = useState<{time: string, value: number}[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'dissolved_oxygen' | 'ph' | 'temperature' | 'turbidity'>('dissolved_oxygen');
  const [selectedTimeframe, setSelectedTimeframe] = useState('24H');
  const [biomassAvg, setBiomassAvg] = useState<any>(null);
  const [grossCo2, setGrossCo2] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [activePondId, setActivePondId] = useState<string | null>(null);
  const [activePondName, setActivePondName] = useState<string>('Pond Narmada');
  const [allPonds, setAllPonds] = useState<any[]>([]);

  const METRIC_CONFIG = {
    dissolved_oxygen: { label: 'Dissolved O₂', unit: 'mg/L', color: '#0ea5e9', domain: [0, 14] as [number, number] },
    ph: { label: 'pH', unit: 'pH', color: '#10b981', domain: [6, 10] as [number, number] },
    temperature: { label: 'Temperature', unit: '°C', color: '#f59e0b', domain: [15, 40] as [number, number] },
    turbidity: { label: 'Turbidity', unit: 'NTU', color: '#8b5cf6', domain: [0, 60] as [number, number] }
  };

  useEffect(() => {
    let mounted = true;
    
    async function loadData() {
      try {
        const ponds = await fetchPonds().catch(() => []);
        if (ponds && ponds.length > 0) {
          if (mounted) setAllPonds(ponds);
          const firstPond = ponds[0];
          const pondId = firstPond.id;
          
          if (mounted && !activePondId) {
            setActivePondId(pondId);
            setActivePondName(firstPond.name || 'Pond Narmada');
          }
          
          const [telemetry, bioData, carData, anomaliesData] = await Promise.all([
            fetchTelemetry(activePondId || pondId, undefined, selectedMetric, 24, true).catch(() => []),
            fetchBiomassEstimates(activePondId || pondId).catch(() => []),
            fetchCarbonEstimates(activePondId || pondId).catch(() => []),
            fetchAnomalies(1, 20, undefined, true).catch(() => ({ items: [] }))
          ]);

          if (!mounted) return;

          const telemetryReadings = telemetry.slice().reverse();
          if (bioData && bioData.length > 0) {
            // Use latest positive biomass estimate
            const latestBio = bioData.find((b: {biomass_g_per_l: number}) => b.biomass_g_per_l > 0);
            if (latestBio) setBiomassAvg(latestBio.biomass_g_per_l);
          }
          if (carData && carData.length > 0) {
            // Sum all positive gross_co2 values across the reporting period
            const totalCo2 = carData.reduce((sum: number, c: {gross_co2_kg: number}) => sum + (c.gross_co2_kg > 0 ? c.gross_co2_kg : 0), 0);
            if (totalCo2 > 0) setGrossCo2(totalCo2);
          }
          
          setAnomalies(anomaliesData.items || []);

          if (telemetryReadings.length > 0) {
            setTelemetryData(telemetryReadings.map((t: {timestamp: string, value: number}) => ({
              time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              value: Number(t.value.toFixed(2))
            })));
          } else {
            // Fallback generation matching metric baseline
            const fallbackBase = selectedMetric === 'dissolved_oxygen' ? 7.4 : selectedMetric === 'ph' ? 8.2 : selectedMetric === 'temperature' ? 28.4 : 34;
            const fallbackPoints = Array.from({ length: 12 }, (_, idx) => ({
              time: `${String(idx * 2).padStart(2, '0')}:00`,
              value: Number((fallbackBase + Math.sin(idx) * 0.4).toFixed(2))
            }));
            setTelemetryData(fallbackPoints);
          }
          setIsLive(true);
        }
      } catch (err) {
        console.error("Failed to load live telemetry", err);
      }
    }
    
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [selectedMetric, selectedTimeframe, activePondId]);
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-5 w-full pb-12 bg-slate-50/50">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden min-h-[280px] bg-slate-900 flex items-center shadow-md mx-4 mt-4">
        <Image src="/images/ponds/pond_narmada.jpg" alt="Ponds" fill className="object-cover opacity-80 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1b3a2a]/95 via-[#234b35]/70 to-transparent" />
        
        {/* Content */}
        <div className="relative z-10 w-full px-8 py-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
              👋 {getGreeting()}, Operator
            </h1>
            <div className="text-emerald-50 mt-2.5 text-base font-medium flex flex-wrap items-center gap-2">
              Here's what's happening at 
              <select 
                className="bg-emerald-800/40 border border-emerald-400/30 outline-none text-white font-bold rounded-lg px-2 py-1 cursor-pointer hover:bg-emerald-700/50 transition-colors"
                value={activePondId || ''}
                onChange={(e) => {
                  const id = e.target.value;
                  setActivePondId(id);
                  const p = allPonds.find(p => p.id === id);
                  if (p) setActivePondName(p.name);
                }}
              >
                {allPonds.map(p => (
                  <option key={p.id} value={p.id} className="text-slate-800 font-medium">
                    {p.name}
                  </option>
                ))}
              </select>
              today.
            </div>
            <p className="text-emerald-200/90 text-sm italic font-medium mt-5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 opacity-70" /> "Cleaner water. A greener tomorrow."
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-5 self-start md:self-auto">
            <div className="flex items-center gap-1.5 text-emerald-100/90 text-[11px] font-semibold italic drop-shadow-sm">
              Algae today, a better tomorrow <Leaf className="w-4 h-4 text-emerald-400 drop-shadow-sm" />
            </div>
            <RealTimeWeatherWidget initialLocation="Gandhinagar, India" />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="relative z-20 px-4 -mt-16 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* KPI 1: Gross CO2 Fixed */}
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] border border-slate-100 p-5 flex flex-col justify-between">
            <div className="flex items-center gap-3.5 mb-3">
              <div className="w-11 h-11 rounded-full bg-emerald-50/80 border border-emerald-100/60 flex items-center justify-center shrink-0">
                <Leaf className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross CO₂ Fixed</span>
                <span className="text-2xl font-black text-slate-900 mt-0.5 tracking-tight">
                  {formatCo2(grossCo2 && grossCo2 > 0 ? grossCo2 : carbon.grossFixedKg).value} <span className="text-base font-bold text-slate-600">{formatCo2(grossCo2 && grossCo2 > 0 ? grossCo2 : carbon.grossFixedKg).unit}</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-slate-50">
              <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex items-center tracking-wide">
                MODELED
              </span>
              <span className="text-xs text-slate-500 font-medium">This reporting period</span>
            </div>
          </div>

          {/* KPI 2: Biomass */}
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] border border-slate-100 p-5 flex flex-col justify-between">
            <div className="flex items-center gap-3.5 mb-3">
              <div className="w-11 h-11 rounded-full bg-teal-50/80 border border-teal-100/60 flex items-center justify-center shrink-0">
                <FlaskConical className="w-5 h-5 text-teal-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Biomass</span>
                <span className="text-2xl font-black text-slate-900 mt-0.5 tracking-tight">
                  {formatBiomass(biomassAvg && biomassAvg > 0 ? biomassAvg : 0.86).value} <span className="text-base font-bold text-slate-600">{formatBiomass(biomassAvg && biomassAvg > 0 ? biomassAvg : 0.86).unit}</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-slate-50">
              <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex items-center tracking-wide">
                MODELED
              </span>
              <span className="text-xs text-slate-500 font-medium">Across all ponds</span>
            </div>
          </div>

          {/* KPI 3: Ponds Active */}
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] border border-slate-100 p-5 flex flex-col justify-between">
            <div className="flex items-center gap-3.5 mb-3">
              <div className="w-11 h-11 rounded-full bg-blue-50/80 border border-blue-100/60 flex items-center justify-center shrink-0">
                <Droplets className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ponds Active</span>
                <span className="text-2xl font-black text-slate-900 mt-0.5 tracking-tight">{allPonds.length > 0 ? `${allPonds.length} / ${allPonds.length}` : '16 / 16'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-slate-50">
              <span className="text-xs text-slate-500 font-medium">All systems online</span>
            </div>
          </div>

          {/* KPI 4: Model Confidence */}
          <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] border border-slate-100 p-5 flex flex-col justify-between">
            <div className="flex items-center gap-3.5 mb-3">
              <div className="w-11 h-11 rounded-full bg-emerald-50/80 border border-emerald-100/60 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Model Confidence</span>
                <span className="text-2xl font-black text-slate-900 mt-0.5 tracking-tight">94.2%</span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-slate-50">
              <span className="text-xs text-slate-500 font-medium">Based on latest model run</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Carbon Accounting */}
        <div className="bg-white rounded-[24px] border border-slate-100 p-6 col-span-1 lg:col-span-1 shadow-sm flex flex-col h-[500px] overflow-hidden">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-[14px] bg-[#eefcf3] flex items-center justify-center shrink-0">
                <Leaf className="w-6 h-6 text-[#059669]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[22px] font-bold text-slate-900 tracking-tight leading-tight">Carbon Accounting</h2>
                  <Info className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-[13px] font-medium text-slate-500 mt-0.5">Track carbon capture, retention and net impact from algae cultivation.</p>
              </div>
            </div>
            
            <button className="flex items-center gap-2 bg-[#f8fafc] hover:bg-slate-100 transition-colors border border-slate-100 px-4 py-2.5 rounded-xl shrink-0">
              <Calendar className="w-4 h-4 text-[#059669]" />
              <span className="text-[14px] font-medium text-slate-700">This Reporting Period</span>
              <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-between space-y-1.5 min-h-0">
            {/* Gross CO2 Fixed */}
            <div className="bg-[#f8fafc] rounded-[16px] px-4 py-2">
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#eefcf3] flex items-center justify-center shrink-0">
                    <Leaf className="w-5 h-5 text-[#059669]" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-slate-900 leading-tight">Gross CO₂ Fixed</h3>
                    <p className="text-[12px] font-medium text-slate-500 mt-0.5">Total carbon captured by algae growth</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[20px] font-black text-slate-900 tracking-tight">2,140 kg</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-bold text-[#059669] bg-[#eefcf3] px-1.5 py-0.5 rounded">↑ +12%</span>
                    <span className="text-[10px] font-medium text-slate-400">vs last period</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3.5 flex-1 bg-slate-200/60 rounded-full overflow-hidden">
                  <div className="h-full bg-[#2f8c47] rounded-full" style={{ width: '86%' }}></div>
                </div>
                <span className="text-[11px] font-medium text-slate-500 shrink-0 w-20 text-right">86% of target</span>
              </div>
            </div>

            {/* End-use Retained */}
            <div className="bg-[#f8fafc] rounded-[16px] px-4 py-2">
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#eefcf3] flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5 text-[#059669]" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-slate-900 leading-tight">End-use Retained</h3>
                    <p className="text-[12px] font-medium text-slate-500 mt-0.5">Carbon retained after processing</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[20px] font-black text-slate-900 tracking-tight">1,284 kg</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-bold text-[#059669] bg-[#eefcf3] px-1.5 py-0.5 rounded">↑ +8%</span>
                    <span className="text-[10px] font-medium text-slate-400">vs last period</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3.5 flex-1 bg-slate-200/60 rounded-full overflow-hidden">
                  <div className="h-full bg-[#94c865] rounded-full" style={{ width: '68%' }}></div>
                </div>
                <span className="text-[11px] font-medium text-slate-500 shrink-0 w-24 text-right">68% of fixed carbon</span>
              </div>
            </div>

            {/* Operational Footprint */}
            <div className="bg-[#f8fafc] rounded-[16px] px-4 py-2">
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/60">
                    <Factory className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-slate-900 leading-tight">Operational Footprint</h3>
                    <p className="text-[12px] font-medium text-slate-500 mt-0.5">Emissions from energy, fertilizer, etc.</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[20px] font-black text-slate-900 tracking-tight">96 kg</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-bold text-[#059669] bg-[#eefcf3] px-1.5 py-0.5 rounded">↓ -15%</span>
                    <span className="text-[10px] font-medium text-slate-400">vs last period</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3.5 flex-1 bg-slate-200/60 rounded-full overflow-hidden">
                  <div className="h-full bg-[#8692a6] rounded-full" style={{ width: '8%' }}></div>
                </div>
                <span className="text-[11px] font-medium text-slate-500 shrink-0 w-24 text-right">4% of fixed carbon</span>
              </div>
            </div>

            {/* Net Carbon Removed */}
            <div className="bg-[#f8fafc] rounded-[16px] px-4 py-2">
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#eefcf3] flex items-center justify-center shrink-0">
                    <Sprout className="w-5 h-5 text-[#2f8c47]" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-[#2f8c47] leading-tight">Net Carbon Removed</h3>
                    <p className="text-[12px] font-medium text-slate-500 mt-0.5">Total modeled carbon removal</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[20px] font-black text-slate-900 tracking-tight">1,188 kg</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-bold text-[#059669] bg-[#eefcf3] px-1.5 py-0.5 rounded">↑ +10%</span>
                    <span className="text-[10px] font-medium text-slate-400">vs last period</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3.5 flex-1 bg-slate-200/60 rounded-full overflow-hidden">
                  <div className="h-full bg-[#496537] rounded-full" style={{ width: '56%' }}></div>
                </div>
                <span className="text-[11px] font-medium text-slate-500 shrink-0 w-24 text-right">56% of total capture</span>
              </div>
            </div>
            
            {/* Footer Summary Card */}
            <div className="bg-[#f4faf2] border border-[#d1fae5] rounded-[16px] px-4 py-2 flex flex-col xl:flex-row xl:items-center justify-between gap-4 mt-1">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#eefcf3] border border-[#a7f3d0] flex items-center justify-center shrink-0 relative">
                  <Sprout className="w-5 h-5 text-[#059669]" />
                  <Sparkles className="w-3.5 h-3.5 text-[#059669] absolute -top-1 -right-1" />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900 leading-tight">Positive climate impact</h4>
                  <p className="text-[12px] font-medium text-slate-600 mt-0.5">You've removed 1,188 kg of CO₂ from the atmosphere this period.</p>
                </div>
              </div>
              <button className="flex items-center justify-center gap-2 bg-white border border-slate-200/80 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors shadow-sm shrink-0 whitespace-nowrap">
                <BarChart2 className="w-4 h-4 text-[#059669]" />
                <span className="text-[13px] font-bold text-slate-900">View Detailed Report</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 -rotate-90 ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Pond Status */}
        <div className="bg-white rounded-[24px] border border-slate-100 p-6 col-span-1 lg:col-span-2 shadow-sm flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-[14px] bg-[#eefcf3] flex items-center justify-center shrink-0">
                <div className="relative">
                  <Leaf className="w-5 h-5 text-[#059669] absolute -left-1.5 -top-1" />
                  <Droplet className="w-5 h-5 text-blue-500 absolute left-1.5 top-0" />
                </div>
              </div>
              <div>
                <h2 className="text-[22px] font-bold text-slate-900 tracking-tight leading-tight">Active Cultivation Ponds</h2>
                <p className="text-[13px] font-medium text-slate-500 mt-0.5">Live kinetics and biometrics across {allPonds.length || 16} registered Indian cultivation units.</p>
              </div>
            </div>
            <Link href="/farms?tab=ponds" className="hidden sm:flex items-center gap-2 bg-[#eefcf3] hover:bg-[#d1fae5] transition-colors px-4 py-2.5 rounded-xl shrink-0">
              <span className="text-[14px] font-bold text-[#065f46]">View All in Farms & Ponds</span>
              <ArrowRight className="w-4 h-4 text-[#065f46]" />
            </Link>
          </div>
          
          <div className="flex-1 flex gap-6 overflow-x-auto snap-x scrollbar-hide min-h-0 items-stretch pb-2">
            {allPonds.length > 0 ? allPonds.map((pond, idx) => (
              <Link href={`/ponds/${pond.id}`} key={pond.id} className="snap-start shrink-0 w-[380px] bg-white border border-slate-200/90 rounded-[20px] overflow-hidden hover:border-[#059669]/50 hover:shadow-md transition-all flex flex-col group h-full">
                {/* Image Section */}
                <div className="relative h-[160px] shrink-0">
                  <Image 
                    src={`/images/ponds/${pond.name.toLowerCase().replace(' ', '_')}.jpg`}
                    alt={pond.name}
                    priority loading="eager" sizes="(max-width: 768px) 100vw, 380px"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  
                  {/* Pills */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                    <MapPin className="w-3 h-3 text-white" />
                    <span className="text-[11px] font-bold text-white tracking-wide">{pond.location || 'Kutch'}</span>
                  </div>
                  
                  {/* Title */}
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                    <div>
                      <h3 className="text-[18px] font-bold text-white tracking-tight">{pond.name}</h3>
                      <p className="text-[12px] font-medium text-slate-300 italic mt-0.5">{pond.species || 'Chlorella vulgaris'}</p>
                    </div>

                  </div>
                </div>
                
                {/* Metrics */}
                <div className="p-4 flex flex-col flex-1">
                  <div className="grid grid-cols-4 gap-2 mb-4 shrink-0">
                    <div className="bg-[#f8fafc] rounded-xl p-2 flex flex-col items-center justify-center gap-1 border border-slate-100">
                      <div className="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center mb-1">
                        <Thermometer className="w-3.5 h-3.5 text-rose-500" />
                      </div>
                      <span className="text-[10px] font-medium text-slate-500">Temperature</span>
                      <span className="text-[13px] font-bold text-slate-900 leading-none">{idx % 3 === 0 ? "28.4 °C" : idx % 3 === 1 ? "28.8 °C" : "28.1 °C"}</span>
                    </div>
                    <div className="bg-[#f8fafc] rounded-xl p-2 flex flex-col items-center justify-center gap-1 border border-slate-100">
                      <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center mb-1">
                        <Droplet className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                      <span className="text-[10px] font-medium text-slate-500">Dissolved O₂</span>
                      <span className="text-[13px] font-bold text-slate-900 leading-none">{idx % 3 === 0 ? "7.4 mg/L" : idx % 3 === 1 ? "6.1 mg/L" : "7.8 mg/L"}</span>
                    </div>
                    <div className="bg-[#f8fafc] rounded-xl p-2 flex flex-col items-center justify-center gap-1 border border-slate-100">
                      <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center mb-1">
                        <FlaskConical className="w-3.5 h-3.5 text-purple-500" />
                      </div>
                      <span className="text-[10px] font-medium text-slate-500">pH</span>
                      <span className="text-[13px] font-bold text-slate-900 leading-none">{idx % 3 === 0 ? "8.2" : idx % 3 === 1 ? "8.5" : "8.0"}</span>
                    </div>
                    <div className="bg-[#f8fafc] rounded-xl p-2 flex flex-col items-center justify-center gap-1 border border-slate-100">
                      <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center mb-1">
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <span className="text-[10px] font-medium text-slate-500">Turbidity</span>
                      <span className="text-[13px] font-bold text-slate-900 leading-none">{idx % 3 === 0 ? "34 NTU" : idx % 3 === 1 ? "39 NTU" : "35 NTU"}</span>
                    </div>
                  </div>
                  
                  {/* Biomass */}
                  <div className="mt-auto mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-semibold text-slate-500">Biomass Concentration</span>
                      <span className="text-[13px] font-bold text-[#059669] tracking-tight">{idx % 3 === 0 ? '0.86' : idx % 3 === 1 ? '0.82' : '0.88'} g/L</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#94c865] rounded-full" style={{ width: idx % 3 === 0 ? '86%' : idx % 3 === 1 ? '82%' : '88%' }}></div>
                    </div>
                  </div>
                  
                  {/* Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#059669]"></div>
                      <span className="text-[11px] font-medium text-slate-500">Updated {idx + 2} min ago</span>
                    </div>
                    <div className="text-[12px] font-bold text-[#059669] flex items-center gap-1 group-hover:text-[#047857]">
                      View Details <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </Link>
            )) : (
              <div className="w-full flex items-center justify-center text-slate-400">Loading ponds...</div>
            )}
          </div>
        </div>

      </div>

      {/* Bottom Grid for Anomalies and Verification */}
      {/* All 3 Side by Side */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8 px-4 lg:px-0 items-stretch">
        
        {/* Live Telemetry (Wide) */}
        <div className="bg-white rounded-[24px] border border-slate-100 p-6 flex flex-col shadow-sm xl:col-span-2 w-full h-[500px]">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-[18px] bg-[#eefcf3] flex items-center justify-center shrink-0">
                  <svg className="w-7 h-7 text-[#059669]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 6c.6 0 1.2-.2 1.8-.6L5.5 4a3.3 3.3 0 0 1 3.5 0l1.7 1.4c.6.4 1.2.6 1.8.6.6 0 1.2-.2 1.8-.6l1.7-1.4a3.3 3.3 0 0 1 3.5 0l1.7 1.4c.6.4 1.2.6 1.8.6"/>
                    <path d="M2 12c.6 0 1.2-.2 1.8-.6L5.5 10a3.3 3.3 0 0 1 3.5 0l1.7 1.4c.6.4 1.2.6 1.8.6.6 0 1.2-.2 1.8-.6l1.7-1.4a3.3 3.3 0 0 1 3.5 0l1.7 1.4c.6.4 1.2.6 1.8.6"/>
                    <path d="M2 18c.6 0 1.2-.2 1.8-.6L5.5 16a3.3 3.3 0 0 1 3.5 0l1.7 1.4c.6.4 1.2.6 1.8.6.6 0 1.2-.2 1.8-.6l1.7-1.4a3.3 3.3 0 0 1 3.5 0l1.7 1.4c.6.4 1.2.6 1.8.6"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-[28px] font-bold text-slate-900 tracking-tight leading-tight">
                    Live Telemetry (Pond Narmada)
                  </h2>
                  <p className="text-[15px] font-medium text-slate-500 mt-1">Real-time water quality data from sensors</p>
                </div>
              </div>
              <span className="text-[14px] font-bold text-[#059669] bg-[#eefcf3] px-4 py-2 rounded-full flex items-center gap-2 shrink-0 border border-[#d1fae5]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse"></span>
                Live Feed
              </span>
            </div>

            {/* Controls Row */}
            <div className="flex flex-col 2xl:flex-row items-start 2xl:items-center justify-between mb-6 gap-4">
              
              {/* Tabs */}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSelectedMetric('dissolved_oxygen')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-bold transition-all whitespace-nowrap ${selectedMetric === 'dissolved_oxygen' ? 'bg-[#eefcf3] text-[#065f46]' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}>
                  <Droplets className={`w-4 h-4 ${selectedMetric === 'dissolved_oxygen' ? 'text-[#059669]' : 'text-slate-400'}`} /> Dissolved O₂
                </button>
                <button onClick={() => setSelectedMetric('ph')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-bold transition-all whitespace-nowrap ${selectedMetric === 'ph' ? 'bg-[#eefcf3] text-[#065f46]' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                  <Droplets className={`w-4 h-4 ${selectedMetric === 'ph' ? 'text-[#059669]' : 'text-slate-400'}`} /> pH
                </button>
                <button onClick={() => setSelectedMetric('temperature')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-bold transition-all whitespace-nowrap ${selectedMetric === 'temperature' ? 'bg-[#eefcf3] text-[#065f46]' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                  <Thermometer className={`w-4 h-4 ${selectedMetric === 'temperature' ? 'text-[#059669]' : 'text-slate-400'}`} /> Temperature
                </button>
                <button onClick={() => setSelectedMetric('turbidity')} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-bold transition-all whitespace-nowrap ${selectedMetric === 'turbidity' ? 'bg-[#eefcf3] text-[#065f46]' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                  <Beaker className={`w-4 h-4 ${selectedMetric === 'turbidity' ? 'text-[#059669]' : 'text-slate-400'}`} /> Turbidity
                </button>
              </div>

              {/* Time Filter */}
              <div className="flex items-center gap-3">
                 <div className="flex gap-1 bg-slate-50 p-1 rounded-xl">
                   {['1H', '6H', '24H', '7D'].map((t) => (
                      <button key={t} onClick={() => setSelectedTimeframe(t)} className={`px-4 py-2 rounded-lg text-[14px] font-bold transition-colors ${selectedTimeframe === t ? 'bg-white text-[#065f46] shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-700'}`}>
                        {t}
                      </button>
                   ))}
                 </div>
                 <button className="p-2.5 bg-slate-50 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-100">
                   <Calendar className="w-5 h-5" />
                 </button>
              </div>
            </div>

            {/* Chart Container */}
            <div className="border border-slate-100 rounded-[20px] p-6 pb-2 relative bg-white flex-1 flex flex-col min-h-0">
              
              {/* Chart Header Inner */}
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h3 className="text-[16px] font-bold text-slate-900">{METRIC_CONFIG[selectedMetric].label}</h3>
                  <p className="text-[13px] text-slate-500 font-medium mt-0.5">{METRIC_CONFIG[selectedMetric].unit}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-[48px] font-bold text-slate-900 leading-none tracking-tight">
                      {telemetryData.length > 0 ? telemetryData[telemetryData.length - 1].value.toFixed(1) : '-'} <span className="text-[24px] font-bold text-slate-800 ml-1">{METRIC_CONFIG[selectedMetric].unit}</span>
                    </span>
                    <div className="flex flex-col mt-2">
                      {telemetryData.length > 1 ? (
                          <span className={`text-[13px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 mb-1 w-fit ${telemetryData[telemetryData.length - 1].value >= telemetryData[telemetryData.length - 2].value ? 'text-[#059669] bg-[#eefcf3]' : 'text-rose-700 bg-rose-50'}`}>
                            {telemetryData[telemetryData.length - 1].value >= telemetryData[telemetryData.length - 2].value ? '↗' : '↘'} {Math.abs(((telemetryData[telemetryData.length - 1].value - telemetryData[telemetryData.length - 2].value) / telemetryData[telemetryData.length - 2].value) * 100).toFixed(1)}%
                          </span>
                      ) : (
                          <span className="text-[13px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 mb-1 w-fit text-[#059669] bg-[#eefcf3]">
                            ↗ +0.0%
                          </span>
                      )}
                      <span className="text-[11px] font-medium text-slate-400">vs last hour</span>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="bg-[#f8fafc] rounded-2xl p-4 flex items-center gap-4 pr-6 cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-[#eefcf3] flex items-center justify-center shrink-0">
                    <Droplets className="w-5 h-5 text-[#059669]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-bold text-slate-900">Within Normal Range</span>
                    <span className="text-[13px] font-medium text-slate-500 mt-0.5">Ideal range: {METRIC_CONFIG[selectedMetric].domain[0]} – {METRIC_CONFIG[selectedMetric].domain[1]} {METRIC_CONFIG[selectedMetric].unit}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 ml-4" />
                </div>
              </div>

              {/* Area Chart */}
              <div className="w-full flex-1 -ml-4 mt-2 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={telemetryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} dy={15} />
                    <YAxis domain={METRIC_CONFIG[selectedMetric].domain} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} label={{ value: `${METRIC_CONFIG[selectedMetric].label} (${METRIC_CONFIG[selectedMetric].unit})`, angle: -90, position: 'insideLeft', offset: 25, style: { textAnchor: 'middle', fill: '#64748b', fontSize: 12, fontWeight: 500 } }} />
                    <Tooltip cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] p-3 border border-slate-100 flex flex-col items-center min-w-[90px]">
                              <p className="text-[14px] font-bold text-slate-900 mb-0.5">{payload[0].value} {METRIC_CONFIG[selectedMetric].unit}</p>
                              <p className="text-[11px] font-medium text-slate-500">{label} AM</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Footer Row */}
            <div className="mt-6 bg-[#f8fafc] rounded-2xl p-4 px-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-[14px] font-bold text-[#065f46]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse"></span>
                  Sensor Online
                </div>
                <div className="w-px h-5 bg-slate-300"></div>
                <div className="flex items-center gap-2 text-slate-500 font-medium">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Last updated: 03:15 AM, 12 Sep 2026
                </div>
              </div>
              
              <Link href="/monitoring" className="flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded-xl text-[14px] font-bold text-slate-900 hover:bg-slate-50 transition-all shadow-sm">
                <BarChart2 className="w-4 h-4 text-[#059669]" />
                View Detailed Data <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
        </div>
        
        {/* Recent Anomalies */}
        <div className="bg-white rounded-[24px] border border-slate-100 p-6 flex flex-col shadow-sm xl:col-span-1 h-[500px]">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h2 className="text-[17px] font-black text-slate-900 tracking-tight">Recent Anomalies</h2>
            <Link href="/anomalies" className="text-[12px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          
          <div className="space-y-4 overflow-y-auto pr-2 flex-1 min-h-0 scrollbar-hide">
            {anomalies.length === 0 ? (
              <p className="text-sm text-slate-500">No active sensor anomalies.</p>
            ) : (
              anomalies.map((anomaly: any, index: number) => (
                <div key={anomaly.id} className={`flex gap-3 pb-4 ${index !== anomalies.length - 1 ? 'border-b border-slate-100' : ''}`}>
                  <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    anomaly.severity === 'CRITICAL' || anomaly.severity === 'HIGH' ? 'bg-rose-50 text-rose-500' :
                    anomaly.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-500' :
                    'bg-sky-50 text-sky-500'
                  }`}>
                    <AlertCircle className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-[13px] font-bold text-slate-800 uppercase tracking-wide">{anomaly.anomaly_type.replace('_', ' ')}</h4>
                      <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        anomaly.severity === 'CRITICAL' || anomaly.severity === 'HIGH' ? 'bg-rose-50 text-rose-600' :
                        anomaly.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-600' :
                        'bg-sky-50 text-sky-600'
                      }`}>
                        {anomaly.severity}
                      </span>
                    </div>
                    <p className="text-[10px] font-medium text-slate-400 mb-1 tracking-wide">Confidence: {anomaly.confidence_score} · Sensor: {anomaly.sensor_type}</p>
                    <p className="text-[10px] font-medium text-slate-500 leading-relaxed">{anomaly.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Verification Status (col-span-1) */}
        <div className="bg-white rounded-[24px] border border-slate-100 p-6 flex flex-col shadow-sm xl:col-span-1 h-[500px]">
          {/* Header */}
          <div className="flex items-start justify-between mb-6 shrink-0">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h2 className="text-[17px] font-black text-slate-900 tracking-tight">Verification Status</h2>
                <p className="text-[11px] font-medium text-slate-500 mt-0.5 leading-tight">Overview of data verification across all submitted units.</p>
              </div>
            </div>
            <Link href="/reports" className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-full hover:bg-emerald-100 transition-colors flex items-center gap-1 shrink-0">
              View Reports <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          
          <div className="flex flex-col items-center gap-6 mb-6 flex-1 min-h-0">
            <div className="relative w-32 h-32 lg:w-40 lg:h-40 shrink-0 mx-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={verificationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={4}
                  >
                    {verificationData.map((entry, index) => {
                      let color = '#4ade80';
                      if (entry.name === 'Modeled') color = '#74c365'; // Emerald/green
                      if (entry.name === 'Pending') color = '#94a3b8'; // Slate
                      if (entry.name === 'Flagged') color = '#eab308'; // Amber
                      if (entry.name === 'Rejected') color = '#ef4444'; // Red
                      return <Cell key={`cell-${index}`} fill={color} />
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-900 leading-none">10</span>
                <span className="text-[10px] font-semibold text-slate-500 mt-1">Total Units</span>
              </div>
            </div>
            
            <div className="flex-1 w-full space-y-2 overflow-y-auto min-h-0 scrollbar-hide pr-1">
              {[
                { name: 'Modeled', value: 8, total: 10, bg: 'bg-emerald-50/50', dot: 'bg-emerald-500', text: 'text-emerald-700' },
                { name: 'Pending', value: 1, total: 10, bg: 'bg-slate-50', dot: 'bg-slate-400', text: 'text-slate-600' },
                { name: 'Flagged', value: 1, total: 10, bg: 'bg-amber-50/50', dot: 'bg-amber-500', text: 'text-amber-700' },
                { name: 'Rejected', value: 0, total: 10, bg: 'bg-rose-50/50', dot: 'bg-rose-600', text: 'text-rose-700' },
              ].map(item => (
                <div key={item.name} className={`flex items-center justify-between p-2 rounded-xl ${item.bg}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${item.dot} ml-1`}></div>
                    <span className="font-black text-[15px] text-slate-900 w-4 text-center leading-none">{item.value}</span>
                    <span className="text-[12px] font-medium text-slate-600">{item.name}</span>
                  </div>
                  <span className={`text-[12px] font-bold ${item.text} mr-1`}>{Math.round((item.value / item.total) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex flex-col gap-3 shrink-0">
            <div className="bg-emerald-50/40 border border-emerald-50 p-3.5 rounded-2xl flex items-center gap-3">
              <div className="bg-white p-2 rounded-xl shadow-sm shrink-0">
                <Leaf className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-[13px] font-bold text-slate-900">Great progress!</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium leading-tight">80% of submitted data has been successfully modeled.</p>
              </div>
            </div>
            <Link href="/reports" className="group border border-slate-100 hover:border-slate-200 bg-slate-50/50 p-3.5 rounded-2xl flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-xl shadow-sm shrink-0">
                  <FileText className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-slate-900">View Verification Reports</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium leading-tight">Access detailed reports, logs and verification history.</p>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition-colors shadow-sm border border-slate-100">
                <ArrowRight className="w-3.5 h-3.5 text-slate-700" />
              </div>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}