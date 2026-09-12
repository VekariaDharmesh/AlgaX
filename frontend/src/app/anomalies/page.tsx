'use client';

import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  ArrowRight, 
  Filter, 
  Clock, 
  CheckCircle, 
  Activity, 
  CheckCheck, 
  ShieldAlert,
  RotateCcw
} from 'lucide-react';
import { fetchAnomalies, updateAnomalyStatus } from '@/lib/api';
import { useAnomalyNotification } from '@/context/AnomalyContext';
import Link from 'next/link';

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('OPEN');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { refreshAnomalies } = useAnomalyNotification();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async (filter = activeFilter) => {
    try {
      setLoading(true);
      const statusParam = filter === 'All' ? undefined : filter;
      const data = await fetchAnomalies(1, 50, statusParam, true);
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
    const openItems = anomalies.filter(a => a.status === 'OPEN');
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

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-emerald-500/50 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-rose-500" />
            Anomaly & Deviation Center
          </h1>
          <p className="text-xs text-gray-500 mt-1">Real-time biological kinetics, environmental parameters, and hardware sensor telemetry deviations.</p>
        </div>
        <div className="flex items-center gap-2">
          {activeFilter === 'OPEN' && anomalies.length > 0 && (
            <button 
              onClick={handleAcknowledgeAll}
              disabled={actionInProgress !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4 text-emerald-400" />
              {actionInProgress === 'all' ? 'Processing...' : 'Acknowledge All Open'}
            </button>
          )}
          <button 
            onClick={() => loadData(activeFilter)} 
            className="p-2 border border-gray-200 rounded-xl text-gray-600 bg-white hover:bg-gray-50 text-xs font-bold transition-all shadow-xs"
            title="Refresh anomalies"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['OPEN', 'INVESTIGATING', 'ACKNOWLEDGED', 'RESOLVED', 'All'].map(filter => (
          <button 
            key={filter} 
            onClick={() => {
              setActiveFilter(filter);
              loadData(filter);
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
              activeFilter === filter 
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {loading && anomalies.length === 0 ? (
        <div className="text-center text-gray-500 py-16 text-sm font-medium">
          <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Scanning telemetry streams & anomaly intelligence...
        </div>
      ) : anomalies.length === 0 ? (
        <div className="text-center text-gray-500 py-16 border border-dashed border-gray-300 rounded-2xl bg-white shadow-2xs">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <p className="font-bold text-gray-900 text-sm">No anomalies in "{activeFilter}" state</p>
          <p className="text-xs text-gray-400 mt-1">All raceway biological models and sensors are reporting nominal telemetry.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {anomalies.map((anomaly) => {
            const isCritical = anomaly.severity === 'CRITICAL';
            const isHigh = anomaly.severity === 'HIGH';
            const isMed = anomaly.severity === 'MEDIUM';

            return (
              <div 
                key={anomaly.id} 
                className="bg-white rounded-2xl border border-gray-200/90 p-5 flex flex-col md:flex-row gap-4 hover:shadow-md transition-all relative overflow-hidden group shadow-2xs"
              >
                {/* Priority Indicator Bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                  isCritical ? 'bg-rose-500' :
                  isHigh ? 'bg-orange-500' :
                  isMed ? 'bg-amber-400' : 'bg-sky-400'
                }`} />

                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  isCritical ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                  isHigh ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                  isMed ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                  'bg-sky-50 text-sky-600 border border-sky-100'
                }`}>
                  {anomaly.status === 'RESOLVED' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base font-black text-gray-900 tracking-tight">
                        {anomaly.anomaly_type.replace(/_/g, ' ')}
                      </h3>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isCritical ? 'bg-rose-100 text-rose-700' :
                        isHigh ? 'bg-orange-100 text-orange-700' :
                        isMed ? 'bg-amber-100 text-amber-800' :
                        'bg-sky-100 text-sky-800'
                      }`}>
                        {anomaly.severity}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        {anomaly.source_provenance?.replace('_engine', '') || 'Telemetry'}
                      </span>
                      {anomaly.priority_score > 50 && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                          Priority {anomaly.priority_score}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(anomaly.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                      <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                        anomaly.status === 'OPEN' ? 'bg-rose-50 text-rose-700' :
                        anomaly.status === 'ACKNOWLEDGED' ? 'bg-amber-50 text-amber-700' :
                        anomaly.status === 'INVESTIGATING' ? 'bg-blue-50 text-blue-700' :
                        'bg-emerald-50 text-emerald-700'
                      }`}>
                        {anomaly.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-xs">
                      <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Observed Telemetry</span>
                      <p className="text-gray-800 font-medium">{anomaly.description}</p>
                      {anomaly.observed_value !== undefined && anomaly.observed_value !== null && (
                        <div className="mt-1.5 flex items-center gap-2 font-mono text-[11px] text-slate-500">
                          <span>Observed: <strong className="text-slate-800">{Number(anomaly.observed_value).toFixed(2)}</strong></span>
                          <span>•</span>
                          <span>Expected: <strong className="text-slate-800">{anomaly.expected_value !== null && anomaly.expected_value !== undefined ? Number(anomaly.expected_value).toFixed(2) : 'Nominal'}</strong></span>
                        </div>
                      )}
                    </div>
                    
                    {anomaly.explanation_record ? (
                      <div className="bg-blue-50/60 border border-blue-100 p-3 rounded-xl text-xs">
                        <span className="font-bold text-[10px] text-blue-800 uppercase tracking-wider block mb-1">Mechanistic Cause & Explanations</span>
                        <p className="text-blue-900 font-medium">{anomaly.explanation_record.summary}</p>
                        {anomaly.explanation_record.primary_factor && (
                          <p className="text-[11px] text-blue-700 mt-1 font-semibold">
                            Primary Factor: {anomaly.explanation_record.primary_factor}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">Sensor Confidence</span>
                          <span className="font-mono font-bold text-slate-700 text-sm">{((anomaly.confidence_score || 0.85) * 100).toFixed(0)}%</span>
                        </div>
                        <span className="text-[11px] text-slate-400 italic">No biological crash risk identified</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Action Controls */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      {anomaly.status === 'OPEN' && (
                        <button 
                          onClick={() => handleUpdateStatus(anomaly.id, 'ACKNOWLEDGED', anomaly.anomaly_type)}
                          disabled={actionInProgress === anomaly.id}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          Acknowledge
                        </button>
                      )}
                      {(anomaly.status === 'OPEN' || anomaly.status === 'ACKNOWLEDGED') && (
                        <button 
                          onClick={() => handleUpdateStatus(anomaly.id, 'INVESTIGATING', anomaly.anomaly_type)}
                          disabled={actionInProgress === anomaly.id}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          Start Investigation
                        </button>
                      )}
                      {anomaly.status !== 'RESOLVED' && (
                        <button 
                          onClick={() => handleUpdateStatus(anomaly.id, 'RESOLVED', anomaly.anomaly_type)}
                          disabled={actionInProgress === anomaly.id}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Mark Resolved
                        </button>
                      )}
                    </div>

                    <Link 
                      href={`/anomalies/${anomaly.id}`} 
                      className="text-xs font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1 group/btn"
                    >
                      Full Provenance & Details 
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
