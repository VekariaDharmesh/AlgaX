'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DEMO_PONDS } from '@/lib/demo/ponds';
import { 
  ArrowRight, 
  Droplets, 
  Filter, 
  Search, 
  Activity, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  Layers,
  Thermometer,
  Gauge
} from 'lucide-react';

export default function PondsPage() {
  const [filterStatus, setFilterStatus] = useState<'All' | 'Healthy' | 'Attention'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPonds = DEMO_PONDS.filter(pond => {
    const matchesStatus = filterStatus === 'All' || pond.status === filterStatus;
    const matchesSearch = 
      pond.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pond.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pond.speciesCommon.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 p-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Cultivation Inventory
            </span>
            <span className="text-xs font-semibold text-slate-400">• High-Throughput Raceways & PBRs</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Active Cultivation Ponds</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Biomass concentration, kinetic limitation tracking, and nutrient monitoring across operational ponds.
          </p>
        </div>

        {/* Quick Stats Banner */}
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-4 py-2 rounded-2xl">
          <Droplets className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-emerald-900">{DEMO_PONDS.length} Units Active</span>
            <span className="text-emerald-700 block">Total Volume: {DEMO_PONDS.reduce((acc, p) => acc + p.volumeLiters, 0).toLocaleString()} L</span>
          </div>
        </div>
      </div>

      {/* Controls Bar: Search and Status Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by pond name or algae strain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {(['All', 'Healthy', 'Attention'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterStatus === status
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Ponds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPonds.map(pond => (
          <Link 
            href={`/ponds/${pond.id}`} 
            key={pond.id} 
            className="bg-white border border-slate-200 rounded-3xl overflow-hidden hover:shadow-xl hover:border-emerald-400 transition-all group flex flex-col h-full"
          >
            {/* Image Header with Badge Overlay */}
            <div className="h-52 w-full relative bg-slate-900 overflow-hidden">
              <img 
                src={`/images/ponds/${pond.id}.jpg`} 
                alt={`${pond.name} view`} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-95" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              
              {/* Top badges */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <span className="bg-slate-900/80 backdrop-blur-md text-slate-200 font-semibold text-[11px] px-2.5 py-1 rounded-lg border border-slate-700">
                  {pond.pondType}
                </span>
                <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5 shadow ${
                  pond.status === 'Healthy' 
                    ? 'bg-emerald-500/90 text-white' 
                    : 'bg-amber-500/90 text-white'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  {pond.status}
                </span>
              </div>

              {/* Bottom pond title on image */}
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <div className="text-[11px] uppercase font-bold text-emerald-400 tracking-wider">
                  {pond.speciesCommon}
                </div>
                <h2 className="text-2xl font-black tracking-tight">{pond.name}</h2>
                <p className="text-xs text-slate-300 italic font-medium">{pond.species}</p>
              </div>
            </div>
            
            {/* Content Body */}
            <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
              
              {/* Description */}
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                {pond.description}
              </p>

              {/* Detailed 4-Metric Grid */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Biomass</span>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    {pond.biomass.toFixed(2)} <span className="text-xs font-normal text-slate-500">g/L</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold">+{pond.dailyGrowthRate}% daily rate</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Temperature</span>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    {pond.temperature.toFixed(1)} <span className="text-xs font-normal text-slate-500">°C</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Optimal (26-30°C)</span>
                </div>

                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">pH Level</span>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    {pond.ph.toFixed(1)}
                  </div>
                  <span className="text-[10px] text-slate-500">Target 7.8 - 8.4</span>
                </div>

                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Nitrogen (N)</span>
                  <div className={`text-base font-black mt-0.5 ${pond.nitrogen < 5 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {pond.nitrogen.toFixed(1)} <span className="text-xs font-normal text-slate-500">mg/L</span>
                  </div>
                  <span className={`text-[10px] font-semibold ${pond.nitrogen < 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {pond.nitrogen < 5 ? '⚠️ Sub-optimal' : '✓ Normal availability'}
                  </span>
                </div>
              </div>

              {/* Physical Topology Spec Footer */}
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  {pond.areaSqM} m² • {pond.depthCm} cm depth
                </span>
                <span className="text-slate-700 font-bold">
                  {(pond.volumeLiters).toLocaleString()} L
                </span>
              </div>
              
              {/* Action */}
              <div className="pt-2 flex items-center justify-between text-emerald-700 font-bold text-xs group-hover:text-emerald-800">
                <span>Open Telemetry & Limitations</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredPonds.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <Droplets className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-600 font-bold">No ponds match your query</p>
          <button 
            onClick={() => { setFilterStatus('All'); setSearchQuery(''); }}
            className="mt-2 text-xs text-emerald-600 font-bold hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
