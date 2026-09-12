'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, FileText, CheckCircle2, AlertTriangle, FileCode, 
  RefreshCw, Download, Calendar, Activity, Check, Clock, UserCheck
} from 'lucide-react';
import { 
  API_BASE_URL, fetchPonds, verifyPackageHash, sealEvidencePackage, fetchReviewActions, 
  submitReviewAction, HashVerificationResult 
} from '@/lib/api';
import { formatCo2 } from '@/lib/formatters';

export default function ReviewWorkspacePage() {
  const [ponds, setPonds] = useState<any[]>([]);
  const [selectedPondId, setSelectedPondId] = useState<string>('');
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPkgId, setSelectedPkgId] = useState<string>('');
  const [pkg, setPkg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Hash verification state
  const [verifyResult, setVerifyResult] = useState<HashVerificationResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [sealing, setSealing] = useState(false);

  // Audit actions state
  const [reviewActions, setReviewActions] = useState<any[]>([]);
  const [auditNote, setAuditNote] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    fetchPonds()
      .then((data) => {
        setPonds(data);
        if (data.length > 0) {
          setSelectedPondId(data[0].id);
        }
        setLoading(false);
      });
  }, []);

  const loadPackagesForPond = useCallback((pondId: string) => {
    if (!pondId) return;
    fetch(`${API_BASE_URL}/ponds/${pondId}/evidence-packages`)
      .then((res) => res.json())
      .then((data) => {
        setPackages(data);
        if (data.length > 0) {
          setSelectedPkgId(data[0].id);
          setPkg(data[0]);
        } else {
          setSelectedPkgId('');
          setPkg(null);
        }
      });
  }, []);

  useEffect(() => {
    if (selectedPondId) {
      loadPackagesForPond(selectedPondId);
    }
  }, [selectedPondId, loadPackagesForPond]);

  const loadPackageDetails = useCallback((pkgId: string) => {
    if (!pkgId) return;
    fetch(`${API_BASE_URL}/evidence-packages/${pkgId}`)
      .then((res) => res.json())
      .then((data) => {
        setPkg(data);
        setVerifyResult(null);
      });

    fetchReviewActions(pkgId)
      .then((data) => setReviewActions(data))
      .catch(() => setReviewActions([]));
  }, []);

  useEffect(() => {
    if (selectedPkgId) {
      loadPackageDetails(selectedPkgId);
    }
  }, [selectedPkgId, loadPackageDetails]);

  const handleVerifyHash = async () => {
    if (!selectedPkgId) return;
    setVerifying(true);
    try {
      const res = await verifyPackageHash(selectedPkgId);
      setVerifyResult(res);
    } catch (err) {
      console.error('Hash verification failed:', err);
    } finally {
      setVerifying(false);
    }
  };

  const handleSealPackage = async () => {
    if (!selectedPkgId) return;
    setSealing(true);
    try {
      const updated = await sealEvidencePackage(selectedPkgId);
      setPkg(updated);
      loadPackagesForPond(selectedPondId);
    } catch (err: any) {
      alert(err.message || 'Failed to seal package');
    } finally {
      setSealing(false);
    }
  };

  const handleAction = async (actionType: string) => {
    if (!selectedPkgId) return;
    setSubmittingAction(true);
    try {
      await submitReviewAction(selectedPkgId, actionType, auditNote);
      setAuditNote('');
      loadPackageDetails(selectedPkgId);
    } catch (err) {
      console.error('Submit review action failed:', err);
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-12 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-sky-500 mb-2" />
        Loading Verifier Review Workspace...
      </div>
    );
  }

  // Compute carbon total
  let netCo2 = 0;
  if (pkg && pkg.carbon_evidence_json) {
    for (const c of pkg.carbon_evidence_json) {
      netCo2 += Number(c.net_carbon_removed_kg || 0);
    }
  }

  const formattedNetCo2 = formatCo2(netCo2);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 p-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            Review Workspace
            <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
              AUDIT PORTAL
            </span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Independent verifier audit portal for inspecting Evidence Chain integrity and recording audit decisions.
          </p>
        </div>
        <div className="bg-sky-50 border border-sky-200 px-4 py-2 rounded-xl flex items-center gap-2 self-start">
          <Shield className="w-5 h-5 text-sky-600" />
          <span className="text-xs font-bold text-sky-800">Verifier Authorized Mode</span>
        </div>
      </div>

      {/* Pond & Package Context Selectors */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Select Pond</label>
          <select
            className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            value={selectedPondId}
            onChange={(e) => setSelectedPondId(e.target.value)}
          >
            {ponds.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Select Evidence Package</label>
          <select
            className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            value={selectedPkgId}
            onChange={(e) => setSelectedPkgId(e.target.value)}
          >
            {packages.length === 0 ? (
              <option value="">No packages available for this pond</option>
            ) : (
              packages.map((pk) => (
                <option key={pk.id} value={pk.id}>
                  Package v{pk.package_version} ({new Date(pk.reporting_period_start).toLocaleDateString()}) - {pk.status}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {!pkg ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold">No evidence package selected.</p>
          <p className="text-xs text-slate-400 mt-1">Please select a pond and package from the dropdowns above.</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Package Status Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="border-b border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/60">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-black text-slate-900">Report: Package v{pkg.package_version}</h2>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    pkg.status === 'SEALED' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                    pkg.status === 'READY_FOR_REVIEW' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                    'bg-sky-100 text-sky-800 border border-sky-200'
                  }`}>
                    {pkg.status}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-800">
                    Review State: {pkg.review_state || 'NOT_STARTED'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1" suppressHydrationWarning>
                  Period: <strong>{pkg.reporting_period_start?.slice(0,10) || new Date(pkg.reporting_period_start).toLocaleDateString()}</strong> to <strong>{pkg.reporting_period_end?.slice(0,10) || new Date(pkg.reporting_period_end).toLocaleDateString()}</strong>
                </p>
                {pkg.sealed_at && (
                  <p className="text-xs text-indigo-600 mt-0.5 font-medium">
                    Sealed at {new Date(pkg.sealed_at).toLocaleString()} by {pkg.sealed_by || 'auditor'}
                  </p>
                )}
              </div>

              <div className="text-left md:text-right shrink-0">
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Net Carbon Sequestration</div>
                <div className="text-2xl font-black text-emerald-700">
                  {formattedNetCo2.value} <span className="text-sm font-bold text-emerald-900">{formattedNetCo2.unit}</span>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">

              {/* SHA-256 Hash Integrity Verification Box */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/10 rounded-xl border border-white/10 shrink-0">
                      <Shield className="w-6 h-6 text-sky-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">SHA-256 Cryptographic Integrity Digest</h3>
                      <p className="text-xs text-slate-300">Recomputes hash directly from canonical JSON evidence payload</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {pkg.status !== 'SEALED' && pkg.completeness !== 'INSUFFICIENT_EVIDENCE' && (
                      <button
                        onClick={handleSealPackage}
                        disabled={sealing}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2 shrink-0"
                      >
                        {sealing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                        Seal Package
                      </button>
                    )}
                    <button
                      onClick={handleVerifyHash}
                      disabled={verifying}
                      className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-900 font-extrabold rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2 shrink-0"
                    >
                      {verifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Verify SHA-256 Digest
                    </button>
                  </div>
                </div>

                <div className="font-mono text-xs bg-slate-950/80 p-3.5 rounded-xl border border-white/10 break-all text-sky-300">
                  <span className="text-slate-500 font-sans block text-[10px] font-bold uppercase mb-0.5">Recorded Package Digest:</span>
                  {pkg.canonical_hash || 'Not generated'}
                </div>

                {verifyResult && (
                  <div className={`p-4 rounded-xl border flex items-center gap-3 animate-fade-in ${
                    verifyResult.integrity_match
                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                      : 'bg-rose-500/20 text-rose-200 border-rose-400/40'
                  }`}>
                    {verifyResult.integrity_match ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
                    )}
                    <div>
                      <h4 className="font-extrabold text-sm uppercase tracking-wide text-white">{verifyResult.status}</h4>
                      <p className="text-xs mt-0.5">{verifyResult.message}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Evidence Bundle Checklist */}
              <div>
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide mb-3">Evidence Bundle Checklist & Provenance</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3.5 border border-slate-200 rounded-xl bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <FileCode className="w-5 h-5 text-sky-600 shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-slate-800">Sensor Telemetry</div>
                        <div className="text-xs text-slate-500">{pkg.sensor_evidence_json?.length || 0} readings recorded</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-sky-700 bg-sky-100 px-2 py-0.5 rounded border border-sky-200">
                      OBSERVED
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 border border-slate-200 rounded-xl bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <Activity className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-slate-800">Biological Model Runs</div>
                        <div className="text-xs text-slate-500">{pkg.model_evidence_json?.length || 0} runs executed</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                      MODELLED
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 border border-slate-200 rounded-xl bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-amber-600 shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-slate-800">Carbon Accounting</div>
                        <div className="text-xs text-slate-500">{pkg.carbon_evidence_json?.length || 0} estimates computed</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                      DERIVED
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 border border-slate-200 rounded-xl bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-purple-600 shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-slate-800">Anomalies & Events</div>
                        <div className="text-xs text-slate-500">{pkg.anomaly_evidence_json?.length || 0} anomaly records</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded border border-purple-200">
                      DETECTED
                    </span>
                  </div>
                </div>
              </div>

              {/* Verifier Actions & Audit Trail */}
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Verifier Audit Decision</h3>
                
                <textarea
                  value={auditNote}
                  onChange={(e) => setAuditNote(e.target.value)}
                  placeholder="Enter verifier audit notes or rationale here..."
                  className="w-full border border-slate-300 rounded-xl p-3.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[90px]"
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleAction('START_REVIEW')}
                    disabled={submittingAction}
                    className="px-3.5 py-2 bg-sky-600 text-white font-bold rounded-xl text-xs hover:bg-sky-700 transition-colors shadow-sm"
                  >
                    Start Review
                  </button>
                  <button
                    onClick={() => handleAction('FLAG_FOR_ATTENTION')}
                    disabled={submittingAction}
                    className="px-3.5 py-2 bg-amber-600 text-white font-bold rounded-xl text-xs hover:bg-amber-700 transition-colors shadow-sm"
                  >
                    Flag for Attention
                  </button>
                  <button
                    onClick={() => handleAction('REQUEST_MORE_EVIDENCE')}
                    disabled={submittingAction}
                    className="px-3.5 py-2 bg-purple-600 text-white font-bold rounded-xl text-xs hover:bg-purple-700 transition-colors shadow-sm"
                  >
                    Request More Evidence
                  </button>
                  <button
                    onClick={() => handleAction('MARK_REVIEWED')}
                    disabled={submittingAction}
                    className="px-3.5 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    Mark Reviewed
                  </button>
                  <button
                    onClick={() => handleAction('CLOSE_REVIEW')}
                    disabled={submittingAction}
                    className="px-3.5 py-2 bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-900 transition-colors shadow-sm"
                  >
                    Close Review
                  </button>
                </div>

                {/* Audit Action Log History */}
                {reviewActions.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Verifier Action History Log</h4>
                    <div className="space-y-2">
                      {reviewActions.map((act) => (
                        <div key={act.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-start gap-3">
                          <UserCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">{act.action}</span>
                              <span className="text-[10px] text-slate-400">{new Date(act.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-slate-600 mt-0.5">{act.note || 'No notes attached.'}</p>
                            <span className="text-[10px] text-slate-400 font-medium">Actor: {act.actor}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
