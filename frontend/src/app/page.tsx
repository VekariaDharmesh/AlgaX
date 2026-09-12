'use client';

import React, { useEffect, useState } from 'react';
import { Leaf, FlaskConical, Droplets, Shield, Info, ArrowRight, AlertCircle, Image as ImageIcon, FileText, Sun } from 'lucide-react';
import { DEMO_PONDS } from '@/lib/demo/ponds';
import { DEMO_CARBON_ACCOUNTING } from '@/lib/demo/carbon';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Link from 'next/link';
import { fetchPonds, injectScenario, fetchBiomassEstimates, fetchCarbonEstimates, fetchAnomalies, fetchAnomalyExplanation } from '@/lib/api';

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
        const ponds = await fetchPonds();
        if (ponds.length > 0) {
          const pondId = ponds[0].id;
          
          if (mounted) {
            setActivePondId(pondId);
          }
          
          const res = await fetch(`http://localhost:8000/api/telemetry?pond_id=${pondId}&sensor_type=temperature&limit=24`);
          const telemetry = await res.json();
          const temps = telemetry.reverse();
          
          // Fetch Phase 2 Model Estimates
          try {
            const bioData = await fetchBiomassEstimates(pondId);
            const carData = await fetchCarbonEstimates(pondId);
            
            if (mounted) {
              if (bioData && bioData.length > 0) setBiomassAvg(bioData[0].biomass_g_per_l);
              if (carData && carData.length > 0) setGrossCo2(carData[0].gross_co2_kg);
            }
            
            const anomaliesData = await fetchAnomalies();
            if (mounted) {
              const anomaliesList = anomaliesData.items || [];
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const anomaliesWithExp = await Promise.all(anomaliesList.map(async (a: any) => {
                 if (a.source_provenance === 'biological_engine') {
                   try {
                     const exp = await fetchAnomalyExplanation(a.id);
                     return { ...a, explanation_record: exp };
                   } catch (err) {
                     return a;
                   }
                 }
                 return a;
              }));
              setAnomalies(anomaliesWithExp);
            }
          } catch (e) {
            console.error("Failed to load estimates or anomalies", e);
          }
          
          if (mounted) {
            setTelemetryData(temps.map((t: {timestamp: string, value: number}) => ({
              time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              value: Number(t.value.toFixed(1))
            })));
            setIsLive(true);
          }
        }
      } catch (err) {
        console.error("Failed to load live telemetry", err);
      }
    }
    
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);
  
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden h-64 bg-slate-100 flex items-center border border-slate-200/60 shadow-sm">
        {/* Background Image & Overlay */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2000&auto=format&fit=crop')" }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-white via-white/95 to-transparent" />
        
        {/* Content */}
        <div className="relative z-10 w-full px-8 flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              Good morning, Operator
              {isLive && (
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded flex items-center gap-1 shadow-sm border border-blue-100">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                  SIMULATED DATA
                </span>
              )}
            </h1>
            <p className="text-slate-600 mt-2 text-lg font-medium">Carbon operations are being monitored across your farm.</p>
            
            {isLive && activePondId && (
              <div className="flex gap-2 mt-6">
                <button 
                  onClick={() => injectScenario(activePondId, 'nutrient_depletion')}
                  className="text-xs font-bold bg-orange-50/90 backdrop-blur text-orange-700 border border-orange-200 px-3 py-1.5 rounded-md hover:bg-orange-100 transition-colors shadow-sm"
                >
                  Simulate N-Depletion
                </button>
                <button 
                  onClick={() => injectScenario(activePondId, 'heatwave')}
                  className="text-xs font-bold bg-red-50/90 backdrop-blur text-red-700 border border-red-200 px-3 py-1.5 rounded-md hover:bg-red-100 transition-colors shadow-sm"
                >
                  Simulate Heatwave
                </button>
                <button 
                  onClick={() => injectScenario(activePondId, 'sensor_dropout')}
                  className="text-xs font-bold bg-slate-50/90 backdrop-blur text-slate-700 border border-slate-200 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors shadow-sm"
                >
                  Drop Temp Sensor
                </button>
              </div>
            )}
          </div>
          
          {/* Weather Widget */}
          <div className="bg-white/60 backdrop-blur-md border border-white/60 p-4 rounded-xl shadow-sm flex items-center gap-4 min-w-[200px]">
            <Sun className="w-10 h-10 text-yellow-500 drop-shadow-sm" />
            <div className="flex flex-col">
              <span className="text-2xl font-extrabold text-slate-900 leading-none">28°C</span>
              <span className="text-xs font-semibold text-slate-700 mt-1.5">Gandhinagar, India</span>
              <span className="text-[11px] font-medium text-slate-600">Clear Sky</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="relative z-20 px-4 -mt-16 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* KPI 1: Net Carbon Removed */}
          <div className="bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-100 p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                <Leaf className="w-6 h-6 text-green-700" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Gross CO₂ Fixed</span>
                <span className="text-2xl font-extrabold text-slate-900 mt-0.5">{grossCo2 !== null ? grossCo2.toFixed(1) : '-'} <span className="text-lg">kg CO₂e</span></span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center">
                MODELED
              </span>
              <span className="text-xs text-slate-500 font-medium">This reporting period</span>
            </div>
          </div>

          {/* KPI 2: Biomass */}
          <div className="bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-100 p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
                <FlaskConical className="w-6 h-6 text-teal-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Estimated Biomass</span>
                <span className="text-2xl font-extrabold text-slate-900 mt-0.5">{biomassAvg !== null ? biomassAvg.toFixed(2) : '-'} <span className="text-lg">g/L</span></span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center">
                MODELED
              </span>
              <span className="text-xs text-slate-500 font-medium">Across all ponds</span>
            </div>
          </div>

          {/* KPI 3: Ponds Active */}
          <div className="bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-100 p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <Droplets className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Ponds Active</span>
                <span className="text-2xl font-extrabold text-slate-900 mt-0.5">3 / 3</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">All systems online</span>
            </div>
          </div>

          {/* KPI 4: Model Confidence */}
          <div className="bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-100 p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-emerald-700" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Model Confidence</span>
                <span className="text-2xl font-extrabold text-slate-900 mt-0.5">94.2%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
                <div className="h-full bg-green-400" style={{ width: `${(carbon.endUseRetainedKg / carbon.grossFixedKg) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-semibold text-gray-900">Operational Footprint</span>
                <span className="font-bold text-gray-900">{carbon.operationalFootprintKg.toLocaleString()} kg</span>
              </div>
              <p className="text-xs text-gray-500 mb-2">Emissions from energy, fertilizer, etc.</p>
              <div className="h-6 w-full bg-gray-100 rounded overflow-hidden">
                <div className="h-full bg-gray-400" style={{ width: `${(carbon.operationalFootprintKg / carbon.grossFixedKg) * 100}%` }}></div>
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
        <div className="bg-white rounded-xl border border-gray-200 p-5 col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Pond Status</h2>
            <Link href="/ponds" className="text-sm font-medium text-green-600 hover:text-green-700 flex items-center gap-1">
              View All Ponds <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DEMO_PONDS.map(pond => (
              <Link href={`/ponds/${pond.id}`} key={pond.id} className="border border-gray-200 rounded-lg overflow-hidden hover:border-green-300 transition-colors block">
                <div className="h-24 bg-gray-200 relative overflow-hidden">
                  <img src={`/images/ponds/${pond.id}.jpg`} alt={pond.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-900">{pond.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      pond.status === 'Healthy' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${pond.status === 'Healthy' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                      {pond.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 italic mb-4">{pond.species}</p>
                  
                  <div className="grid grid-cols-2 gap-y-2 text-xs">
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="w-4 inline-block text-center text-gray-400">🌡</span> {pond.temperature.toFixed(1)} °C
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="w-4 inline-block text-center font-serif text-gray-400 text-[10px]">pH</span> {pond.ph.toFixed(1)}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="w-4 inline-block text-center text-gray-400">💧</span> {pond.dissolvedOxygen.toFixed(1)} mg/L
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="w-4 inline-block text-center text-gray-400">✨</span> {pond.turbidity} NTU
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 col-span-2 mt-1">
                      <span className="w-4 inline-block text-center text-gray-400">🌿</span> {pond.biomass.toFixed(2)} g/L
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
            <div className="absolute top-0 left-0 text-[10px] text-gray-400 transform -rotate-90 origin-bottom-left -translate-y-8 translate-x-2">
              Dissolved O₂ (mg/L)
            </div>
            <ResponsiveContainer width="100%" height={192}>
              <LineChart data={telemetryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis domain={[0, 12]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
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
