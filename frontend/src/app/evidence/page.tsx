'use client';

import React from 'react';
import { Activity, FlaskConical, Image as ImageIcon, Database } from 'lucide-react';

export default function EvidencePage() {
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

        {/* Imagery */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 p-4 bg-gray-50 flex items-center gap-3">
            <ImageIcon className="w-5 h-5 text-gray-500" />
            <h2 className="font-bold text-gray-900">Imagery Analysis</h2>
          </div>
          <div className="p-6 flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3 bg-gray-200 rounded-lg min-h-[160px] flex flex-col items-center justify-center text-gray-400 relative">
              <ImageIcon className="w-8 h-8 opacity-50 mb-2" />
              <span className="text-xs uppercase tracking-wider font-bold">Drone Pass</span>
              <div className="absolute inset-0 bg-green-500 opacity-20 mix-blend-multiply rounded-lg"></div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Visual Model Confirmation</h3>
              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div><span className="block text-gray-500 text-xs mb-1">Greenness Index</span><span className="font-medium text-green-700">0.74</span></div>
                <div><span className="block text-gray-500 text-xs mb-1">Coverage</span><span className="font-medium">92%</span></div>
                <div><span className="block text-gray-500 text-xs mb-1">Imagery Signal</span><span className="font-medium">0.82 g/L</span></div>
                <div><span className="block text-gray-500 text-xs mb-1">Model Comparison</span><span className="font-medium text-blue-600">Within 3.4% error margin</span></div>
              </div>
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
      </div>
    </div>
  );
}
