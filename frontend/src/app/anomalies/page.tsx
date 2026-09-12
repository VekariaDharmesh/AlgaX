'use client';

import React from 'react';
import { DEMO_ANOMALIES } from '@/lib/demo/anomalies';
import { AlertCircle, ArrowRight, Filter } from 'lucide-react';

export default function AnomaliesPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Anomalies</h1>
          <p className="text-gray-500 mt-1">Environmental and sensor deviations detected by the system.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded text-sm text-gray-600 bg-white hover:bg-gray-50">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {['All', 'Environmental', 'Sensor', 'Growth', 'Critical', 'Resolved'].map(filter => (
          <button key={filter} className={`px-4 py-1.5 rounded-full text-sm font-medium border ${filter === 'All' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {filter}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {DEMO_ANOMALIES.map((anomaly) => (
          <div key={anomaly.id} className="bg-white rounded-xl border border-gray-200 p-6 flex gap-4 hover:shadow-sm transition-shadow">
            <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              anomaly.severity === 'HIGH' ? 'bg-red-100 text-red-600' :
              anomaly.severity === 'MEDIUM' ? 'bg-orange-100 text-orange-500' :
              'bg-blue-100 text-blue-500'
            }`}>
              <AlertCircle className="w-5 h-5" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-900">{anomaly.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      anomaly.severity === 'HIGH' ? 'bg-red-50 text-red-600 border border-red-100' :
                      anomaly.severity === 'MEDIUM' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                      'bg-blue-50 text-blue-600 border border-blue-100'
                    }`}>
                      {anomaly.severity}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200">
                      {anomaly.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{anomaly.pondName} · {anomaly.timeAgo}</p>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Observed</span>
                  <p className="text-sm text-gray-900">{anomaly.description}</p>
                </div>
                {anomaly.explanation && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Likely Impact / Explanation</span>
                    <p className="text-sm text-gray-900">{anomaly.explanation}</p>
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex gap-3">
                <button className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  View Pond <ArrowRight className="w-4 h-4" />
                </button>
                <button className="text-sm font-medium text-gray-500 hover:text-gray-800 flex items-center gap-1">
                  Add Review Note
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
