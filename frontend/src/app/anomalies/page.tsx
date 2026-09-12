'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, ArrowRight, Filter, Clock, CheckCircle } from 'lucide-react';
import { fetchAnomalies } from '@/lib/api';
import Link from 'next/link';

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('OPEN');

  const loadData = async () => {
    try {
      // Fetch OPEN anomalies by default, or all if not filtering
      const statusParam = activeFilter === 'All' ? undefined : activeFilter;
      const data = await fetchAnomalies(1, 50, statusParam);
      // Sort by priority_score descending
      const sorted = data.items.sort((a: any, b: any) => b.priority_score - a.priority_score);
      setAnomalies(sorted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [activeFilter]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Anomaly Center</h1>
          <p className="text-gray-500 mt-1">Unified view of biological, environmental, and sensor deviations.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded text-sm text-gray-600 bg-white hover:bg-gray-50">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {['OPEN', 'INVESTIGATING', 'ACKNOWLEDGED', 'RESOLVED', 'All'].map(filter => (
          <button 
            key={filter} 
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              activeFilter === filter 
                ? 'bg-gray-900 text-white border-gray-900' 
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {loading && anomalies.length === 0 ? (
        <div className="text-center text-gray-500 py-12">Loading anomaly intelligence...</div>
      ) : anomalies.length === 0 ? (
        <div className="text-center text-gray-500 py-12 border border-dashed border-gray-300 rounded-xl bg-gray-50">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="font-medium text-gray-900">No matching anomalies</p>
          <p className="text-sm">The system is operating within expected parameters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {anomalies.map((anomaly) => (
            <div key={anomaly.id} className="bg-white rounded-xl border border-gray-200 p-6 flex gap-4 hover:shadow-md transition-shadow relative overflow-hidden">
              
              {/* Priority Bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                anomaly.severity === 'CRITICAL' ? 'bg-red-500' :
                anomaly.severity === 'HIGH' ? 'bg-orange-500' :
                anomaly.severity === 'MEDIUM' ? 'bg-yellow-400' : 'bg-blue-400'
              }`} />

              <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                anomaly.severity === 'CRITICAL' ? 'bg-red-100 text-red-600' :
                anomaly.severity === 'HIGH' ? 'bg-orange-100 text-orange-500' :
                anomaly.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-600' :
                'bg-blue-100 text-blue-500'
              }`}>
                {anomaly.status === 'RESOLVED' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              </div>
              
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-gray-900">{anomaly.anomaly_type.replace(/_/g, ' ')}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        anomaly.severity === 'CRITICAL' ? 'bg-red-50 text-red-600 border border-red-100' :
                        anomaly.severity === 'HIGH' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                        anomaly.severity === 'MEDIUM' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' :
                        'bg-blue-50 text-blue-600 border border-blue-100'
                      }`}>
                        {anomaly.severity}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200">
                        {anomaly.source_provenance.replace('_engine', '')}
                      </span>
                      {anomaly.priority_score > 60 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-100">
                          High Priority ({anomaly.priority_score})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(anomaly.timestamp).toLocaleString()}</span>
                      <span>·</span>
                      <span className="font-medium text-gray-700">{anomaly.status}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Observed</span>
                    <p className="text-sm text-gray-900">{anomaly.description}</p>
                    {anomaly.observed_value && (
                      <p className="text-xs text-gray-500 mt-2 font-mono">
                        Val: {anomaly.observed_value.toFixed(2)} (Expected: {anomaly.expected_value?.toFixed(2) || 'N/A'})
                      </p>
                    )}
                  </div>
                  
                  {anomaly.explanation_record ? (
                    <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-lg">
                      <span className="text-xs font-semibold text-blue-800 uppercase block mb-1">AI Explanation</span>
                      <p className="text-sm text-gray-900">{anomaly.explanation_record.summary}</p>
                      {anomaly.explanation_record.primary_factor && (
                        <p className="text-xs text-blue-700 mt-2 font-medium">
                          Primary Factor: {anomaly.explanation_record.primary_factor}
                        </p>
                      )}
                    </div>
                  ) : anomaly.explanation && Object.keys(anomaly.explanation).length > 0 ? (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Context</span>
                      <p className="text-sm text-gray-900">{JSON.stringify(anomaly.explanation)}</p>
                    </div>
                  ) : null}
                </div>
                
                <div className="mt-5 flex items-center justify-between">
                  <div className="flex gap-3">
                    <Link href={`/anomalies/${anomaly.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                      Investigate <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
