"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  Shield, AlertTriangle, FileText, Activity, 
  MapPin, Clock, Camera, Zap, FileSearch, 
  CheckCircle, ShieldAlert, ArrowLeft
} from "lucide-react";
import Link from "next/link";

export default function ReviewWorkspace() {
  const params = useParams();
  const pkgId = params.id as string;
  
  const [pkg, setPkg] = useState<any>(null);
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  const [newAction, setNewAction] = useState("");
  const [newNote, setNewNote] = useState("");

  useEffect(() => {
    if (!pkgId) return;
    
    Promise.all([
      fetch(`/api/evidence-packages/${pkgId}`).then(res => res.json()),
      fetch(`/api/evidence-packages/${pkgId}/review/actions`).then(res => res.json())
    ]).then(([pkgData, actionsData]) => {
      setPkg(pkgData);
      setActions(actionsData);
      setLoading(false);
    });
  }, [pkgId]);

  const submitAction = async () => {
    if (!newAction) return;
    
    const res = await fetch(`/api/evidence-packages/${pkgId}/review/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: newAction,
        note: newNote || null
      })
    });
    
    if (res.ok) {
      const action = await res.json();
      setActions([...actions, action]);
      setNewAction("");
      setNewNote("");
      
      // Refresh package to get new state
      const updatedPkg = await fetch(`/api/evidence-packages/${pkgId}`).then(res => res.json());
      setPkg(updatedPkg);
    }
  };

  if (loading || !pkg) return <div className="p-12 text-center text-gray-500">Loading Review Workspace...</div>;

  const tabs = [
    { id: "overview", label: "Overview", icon: <FileText className="w-4 h-4" /> },
    { id: "sensors", label: "Sensor Evidence", icon: <Activity className="w-4 h-4" /> },
    { id: "models", label: "Model Evidence", icon: <Zap className="w-4 h-4" /> },
    { id: "carbon", label: "Carbon Estimates", icon: <Shield className="w-4 h-4" /> },
    { id: "anomalies", label: "Anomalies", icon: <AlertTriangle className="w-4 h-4" /> },
    { id: "imagery", label: "Imagery", icon: <Camera className="w-4 h-4" /> },
    { id: "cross-validation", label: "Cross-Validation", icon: <FileSearch className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/reports" className="text-gray-400 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Evidence Review Workspace</h1>
            {pkg.contains_simulated_data && (
              <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded border border-yellow-300 ml-2">
                SIMULATED DATA
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {pkg.id}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {new Date(pkg.reporting_period_start).toLocaleDateString()} — {new Date(pkg.reporting_period_end).toLocaleDateString()}</span>
            <span className="flex items-center gap-1.5"><Shield className="w-4 h-4" /> v{pkg.package_version}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Review State</div>
            <div className={`text-sm font-bold ${
              pkg.review_state === 'NOT_STARTED' ? 'text-gray-500' :
              pkg.review_state === 'IN_REVIEW' ? 'text-blue-600' :
              pkg.review_state === 'NEEDS_ATTENTION' ? 'text-orange-600' :
              pkg.review_state === 'READY_FOR_EXTERNAL_REVIEW' ? 'text-green-600' :
              'text-gray-900'
            }`}>
              {pkg.review_state.replace(/_/g, ' ')}
            </div>
          </div>
          <div className="h-10 w-px bg-gray-200"></div>
          <div className="text-right">
            <div className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Completeness</div>
            <div className="text-sm font-bold text-gray-900">{pkg.completeness.replace(/_/g, ' ')}</div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Nav */}
        <nav className="w-64 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto">
          <div className="p-4 space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Limitations Panel */}
          {pkg.limitations_json?.length > 0 && (
            <div className="mt-8 px-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Limitations</h3>
              <ul className="space-y-3">
                {pkg.limitations_json.map((lim: any, i: number) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-100">
                    <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    <span>{lim.description || lim}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        {/* Center Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" /> Evidence Integrity
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Canonical Hash (SHA-256)</p>
                      <code className="text-xs bg-gray-100 p-2 rounded block break-all text-gray-800 border border-gray-200">
                        {pkg.canonical_hash}
                      </code>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Generated At</p>
                      <p className="text-sm font-medium text-gray-900">{new Date(pkg.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">Sensor Readings</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{pkg.sensor_evidence_json?.length || 0}</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">Model Estimates</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{pkg.model_evidence_json?.length || 0}</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">Carbon Outputs</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{pkg.carbon_evidence_json?.length || 0}</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">Imagery Analyzed</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{pkg.imagery_evidence_json?.length || 0}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'carbon' && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900">Carbon Evidence</h2>
                {pkg.carbon_evidence_json?.length === 0 ? (
                  <p className="text-gray-500 bg-white p-6 rounded-lg border border-gray-200">No carbon estimates available for this period.</p>
                ) : (
                  pkg.carbon_evidence_json.map((c: any, i: number) => (
                    <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                      <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                        <div>
                          <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-800 rounded uppercase tracking-wider">Modelled Estimate</span>
                          <h3 className="text-md font-bold mt-2">Carbon Run ID: <span className="font-mono font-normal">{c.id}</span></h3>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Source Model Run</p>
                          <p className="text-sm font-mono">{c.model_run_id}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Gross CO2 Fixed</p>
                          <p className="text-lg font-bold">{c.gross_co2_fixed_kg !== null ? c.gross_co2_fixed_kg.toFixed(2) : '—'} kg</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">End-Use Retained</p>
                          <p className="text-lg font-bold">{c.end_use_retained_co2_kg !== null ? c.end_use_retained_co2_kg.toFixed(2) : '—'} kg</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Operational Footprint</p>
                          <p className="text-lg font-bold">{c.operational_emissions_co2_kg !== null ? c.operational_emissions_co2_kg.toFixed(2) : '—'} kg</p>
                        </div>
                        <div className="bg-green-50 p-2 rounded">
                          <p className="text-xs text-green-800 mb-1 font-semibold">Net Carbon Removed</p>
                          <p className="text-xl font-bold text-green-700">
                            {c.net_sequestration_kg !== null ? c.net_sequestration_kg.toFixed(2) : 'Unverified'} kg
                          </p>
                        </div>
                      </div>
                      {c.net_sequestration_kg === null && (
                         <div className="mt-4 p-3 bg-gray-50 text-sm text-gray-600 rounded border border-gray-200">
                            Net sequestration is unavailable because end-use information is unspecified or the footprint was not fully verified.
                         </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
            
            {activeTab === 'anomalies' && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900">Anomalies Detected</h2>
                {pkg.anomaly_evidence_json?.length === 0 ? (
                  <p className="text-gray-500 bg-white p-6 rounded-lg border border-gray-200">No anomalies detected in this reporting period.</p>
                ) : (
                  pkg.anomaly_evidence_json.map((a: any, i: number) => (
                    <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex justify-between">
                        <div className="flex items-center gap-2 mb-2">
                          <ShieldAlert className={`w-5 h-5 ${a.severity === 'HIGH' ? 'text-red-500' : 'text-orange-500'}`} />
                          <span className="font-bold text-gray-900">{a.type}</span>
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{a.status}</span>
                        </div>
                        <div className="text-sm text-gray-500">{new Date(a.timestamp).toLocaleString()}</div>
                      </div>
                      <p className="text-sm text-gray-700 mt-2">{a.explanation || "No explanation provided."}</p>
                    </div>
                  ))
                )}
              </div>
            )}
            
            {activeTab === 'cross-validation' && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900">Evidence Cross-Validation</h2>
                {pkg.cross_validation_evidence_json?.length === 0 ? (
                  <p className="text-gray-500 bg-white p-6 rounded-lg border border-gray-200">No cross-validation records available.</p>
                ) : (
                  pkg.cross_validation_evidence_json.map((cv: any, i: number) => (
                    <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                           <span className="text-xs font-bold px-2 py-1 bg-purple-100 text-purple-800 rounded uppercase tracking-wider">Cross-Validated</span>
                           <h3 className="text-md font-bold mt-2">Alignment Result</h3>
                        </div>
                        <span className={`px-3 py-1 text-sm font-bold rounded-full ${
                          cv.alignment_result === 'CONSISTENT' ? 'bg-green-100 text-green-800' :
                          cv.alignment_result === 'INCONSISTENT' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {cv.alignment_result}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded border border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase">Sensors / Model</p>
                          <p className="text-sm font-mono mt-1 text-gray-700 break-all">Model Run: {cv.model_run_id}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded border border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase">Imagery Evidence</p>
                          <p className="text-sm font-mono mt-1 text-gray-700 break-all">Image Analysis: {cv.imagery_analysis_id}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Placeholder for other tabs */}
            {['sensors', 'models', 'imagery'].includes(activeTab) && (
               <div className="bg-white p-6 rounded-xl border border-gray-200 text-center text-gray-500">
                 Detailed views for {activeTab} are intentionally summarized. Review the JSON export for full raw payloads.
               </div>
            )}
            
          </div>
        </main>

        {/* Right Context & Actions Panel */}
        <aside className="w-80 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-bold text-gray-900">Review Actions</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {actions.map((act) => (
              <div key={act.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm text-sm">
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                  <span className="font-semibold text-gray-700">{act.actor}</span>
                  <span>{new Date(act.created_at).toLocaleDateString()}</span>
                </div>
                <div className="font-bold text-gray-900 mb-1">{act.action.replace(/_/g, ' ')}</div>
                {act.note && <div className="text-gray-600 italic bg-gray-50 p-2 rounded">{act.note}</div>}
              </div>
            ))}
            {actions.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No review actions recorded yet.</p>}
          </div>
          
          <div className="p-4 border-t border-gray-200 bg-white space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">New Action</label>
              <select 
                className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
              >
                <option value="">-- Select Action --</option>
                <option value="START_REVIEW">Start Review</option>
                <option value="FLAG_FOR_ATTENTION">Flag for Attention</option>
                <option value="MARK_REVIEWED">Mark as Reviewed</option>
                <option value="REQUEST_MORE_EVIDENCE">Request More Evidence</option>
                <option value="CLOSE_REVIEW">Close Review</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Review Note (Optional)</label>
              <textarea 
                className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                placeholder="Add context for this action..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              ></textarea>
            </div>
            <button 
              onClick={submitAction}
              disabled={!newAction}
              className="w-full py-2 bg-blue-600 text-white font-semibold rounded text-sm disabled:opacity-50 hover:bg-blue-700 transition-colors"
            >
              Submit Action
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
