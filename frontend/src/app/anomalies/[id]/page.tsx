'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchAnomaly, updateAnomalyStatus } from '@/lib/api';
import { ArrowLeft, Clock, AlertCircle, CheckCircle, Activity, ChevronRight, Info } from 'lucide-react';
import Link from 'next/link';

export default function AnomalyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const anomalyId = params.id as string;
  
  const [anomaly, setAnomaly] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchAnomaly(anomalyId);
        setAnomaly(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    // Refresh every 10 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [anomalyId]);

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setUpdating(true);
      const updated = await updateAnomalyStatus(anomalyId, newStatus);
      setAnomaly((prev: any) => ({ ...prev, status: updated.status, priority_score: updated.priority_score }));
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="max-w-5xl mx-auto p-6 text-center text-gray-500">Loading anomaly details...</div>;
  }

  if (!anomaly) {
    return (
      <div className="max-w-5xl mx-auto p-6 text-center">
        <h2 className="text-xl font-bold text-gray-900">Anomaly Not Found</h2>
        <button onClick={() => router.back()} className="text-blue-600 mt-4 underline">Go Back</button>
      </div>
    );
  }

  const isCritical = anomaly.severity === 'CRITICAL';
  
  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">
      <Link href="/anomalies" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Anomalies
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header Section */}
        <div className={`p-6 border-b border-gray-200 flex justify-between items-start ${isCritical ? 'bg-red-50' : ''}`}>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {anomaly.anomaly_type.replace(/_/g, ' ')}
              </h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                isCritical ? 'bg-red-100 text-red-700' :
                anomaly.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {anomaly.severity}
              </span>
            </div>
            <p className="text-gray-600 max-w-2xl">{anomaly.description}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(anomaly.timestamp).toLocaleString()}
              </div>
              <div className="flex items-center gap-1">
                <Activity className="w-4 h-4" />
                Score: {anomaly.priority_score}
              </div>
              <div>Source: {anomaly.source_provenance}</div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <span className="text-sm font-medium text-gray-500">Current Status</span>
            <span className={`px-3 py-1 rounded-full text-sm font-bold border ${
              anomaly.status === 'OPEN' ? 'bg-red-50 text-red-600 border-red-200' :
              anomaly.status === 'ACKNOWLEDGED' ? 'bg-orange-50 text-orange-600 border-orange-200' :
              anomaly.status === 'INVESTIGATING' ? 'bg-blue-50 text-blue-600 border-blue-200' :
              'bg-green-50 text-green-600 border-green-200'
            }`}>
              {anomaly.status}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600 font-medium">Operator Actions:</div>
          <div className="flex gap-2">
            {anomaly.status === 'OPEN' && (
              <button 
                onClick={() => handleStatusUpdate('ACKNOWLEDGED')} 
                disabled={updating}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Acknowledge
              </button>
            )}
            {(anomaly.status === 'OPEN' || anomaly.status === 'ACKNOWLEDGED') && (
              <button 
                onClick={() => handleStatusUpdate('INVESTIGATING')} 
                disabled={updating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Start Investigation
              </button>
            )}
            {anomaly.status !== 'RESOLVED' && (
              <button 
                onClick={() => handleStatusUpdate('RESOLVED')} 
                disabled={updating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                Mark Resolved
              </button>
            )}
            {anomaly.status === 'RESOLVED' && (
              <button 
                onClick={() => handleStatusUpdate('OPEN')} 
                disabled={updating}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Re-open
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* AI Explanation Panel */}
          {anomaly.explanation_record && (
            <div className="bg-blue-50/30 rounded-xl border border-blue-100 p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-500" />
                Phase 3.4 Mechanistic Explanation
              </h2>
              <div className="bg-white rounded-lg p-4 border border-blue-50 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Summary</h3>
                  <p className="text-gray-900 mt-1">{anomaly.explanation_record.summary}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Detailed Analysis</h3>
                  <p className="text-gray-800 mt-1 text-sm">{anomaly.explanation_record.details}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <span className="text-xs font-semibold text-gray-500 block">Confidence</span>
                    <span className="text-lg font-bold text-gray-900">{(anomaly.explanation_record.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <span className="text-xs font-semibold text-gray-500 block">Evidence Strength</span>
                    <span className="text-lg font-bold text-gray-900">{anomaly.explanation_record.evidence_strength}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Core Metrics */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Deviation Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-500">Observed Value</div>
                <div className="text-xl font-bold text-gray-900 mt-1">{anomaly.observed_value?.toFixed(2) ?? 'N/A'}</div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-500">Expected Value</div>
                <div className="text-xl font-bold text-gray-900 mt-1">{anomaly.expected_value?.toFixed(2) ?? 'N/A'}</div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-500">Deviation</div>
                <div className={`text-xl font-bold mt-1 ${anomaly.deviation > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                  {anomaly.deviation ? (anomaly.deviation > 0 ? '+' : '') + anomaly.deviation.toFixed(2) : 'N/A'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Evidence Traces (If bio engine) */}
          {anomaly.explanation_record && anomaly.explanation_record.supporting_evidence_json && anomaly.explanation_record.supporting_evidence_json.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Supporting Evidence</h2>
              <div className="space-y-2">
                {anomaly.explanation_record.supporting_evidence_json.map((ev: any, idx: number) => (
                  <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm flex justify-between items-center">
                    <span className="font-medium text-gray-800">{ev.source_type} ({ev.sensor_type})</span>
                    <span className="text-gray-500 font-mono text-xs">Val: {ev.value?.toFixed(2)} vs Exp: {ev.expected?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
