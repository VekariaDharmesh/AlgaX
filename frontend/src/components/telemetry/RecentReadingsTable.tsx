'use client';

import React, { useState } from 'react';
import { SensorReading } from '@/lib/api';
import { Search, ChevronLeft, ChevronRight, Eye, Database, Filter } from 'lucide-react';

import { parseUtcDate } from '@/lib/formatters';

interface RecentReadingsTableProps {
  readings: SensorReading[];
  sensorsMap: Record<string, { type: string; unit: string }>;
  onSelectReading: (reading: SensorReading) => void;
}

export function RecentReadingsTable({ readings, sensorsMap, onSelectReading }: RecentReadingsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMetric, setSelectedMetric] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filtering
  const filteredReadings = readings.filter((r) => {
    const sInfo = sensorsMap[r.sensor_id];
    const mType = sInfo ? sInfo.type : '';

    const matchesMetric = selectedMetric === 'ALL' || mType === selectedMetric;
    const matchesSearch =
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.sensor_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mType.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesMetric && matchesSearch;
  });

  const totalPages = Math.ceil(filteredReadings.length / pageSize) || 1;
  const paginatedReadings = filteredReadings.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            Telemetry Sensor Readings Log
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Raw IoT sensor transmissions, payload verification, and stream audit trail.
          </p>
        </div>

        {/* Search & Metric Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search reading or sensor..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 rounded-xl pl-9 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-56"
            />
          </div>

          <select
            value={selectedMetric}
            onChange={(e) => {
              setSelectedMetric(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none"
          >
            <option value="ALL">All Metrics</option>
            <option value="temperature">Temperature</option>
            <option value="ph">pH Balance</option>
            <option value="light">Solar Irradiance</option>
            <option value="nitrogen">Nitrogen</option>
            <option value="dissolved_oxygen">Dissolved Oxygen</option>
            <option value="turbidity">Turbidity</option>
          </select>
        </div>
      </div>

      {paginatedReadings.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Metric</th>
                <th className="py-2.5 px-3">Value</th>
                <th className="py-2.5 px-3">Quality</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedReadings.map((r) => {
                const sInfo = sensorsMap[r.sensor_id];
                const mType = sInfo ? sInfo.type.replace('_', ' ') : 'sensor';
                const unit = sInfo ? sInfo.unit : '';

                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-600">
                      {parseUtcDate(r.timestamp).toLocaleString([], { hour12: false })}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 uppercase">
                      {mType}
                    </td>
                    <td className="py-3 px-3 font-extrabold text-slate-900">
                      {r.value} <span className="text-slate-500 font-semibold">{unit}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {r.quality_flag}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {r.source_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onSelectReading(r)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs font-semibold text-slate-400">
          No telemetry readings match current search filters.
        </div>
      )}

      {/* Pagination Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-medium text-slate-500">
        <div>
          Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredReadings.length} total)
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
