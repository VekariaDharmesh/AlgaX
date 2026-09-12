'use client';

import React, { useState, useEffect } from 'react';
import { Activity, FlaskConical, Database, Layers, CheckCircle, AlertTriangle, HelpCircle } from 'lucide-react';

import { fetchPonds, API_BASE_URL } from '@/lib/api';

interface CrossValidationRun {
  id: string;
  comparison_window_start: string | null;
  comparison_window_end: string | null;
  model_trend: string | null;
  imagery_trend: string | null;
  model_change: number | null;
  imagery_change: number | null;
  temporal_alignment_status: string;
  result_status: string;
  confidence: string;
  evidence_summary: string;
  created_at: string;
  engine_version: string;
}

export default function EvidencePage() {
  const [cvRuns, setCvRuns] = useState<CrossValidationRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch a pond first, then its CV runs
    const fetchCV = async () => {
      try {
        const ponds = await fetchPonds();
        if (ponds && ponds.length > 0) {
          const cvRes = await fetch(`${API_BASE_URL}/ponds/${ponds[0].id}/cross-validation`);
          const data = await cvRes.json();
          setCvRuns(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCV();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Evidence Chain</h1>
        <p className="text-gray-500 mt-1">Cryptographically verifiable data linking physical observations to modeled outputs.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Sensor Data */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 p-4 bg-gray-50 flex items-center gap-3">
            <Activity className="w-5 h-5 text-gray-500" />
            <h2 className="font-bold text-gray-900">Sensor Data (Telemetry)</h2>
          </div>
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="block text-gray-500 text-xs mb-1">Source</span><span className="font-medium">Direct IoT Stream</span></div>
            <div><span className="block text-gray-500 text-xs mb-1">Timestamp</span><span className="font-medium">Every 5 minutes</span></div>
            <div><span className="block text-gray-500 text-xs mb-1">Data Completeness</span><span className="font-medium text-green-600">99.8%</span></div>
            <div><span className="block text-gray-500 text-xs mb-1">Provenance Hash</span><span className="font-mono text-gray-400">e3b0c4...46b9</span></div>
          </div>
        </div>

        {/* Lab Measurements */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 p-4 bg-gray-50 flex items-center gap-3">
            <FlaskConical className="w-5 h-5 text-gray-500" />
            <h2 className="font-bold text-gray-900">Lab Measurements</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                <div className="font-bold text-gray-900">Dry-weight sample</div>
                <div className="text-sm text-gray-500 mt-1">Recalibration event triggered optical density coefficient update.</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">0.85 <span className="text-sm text-gray-500">g/L</span></div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm mt-4">
              <div><span className="block text-gray-500 text-xs mb-1">Sample Date</span><span className="font-medium">Sep 10, 2026</span></div>
              <div><span className="block text-gray-500 text-xs mb-1">Source</span><span className="font-medium">Operator (Dharmesh)</span></div>
              <div><span className="block text-gray-500 text-xs mb-1">Recalibration Status</span><span className="font-medium text-green-600">Applied</span></div>
            </div>
          </div>
        </div>

        {/* Model Output */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 p-4 bg-gray-50 flex items-center gap-3">
            <Database className="w-5 h-5 text-gray-500" />
            <h2 className="font-bold text-gray-900">Model Output</h2>
          </div>
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="block text-gray-500 text-xs mb-1">Model Version</span><span className="font-mono text-gray-900">v1.2.0</span></div>
            <div><span className="block text-gray-500 text-xs mb-1">Biomass Estimate</span><span className="font-medium">0.86 g/L avg</span></div>
            <div><span className="block text-gray-500 text-xs mb-1">Growth Kinetics</span><span className="font-medium text-gray-900">Monod-Droop Engine</span></div>
            <div><span className="block text-gray-500 text-xs mb-1">Carbon Method</span><span className="font-medium text-gray-900">Dynamic C-frac</span></div>
          </div>
        </div>
        
        {/* Cross Validation Alignment */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-2">
          <div className="border-b border-gray-200 p-4 bg-indigo-50 flex items-center gap-3">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-gray-900">Phase 4.4: Evidence Alignment (Cross-Validation)</h2>
          </div>
          <div className="p-6">
            {loading ? (
              <p className="text-gray-500 text-sm">Loading alignment evidence...</p>
            ) : cvRuns.length > 0 ? (
              <div className="space-y-4">
                {cvRuns.map((run) => (
                  <div key={run.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          {run.result_status === 'CONSISTENT' && <CheckCircle className="w-5 h-5 text-green-500" />}
                          {run.result_status === 'INCONSISTENT' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                          {run.result_status === 'PARTIALLY_CONSISTENT' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                          {run.result_status === 'INSUFFICIENT_EVIDENCE' && <HelpCircle className="w-5 h-5 text-gray-500" />}
                          <span className="font-bold text-gray-900">Result: {run.result_status.replace(/_/g, ' ')}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{run.evidence_summary}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block mb-1">Confidence</span>
                        <span className={`text-sm font-semibold px-2 py-1 rounded-full ${
                          run.confidence === 'HIGH' ? 'bg-green-100 text-green-700' :
                          run.confidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {run.confidence}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded border border-gray-100">
                      <div>
                        <span className="block text-gray-500 text-xs mb-1">Model Trend</span>
                        <span className="font-medium">{run.model_trend || 'N/A'} {run.model_change !== null ? `(${(run.model_change * 100).toFixed(1)}%)` : ''}</span>
                      </div>
                      <div>
                        <span className="block text-gray-500 text-xs mb-1">Imagery Trend</span>
                        <span className="font-medium">{run.imagery_trend || 'N/A'} {run.imagery_change !== null ? `(${(run.imagery_change * 100).toFixed(1)} pp)` : ''}</span>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-400 font-mono">
                      Run ID: {run.id} | Engine: {run.engine_version}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No cross-validation runs available for this pond.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
