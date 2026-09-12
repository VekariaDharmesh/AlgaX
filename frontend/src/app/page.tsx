'use client';

import React, { useEffect, useState } from 'react';
import { Leaf, FlaskConical, Droplets, Shield, Info, ArrowRight, AlertCircle, Image as ImageIcon, FileText, Sun } from 'lucide-react';
import { DEMO_PONDS } from '@/lib/demo/ponds';
import { DEMO_CARBON_ACCOUNTING } from '@/lib/demo/carbon';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Link from 'next/link';
import { fetchPonds, fetchTelemetry, injectScenario, fetchBiomassEstimates, fetchCarbonEstimates, fetchAnomalies, fetchAnomalyExplanation } from '@/lib/api';
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

  const [biomassAvg, setBiomassAvg] = useState<number | null>(null);
  const [grossCo2, setGrossCo2] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [activePondId, setActivePondId] = useState<string | null>(null);



  useEffect(() => {
    let mounted = true;
    
    async function loadData() {
      try {
        const ponds = await fetchPonds().catch(() => []);
        if (ponds && ponds.length > 0) {
          const pondId = ponds[0].id;
          
          if (mounted) {
            setActivePondId(pondId);
          }
          
          const [telemetry, bioData, carData, anomaliesData] = await Promise.all([
            fetchTelemetry(pondId, undefined, 'temperature', 24).catch(() => []),
            fetchBiomassEstimates(pondId).catch(() => []),
            fetchCarbonEstimates(pondId).catch(() => []),
            fetchAnomalies(1, 20).catch(() => ({ items: [] }))
          ]);



          if (!mounted) return;

          const temps = telemetry.slice().reverse();
          if (bioData && bioData.length > 0) setBiomassAvg(bioData[0].biomass_g_per_l);
          if (carData && carData.length > 0) setGrossCo2(carData[0].gross_co2_kg);
          
          setAnomalies(anomaliesData.items || []);

          setTelemetryData(temps.map((t: {timestamp: string, value: number}) => ({
            time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            value: Number(t.value.toFixed(1))
          })));
          setIsLive(true);
        }
      } catch (err) {
        console.error("Failed to load live telemetry", err);
      }
    }
    
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden min-h-[220px] bg-gradient-to-r from-[#113a29] via-[#164e35] to-[#1e5a3d] flex items-center border border-emerald-900/40 shadow-lg">
        {/* Subtle Ambient Radial Highlight */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-1/3 w-80 h-80 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 w-full px-8 py-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
              {getGreeting()}, Operator
            </h1>
            <p className="text-emerald-100/80 mt-1.5 text-base font-normal">
              Carbon operations are being monitored across your farm.
            </p>
          </div>
          
          {/* Real-Time Weather Widget */}
          <div className="shrink-0 self-start md:self-auto">
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
                  {formatCo2(grossCo2).value} <span className="text-base font-bold text-slate-600">{formatCo2(grossCo2).unit}</span>
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
                  {formatBiomass(biomassAvg).value} <span className="text-base font-bold text-slate-600">{formatBiomass(biomassAvg).unit}</span>
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
                <span className="text-2xl font-black text-slate-900 mt-0.5 tracking-tight">3 / 3</span>
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
        <div className="bg-white rounded-xl border border-gray-200 p-5 col-span-1 lg:col-span-1">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">Carbon Accounting</h2>
              <Info className="w-4 h-4 text-gray-400" />
            </div>
            <select className="text-sm border-gray-300 rounded-md text-gray-600 bg-gray-50 px-2 py-1 outline-none">
              <option>This Reporting Period</option>
            </select>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-semibold text-gray-900">Gross CO₂ Fixed</span>
                <span className="font-bold text-gray-900">{carbon.grossFixedKg.toLocaleString()} kg</span>
              </div>
              <p className="text-xs text-gray-500 mb-2">Total carbon captured by algae growth</p>
              <div className="h-6 w-full bg-gray-100 rounded overflow-hidden">
                <div className="h-full bg-green-600" style={{ width: '100%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-semibold text-gray-900">End-use Retained</span>
                <span className="font-bold text-gray-900">{carbon.endUseRetainedKg.toLocaleString()} kg</span>
              </div>
              <p className="text-xs text-gray-500 mb-2">Carbon retained after processing</p>
              <div className="h-6 w-full bg-gray-100 rounded overflow-hidden">
                <div className="h-full bg-green-400" style={{ width: carbon.grossFixedKg ? `${(carbon.endUseRetainedKg / carbon.grossFixedKg) * 100}%` : '0%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-semibold text-gray-900">Operational Footprint</span>
                <span className="font-bold text-gray-900">{carbon.operationalFootprintKg.toLocaleString()} kg</span>
              </div>
              <p className="text-xs text-gray-500 mb-2">Emissions from energy, fertilizer, etc.</p>
              <div className="h-6 w-full bg-gray-100 rounded overflow-hidden">
                <div className="h-full bg-gray-400" style={{ width: carbon.grossFixedKg ? `${(carbon.operationalFootprintKg / carbon.grossFixedKg) * 100}%` : '0%' }}></div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-bold text-green-800 uppercase tracking-wide">Net Carbon Removed</span>
              <span className="font-bold text-gray-900">{carbon.netRemovedKg.toLocaleString()} kg</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">Total modeled carbon removal</p>
            <div className="h-6 w-full bg-gray-100 rounded overflow-hidden">
              <div className="h-full bg-green-800" style={{ width: `${(carbon.netRemovedKg / carbon.grossFixedKg) * 100}%` }}></div>
            </div>
          </div>
        </div>

        {/* Pond Status */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 col-span-1 lg:col-span-2 shadow-2xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-black text-gray-900">Active Cultivation Ponds</h2>
              <p className="text-xs text-gray-400">Live kinetics and biometrics across 6 registered Indian cultivation units.</p>
            </div>
            <Link href="/farms?tab=ponds" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              View All in Farms & Ponds <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DEMO_PONDS.map(pond => (
              <Link href={`/ponds/${pond.id}`} key={pond.id} className="border border-gray-200/90 rounded-2xl overflow-hidden hover:border-emerald-400 hover:shadow-md transition-all block group bg-white">
                <div className="h-28 bg-gray-900 relative overflow-hidden">
                  <img src={pond.imageUrl} alt={pond.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  <div className="absolute top-2 left-2">
                    <span className="bg-slate-900/80 backdrop-blur-md text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-md border border-slate-700">
                      {pond.farmName.split(' ')[0]}
                    </span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow ${
                      pond.status === 'Healthy' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full bg-white animate-pulse`}></span>
                      {pond.status}
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 text-white">
                    <div className="font-bold text-sm drop-shadow">{pond.name}</div>
                  </div>
                </div>
                <div className="p-3.5 space-y-2">
                  <p className="text-[11px] text-gray-500 italic truncate">{pond.species}</p>
                  
                  <div className="grid grid-cols-2 gap-y-1.5 text-xs bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5 text-gray-700 font-medium text-[11px]">
                      <span className="text-gray-400">🌡</span> {pond.temperature.toFixed(1)} °C
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-700 font-medium text-[11px]">
                      <span className="text-gray-400 text-[10px] font-serif">pH</span> {pond.ph.toFixed(1)}
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-700 font-medium text-[11px]">
                      <span className="text-gray-400">💧</span> {pond.dissolvedOxygen.toFixed(1)} mg/L
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-700 font-medium text-[11px]">
                      <span className="text-gray-400">✨</span> {pond.turbidity} NTU
                    </div>
                    <div className="flex items-center justify-between col-span-2 pt-1 border-t border-slate-200/60 text-[11px]">
                      <span className="text-gray-500">Biomass:</span>
                      <span className="font-black text-emerald-700 font-mono">{pond.biomass.toFixed(2)} g/L</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Telemetry */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Live Telemetry (Pond B)</h2>
            <select className="text-xs border-gray-300 rounded bg-gray-50 px-2 py-1 outline-none text-gray-600">
              <option>Last 24 hours</option>
            </select>
          </div>
          
          <div className="flex gap-4 border-b border-gray-100 mb-4">
            <button className="pb-2 text-sm font-bold text-green-600 border-b-2 border-green-600">Dissolved O₂</button>
            <button className="pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">pH</button>
            <button className="pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">Temperature</button>
            <button className="pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">Turbidity</button>
          </div>

          <div className="h-48 w-full relative">
            <ResponsiveContainer width="100%" height={192}>
              <LineChart data={telemetryData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis 
                  domain={[0, 12]} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9ca3af' }} 
                  label={{ value: 'Dissolved O₂ (mg/L)', angle: -90, position: 'insideLeft', offset: -5, style: { textAnchor: 'middle', fill: '#9ca3af', fontSize: 10 } }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  labelStyle={{ display: 'none' }}
                />
                <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Anomalies */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 col-span-1 h-[450px] flex flex-col">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h2 className="text-lg font-bold text-gray-900">Recent Anomalies</h2>
            <Link href="/anomalies" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="space-y-4 overflow-y-auto pr-2 flex-1 scrollbar-thin scrollbar-thumb-gray-200">
            {anomalies.length === 0 ? (
              <p className="text-sm text-gray-500">No active sensor anomalies.</p>
            ) : (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              anomalies.map((anomaly: any, index: number) => (
                <div key={anomaly.id} className={`flex gap-3 pb-4 ${index !== anomalies.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    anomaly.severity === 'CRITICAL' || anomaly.severity === 'HIGH' ? 'bg-red-100 text-red-600' :
                    anomaly.severity === 'MEDIUM' ? 'bg-orange-100 text-orange-500' :
                    'bg-blue-100 text-blue-500'
                  }`}>
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm text-gray-900">{anomaly.anomaly_type.replace(/_/g, ' ')}</h4>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        anomaly.severity === 'CRITICAL' || anomaly.severity === 'HIGH' ? 'bg-red-50 text-red-600' :
                        anomaly.severity === 'MEDIUM' ? 'bg-orange-50 text-orange-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {anomaly.severity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Confidence: {anomaly.confidence_score} · Sensor: {anomaly.sensor_type}</p>
                    <p className="text-xs text-gray-600 mt-1">{anomaly.description}</p>
                    {anomaly.explanation_record && (
                      <div className="mt-2 bg-slate-50 p-2 rounded border border-slate-200">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-700">Mechanistic Explanation</span>
                          <span className={`text-[10px] px-1.5 rounded font-bold ${anomaly.explanation_record.evidence_strength === 'STRONG' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'}`}>{anomaly.explanation_record.evidence_strength} EVIDENCE</span>
                        </div>
                        <p className="text-xs text-slate-600 mb-1">{anomaly.explanation_record.summary}</p>
                        {anomaly.explanation_record.primary_factor && (
                           <p className="text-[10px] text-slate-500 font-medium">Primary Limitation: {anomaly.explanation_record.primary_factor}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Verification Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 col-span-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-gray-900">Verification Status</h2>
            <Link href="/reports" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View Reports <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="flex-1 flex items-center justify-center gap-6">
            <div className="h-32 w-32 relative">
              <ResponsiveContainer width="100%" height={128}>
                <PieChart>
                  <Pie
                    data={verificationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {verificationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900 leading-none">8</span>
                <span className="text-[10px] text-gray-500 font-medium uppercase mt-1">Modeled</span>
              </div>
            </div>
            
            <div className="space-y-2">
              {verificationData.map(item => (
                <div key={item.name} className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="font-bold text-gray-900 w-4 text-right">{item.value}</span>
                  <span className="text-gray-600">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
          
          <Link href="/reports" className="mt-4 flex items-center justify-between w-full p-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              View Verification Reports
            </div>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
