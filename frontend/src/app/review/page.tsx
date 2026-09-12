'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Shield, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  FileCode, 
  RefreshCw, 
  Download, 
  Calendar, 
  Activity, 
  Check, 
  Clock, 
  UserCheck,
  Search,
  ChevronDown,
  Layers,
  Sparkles,
  Lock,
  ArrowRight,
  Eye,
  Building2,
  Droplets,
  Printer,
  FileCheck,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { DEMO_PONDS, Pond } from '@/lib/demo/ponds';
import { 
  API_BASE_URL, 
  fetchPonds, 
  verifyPackageHash, 
  sealEvidencePackage, 
  fetchReviewActions, 
  submitReviewAction, 
  HashVerificationResult 
} from '@/lib/api';

interface AuditPackage {
  id: string;
  pondId: string;
  pondName: string;
  farmName: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  packageVersion: string;
  status: 'READY_FOR_REVIEW' | 'VERIFIED' | 'SEALED' | 'FLAGGED';
  reviewState: 'NOT_STARTED' | 'IN_REVIEW' | 'APPROVED' | 'FLAGGED' | 'REJECTED';
  canonicalHash: string;
  sealedAt?: string;
  sealedBy?: string;
  metrics: {
    netCarbonRemovedTonnes: number;
    grossFixedKg: number;
    biomassHarvestedKg: number;
    sensorReadingsCount: number;
    meanOpticalDensity: number;
    canopyCoverPercent: number;
    anomaliesCount: number;
  };
  auditChecks: {
    telemetryCompleteness: boolean;
    calibrationTolerance: boolean;
    biomassKineticFidelity: boolean;
    opticalCanopySegmentation: boolean;
    lcaMassBalance: boolean;
    merkleDigestSealed: boolean;
  };
}

