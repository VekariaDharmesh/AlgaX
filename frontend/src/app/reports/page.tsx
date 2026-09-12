"use client";

import { useState, useEffect } from "react";
import { Download, ExternalLink, Shield } from "lucide-react";

export default function ReportsPage() {
  const [ponds, setPonds] = useState<any[]>([]);
  const [selectedPond, setSelectedPond] = useState<string>("");
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ponds")
      .then((res) => res.json())
      .then((data) => {
        setPonds(data);
        if (data.length > 0) setSelectedPond(data[0].id);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedPond) return;
    fetch(`/api/ponds/${selectedPond}/evidence-packages`)
      .then((res) => res.json())
      .then((data) => setPackages(data));
  }, [selectedPond]);

  const generatePackage = async () => {
    if (!selectedPond) return;
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);

    await fetch(`/api/ponds/${selectedPond}/evidence-packages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reporting_period_start: start.toISOString(),
        reporting_period_end: end.toISOString()
      })
    });
    
    fetch(`/api/ponds/${selectedPond}/evidence-packages`)
      .then((res) => res.json())
      .then((data) => setPackages(data));
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Evidence & Reporting</h1>
          <p className="text-gray-500 mt-1">Verification-ready carbon accounting outputs and historical records.</p>
        </div>
        <button onClick={generatePackage} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors text-sm shadow-sm">
          Generate New Package
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Select Pond Context</label>
        <select
          className="w-full md:w-64 border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
          value={selectedPond}
          onChange={(e) => setSelectedPond(e.target.value)}
        >
          {ponds.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {packages.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No evidence packages generated for this pond yet.</p>
          </div>
        ) : (
          packages.map(pkg => (
            <div key={pkg.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Package v{pkg.package_version}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {new Date(pkg.reporting_period_start).toLocaleDateString()} — {new Date(pkg.reporting_period_end).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                    pkg.status === 'READY_FOR_REVIEW' ? 'bg-green-100 text-green-700' :
                    pkg.status === 'DRAFT' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {pkg.status}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                    {pkg.completeness}
                  </span>
                  {pkg.contains_simulated_data && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-300">
                      SIMULATED
                    </span>
                  )}
                </div>
              </div>
              
              <div className="p-5 bg-gray-50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Sensors</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{pkg.sensor_evidence_json?.length || 0}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Model Runs</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{pkg.model_evidence_json?.length || 0}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Anomalies</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{pkg.anomaly_evidence_json?.length || 0}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Images</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{pkg.imagery_evidence_json?.length || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="px-5 py-4 bg-white border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 max-w-full overflow-hidden">
                  <Shield className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-xs font-mono text-gray-500 truncate" title={pkg.canonical_hash}>
                    {pkg.canonical_hash}
                  </span>
                </div>
                <div className="flex gap-3">
                  <a 
                    href={`/review/${pkg.id}`} 
                    className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                  >
                    Open Review Workspace
                  </a>
                  <a 
                    href={`/api/evidence-packages/${pkg.id}/report`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    View HTML Report
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
