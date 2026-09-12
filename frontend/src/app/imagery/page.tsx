"use client";

import React, { useState, useEffect } from "react";
import { Upload, Image as ImageIcon, CheckCircle, AlertCircle } from "lucide-react";

interface Farm { id: string; name: string; }
interface Pond { id: string; name: string; }
interface ImageryRecord {
  id: string;
  source_type: string;
  ingestion_timestamp: string;
  width_px: number;
  height_px: number;
  file_size_bytes: number;
  processing_status: string;
  sha256_hash: string;
}

interface ImageryProcessingResponse {
  imagery_id: string;
  processing_version: string;
  processing_status: string;
  processed_storage_reference: string;
  original_sha256_hash: string;
  processed_sha256_hash: string;
  original_width_px: number;
  original_height_px: number;
  processed_width_px: number;
  processed_height_px: number;
  quality_classification: string;
  quality_flags: string[];
  quality_metrics: {
    sharpness?: number;
    brightness?: number;
    contrast?: number;
    underexposed_fraction?: number;
    overexposed_fraction?: number;
  };
}

interface ImageryAnalysisResponse {
  id: string;
  analysis_status: string;
  green_dominance: number;
  green_pixel_fraction: number;
  spatial_mean: number;
  spatial_std: number;
  absolute_change: number | null;
  relative_change: number | null;
  change_classification: string | null;
  grid_data: { row: number; col: number; green_fraction: number }[];
}

