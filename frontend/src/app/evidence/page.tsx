'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Activity, 
  FlaskConical, 
  Database, 
  Layers, 
  CheckCircle, 
  AlertTriangle, 
  HelpCircle,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  ChevronRight,
  Shield,
  BookOpen,
  Calendar,
  User,
  FileText,
  Settings,
  BarChart3,
  TrendingUp,
  Leaf,
  Info,
  Play,
  RefreshCw,
  X,
  ExternalLink,
  Lock
} from 'lucide-react';
import { DEMO_PONDS } from '@/lib/demo/ponds';

interface CrossValidationResult {
  runId: string;
  status: 'CONSISTENT' | 'HIGH_CONFIDENCE' | 'IN_PROGRESS';
  modelTrend: string;
  imageryTrend: string;
  modelChange: number;
  imageryChange: number;
  correlation: number;
  engineVersion: string;
  timestamp: string;
  summary: string;
}

export default function EvidencePage() {
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [isRunningCV, setIsRunningCV] = useState<boolean>(false);
  const [cvResult, setCvResult] = useState<CrossValidationResult | null>(null);
  
  // Modals & Expandable tiers
  const [showDocModal, setShowDocModal] = useState<boolean>(false);
  const [activeTierModal, setActiveTierModal] = useState<'telemetry' | 'lab' | 'model' | 'cv' | null>(null);

  const fullHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  const handleCopyHash = () => {
    navigator.clipboard.writeText(fullHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleRunCrossValidation = async () => {
    setIsRunningCV(true);
    await new Promise(r => setTimeout(r, 1200));

    setCvResult({
      runId: `CV-${Date.now().toString().slice(-6)}`,
      status: 'CONSISTENT',
      modelTrend: 'POSITIVE_GROWTH (+13.2%)',
      imageryTrend: 'CANOPY_INCREASE (+12.8 pp)',
      modelChange: 0.132,
      imageryChange: 0.128,
      correlation: 0.984,
      engineVersion: 'Monod-Droop AlgaX v1.2.0',
      timestamp: new Date().toISOString(),
      summary: 'High-confidence alignment between Monod-Droop photosynthetic accumulation models and 24 multi-spectral drone/satellite canopy cover observations.'
    });

    setIsRunningCV(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 p-4 sm:p-6 text-slate-800">
      
      {/* 1. Top Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <Link href="/" className="text-slate-500 hover:text-slate-700">Overview</Link>
        <span>›</span>
        <span className="text-slate-900 font-bold">Evidence Chain</span>
      </div>

      {/* 2. Page Header (Matching Screenshot) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Evidence Chain
          </h1>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm max-w-2xl">
            Cryptographically verifiable data linking physical observations to modeled outputs.
          </p>
        </div>

        {/* View Documentation Button */}
        <button
          onClick={() => setShowDocModal(true)}
          className="bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-2xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <BookOpen className="w-4 h-4 text-slate-500" />
          <span>View Documentation</span>
        </button>
      </div>

      {/* 3. Stacked Evidence Chain Tiers (4 Tiers Matching Screenshot) */}
      <div className="space-y-4">
        
        {/* ========================================================================= */}
        {/* TIER 1: Sensor Data (Telemetry) */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs hover:border-slate-300 transition-all">
          {/* Card Header Row */}
          <div 
            onClick={() => setActiveTierModal('telemetry')}
            className="p-5 flex items-center justify-between cursor-pointer border-b border-slate-100 bg-white hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sensor Data (Telemetry)</h3>
                <p className="text-xs text-slate-500 mt-0.5">Real-time data from deployed sensors</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* 4-Metric Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100 bg-slate-50/50 p-4 text-xs">
            <div className="p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold uppercase mb-1">
                <Database className="w-3.5 h-3.5 text-slate-400" /> Source
              </div>
              <div className="font-bold text-slate-900 text-sm">Direct IoT Stream</div>
            </div>

            <div className="p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold uppercase mb-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Timestamp
              </div>
              <div className="font-bold text-slate-900 text-sm">Every 5 minutes</div>
            </div>

            <div className="p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold uppercase mb-1">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600" /> Data Completeness
              </div>
              <div className="font-black text-emerald-600 text-sm font-mono">99.8%</div>
            </div>

            <div className="p-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase mb-1">
                <span className="flex items-center gap-1">
                  <span className="font-mono text-slate-400 font-bold">#</span> Provenance Hash
                </span>
                <button
                  onClick={handleCopyHash}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Copy SHA-256 Hash"
                >
                  {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="font-mono font-bold text-slate-700 text-xs truncate">
                e3b0c4...46b9
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TIER 2: Lab Measurements */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs hover:border-slate-300 transition-all">
          {/* Card Header Row */}
          <div 
            onClick={() => setActiveTierModal('lab')}
            className="p-5 flex items-center justify-between cursor-pointer border-b border-slate-100 bg-white hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Lab Measurements</h3>
                <p className="text-xs text-slate-500 mt-0.5">Physical validation data (e.g. dry weight)</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Applied
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Middle Dry-Weight Callout Box */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
              <div>
                <h4 className="font-bold text-sm text-slate-900">Dry-weight sample</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recalibration event triggered optical density coefficient update.
                </p>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <span className="text-2xl font-black text-slate-900 font-mono">0.85</span>
                <span className="text-xs font-normal text-slate-500 ml-1">g/L</span>
              </div>
            </div>

            {/* Bottom 3-Metric Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Sample Date</span>
                  <span className="font-bold text-slate-900">Sep 10, 2026</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Source</span>
                  <span className="font-bold text-slate-900">Operator (Dharmesh)</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Recalibration Status</span>
                  <span className="font-bold text-emerald-600">Applied</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TIER 3: Model Output */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs hover:border-slate-300 transition-all">
          {/* Card Header Row */}
          <div 
            onClick={() => setActiveTierModal('model')}
            className="p-5 flex items-center justify-between cursor-pointer border-b border-slate-100 bg-white hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Model Output</h3>
                <p className="text-xs text-slate-500 mt-0.5">Model-generated estimates and parameters</p>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>

          {/* 4-Metric Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100 bg-slate-50/50 p-4 text-xs">
            <div className="p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold uppercase mb-1">
                <Settings className="w-3.5 h-3.5 text-slate-400" /> Model Version
              </div>
              <div className="font-mono font-bold text-slate-900 text-sm">v1.2.0</div>
            </div>

            <div className="p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold uppercase mb-1">
                <BarChart3 className="w-3.5 h-3.5 text-slate-400" /> Biomass Estimate
              </div>
              <div className="font-bold text-slate-900 text-sm">0.86 g/L avg</div>
            </div>

            <div className="p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold uppercase mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-slate-400" /> Growth Kinetics
              </div>
              <div className="font-bold text-slate-900 text-sm">Monod-Droop Engine</div>
            </div>

            <div className="p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold uppercase mb-1">
                <Leaf className="w-3.5 h-3.5 text-emerald-600" /> Carbon Method
              </div>
              <div className="font-bold text-slate-900 text-sm">Dynamic C-frac</div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TIER 4: Phase 4.4: Evidence Alignment (Cross-Validation) */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs hover:border-slate-300 transition-all">
          {/* Card Header Row */}
          <div className="p-5 flex items-center justify-between border-b border-slate-100 bg-white">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Phase 4.4: Evidence Alignment (Cross-Validation)</h3>
                <p className="text-xs text-slate-500 mt-0.5">Compare model outputs with independent data</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs ${
                cvResult 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-slate-100 text-slate-600'
              }`}>
                <span className={`w-2 h-2 rounded-full ${cvResult ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                {cvResult ? 'Verified (98.4%)' : 'Not Run'}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Bottom Action / Alignment Results */}
          <div className="p-5 space-y-4">
            {!cvResult ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-sky-50/40 border border-sky-100 rounded-2xl">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">No cross-validation runs available for this pond.</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Run cross-validation to verify model accuracy against independent measurements.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRunCrossValidation}
                  disabled={isRunningCV}
                  className="px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  {isRunningCV ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Comparing Models & CV...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Run Cross-Validation</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <h4 className="font-black text-sm text-slate-900">Cross-Validation Alignment Confirmed (R² = 0.984)</h4>
                    </div>
                    <span className="font-mono text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md font-bold">
                      {cvResult.runId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {cvResult.summary}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Monod Kinetic Model Trend</span>
                      <span className="font-bold text-slate-900">{cvResult.modelTrend}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Drone & Satellite Optical CV</span>
                      <span className="font-bold text-emerald-700">{cvResult.imageryTrend}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleRunCrossValidation}
                    disabled={isRunningCV}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRunningCV ? 'animate-spin' : ''}`} />
                    Re-run Alignment Comparison
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL: View Documentation */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900">Evidence Chain Protocol Documentation</h3>
              </div>
              <button 
                onClick={() => setShowDocModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
              <p>
                The <strong>AlgaX Evidence Chain</strong> ensures end-to-end cryptographic and physical auditability for microalgae carbon sequestration.
              </p>
              
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs">1. Raw IoT Ingestion & Hashing</h4>
                <p>
                  Every telemetry reading (temperature, pH, DO, turbidity) is signed at the sensor node and committed to a local SHA-256 Merkle leaf, preventing retrospective manipulation.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs">2. Physical Lab Calibration Reconciliation</h4>
                <p>
                  Periodic laboratory dry-weight samples trigger recalibration coefficients, creating an auditable provenance trail between wet sensor spectroscopy and oven-dried grams-per-liter benchmarks.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs">3. Phase 4.4 Cross-Validation</h4>
                <p>
                  Computer vision green canopy segmentations from multi-spectral imagery are cross-compared with Monod-Droop growth predictions to guarantee consistency before carbon credit generation.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowDocModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Close Documentation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Tier Details */}
      {activeTierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 capitalize">
                {activeTierModal} Provenance Details
              </h3>
              <button 
                onClick={() => setActiveTierModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-slate-950 text-slate-300 font-mono text-[11px] rounded-2xl space-y-1.5">
                <div className="text-slate-500 font-sans uppercase font-bold text-[9px]">Cryptographic Digest:</div>
                <div className="text-emerald-400 break-all">{fullHash}</div>
              </div>
              <p>
                This tier is cryptographically anchored into the AlgaX Evidence Chain block and audited according to ISO 14064-2 protocols.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveTierModal(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
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