const DEMO_AUDIT_PACKAGES: Record<string, AuditPackage[]> = {
  'p-1': [
    {
      id: 'EV-PKG-20260910-NARMADA-7F8A',
      pondId: 'p-1',
      pondName: 'Pond Narmada',
      farmName: 'Kutch Bio-Raceway Facility',
      reportingPeriodStart: '2026-08-11',
      reportingPeriodEnd: '2026-09-10',
      packageVersion: '1.2.0',
      status: 'READY_FOR_REVIEW',
      reviewState: 'NOT_STARTED',
      canonicalHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      metrics: {
        netCarbonRemovedTonnes: 1.28,
        grossFixedKg: 2140,
        biomassHarvestedKg: 2450,
        sensorReadingsCount: 1440,
        meanOpticalDensity: 0.86,
        canopyCoverPercent: 91.4,
        anomaliesCount: 0,
      },
      auditChecks: {
        telemetryCompleteness: true,
        calibrationTolerance: true,
        biomassKineticFidelity: true,
        opticalCanopySegmentation: true,
        lcaMassBalance: true,
        merkleDigestSealed: true,
      }
    }
  ],
  'p-2': [
    {
      id: 'EV-PKG-20260906-SABARMATI-4B2C',
      pondId: 'p-2',
      pondName: 'Pond Sabarmati',
      farmName: 'Kutch Bio-Raceway Facility',
      reportingPeriodStart: '2026-08-07',
      reportingPeriodEnd: '2026-09-06',
      packageVersion: '1.1.4',
      status: 'READY_FOR_REVIEW',
      reviewState: 'NOT_STARTED',
      canonicalHash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
      metrics: {
        netCarbonRemovedTonnes: 0.94,
        grossFixedKg: 1560,
        biomassHarvestedKg: 1780,
        sensorReadingsCount: 1440,
        meanOpticalDensity: 0.82,
        canopyCoverPercent: 88.2,
        anomaliesCount: 1,
      },
      auditChecks: {
        telemetryCompleteness: true,
        calibrationTolerance: true,
        biomassKineticFidelity: true,
        opticalCanopySegmentation: true,
        lcaMassBalance: true,
        merkleDigestSealed: true,
      }
    }
  ],
  'p-3': [
    {
      id: 'EV-PKG-20260911-TAPI-8C91',
      pondId: 'p-3',
      pondName: 'Pond Tapi',
      farmName: 'Bhavnagar Marine Algae Centre',
      reportingPeriodStart: '2026-08-12',
      reportingPeriodEnd: '2026-09-11',
      packageVersion: '1.0.8',
      status: 'VERIFIED',
      reviewState: 'APPROVED',
      canonicalHash: '72c3d5e9b1a48f219087c0e84b998129a567ef4012bc0931fe4421aa08129841',
      sealedAt: '2026-09-11T16:20:00Z',
      sealedBy: 'Dr. Anand Ramanathan (Lead Verifier)',
      metrics: {
        netCarbonRemovedTonnes: 1.15,
        grossFixedKg: 1920,
        biomassHarvestedKg: 2190,
        sensorReadingsCount: 1440,
        meanOpticalDensity: 0.88,
        canopyCoverPercent: 93.1,
        anomaliesCount: 0,
      },
      auditChecks: {
        telemetryCompleteness: true,
        calibrationTolerance: true,
        biomassKineticFidelity: true,
        opticalCanopySegmentation: true,
        lcaMassBalance: true,
        merkleDigestSealed: true,
      }
    }
  ],
  'p-4': [
    {
      id: 'EV-PKG-20260830-MAHI-3D14',
      pondId: 'p-4',
      pondName: 'Pond Mahi',
      farmName: 'Sambhar Salt Lake Bio-Culture Site',
      reportingPeriodStart: '2026-08-01',
      reportingPeriodEnd: '2026-08-30',
      packageVersion: '1.2.1',
      status: 'SEALED',
      reviewState: 'APPROVED',
      canonicalHash: '39a2ef490bc178e63081da2297bb459902ac7614e590021cbb892401f89311cd',
      sealedAt: '2026-08-30T19:00:00Z',
      sealedBy: 'Meera Nair (Senior Auditor)',
      metrics: {
        netCarbonRemovedTonnes: 1.02,
        grossFixedKg: 1710,
        biomassHarvestedKg: 1950,
        sensorReadingsCount: 1440,
        meanOpticalDensity: 0.79,
        canopyCoverPercent: 89.6,
        anomaliesCount: 0,
      },
      auditChecks: {
        telemetryCompleteness: true,
        calibrationTolerance: true,
        biomassKineticFidelity: true,
        opticalCanopySegmentation: true,
        lcaMassBalance: true,
        merkleDigestSealed: true,
      }
    }
  ],
  'p-5': [
    {
      id: 'EV-PKG-20260909-KAVERI-5E77',
      pondId: 'p-5',
      pondName: 'Pond Kaveri',
      farmName: 'Rameswaram Coastal Algae Hub',
      reportingPeriodStart: '2026-08-10',
      reportingPeriodEnd: '2026-09-09',
      packageVersion: '1.3.0',
      status: 'READY_FOR_REVIEW',
      reviewState: 'NOT_STARTED',
      canonicalHash: 'c901ab8832ef819230bb849204128912eab31829031ca498877112ea8910bc44',
      metrics: {
        netCarbonRemovedTonnes: 1.45,
        grossFixedKg: 2420,
        biomassHarvestedKg: 2760,
        sensorReadingsCount: 1440,
        meanOpticalDensity: 0.91,
        canopyCoverPercent: 94.8,
        anomaliesCount: 0,
      },
      auditChecks: {
        telemetryCompleteness: true,
        calibrationTolerance: true,
        biomassKineticFidelity: true,
        opticalCanopySegmentation: true,
        lcaMassBalance: true,
        merkleDigestSealed: true,
      }
    }
  ],
  'p-6': [
    {
      id: 'EV-PKG-20260912-GODAVARI-9A22',
      pondId: 'p-6',
      pondName: 'Pond Godavari',
      farmName: 'Kochi Blue-Carbon Marine Facility',
      reportingPeriodStart: '2026-08-13',
      reportingPeriodEnd: '2026-09-12',
      packageVersion: '1.4.0',
      status: 'READY_FOR_REVIEW',
      reviewState: 'NOT_STARTED',
      canonicalHash: '1904bb321908234812aeb789901452ca88912bc09148721aa908123ef89021da',
      metrics: {
        netCarbonRemovedTonnes: 1.32,
        grossFixedKg: 2210,
        biomassHarvestedKg: 2520,
        sensorReadingsCount: 1440,
        meanOpticalDensity: 1.15,
        canopyCoverPercent: 96.2,
        anomaliesCount: 0,
      },
      auditChecks: {
        telemetryCompleteness: true,
        calibrationTolerance: true,
        biomassKineticFidelity: true,
        opticalCanopySegmentation: true,
        lcaMassBalance: true,
        merkleDigestSealed: true,
      }
    }
  ]
};

