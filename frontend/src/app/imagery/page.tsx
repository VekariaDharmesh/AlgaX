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

export default function ImageryPage() {
  const [imagery, setImagery] = useState<ImageryRecord[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  
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
                <span className="font-semibold">SHA-256: </span> 
                <span className="font-mono text-xs">{imagery.find(i => i.id === previewId)?.sha256_hash}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
