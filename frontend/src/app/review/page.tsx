'use client';

import React from 'react';
import { Shield, FileText, CheckCircle, AlertTriangle, FileCode } from 'lucide-react';
import Link from 'next/link';

export default function ReviewWorkspacePage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Review Workspace</h1>
          <p className="text-gray-500 mt-1">Independent verifier audit portal for Evidence Chain.</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-semibold text-blue-800">Verifier View</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-100 p-6 flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Report: MR-2026-00128</h2>
            <p className="text-sm text-gray-500 mt-1">Period: Sep 1 - Sep 12, 2026 · GreenRiver Farm</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 uppercase font-semibold">Net Carbon Removed</div>
            <div className="text-2xl font-bold text-green-700">1,188 kg CO₂e</div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-6 bg-green-50 p-4 rounded-lg border border-green-100">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="text-sm font-bold text-green-800">SHA-256 Hash Verified</h3>
              <div className="text-xs text-green-600 font-mono mt-0.5">a8c7b8d4e9f1a2c3...91f2b3c4d5e6f7a8</div>
            </div>
            <div className="ml-auto text-xs text-green-700 font-medium bg-white px-2 py-1 rounded border border-green-200">
              Integrity Intact
            </div>
          </div>

          <h3 className="font-bold text-gray-900 mb-4">Evidence Bundle Checklist</h3>
          
          <div className="space-y-3 mb-8">
            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <FileCode className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm font-bold text-gray-900">Sensor Telemetry</div>
                  <div className="text-xs text-gray-500">2,880 readings · 99.4% completeness</div>
                </div>
              </div>
              <Link href="#" className="text-sm text-blue-600 font-medium">Inspect</Link>
            </div>

            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm font-bold text-gray-900">Lab Calibration Samples</div>
                  <div className="text-xs text-gray-500">4 offline dry-weight samples recorded</div>
                </div>
              </div>
              <Link href="#" className="text-sm text-blue-600 font-medium">Inspect</Link>
            </div>

            <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <FileCode className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm font-bold text-gray-900">Carbon Calculations & Assumptions</div>
                  <div className="text-xs text-gray-500">Model v1.2.0 · End-use: Bioplastic</div>
                </div>
              </div>
              <Link href="#" className="text-sm text-blue-600 font-medium">Inspect</Link>
            </div>
            
            <div className="flex items-center justify-between p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <div>
                  <div className="text-sm font-bold text-gray-900">Anomalies Detected</div>
                  <div className="text-xs text-yellow-700">3 environmental/sensor events during period</div>
                </div>
              </div>
              <Link href="/anomalies" className="text-sm text-blue-600 font-medium">Inspect</Link>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-bold text-gray-900 mb-4">Audit Action</h3>
            <textarea 
              className="w-full border border-gray-300 rounded-lg p-3 text-sm text-gray-700 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 min-h-[100px] mb-4" 
              placeholder="Add verifier notes here..."
              defaultValue="All sensor data hashes match the cryptographic chain. Nitrogen limitation correctly flagged and adjusted dynamic carbon fraction. Approved for verification record."
            ></textarea>
            
            <div className="flex gap-3">
              <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors">
                <CheckCircle className="w-4 h-4" /> Approve for Review Record
              </button>
              <button className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2 px-4 rounded-lg transition-colors">
                Request Additional Evidence
              </button>
              <button className="bg-white border border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-gray-700 font-bold py-2 px-4 rounded-lg transition-colors">
                Flag for Investigation
              </button>
            </div>
            
            <p className="text-xs text-gray-400 mt-4 italic">
              Note: AlgaX prepares evidence for downstream review; it does not issue carbon credits directly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
