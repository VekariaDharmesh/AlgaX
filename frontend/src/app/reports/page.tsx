"use client";

import { useState, useEffect } from "react";
import { 
  Download, ExternalLink, Shield, Calendar, RefreshCw, 
  FileCode, FileText, CheckCircle2, AlertTriangle, X, Sparkles, Copy, Check
} from "lucide-react";
import Link from "next/link";
import { API_BASE_URL, fetchPonds, verifyPackageHash, fetchCanonicalJson, HashVerificationResult } from "@/lib/api";

export default function ReportsPage() {
  const [ponds, setPonds] = useState<any[]>([]);
  const [selectedPond, setSelectedPond] = useState<string>("");
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Date range state
  const defaultEnd = new Date().toISOString().split("T")[0];
  const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [isGenerating, setIsGenerating] = useState(false);

  // Modals state
  const [activeVerifyPkgId, setActiveVerifyPkgId] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<HashVerificationResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [activeJsonPkgId, setActiveJsonPkgId] = useState<string | null>(null);
  const [jsonContent, setJsonContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchPonds()
      .then((data) => {
        setPonds(data);
        if (data.length > 0) setSelectedPond(data[0].id);
        setLoading(false);
      });
  }, []);

  const loadPackages = (pondId: string) => {
    if (!pondId) return;
    fetch(`${API_BASE_URL}/ponds/${pondId}/evidence-packages`)
      .then((res) => res.json())
      .then((data) => setPackages(data))
      .catch((err) => console.error("Error loading packages:", err));
  };

  useEffect(() => {
    if (selectedPond) {
      loadPackages(selectedPond);
    }
  }, [selectedPond]);

  const generatePackage = async () => {
    if (!selectedPond) return;
    setIsGenerating(true);

    try {
      const sDate = new Date(startDate).toISOString();
      const eDate = new Date(endDate).toISOString();

      await fetch(`${API_BASE_URL}/ponds/${selectedPond}/evidence-packages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporting_period_start: sDate,
          reporting_period_end: eDate
        })
      });

      loadPackages(selectedPond);
    } catch (err) {
      console.error("Failed to generate package:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVerifyHash = async (pkgId: string) => {
    setActiveVerifyPkgId(pkgId);
    setVerifying(true);
    try {
      const res = await verifyPackageHash(pkgId);
      setVerifyResult(res);
    } catch (err) {
      console.error("Verification failed:", err);
    } finally {
      setVerifying(false);
    }
  };

  const handleInspectJson = async (pkgId: string) => {
    setActiveJsonPkgId(pkgId);
    try {
      const data = await fetchCanonicalJson(pkgId);
      setJsonContent(JSON.stringify(data.payload, null, 2));
    } catch (err) {
      console.error("Failed to fetch JSON:", err);
    }
  };

  const handleCopyJson = () => {
    if (!jsonContent) return;
    navigator.clipboard.writeText(jsonContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-12 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-sky-500 mb-2" />
        Loading Evidence Packages...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 p-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            Evidence & Reporting
            <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
              PHASE 6 VERIFICATION-READY
            </span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Assemble stored telemetry, biomass, carbon accounting, anomalies, and imagery into cryptographic SHA-256 evidence bundles.
          </p>
        </div>
      </div>

      {/* Package Generation Controls Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-600" />
          Specify Reporting Period Context
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Select Pond</label>
            <select
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={selectedPond}
              onChange={(e) => setSelectedPond(e.target.value)}
            >
              {ponds.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Reporting Start</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Reporting End</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={generatePackage}
              disabled={isGenerating}
              className="w-full px-4 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate Evidence Package
            </button>
          </div>
        </div>
      </div>

      {/* Package List */}
      <div className="space-y-4">
        {packages.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-semibold">No evidence packages generated for this pond period yet.</p>
            <p className="text-xs text-slate-400 mt-1">Select dates above and click "Generate Evidence Package".</p>
          </div>
        ) : (
          packages.map(pkg => (
            <div key={pkg.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              
              {/* Package Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-extrabold text-slate-900">Evidence Package v{pkg.package_version}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      pkg.status === 'READY_FOR_REVIEW' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                      pkg.status === 'DRAFT' ? 'bg-sky-100 text-sky-800 border border-sky-200' :
                      'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {pkg.status}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-800">
                      {pkg.completeness}
                    </span>
                    {pkg.contains_simulated_data && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded">
                        SIMULATED DATA
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Reporting Period: <strong>{new Date(pkg.reporting_period_start).toLocaleDateString()}</strong> to <strong>{new Date(pkg.reporting_period_end).toLocaleDateString()}</strong>
                  </p>
                </div>

                {/* Quick Action Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleVerifyHash(pkg.id)}
                    className="text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Verify Hash
                  </button>
                  <button
                    onClick={() => handleInspectJson(pkg.id)}
                    className="text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    Canonical JSON
                  </button>
                  <a
                    href={`${API_BASE_URL}/evidence-packages/${pkg.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Report
                  </a>
                  <Link
                    href={`/review?pkg_id=${pkg.id}`}
                    className="text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Review Workspace
                  </Link>
                </div>
              </div>

              {/* Package Content Grid */}
              <div className="p-5 space-y-4">
                
                {/* Evidence Metrics Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 uppercase font-semibold text-[10px] block">Sensor Telemetry</span>
                    <span className="font-bold text-slate-800 text-sm">{pkg.sensor_evidence_json?.length || 0} readings</span>
                    <span className="text-[10px] text-sky-600 block mt-0.5">OBSERVED</span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 uppercase font-semibold text-[10px] block">Model Runs</span>
                    <span className="font-bold text-slate-800 text-sm">{pkg.model_evidence_json?.length || 0} runs</span>
                    <span className="text-[10px] text-emerald-600 block mt-0.5">MODELLED</span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 uppercase font-semibold text-[10px] block">Carbon Sequestration</span>
                    <span className="font-bold text-slate-800 text-sm">{pkg.carbon_evidence_json?.length || 0} estimates</span>
                    <span className="text-[10px] text-amber-600 block mt-0.5">DERIVED</span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 uppercase font-semibold text-[10px] block">Anomalies Logged</span>
                    <span className="font-bold text-slate-800 text-sm">{pkg.anomaly_evidence_json?.length || 0} events</span>
                    <span className="text-[10px] text-purple-600 block mt-0.5">DETECTED</span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 uppercase font-semibold text-[10px] block">Imagery / CV</span>
                    <span className="font-bold text-slate-800 text-sm">{(pkg.imagery_evidence_json?.length || 0) + (pkg.cross_validation_evidence_json?.length || 0)} records</span>
                    <span className="text-[10px] text-teal-600 block mt-0.5">CROSS-VALIDATED</span>
                  </div>
                </div>

                {/* SHA-256 Hash Digest Preview */}
                <div className="bg-slate-900 text-slate-300 rounded-xl p-3.5 flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-slate-500 font-sans uppercase font-bold text-[10px] shrink-0">SHA-256 Hash:</span>
                    <span className="text-sky-400 truncate">{pkg.canonical_hash || "Not computed"}</span>
                  </div>
                  <button
                    onClick={() => handleVerifyHash(pkg.id)}
                    className="text-[11px] font-sans font-bold bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 px-2.5 py-1 rounded-md border border-sky-400/30 transition-colors shrink-0 ml-3"
                  >
                    Check Hash
                  </button>
                </div>

              </div>

            </div>
          ))
        )}
      </div>

      {/* SHA-256 Verification Modal */}
      {activeVerifyPkgId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900">Cryptographic SHA-256 Hash Verification</h3>
              </div>
              <button onClick={() => setActiveVerifyPkgId(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {verifying ? (
              <div className="p-8 text-center text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-sky-500 mb-2" />
                Recomputing canonical JSON & checking SHA-256 digest...
              </div>
            ) : verifyResult ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                  verifyResult.integrity_match
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border-rose-200'
                }`}>
                  {verifyResult.integrity_match ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <h4 className="font-extrabold text-sm uppercase tracking-wide">{verifyResult.status}</h4>
                    <p className="text-xs mt-0.5">{verifyResult.message}</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs font-mono bg-slate-900 text-slate-300 p-4 rounded-xl">
                  <div>
                    <span className="text-slate-500 uppercase font-sans block text-[10px] font-bold">Stored Digest:</span>
                    <span className="text-amber-400 break-all">{verifyResult.stored_hash}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-slate-500 uppercase font-sans block text-[10px] font-bold">Recomputed Digest:</span>
                    <span className="text-sky-400 break-all">{verifyResult.recomputed_hash}</span>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveVerifyPkgId(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-colors"
              >
                Close Verification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Canonical JSON Modal */}
      {activeJsonPkgId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <FileCode className="w-6 h-6 text-sky-600" />
                <h3 className="text-lg font-bold text-slate-900">Canonical JSON Evidence Bundle</h3>
              </div>
              <button onClick={() => setActiveJsonPkgId(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-slate-900 text-slate-200 font-mono text-xs p-4 rounded-xl overflow-y-auto max-h-[60vh]">
              <pre>{jsonContent || "Loading payload..."}</pre>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <button
                onClick={handleCopyJson}
                className="px-3.5 py-2 bg-slate-100 text-slate-800 hover:bg-slate-200 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied to Clipboard!" : "Copy Canonical JSON"}
              </button>
              <button
                onClick={() => setActiveJsonPkgId(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-colors"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
