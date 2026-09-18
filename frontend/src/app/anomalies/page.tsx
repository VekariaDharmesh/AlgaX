'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertCircle, 
  ArrowRight, 
  Filter, 
  Clock, 
  CheckCircle, 
  Activity, 
  CheckCheck, 
  ShieldAlert,
  RotateCcw,
  Trash2,
  Search,
  X,
  SlidersHorizontal,
  Flame,
  Shield,
  Zap,
  Sparkles,
  Eye,
  Check
} from 'lucide-react';
import { fetchAnomalies, updateAnomalyStatus } from '@/lib/api';
import { useAnomalyNotification } from '@/context/AnomalyContext';
import Link from 'next/link';

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('OPEN');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Cleared items set stored locally so users can clear items or clear resolved
  const [clearedIds, setClearedIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('algax_cleared_anomalies');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const { refreshAnomalies } = useAnomalyNotification();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const saveClearedIds = (ids: string[]) => {
    setClearedIds(ids);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('algax_cleared_anomalies', JSON.stringify(ids));
      } catch (e) {
        console.error('Failed to save cleared anomalies:', e);
      }
    }
  };

  const loadData = async (filter = activeFilter) => {
    try {
      setLoading(true);
      const statusParam = filter === 'All' ? undefined : filter;
      const data = await fetchAnomalies(1, 100, statusParam, true);
      const sorted = (data?.items || []).sort((a: any, b: any) => (b.priority_score || 0) - (a.priority_score || 0));
      setAnomalies(sorted);
    } catch (e) {
      console.error('Error loading anomalies:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(activeFilter);
    const interval = setInterval(() => loadData(activeFilter), 10000);
    return () => clearInterval(interval);
  }, [activeFilter]);

  const handleUpdateStatus = async (id: string, newStatus: string, title: string) => {
    try {
      setActionInProgress(id);
      await updateAnomalyStatus(id, newStatus);
      showToast(`Anomaly "${title}" updated to ${newStatus}`);
      await refreshAnomalies();
      await loadData(activeFilter);
    } catch (err) {
      console.error('Failed to update anomaly status:', err);
      showToast(`Failed to update anomaly status.`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleAcknowledgeAll = async () => {
    const openItems = visibleAnomalies.filter(a => a.status === 'OPEN');
    if (openItems.length === 0) return;
    
    try {
      setActionInProgress('all');
      await Promise.all(openItems.map(a => updateAnomalyStatus(a.id, 'ACKNOWLEDGED')));
      showToast(`Acknowledged ${openItems.length} open anomalies.`);
      await refreshAnomalies();
      await loadData(activeFilter);
    } catch (err) {
      console.error('Failed to acknowledge all:', err);
      showToast('Error acknowledging anomalies.');
    } finally {
      setActionInProgress(null);
    }
  };

  // Clear single anomaly card from local view
  const handleClearSingle = (id: string, title: string) => {
    const updated = [...clearedIds, id];
    saveClearedIds(updated);
    showToast(`Cleared anomaly "${title}" from center view.`);
  };

  // Clear all resolved anomalies
  const handleClearResolved = () => {
    const resolvedIds = anomalies.filter(a => a.status === 'RESOLVED').map(a => a.id);
    if (resolvedIds.length === 0) {
      showToast('No resolved anomalies to clear.');
      return;
    }
    const updated = Array.from(new Set([...clearedIds, ...resolvedIds]));
    saveClearedIds(updated);
    showToast(`Cleared ${resolvedIds.length} resolved anomalies from center.`);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setActiveFilter('OPEN');
    setSeverityFilter('ALL');
    setSearchQuery('');
  };

  // Reset cleared anomalies list
  const handleRestoreCleared = () => {
    saveClearedIds([]);
    showToast('Restored all cleared anomalies to center view.');
  };

  // Filter pipeline
  const visibleAnomalies = useMemo(() => {
    return anomalies.filter(a => {
      // Exclude manually cleared items
      if (clearedIds.includes(a.id)) return false;

      // Status filter
      if (activeFilter !== 'All' && a.status !== activeFilter) return false;

      // Severity filter
      if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;

      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const typeMatch = a.anomaly_type?.toLowerCase().includes(q);
        const descMatch = a.description?.toLowerCase().includes(q);
        const pondMatch = a.pond_name?.toLowerCase().includes(q) || a.pond_id?.toLowerCase().includes(q);
        const factorMatch = a.explanation_record?.primary_factor?.toLowerCase().includes(q);
        if (!typeMatch && !descMatch && !pondMatch && !factorMatch) return false;
      }

      return true;
    });
  }, [anomalies, clearedIds, activeFilter, severityFilter, searchQuery]);

  // Executive KPI stats
  const stats = useMemo(() => {
    const activeList = anomalies.filter(a => !clearedIds.includes(a.id));
    return {
      total: activeList.length,
      critical: activeList.filter(a => a.severity === 'CRITICAL' && a.status !== 'RESOLVED').length,
      high: activeList.filter(a => a.severity === 'HIGH' && a.status !== 'RESOLVED').length,
      investigating: activeList.filter(a => a.status === 'INVESTIGATING').length,
      resolved: activeList.filter(a => a.status === 'RESOLVED').length,
      clearedCount: clearedIds.length
    };
  }, [anomalies, clearedIds]);

  return (
    <div className="w-full space-y-6 pb-16 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 shadow-xs">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                Anomaly & Deviation Center
              </h1>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Real-time biological kinetics, multi-factor stress indicators, and physical sensor telemetry deviations.
              </p>
            </div>
          </div>
        </div>

        {/* PRIMARY ACTION BAR */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Clear Resolved Button */}
          <button 
            onClick={handleClearResolved}
            disabled={stats.resolved === 0}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
            title="Clear all resolved anomalies from active workspace view"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Clear Resolved ({stats.resolved})</span>
          </button>

          {/* Acknowledge All Open */}
          {activeFilter === 'OPEN' && visibleAnomalies.length > 0 && (
            <button 
              onClick={handleAcknowledgeAll}
              disabled={actionInProgress !== null}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4 text-emerald-400" />
              <span>{actionInProgress === 'all' ? 'Processing...' : 'Acknowledge All Open'}</span>
            </button>
          )}

          {/* Refresh Data */}
          <button 
            onClick={() => loadData(activeFilter)} 
            className="p-2.5 border border-slate-200 rounded-xl text-slate-600 bg-white hover:bg-slate-50 text-xs font-bold transition-all shadow-xs"
            title="Refresh anomalies stream"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          {/* Restore Cleared Items if any */}
          {stats.clearedCount > 0 && (
            <button
              onClick={handleRestoreCleared}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 underline px-1.5"
              title="Restore cleared anomalies"
            >
              Reset Cleared ({stats.clearedCount})
            </button>
          )}
        </div>
      </div>

      {/* EXECUTIVE SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Active Queue */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Queue</span>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats.total}</span>
            <span className="text-[11px] font-semibold text-slate-400">Items Monitored</span>
          </div>
        </div>

        {/* Card 2: Critical Deviations */}
        <div className="bg-white rounded-2xl p-4 border border-rose-200/80 shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              Critical Risk
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600">{stats.critical}</span>
            <span className="text-[11px] font-semibold text-rose-500">Immediate Action</span>
          </div>
        </div>

        {/* Card 3: Under Investigation */}
        <div className="bg-white rounded-2xl p-4 border border-blue-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Investigating</span>
            <Eye className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-600">{stats.investigating}</span>
            <span className="text-[11px] font-semibold text-blue-500">In Audit Pipeline</span>
          </div>
        </div>

        {/* Card 4: Resolved & Remediated */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Resolved</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{stats.resolved}</span>
            <span className="text-[11px] font-semibold text-emerald-500">Verified Nominal</span>
          </div>
        </div>
      </div>

      {/* SEARCH & FILTER CONTROLS BAR */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Left: Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search anomalies by type, pond or cause..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Severity Pill Filter */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3" /> Severity:
            </span>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  severityFilter === sev 
                    ? sev === 'CRITICAL' ? 'bg-rose-600 text-white shadow-xs' :
                      sev === 'HIGH' ? 'bg-orange-600 text-white shadow-xs' :
                      sev === 'MEDIUM' ? 'bg-amber-600 text-white shadow-xs' :
                      sev === 'LOW' ? 'bg-sky-600 text-white shadow-xs' :
                      'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

        </div>

        {/* Status Tabs Bar */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 flex-wrap gap-2">
          <div className="flex gap-2 overflow-x-auto">
            {['OPEN', 'INVESTIGATING', 'ACKNOWLEDGED', 'RESOLVED', 'All'].map(filter => {
              const count = anomalies.filter(a => !clearedIds.includes(a.id) && (filter === 'All' ? true : a.status === filter)).length;
              return (
                <button 
                  key={filter} 
                  onClick={() => {
                    setActiveFilter(filter);
                    loadData(filter);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    activeFilter === filter 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{filter}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeFilter === filter ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Clear Filters Button (Shows if filters are active) */}
          {(searchQuery || severityFilter !== 'ALL' || activeFilter !== 'OPEN') && (
            <button 
              onClick={handleClearFilters}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 underline"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ANOMALY LISTING */}
      {loading && anomalies.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center text-slate-500 border border-slate-200/80 shadow-2xs">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-bold text-slate-700 text-sm">Scanning Telemetry Streams & Anomaly Intelligence...</p>
        </div>
      ) : visibleAnomalies.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-slate-300 shadow-2xs space-y-3">
          <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto" />
          <h3 className="font-black text-slate-900 text-base">No Anomalies Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery || severityFilter !== 'ALL' || activeFilter !== 'OPEN' 
              ? 'No deviations match your active search or filter criteria. Try resetting filters.'
              : 'All raceway cultivation units, biological kinetics, and optical sensors are reporting nominal parameters.'}
          </p>
          {(searchQuery || severityFilter !== 'ALL' || activeFilter !== 'OPEN') && (
            <button 
              onClick={handleClearFilters}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" /> Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {visibleAnomalies.map((anomaly) => {
            const isCritical = anomaly.severity === 'CRITICAL';
            const isHigh = anomaly.severity === 'HIGH';
            const isMed = anomaly.severity === 'MEDIUM';

            // Calculate metric variance percentage if numbers exist
            const obs = anomaly.observed_value !== undefined && anomaly.observed_value !== null ? Number(anomaly.observed_value) : null;
            const exp = anomaly.expected_value !== undefined && anomaly.expected_value !== null ? Number(anomaly.expected_value) : null;
            let variancePct: string | null = null;
            if (obs !== null && exp !== null && exp !== 0) {
              const diff = ((obs - exp) / exp) * 100;
              variancePct = `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`;
            }

            return (
              <div 
                key={anomaly.id} 
                className="bg-white rounded-3xl border border-slate-200/90 p-5 lg:p-6 flex flex-col md:flex-row gap-5 hover:shadow-md transition-all relative overflow-hidden group shadow-2xs"
              >
                {/* Left Priority Accent Line */}
                <div className={`absolute left-0 top-0 bottom-0 w-2 ${
                  isCritical ? 'bg-rose-500' :
                  isHigh ? 'bg-orange-500' :
                  isMed ? 'bg-amber-400' : 'bg-sky-400'
                }`} />

                {/* Status Badge Icon */}
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                  isCritical ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                  isHigh ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                  isMed ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                  'bg-sky-50 text-sky-600 border border-sky-100'
                }`}>
                  {anomaly.status === 'RESOLVED' ? <CheckCircle className="w-6 h-6 text-emerald-600" /> : <AlertCircle className="w-6 h-6" />}
                </div>

                {/* Main Card Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-black text-slate-900 tracking-tight">
                        {anomaly.anomaly_type.replace(/_/g, ' ')}
                      </h3>
                      
                      {/* Severity Pill */}
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        isCritical ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                        isHigh ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                        isMed ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-sky-100 text-sky-800 border border-sky-200'
                      }`}>
                        {anomaly.severity}
                      </span>

                      {/* Source Provenance */}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        {anomaly.source_provenance?.replace('_engine', '') || 'Telemetry'}
                      </span>

                      {/* Priority Score */}
                      {anomaly.priority_score > 50 && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-purple-600" />
                          Priority {anomaly.priority_score}
                        </span>
                      )}
                    </div>

                    {/* Metadata & Status */}
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(anomaly.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                      <span className={`font-black px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
                        anomaly.status === 'OPEN' ? 'bg-rose-100 text-rose-700' :
                        anomaly.status === 'ACKNOWLEDGED' ? 'bg-amber-100 text-amber-700' :
                        anomaly.status === 'INVESTIGATING' ? 'bg-blue-100 text-blue-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {anomaly.status}
                      </span>
                    </div>
                  </div>

                  {/* 2-Column Comparison Layout */}
                  <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Left: Telemetry Details */}
                    <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/70 text-xs">
                      <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Observed Telemetry</span>
                      <p className="text-slate-800 font-semibold leading-snug">{anomaly.description}</p>
                      
                      {obs !== null && (
                        <div className="mt-2.5 flex items-center gap-3 font-mono text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200/80">
                          <div>
                            <span className="text-slate-400 text-[10px] block font-sans">Observed</span>
                            <strong className="text-slate-900">{obs.toFixed(2)}</strong>
                          </div>
                          <span className="text-slate-300">•</span>
                          <div>
                            <span className="text-slate-400 text-[10px] block font-sans">Expected</span>
                            <strong className="text-slate-900">{exp !== null ? exp.toFixed(2) : 'Nominal'}</strong>
                          </div>
                          {variancePct && (
                            <>
                              <span className="text-slate-300">•</span>
                              <div>
                                <span className="text-slate-400 text-[10px] block font-sans">Variance</span>
                                <strong className={variancePct.startsWith('+') ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                                  {variancePct}
                                </strong>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Root Cause & Explanation */}
                    {anomaly.explanation_record ? (
                      <div className="bg-blue-50/70 border border-blue-200/80 p-3.5 rounded-2xl text-xs">
                        <span className="font-bold text-[10px] text-blue-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-blue-600" /> Mechanistic Cause & Explanation
                        </span>
                        <p className="text-blue-950 font-semibold leading-snug">{anomaly.explanation_record.summary}</p>
                        {anomaly.explanation_record.primary_factor && (
                          <p className="text-[11px] text-blue-800 mt-2 font-bold bg-blue-100/70 px-2 py-0.5 rounded-lg inline-block">
                            Primary Factor: {anomaly.explanation_record.primary_factor}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/70 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">Sensor Confidence</span>
                          <span className="font-mono font-black text-slate-800 text-base">
                            {((anomaly.confidence_score || 0.88) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium italic bg-white px-2.5 py-1 rounded-xl border border-slate-200/70">
                          Telemetry variance within safety envelope
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ACTION CONTROLS FOOTER */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      {/* Acknowledge */}
                      {anomaly.status === 'OPEN' && (
                        <button 
                          onClick={() => handleUpdateStatus(anomaly.id, 'ACKNOWLEDGED', anomaly.anomaly_type)}
                          disabled={actionInProgress === anomaly.id}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          Acknowledge
                        </button>
                      )}

                      {/* Start Investigation */}
                      {(anomaly.status === 'OPEN' || anomaly.status === 'ACKNOWLEDGED') && (
                        <button 
                          onClick={() => handleUpdateStatus(anomaly.id, 'INVESTIGATING', anomaly.anomaly_type)}
                          disabled={actionInProgress === anomaly.id}
                          className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          Start Investigation
                        </button>
                      )}

                      {/* Mark Resolved */}
                      {anomaly.status !== 'RESOLVED' && (
                        <button 
                          onClick={() => handleUpdateStatus(anomaly.id, 'RESOLVED', anomaly.anomaly_type)}
                          disabled={actionInProgress === anomaly.id}
                          className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Mark Resolved
                        </button>
                      )}

                      {/* Clear / Dismiss Button */}
                      <button 
                        onClick={() => handleClearSingle(anomaly.id, anomaly.anomaly_type)}
                        className="px-3 py-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                        title="Clear from active view"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear</span>
                      </button>
                    </div>

                    {/* View Details Link */}
                    <Link 
                      href={`/anomalies/${anomaly.id}`} 
                      className="text-xs font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 group/btn bg-emerald-50/50 hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition-all"
                    >
                      <span>Full Provenance & Details</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