export default function ImageryPage() {
  const [imagery, setImagery] = useState<ImageryRecord[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [processingData, setProcessingData] = useState<ImageryProcessingResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisData, setAnalysisData] = useState<ImageryAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Upload form state
  const [selectedFarm, setSelectedFarm] = useState("");
  const [selectedPond, setSelectedPond] = useState("");
  const [selectedSource, setSelectedSource] = useState("SIMULATED");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const API_BASE = "http://localhost:8000/api";

  const loadData = async () => {
    try {
      setLoading(true);
      const [imgRes, farmRes] = await Promise.all([
        fetch(`${API_BASE}/imagery`),
        fetch(`${API_BASE}/farms`)
      ]);
      const imgData = await imgRes.json();
      const farmData = await farmRes.json();
      setImagery(imgData);
      setFarms(farmData);
    } catch (e) {
      console.error(e);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  useEffect(() => {
    if (previewId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProcessingData(null);
      fetch(`${API_BASE}/imagery/${previewId}/processing`)
        .then(res => {
          if (res.ok) return res.json();
          return null;
        })
        .then(data => setProcessingData(data))
        .catch(() => setProcessingData(null));

      setAnalysisData(null);
      fetch(`${API_BASE}/imagery/${previewId}/analysis`)
        .then(res => {
          if (res.ok) return res.json();
          return null;
        })
        .then(data => setAnalysisData(data))
        .catch(() => setAnalysisData(null));
    }
  }, [previewId]);

  const handleProcessImage = async () => {
    if (!previewId) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/imagery/${previewId}/process`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setProcessingData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!previewId) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/imagery/${previewId}/analyze`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setAnalysisData(data);
      } else {
        const errData = await res.json();
        alert(`Analysis failed: ${errData.detail}`);
      }
    } catch (e) {
      console.error(e);
      alert("Analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFarmChange = async (farmId: string) => {
    setSelectedFarm(farmId);
    setSelectedPond("");
    if (!farmId) {
      setPonds([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/ponds?farm_id=${farmId}`);
      const data = await res.json();
      setPonds(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm || !selectedPond || !selectedFile) {
      setError("Please select a farm, pond, and file");
      return;
    }

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("farm_id", selectedFarm);
    formData.append("pond_id", selectedPond);
    formData.append("source_type", selectedSource);
    formData.append("file", selectedFile);

    try {
      const res = await fetch(`${API_BASE}/imagery`, {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Upload failed");
      }
      
      setSelectedFile(null);
      await loadData();
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError(String(e));
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-black">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Imagery Ingestion</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md flex items-center gap-2">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* Upload Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4">Ingest New Imagery</h2>
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          
          <div>
            <label className="block text-sm font-medium mb-1">Farm</label>
            <select 
              className="w-full border p-2 rounded-md"
              value={selectedFarm}
              onChange={(e) => handleFarmChange(e.target.value)}
            >
              <option value="">Select Farm...</option>
              {farms.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Pond</label>
            <select 
              className="w-full border p-2 rounded-md"
              value={selectedPond}
              onChange={(e) => setSelectedPond(e.target.value)}
              disabled={!selectedFarm}
            >
              <option value="">Select Pond...</option>
              {ponds.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Source Type</label>
            <select 
              className="w-full border p-2 rounded-md"
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
            >
              <option value="SIMULATED">Simulated</option>
              <option value="DRONE">Drone</option>
              <option value="SATELLITE">Satellite</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Image File</label>
            <input 
              type="file" 
              accept="image/jpeg,image/png,image/tiff"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full border p-1.5 rounded-md text-sm"
            />
          </div>

          <div className="md:col-span-4 mt-2 flex justify-end">
            <button 
              type="submit" 
              disabled={uploading || !selectedFile || !selectedPond}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50"
            >
              <Upload size={18} /> {uploading ? "Uploading..." : "Upload Imagery"}
            </button>
          </div>
        </form>
      </div>

      {/* List Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4">Ingested Imagery</h2>
        {loading ? (
          <div className="text-gray-500 py-8 text-center">Loading imagery...</div>
        ) : imagery.length === 0 ? (
          <div className="text-gray-500 py-8 text-center">No imagery found. Upload one above!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-3 text-sm font-semibold">Preview</th>
                  <th className="p-3 text-sm font-semibold">Source</th>
                  <th className="p-3 text-sm font-semibold">Ingestion Time</th>
                  <th className="p-3 text-sm font-semibold">Dimensions</th>
                  <th className="p-3 text-sm font-semibold">Size</th>
                  <th className="p-3 text-sm font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {imagery.map((img) => (
                  <tr key={img.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-3">
                      <button 
                        onClick={() => setPreviewId(img.id)}
                        className="p-2 bg-gray-100 rounded-md hover:bg-gray-200"
                        title="View Full Preview"
                      >
                        <ImageIcon size={20} className="text-gray-600" />
                      </button>
                    </td>
                    <td className="p-3">
                      {img.source_type === "SIMULATED" ? (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                          SIMULATED
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                          {img.source_type}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-gray-600">
                      {new Date(img.ingestion_timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 text-sm text-gray-600">
                      {img.width_px} x {img.height_px}
                    </td>
                    <td className="p-3 text-sm text-gray-600">
                      {(img.file_size_bytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                        <CheckCircle size={16} /> {img.processing_status}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-4 max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Image Preview</h3>
              <button 
                onClick={() => setPreviewId(null)}
                className="text-gray-500 hover:text-black font-semibold p-2"
              >
                Close
              </button>
            </div>
            
            <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-100 rounded-lg relative">
              {imagery.find(i => i.id === previewId)?.source_type === "SIMULATED" && (
                <div className="absolute top-4 left-4 bg-purple-600 text-white px-3 py-1 rounded-md font-bold text-sm shadow-md z-10">
                  SIMULATED
                </div>
              )}
              <img 
                src={`${API_BASE}/imagery/${previewId}/preview`} 
                alt="Imagery Preview" 
                className="max-w-full max-h-full object-contain"
              />
            </div>
            
            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm grid grid-cols-2 gap-4">
              <div>
                <span className="font-semibold">ID: </span> {previewId}
              </div>
              <div>
                <span className="font-semibold">Original SHA-256: </span> 
                <span className="font-mono text-xs">{imagery.find(i => i.id === previewId)?.sha256_hash}</span>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-blue-900">Phase 4.2 Quality Assessment</h4>
                <button 
                  onClick={handleProcessImage}
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50"
                >
                  {isProcessing ? "Processing..." : processingData ? "Reprocess Image" : "Run Preprocessing"}
                </button>
              </div>

              {processingData ? (
                <div className="grid grid-cols-2 gap-4 text-blue-900">
                  <div>
                    <span className="font-semibold block mb-1">Quality Classification</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      processingData.quality_classification === "GOOD" ? "bg-green-100 text-green-700" :
                      processingData.quality_classification === "REVIEW" ? "bg-orange-100 text-orange-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {processingData.quality_classification}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold block mb-1">Quality Flags</span>
                    {processingData.quality_flags?.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {processingData.quality_flags.map((flag: string) => (
                          <span key={flag} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">
                            {flag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">No flags</span>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold block">Metrics</span>
                    <ul className="list-disc list-inside text-xs mt-1">
                      <li>Sharpness: {processingData.quality_metrics?.sharpness?.toFixed(2) || "N/A"}</li>
                      <li>Brightness: {processingData.quality_metrics?.brightness?.toFixed(2) || "N/A"}</li>
                      <li>Contrast: {processingData.quality_metrics?.contrast?.toFixed(2) || "N/A"}</li>
                      <li>Exposure (Over/Under): {(processingData.quality_metrics?.overexposed_fraction! * 100).toFixed(1)}% / {(processingData.quality_metrics?.underexposed_fraction! * 100).toFixed(1)}%</li>
                    </ul>
                  </div>
                  <div>
                    <span className="font-semibold block">Processing Info</span>
                    <ul className="text-xs mt-1 space-y-1">
                      <li><span className="font-medium">Version:</span> {processingData.processing_version}</li>
                      <li><span className="font-medium">Status:</span> {processingData.processing_status}</li>
                      <li><span className="font-medium">Processed Hash:</span> <span className="font-mono">{processingData.processed_sha256_hash?.substring(0, 16)}...</span></li>
                      <li><span className="font-medium">Dimensions:</span> {processingData.processed_width_px}x{processingData.processed_height_px}</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center text-blue-600/70 py-4 italic">
                  Image has not been processed yet. Click the button above to run Phase 4.2 preprocessing.
                </div>
              )}
            </div>

            <div className="mt-4 p-4 bg-purple-50 border border-purple-100 rounded-lg text-sm">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-purple-900">Phase 4.3 Visual & Temporal Analysis</h4>
                <button 
                  onClick={handleAnalyzeImage}
                  disabled={isAnalyzing || !processingData || processingData.quality_classification === "UNSUITABLE"}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50"
                  title={!processingData ? "Must run processing first" : processingData.quality_classification === "UNSUITABLE" ? "Image unsuitable for analysis" : ""}
                >
                  {isAnalyzing ? "Analyzing..." : analysisData ? "Re-Analyze Image" : "Run Visual Analysis"}
                </button>
              </div>

              {analysisData ? (
                <div className="grid grid-cols-2 gap-4 text-purple-900">
                  <div>
                    <span className="font-semibold block mb-1">Analysis Status</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      analysisData.analysis_status === "READY" ? "bg-green-100 text-green-700" :
                      analysisData.analysis_status === "REVIEW" ? "bg-orange-100 text-orange-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {analysisData.analysis_status}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold block">Visual Green Coverage</span>
                    <span className="text-xl font-bold">
                      {analysisData.green_pixel_fraction !== null ? (analysisData.green_pixel_fraction * 100).toFixed(1) : "N/A"}%
                    </span>
                    <span className="text-xs block text-purple-700/70">
                      Mean Dominance: {analysisData.green_dominance?.toFixed(3) || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold block">Spatial Distribution</span>
                    <ul className="list-disc list-inside text-xs mt-1">
                      <li>Spatial Mean: {analysisData.spatial_mean?.toFixed(3) || "N/A"}</li>
                      <li>Spatial Std: {analysisData.spatial_std?.toFixed(3) || "N/A"}</li>
                    </ul>
                  </div>
                  <div>
                    <span className="font-semibold block">Temporal Change</span>
                    {analysisData.change_classification ? (
                      <div className="mt-1">
                        <span className={`px-2 py-1 rounded text-xs font-bold mr-2 ${
                          analysisData.change_classification === "INCREASE" ? "bg-green-100 text-green-700" :
                          analysisData.change_classification === "DECREASE" ? "bg-red-100 text-red-700" :
                          "bg-gray-200 text-gray-700"
                        }`}>
                          {analysisData.change_classification}
                        </span>
                        <span className="text-xs">
                          {analysisData.absolute_change !== null ? (analysisData.absolute_change > 0 ? "+" : "") + (analysisData.absolute_change * 100).toFixed(1) + " pp" : ""}
                        </span>
                      </div>
                    ) : (
                      <span className="text-purple-700/70 text-xs italic">No comparable baseline found.</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center text-purple-600/70 py-4 italic">
                  Visual analysis has not been performed yet. Click the button above to run Phase 4.3 analysis.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
