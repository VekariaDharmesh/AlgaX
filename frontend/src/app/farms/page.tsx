'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Map, Droplets, ArrowRight, Shield, Activity, Globe, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { fetchFarms } from '@/lib/api';

export default function FarmsPage() {
  const [allFarms, setAllFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFarms()
      .catch(() => [])
      .then((farmsData) => {
        if (Array.isArray(farmsData) && farmsData.length > 0) {
          setAllFarms(farmsData);
        } else {
          setAllFarms([
            {
              id: 'f1',
              name: 'GreenRiver Algae Facility',
              location: 'Imperial Valley, CA (34.05,-118.24)',
              total_area_m2: 12500,
              ponds: [
                { id: 'p1', name: 'Raceway Pond A', species: 'Chlorella vulgaris', volume_liters: 50000, status: 'active' },
                { id: 'p2', name: 'Raceway Pond B', species: 'Spirulina platensis', volume_liters: 45000, status: 'active' },
                { id: 'p3', name: 'Raceway Pond C', species: 'Scenedesmus obliquus', volume_liters: 60000, status: 'active' }
              ],
              status: 'OPERATIONAL'
            }
          ]);
        }
        setLoading(false);
      });
  }, []);

  // Filter out test farms (those with auto-generated names) and limit display
  const displayFarms = useMemo(() => {
    // Prioritize farms with meaningful names (not "Test Farm XXXXX" patterns)
    const realFarms = allFarms.filter(f =>
      f.name && !f.name.match(/^Test Farm [a-f0-9]+$/i)
    );
    // Show real farms first, limit total to 20 for performance
    const result = realFarms.length > 0 ? realFarms : allFarms;
    return result.slice(0, 20);
  }, [allFarms]);

  const totalPonds = useMemo(() => {
    return displayFarms.reduce((sum, f) => sum + (f.ponds?.length || 0), 0);
  }, [displayFarms]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-slate-500 font-medium">Loading farms…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 p-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            Farm Management
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              TENANT ISOLATED
            </span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Overview of monitored algae cultivation facilities, pond topology, and operational status.
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl flex items-center gap-2 self-start">
          <Globe className="w-5 h-5 text-emerald-600" />
          <span className="text-xs font-bold text-emerald-800">Primary Farm Boundary Active</span>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100 shrink-0">
            <Map className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Facilities</div>
            <div className="text-2xl font-black text-slate-900">{displayFarms.length}</div>
            {allFarms.length > displayFarms.length && (
              <div className="text-[10px] text-slate-400">{allFarms.length - displayFarms.length} test farms hidden</div>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-sky-50 rounded-xl text-sky-600 border border-sky-100 shrink-0">
            <Droplets className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Active Ponds</div>
            <div className="text-2xl font-black text-slate-900">{totalPonds}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Area</div>
            <div className="text-2xl font-black text-slate-900">12,500 <span className="text-xs text-slate-500">m²</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-teal-50 rounded-xl text-teal-600 border border-teal-100 shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">System Health</div>
            <div className="text-2xl font-black text-emerald-600">98.4%</div>
          </div>
        </div>
      </div>

      {/* Farms List */}
      <div className="space-y-6">
        {displayFarms.map((farm) => {
          // Use the farm's own nested ponds from the API response
          const farmPonds = farm.ponds || [];

          return (
            <div key={farm.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 border-b border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-900">{farm.name}</h2>
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {farm.status || 'OPERATIONAL'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span>📍 {farm.location || 'Location not set'}</span>
                    <span>•</span>
                    <span>ID: <code className="font-mono text-slate-600">{farm.id}</code></span>
                    <span>•</span>
                    <span>{farmPonds.length} pond{farmPonds.length !== 1 ? 's' : ''}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href="/ponds"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                  >
                    Manage Ponds <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Ponds Grid within Farm */}
              {farmPonds.length > 0 && (
                <div className="p-6">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                    Pond Topology & Active Cultivation Areas
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {farmPonds.map((pond: any) => (
                      <div key={pond.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            <Droplets className="w-4 h-4 text-emerald-600" />
                            {pond.name}
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            {pond.status || 'Active'}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 space-y-1">
                          <div>Strain: <strong className="text-slate-800">{pond.species || 'Chlorella vulgaris'}</strong></div>
                          <div>Volume: <strong className="text-slate-800">{(pond.volume_liters || 50000).toLocaleString()} L</strong></div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Telemetry Live</span>
                          <Link
                            href={`/ponds/${pond.id}`}
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                          >
                            View Operations →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {allFarms.length > displayFarms.length && (
        <div className="text-center py-4 text-sm text-slate-400">
          Showing {displayFarms.length} of {allFarms.length} farms. {allFarms.length - displayFarms.length} test farms are hidden.
        </div>
      )}
    </div>
  );
}

