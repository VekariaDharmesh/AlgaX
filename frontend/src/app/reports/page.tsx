'use client';

import React from 'react';
import { Download, ExternalLink, Shield } from 'lucide-react';
import Link from 'next/link';

export default function ReportsPage() {
  const reports = [
    {
      id: 'MR-2026-00128',
      farm: 'GreenRiver Farm',
      period: 'Sep 1 - Sep 12, 2026',
      model: 'v1.2.0',
      carbon: '1,188 kg CO₂e',
      created: 'Sep 12, 2026',
      status: 'Verification-ready',
      hashMatch: true
    },
    {
      id: 'MR-2026-00127',
      farm: 'GreenRiver Farm',
      period: 'Aug 1 - Aug 31, 2026',
      model: 'v1.1.0',
      carbon: '3,042 kg CO₂e',
      created: 'Sep 1, 2026',
      status: 'Verified',
      hashMatch: true
    },
    {
      id: 'MR-2026-00126',
      farm: 'GreenRiver Farm',
      period: 'Jul 1 - Jul 31, 2026',
      model: 'v1.1.0',
      carbon: '2,980 kg CO₂e',
      created: 'Aug 1, 2026',
      status: 'Verified',
      hashMatch: true
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Reports</h1>
          <p className="text-gray-500 mt-1">Verification-ready carbon accounting outputs and historical records.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Report</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Period</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Model Version</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Carbon Removed</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Created</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{report.id}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{report.farm}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{report.period}</td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{report.model}</span>
                  </td>
                  <td className="px-6 py-4 font-bold text-green-700">{report.carbon}</td>
                  <td className="px-6 py-4 text-gray-600">{report.created}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                      report.status === 'Verified' ? 'bg-green-100 text-green-700' : 
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {report.hashMatch && <Shield className="w-3 h-3" />}
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/review`} className="text-gray-400 hover:text-blue-600 transition-colors" title="View Evidence">
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <button className="text-gray-400 hover:text-gray-900 transition-colors" title="Download PDF">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
