'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  ShoppingBag, PlusCircle, Filter, Search, Calendar, User, Scale, 
  Leaf, Zap, Shield, CheckCircle2, AlertTriangle, ArrowRight, X, Clock, RefreshCw, FileText
} from 'lucide-react';
import { 
  fetchFarms, fetchPonds, fetchHarvests, fetchHarvestOverview, 
  fetchBiomassReadiness, createHarvestEvent, updateHarvestEvent, 
  addHarvestBiomassFate, Farm, Pond, HarvestEvent, HarvestOverviewKPIs, 
  BiomassReadiness, HarvestStatus, HarvestMethod, EndUseCategory 
} from '@/lib/api';
import { formatCo2, formatBiomass } from '@/lib/formatters';

export default function HarvestsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [selectedPondId, setSelectedPondId] = useState<string>('');

  const [kpis, setKpis] = useState<HarvestOverviewKPIs | null>(null);
  const [readiness, setReadiness] = useState<BiomassReadiness | null>(null);
  const [harvests, setHarvests] = useState<HarvestEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState<'PLANNED' | 'COMPLETED'>('PLANNED');
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Create form state
  const [formMethod, setFormMethod] = useState<HarvestMethod>('FILTRATION');
  const [formOperator, setFormOperator] = useState('Operator 1');
  const [formEstimatedKg, setFormEstimatedKg] = useState<number>(250);
  const [formActualKg, setFormActualKg] = useState<number | undefined>(undefined);
  const [formNotes, setFormNotes] = useState('');

  // Biomass Fate Modal state
  const [activeFateHarvest, setActiveFateHarvest] = useState<HarvestEvent | null>(null);
  const [fateCategory, setFateCategory] = useState<EndUseCategory>('BIOCHAR');
  const [fateAllocatedKg, setFateAllocatedKg] = useState<number>(100);
  const [fateDestination, setFateDestination] = useState('Regional Biochar Processing Facility');
  const [submittingFate, setSubmittingFate] = useState(false);
  const [fateError, setFateError] = useState<string | null>(null);

  // Detail Modal state
  const [detailHarvest, setDetailHarvest] = useState<HarvestEvent | null>(null);

  // Initial load
  useEffect(() => {
    Promise.all([
      fetchFarms().catch(() => []),
      fetchPonds().catch(() => [])
    ]).then(([farmsData, pondsData]) => {
      setFarms(farmsData);
      setPonds(pondsData);
      if (farmsData.length > 0) setSelectedFarmId(farmsData[0].id);
      if (pondsData.length > 0) setSelectedPondId(pondsData[0].id);
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewData, readinessData, harvestsData] = await Promise.all([
        fetchHarvestOverview(selectedFarmId || undefined, selectedPondId || undefined).catch(() => null),
        selectedPondId ? fetchBiomassReadiness(selectedPondId).catch(() => null) : Promise.resolve(null),
        fetchHarvests(selectedFarmId || undefined, selectedPondId || undefined, statusFilter === 'All' ? undefined : statusFilter).catch(() => ({ items: [] }))
      ]);

      setKpis(overviewData);
      setReadiness(readinessData);
      setHarvests(harvestsData.items || []);
    } catch (err) {
      console.error('Error loading harvest workspace:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedFarmId, selectedPondId, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarmId || !selectedPondId) {
      setCreateError('Please select a Farm and Pond');
      return;
    }

    setSubmittingCreate(true);
    setCreateError(null);
    try {
      await createHarvestEvent({
        farm_id: selectedFarmId,
        pond_id: selectedPondId,
        status: createMode,
        planned_date: new Date().toISOString(),
        harvest_date: createMode === 'COMPLETED' ? new Date().toISOString() : undefined,
        harvest_method: formMethod,
        operator: formOperator,
        estimated_harvest_kg: formEstimatedKg,
        actual_harvest_kg: createMode === 'COMPLETED' ? (formActualKg || formEstimatedKg) : undefined,
        notes: formNotes
      });
      setShowCreateModal(false);
      setFormNotes('');
      loadData();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create harvest event');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleAddFateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFateHarvest) return;

    setSubmittingFate(true);
    setFateError(null);
    try {
      const totalAvailable = activeFateHarvest.actual_harvest_kg ?? activeFateHarvest.estimated_harvest_kg;
      const pct = totalAvailable > 0 ? (fateAllocatedKg / totalAvailable) * 100 : 100;

      await addHarvestBiomassFate(activeFateHarvest.id, {
        end_use_category: fateCategory,
        quantity_allocated_kg: fateAllocatedKg,
        allocation_pct: Number(pct.toFixed(1)),
        destination: fateDestination,
        notes: `Allocated for ${fateCategory}`
      });

      setActiveFateHarvest(null);
      loadData();
    } catch (err: any) {
      setFateError(err.message || 'Failed to allocate biomass fate');
    } finally {
      setSubmittingFate(false);
    }
  };

  const handleCompleteHarvest = async (harvest: HarvestEvent) => {
    try {
      const actual = harvest.estimated_harvest_kg > 0 ? harvest.estimated_harvest_kg : 200;
      await updateHarvestEvent(harvest.id, {
        status: 'COMPLETED',
        actual_harvest_kg: actual,
        harvest_date: new Date().toISOString()
      });
      loadData();
    } catch (err) {
      console.error('Failed to complete harvest:', err);
    }
  };

  const filteredHarvests = harvests.filter(h => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return h.operator.toLowerCase().includes(q) || 
           h.harvest_method.toLowerCase().includes(q) || 
           h.id.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 p-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            Harvest & Traceability
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              REAL-TIME CARBON LINK
            </span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Operational harvest management, biomass removal tracking, end-use fate allocation, and carbon credit provenance.
          </p>
        </div>

        {/* Action Controls & Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={selectedFarmId} 
            onChange={(e) => {
              setSelectedFarmId(e.target.value);
              const p = ponds.filter(pond => pond.farm_id === e.target.value);
              if (p.length > 0) setSelectedPondId(p[0].id);
            }}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {farms.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>

          <select 
            value={selectedPondId} 
            onChange={(e) => setSelectedPondId(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {ponds.filter(p => !selectedFarmId || p.farm_id === selectedFarmId).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <button 
            onClick={() => { setCreateMode('PLANNED'); setShowCreateModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Plan Harvest
          </button>
          
          <button 
            onClick={() => { setCreateMode('COMPLETED'); setShowCreateModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            Record Harvest
          </button>
        </div>
      </div>

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-sm font-medium mb-1">
            <span>Current Biomass</span>
            <Leaf className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {kpis?.current_biomass_g_l !== undefined && kpis.current_biomass_g_l !== null ? `${kpis.current_biomass_g_l.toFixed(2)} g/L` : 'Not available'}
          </div>
          <p className="text-xs text-slate-500 mt-1">Monod-Droop estimate</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-sm font-medium mb-1">
            <span>Harvestable Yield</span>
            <Scale className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {kpis?.harvestable_biomass_kg !== undefined && kpis.harvestable_biomass_kg !== null ? `${kpis.harvestable_biomass_kg.toFixed(1)} kg` : 'Not available'}
          </div>
          <p className="text-xs text-slate-500 mt-1">Pond volume capacity</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-sm font-medium mb-1">
            <span>Total Harvested</span>
            <ShoppingBag className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {kpis?.total_harvested_kg !== undefined ? `${kpis.total_harvested_kg.toFixed(1)} kg` : '0.0 kg'}
          </div>
          <p className="text-xs text-slate-500 mt-1">{kpis?.harvest_event_count || 0} event(s) recorded</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-sm font-medium mb-1">
            <span>Carbon Retained</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {kpis?.carbon_associated_kg !== undefined && kpis.carbon_associated_kg !== null 
              ? `${(kpis.carbon_associated_kg / 1000.0).toFixed(3)} tCO₂e` 
              : 'Not available'}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {kpis?.carbon_associated_kg ? 'Verified end-use fate' : 'End-use verification required'}
          </p>
        </div>
      </div>

      {/* Biomass Readiness & Model Run Section */}
      {readiness && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-6 shadow-md border border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs tracking-wider uppercase">
              <CheckCircle2 className="w-4 h-4" />
              Biomass Readiness Status
            </div>
            <h2 className="text-xl font-bold">{readiness.pond_name}: {readiness.readiness_label}</h2>
            <p className="text-slate-300 text-sm">
              Current density: <span className="font-semibold text-white">{readiness.biomass_g_per_l.toFixed(2)} g/L</span> | 
              Model version: <span className="font-mono text-emerald-300">{readiness.model_version}</span> | 
              Confidence score: <span className="font-semibold text-white">{(readiness.confidence_score * 100).toFixed(0)}%</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => { 
                setFormEstimatedKg(Math.round(readiness.biomass_g_per_l * 100));
                setCreateMode('PLANNED');
                setShowCreateModal(true); 
              }}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm rounded-lg shadow transition-colors flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              Plan Harvest from Model
            </button>
          </div>
        </div>
      )}

      {/* Harvest History & Management Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Filters and Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            {['All', 'PLANNED', 'COMPLETED', 'CANCELLED'].map(filter => (
              <button 
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === filter 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Search by operator, method..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Harvest Events Table */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            <span className="text-sm font-medium">Loading harvest records...</span>
          </div>
        ) : filteredHarvests.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900">No harvest events yet</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              No harvest events recorded for this selection. Create a planned harvest or record a completed biomass extraction.
            </p>
            <button 
              onClick={() => { setCreateMode('PLANNED'); setShowCreateModal(true); }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Plan First Harvest
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4">Harvest ID / Operator</th>
                  <th className="p-4">Method & Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Est. Harvest (kg)</th>
                  <th className="p-4">Actual Harvest (kg)</th>
                  <th className="p-4">End-Use Fate</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredHarvests.map(harvest => (
                  <tr key={harvest.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    <td className="p-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-500">{harvest.id.substring(0, 8)}...</span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3" />
                        {harvest.operator}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="font-medium text-slate-800">{harvest.harvest_method}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(harvest.planned_date).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        harvest.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                        harvest.status === 'PLANNED' ? 'bg-blue-100 text-blue-800' :
                        harvest.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          harvest.status === 'COMPLETED' ? 'bg-emerald-500' :
                          harvest.status === 'PLANNED' ? 'bg-blue-500' : 'bg-amber-500'
                        }`} />
                        {harvest.status}
                      </span>
                    </td>

                    <td className="p-4 font-mono font-medium text-slate-700">
                      {harvest.estimated_harvest_kg.toFixed(1)} kg
                    </td>

                    <td className="p-4 font-mono font-bold text-slate-900">
                      {harvest.actual_harvest_kg !== undefined && harvest.actual_harvest_kg !== null 
                        ? `${harvest.actual_harvest_kg.toFixed(1)} kg` 
                        : <span className="text-slate-400 font-normal italic">Pending measurement</span>
                      }
                    </td>

                    <td className="p-4">
                      {harvest.biomass_fates && harvest.biomass_fates.length > 0 ? (
                        <div className="space-y-1">
                          {harvest.biomass_fates.map(f => (
                            <span key={f.id} className="inline-block bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold px-2 py-0.5 rounded">
                              {f.end_use_category}: {f.quantity_allocated_kg} kg ({f.allocation_pct}%)
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 font-medium">
                          Unspecified fate
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {harvest.status === 'PLANNED' && (
                          <button 
                            onClick={() => handleCompleteHarvest(harvest)}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 transition-colors"
                          >
                            Mark Harvested
                          </button>
                        )}

                        <button 
                          onClick={() => { setActiveFateHarvest(harvest); setFateAllocatedKg(harvest.actual_harvest_kg || harvest.estimated_harvest_kg); }}
                          className="px-2.5 py-1 bg-purple-600 text-white rounded text-xs font-semibold hover:bg-purple-700 transition-colors"
                        >
                          Add Fate
                        </button>

                        <button 
                          onClick={() => setDetailHarvest(harvest)}
                          className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded text-xs font-semibold hover:bg-slate-200 transition-colors"
                        >
                          Details
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create Harvest Event */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
                {createMode === 'PLANNED' ? 'Plan New Harvest Event' : 'Record Harvest Execution'}
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Harvest Method</label>
                <select 
                  value={formMethod} 
                  onChange={(e) => setFormMethod(e.target.value as HarvestMethod)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="FILTRATION">FILTRATION (Screen / Membrane)</option>
                  <option value="CENTRIFUGATION">CENTRIFUGATION (High Speed)</option>
                  <option value="FLOCCULATION">FLOCCULATION (Auto-flocculation)</option>
                  <option value="SKIMMING">SKIMMING (Surface Skimming)</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Operator Name</label>
                <input 
                  type="text" 
                  value={formOperator}
                  onChange={(e) => setFormOperator(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Harvest (kg)</label>
                  <input 
                    type="number" 
                    value={formEstimatedKg}
                    onChange={(e) => setFormEstimatedKg(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    min={0}
                    required
                  />
                </div>

                {createMode === 'COMPLETED' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Actual Measured (kg)</label>
                    <input 
                      type="number" 
                      value={formActualKg || ''}
                      placeholder={formEstimatedKg.toString()}
                      onChange={(e) => setFormActualKg(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                      min={0}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Operational Notes</label>
                <textarea 
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Notes on water clarity, screen mesh, turbidity drops..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 h-20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingCreate}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow transition-colors"
                >
                  {submittingCreate ? 'Saving...' : createMode === 'PLANNED' ? 'Create Harvest Plan' : 'Record Execution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Biomass Fate */}
      {activeFateHarvest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Leaf className="w-5 h-5 text-purple-600" />
                Allocate Biomass Fate / End Use
              </h3>
              <button onClick={() => setActiveFateHarvest(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 text-xs text-purple-900">
              Harvest Event ID: <span className="font-mono font-bold">{activeFateHarvest.id.substring(0, 8)}...</span> | 
              Available Biomass: <span className="font-bold">{activeFateHarvest.actual_harvest_kg || activeFateHarvest.estimated_harvest_kg} kg</span>
            </div>

            {fateError && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium">
                {fateError}
              </div>
            )}

            <form onSubmit={handleAddFateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">End Use Category</label>
                <select 
                  value={fateCategory} 
                  onChange={(e) => setFateCategory(e.target.value as EndUseCategory)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                >
                  <option value="BIOCHAR">BIOCHAR (80% Carbon Permanence)</option>
                  <option value="BIOPLASTICS">BIOPLASTICS (50% Carbon Retention)</option>
                  <option value="FUEL">FUEL / BIOFUEL (0% Retention)</option>
                  <option value="ANIMAL_FEED">ANIMAL FEED (0% Permanent Retention)</option>
                  <option value="UNSPECIFIED">UNSPECIFIED (Retention Pending)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quantity Allocated (kg)</label>
                <input 
                  type="number" 
                  value={fateAllocatedKg}
                  onChange={(e) => setFateAllocatedKg(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  min={0.1}
                  step={0.1}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Destination Facility</label>
                <input 
                  type="text" 
                  value={fateDestination}
                  onChange={(e) => setFateDestination(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setActiveFateHarvest(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingFate}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold shadow transition-colors"
                >
                  {submittingFate ? 'Saving...' : 'Save End-Use Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detailed Harvest Traceability View */}
      {detailHarvest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-600" />
                  Harvest Traceability Detail
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {detailHarvest.id}</p>
              </div>
              <button onClick={() => setDetailHarvest(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Event Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">Operator</span>
                <span className="font-bold text-slate-900">{detailHarvest.operator}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Method</span>
                <span className="font-bold text-slate-900">{detailHarvest.harvest_method}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Status</span>
                <span className="font-bold text-emerald-700">{detailHarvest.status}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Date</span>
                <span className="font-bold text-slate-900">{new Date(detailHarvest.planned_date).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Biomass Quantities */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-2">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-600" />
                Biomass Measurements & Yield
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm pt-1">
                <div>
                  <span className="text-slate-500 text-xs block">Biomass Before</span>
                  <span className="font-mono font-bold text-slate-800">
                    {detailHarvest.biomass_before_g_per_l ? `${detailHarvest.biomass_before_g_per_l.toFixed(2)} g/L` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">Estimated Harvest</span>
                  <span className="font-mono font-bold text-blue-700">{detailHarvest.estimated_harvest_kg.toFixed(1)} kg</span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">Actual Measured</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {detailHarvest.actual_harvest_kg ? `${detailHarvest.actual_harvest_kg.toFixed(1)} kg` : 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* End-Use Fates */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-2">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-purple-600" />
                End-Use Allocations & Fate
              </h4>
              {detailHarvest.biomass_fates && detailHarvest.biomass_fates.length > 0 ? (
                <div className="space-y-2 pt-1">
                  {detailHarvest.biomass_fates.map(f => (
                    <div key={f.id} className="flex items-center justify-between bg-purple-50/60 border border-purple-100 p-2.5 rounded-lg text-xs">
                      <div>
                        <span className="font-bold text-purple-900 block">{f.end_use_category} ({f.allocation_pct}%)</span>
                        <span className="text-purple-700">{f.destination}</span>
                      </div>
                      <span className="font-mono font-bold text-purple-900">{f.quantity_allocated_kg} kg</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-amber-700 italic pt-1">
                  No biomass fate allocated yet. Retention factor defaults to unspecified.
                </p>
              )}
            </div>

            {/* Provenance and Navigation Links */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <Link 
                href="/review" 
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <FileText className="w-4 h-4" /> View in Review Workspace
              </Link>

              <button 
                onClick={() => setDetailHarvest(null)} 
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
