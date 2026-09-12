'use client';

import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceDot } from 'recharts';
import { SensorReading, TelemetryKpi } from '@/lib/api';
import { Thermometer, Sun, Droplets, FlaskConical, Waves, Sprout, AlertTriangle } from 'lucide-react';

interface TelemetryChartsSectionProps {
  readings: SensorReading[];
  sensorsMap: Record<string, { type: string; unit: string }>;
  kpis: Record<string, TelemetryKpi>;
  anomalies?: any[];
}

const METRIC_CONFIG: Record<string, { title: string; unit: string; color: string; icon: any; domain?: [number, number] }> = {
  temperature: { title: 'Water Temperature', unit: '°C', color: '#f43f5e', icon: Thermometer },
  ph: { title: 'pH Balance', unit: 'pH', color: '#6366f1', icon: FlaskConical },
  light: { title: 'Solar Irradiance (PAR)', unit: 'µmol/m²/s', color: '#f59e0b', icon: Sun },
  nitrogen: { title: 'Aqueous Nitrogen', unit: 'mg/L', color: '#10b981', icon: Droplets },
  dissolved_oxygen: { title: 'Dissolved Oxygen', unit: 'mg/L', color: '#0284c7', icon: Waves },
  turbidity: { title: 'Turbidity / Biomass Proxy', unit: 'NTU', color: '#14b8a6', icon: Sprout },
};

export function TelemetryChartsSection({ readings, sensorsMap, kpis, anomalies = [] }: TelemetryChartsSectionProps) {
  // Group readings by metric type
  const groupedData: Record<string, { timestamp: string; timeLabel: string; val: number; rawTimestamp: string }[]> = {};

  readings.forEach((r) => {
    const sInfo = sensorsMap[r.sensor_id];
    const mType = sInfo ? sInfo.type : 'unknown';

    if (!groupedData[mType]) {
      groupedData[mType] = [];
    }

    const dateObj = new Date(r.timestamp);
    groupedData[mType].push({
      timestamp: r.timestamp,
      timeLabel: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      val: Math.round(r.value * 100) / 100,
      rawTimestamp: r.timestamp,
    });
  });

  // Sort chronological for charts
  Object.keys(groupedData).forEach((k) => {
    groupedData[k].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  });

  const displayMetrics = ['temperature', 'ph', 'light', 'nitrogen', 'dissolved_oxygen', 'turbidity'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Time-Series Telemetry Analysis</h2>
          <p className="text-xs font-medium text-slate-500">
            Real-time environmental sensor trends with statistical control bounds and anomaly markers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {displayMetrics.map((metricKey) => {
          const cfg = METRIC_CONFIG[metricKey] || {
            title: metricKey,
            unit: '',
            color: '#059669',
            icon: Sprout,
          };
          const data = groupedData[metricKey] || [];
          const kpi = kpis[metricKey];
          const Icon = cfg.icon;

          // Find matching anomalies for metric
          const metricAnomalies = anomalies.filter(
            (a) => a.sensor_type?.toLowerCase() === metricKey || a.type?.toLowerCase().includes(metricKey)
          );

          return (
            <div key={metricKey} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
              {/* Chart Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                    <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{cfg.title}</h3>
                    <div className="text-[11px] font-medium text-slate-500">
                      {kpi ? (
                        <span>
                          Current: <strong className="text-slate-800">{kpi.latest} {cfg.unit}</strong> • Avg:{' '}
                          <strong className="text-slate-800">{kpi.avg} {cfg.unit}</strong>
                        </span>
                      ) : (
                        'No readings in selected range'
                      )}
                    </div>
                  </div>
                </div>

                {metricAnomalies.length > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    {metricAnomalies.length} Anomaly Flag
                  </span>
                )}
              </div>

              {/* Chart Canvas */}
              {data.length > 0 ? (
                <div className="h-56 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="timeLabel" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          color: '#fff',
                          borderRadius: '0.75rem',
                          border: 'none',
                          fontSize: '12px',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                        }}
                        formatter={(val: any) => [`${val} ${cfg.unit}`, cfg.title]}
                        labelFormatter={(label: any) => `Time: ${label}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="val"
                        stroke={cfg.color}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                      />

                      {/* Anomaly Dot Overlays */}
                      {metricAnomalies.map((anom, idx) => {
                        const point = data.find(
                          (d) => Math.abs(new Date(d.rawTimestamp).getTime() - new Date(anom.timestamp).getTime()) < 600000
                        );
                        if (!point) return null;
                        return (
                          <ReferenceDot
                            key={idx}
                            x={point.timeLabel}
                            y={point.val}
                            r={6}
                            fill="#ef4444"
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-56 flex flex-col items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs font-semibold">
                  No telemetry stream available for {cfg.title}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