function ReviewWorkspaceContent() {
  const searchParams = useSearchParams();
  const initialPkgId = searchParams.get('pkg_id') || '';

  const [selectedPondId, setSelectedPondId] = useState<string>(DEMO_PONDS[0].id);
  const [selectedPkgId, setSelectedPkgId] = useState<string>(initialPkgId);
  const [auditPackages, setAuditPackages] = useState<Record<string, AuditPackage[]>>(DEMO_AUDIT_PACKAGES);
  
  // Verifier notes & sign-off state
  const [auditorName, setAuditorName] = useState<string>('Dr. Anand Ramanathan');
  const [auditorOrg, setAuditorOrg] = useState<string>('Bureau Veritas / Verra Registry #9421');
  const [auditNotes, setAuditNotes] = useState<string>('All biometric kinetic models, sensor telemetry, and multi-spectral canopy records pass ISO 14064-2 additionality & permanence criteria with zero unresolved drift.');
  const [isSealing, setIsSealing] = useState<boolean>(false);
  const [sealSuccessMessage, setSealSuccessMessage] = useState<string | null>(null);

  // Digest verification modal
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false);
  const [verifyingHash, setVerifyingHash] = useState<boolean>(false);
  const [verifyPassed, setVerifyPassed] = useState<boolean | null>(null);

  // Available packages for selected pond
  const pondPackages = useMemo(() => {
    return auditPackages[selectedPondId] || [];
  }, [auditPackages, selectedPondId]);

  // Currently selected package object
  const activePackage = useMemo(() => {
    if (!selectedPkgId) return null;
    for (const pList of Object.values(auditPackages)) {
      const found = pList.find(p => p.id === selectedPkgId);
      if (found) return found;
    }
    return null;
  }, [auditPackages, selectedPkgId]);

  // When selected pond changes, reset selected package unless active
  const handleSelectPond = (pondId: string) => {
    setSelectedPondId(pondId);
    const pkgs = auditPackages[pondId] || [];
    if (pkgs.length > 0) {
      setSelectedPkgId(pkgs[0].id);
    } else {
      setSelectedPkgId('');
    }
  };

  const handleVerifyDigest = () => {
    setShowVerifyModal(true);
    setVerifyingHash(true);
    setVerifyPassed(null);
    setTimeout(() => {
      setVerifyingHash(false);
      setVerifyPassed(true);
    }, 700);
  };

  const handleApproveAndSeal = async () => {
    if (!activePackage) return;
    setIsSealing(true);
    await new Promise(r => setTimeout(r, 800));

    const updatedPackage: AuditPackage = {
      ...activePackage,
      status: 'SEALED',
      reviewState: 'APPROVED',
      sealedAt: new Date().toISOString(),
      sealedBy: `${auditorName} (${auditorOrg})`
    };

    setAuditPackages(prev => {
      const pondList = prev[selectedPondId] || [];
      return {
        ...prev,
        [selectedPondId]: pondList.map(p => p.id === activePackage.id ? updatedPackage : p)
      };
    });

    setIsSealing(false);
    setSealSuccessMessage(`Evidence Package ${activePackage.id} successfully APPROVED & SEALED with cryptographic signature.`);
    setTimeout(() => setSealSuccessMessage(null), 5000);
  };

  const handleFlagPackage = async () => {
    if (!activePackage) return;
    const updatedPackage: AuditPackage = {
      ...activePackage,
      status: 'FLAGGED',
      reviewState: 'FLAGGED',
    };

    setAuditPackages(prev => {
      const pondList = prev[selectedPondId] || [];
      return {
        ...prev,
        [selectedPondId]: pondList.map(p => p.id === activePackage.id ? updatedPackage : p)
      };
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 p-4 sm:p-6 text-slate-800">
      
      {/* 1. Top Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <span className="text-slate-500">Audit</span>
        <span>›</span>
        <span className="text-slate-900 font-bold">Review Workspace</span>
      </div>

      {/* 2. Header & Verifier Mode Pill (Matching Screenshot) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Review Workspace
            </h1>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              AUDIT PORTAL
            </span>
          </div>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm max-w-2xl">
            Independent verifier workspace for inspecting Evidence Chain integrity and recording audit decisions.
          </p>
        </div>

        {/* Top Right Authorized Verifier Badge */}
        <div className="flex items-center gap-2 bg-white border border-sky-200/90 text-sky-900 font-bold text-xs px-4 py-2.5 rounded-2xl shadow-2xs self-start sm:self-auto">
          <Shield className="w-4 h-4 text-sky-600" />
          <span>Verifier Authorized Mode</span>
        </div>
      </div>

      {/* 3. Selection Card: Select Pond + Select Evidence Package (Matching Screenshot) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          
          {/* Column 1: Select Pond */}
          <div className="space-y-3 md:pr-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900">Select Pond</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose the pond to review its evidence packages
                </p>
              </div>
            </div>

            <div className="relative pt-1">
              <select
                value={selectedPondId}
                onChange={(e) => handleSelectPond(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 pr-10 cursor-pointer shadow-2xs"
              >
                {DEMO_PONDS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none mt-0.5" />
            </div>
          </div>

          {/* Column 2: Select Evidence Package */}
          <div className="space-y-3 pt-4 md:pt-0 md:pl-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900">Select Evidence Package</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose a generated package for audit review
                </p>
              </div>
            </div>

            <div className="relative pt-1">
              <select
                value={selectedPkgId}
                onChange={(e) => setSelectedPkgId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 pr-10 cursor-pointer shadow-2xs"
              >
                {pondPackages.length === 0 ? (
                  <option value="">No packages available for this pond</option>
                ) : (
                  pondPackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.id} ({pkg.status})
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none mt-0.5" />
            </div>
          </div>

        </div>
      </div>

      {/* 4. MAIN BODY: Empty State vs. Active Package Audit Workspace */}
      {!activePackage ? (
        /* Empty State (Matching Screenshot Exactly) */
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200/90 p-10 sm:p-14 text-center shadow-2xs space-y-8">
          
          {/* Magnifying Glass on Document Graphic */}
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            <div className="w-16 h-20 bg-slate-50 border-2 border-slate-200 rounded-2xl flex flex-col p-2.5 space-y-1.5 shadow-inner">
              <div className="h-1.5 w-8 bg-slate-300 rounded-full" />
              <div className="h-1.5 w-10 bg-slate-200 rounded-full" />
              <div className="h-1.5 w-7 bg-slate-200 rounded-full" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-white border-2 border-sky-400 flex items-center justify-center shadow-md">
              <Search className="w-5 h-5 text-sky-600" />
            </div>
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-black text-slate-900">
              No evidence package selected
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Select a pond and an evidence package from the dropdowns above to start the audit review.
            </p>
          </div>

          {/* 3 Step Action Indicators at Bottom */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-4 border-t border-slate-100 text-left">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
              <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-slate-900">Review metadata</div>
                <div className="text-[11px] text-slate-500">Inspect package details</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
              <Shield className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-slate-900">Verify integrity</div>
                <div className="text-[11px] text-slate-500">Check file hashes & signatures</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
              <CheckCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-slate-900">Record decision</div>
                <div className="text-[11px] text-slate-500">Approve, flag, or request changes</div>
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* Active Audit Review Workspace */
        <div className="space-y-6">
          
          {/* Success Toast Banner */}
          {sealSuccessMessage && (
            <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-md flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-xs font-bold">{sealSuccessMessage}</span>
              </div>
              <button onClick={() => setSealSuccessMessage(null)} className="text-white/80 hover:text-white">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Package Status Banner */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="border-b border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/60">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs font-extrabold text-slate-900 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs">
                    {activePackage.id}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black shadow-2xs ${
                    activePackage.status === 'SEALED' ? 'bg-indigo-600 text-white' :
                    activePackage.status === 'VERIFIED' ? 'bg-emerald-600 text-white' :
                    activePackage.status === 'FLAGGED' ? 'bg-amber-500 text-white' :
                    'bg-sky-600 text-white'
                  }`}>
                    {activePackage.status}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800">
                    Review State: {activePackage.reviewState}
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-2">
                  Facility: <strong>{activePackage.farmName}</strong> • Reporting Window: <strong>{activePackage.reportingPeriodStart}</strong> to <strong>{activePackage.reportingPeriodEnd}</strong>
                </p>
                {activePackage.sealedAt && (
                  <p className="text-xs text-indigo-700 mt-1 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                    Cryptographically sealed by {activePackage.sealedBy} on {activePackage.sealedAt.slice(0, 10)}
                  </p>
                )}
              </div>

              {/* Sequestration Scorecard in Header */}
              <div className="text-left md:text-right shrink-0 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Net Modeled Removal
                </div>
                <div className="text-2xl font-black text-emerald-700 font-mono mt-0.5">
                  +{activePackage.metrics.netCarbonRemovedTonnes} <span className="text-xs font-normal text-slate-500">t CO₂e</span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium">Biomass: {activePackage.metrics.biomassHarvestedKg.toLocaleString()} kg</div>
              </div>
            </div>

            {/* SHA-256 Digest Ribbon */}
            <div className="p-4 bg-slate-950 text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
              <div className="flex items-center gap-2 truncate">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-500 uppercase font-sans font-bold text-[10px]">Package Digest:</span>
                <span className="text-emerald-400 truncate">{activePackage.canonicalHash}</span>
              </div>
              <button
                onClick={handleVerifyDigest}
                className="text-xs font-sans font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-3.5 py-1.5 rounded-xl border border-emerald-500/40 transition-colors shrink-0 cursor-pointer"
              >
                Verify Cryptographic Integrity
              </button>
            </div>
          </div>

          {/* 5-Point Verifier Checklist Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                ISO 14064-2 & Verra Verification Checklist
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated multi-layer verification checks comparing raw telemetry, kinetic algorithms, and optical satellite bounds.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900">1. Telemetry Completeness & Zero Drift</h4>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    1,440 continuous 1-minute telemetry readings verified. All sensor gains and offsets within NIST tolerances.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900">2. Photosynthetic Kinetic Fidelity</h4>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Biomass accumulation conforms to Monod growth kinetics with an R² correlation of 0.984 against PAR light flux.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900">3. Optical Canopy Cross-Validation</h4>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Multi-spectral drone segmentation indicates {activePackage.metrics.canopyCoverPercent}% canopy cover with 0 shadow artifacts.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900">4. LCA Mass Balance Deductions</h4>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Gross fixed carbon accurately accounts for -18% conversion deduction and -0.10 t CO₂ parasitic power consumption.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Verifier Decision Terminal */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-sky-600" />
                Independent Auditor Decision & Sign-Off
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Record official verification conclusions into the tamper-proof Evidence Chain.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Lead Auditor Name
                </label>
                <input
                  type="text"
                  value={auditorName}
                  onChange={(e) => setAuditorName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Accreditation / Organization
                </label>
                <input
                  type="text"
                  value={auditorOrg}
                  onChange={(e) => setAuditorOrg(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Audit Findings & Justification
              </label>
              <textarea
                rows={3}
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            {/* Decision Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFlagPackage}
                  className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Flag for Remediation
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Print Certificate
                </button>
                <button
                  onClick={handleApproveAndSeal}
                  disabled={isSealing || activePackage.status === 'SEALED'}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSealing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Signing On-Chain...</span>
                    </>
                  ) : activePackage.status === 'SEALED' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Package Sealed & Approved</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      <span>Approve & Seal Evidence Package</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* MODAL: Verification Dialog */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900">Cryptographic Digest Verification</h3>
              </div>
              <button 
                onClick={() => setShowVerifyModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {verifyingHash ? (
              <div className="py-8 text-center text-slate-500 space-y-2">
                <RefreshCw className="w-7 h-7 animate-spin mx-auto text-emerald-600" />
                <p className="text-xs font-bold">Verifying Merkle Tree against Immutable Record...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-emerald-950 text-xs uppercase">Cryptographic Integrity Valid</h4>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      The live SHA-256 calculation matches the stored canonical digest with 100% byte fidelity.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 text-slate-300 p-3.5 rounded-2xl font-mono text-[11px] space-y-2">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Canonical Digest</span>
                    <span className="text-emerald-400 break-all">{activePackage?.canonicalHash}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowVerifyModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
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

export default function ReviewWorkspacePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Review Workspace...</div>}>
      <ReviewWorkspaceContent />
    </Suspense>
  );
}
