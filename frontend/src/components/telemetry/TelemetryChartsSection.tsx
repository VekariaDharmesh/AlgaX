'use client';

import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceDot 
} from 'recharts';
import { SensorReading, TelemetryKpi } from '@/lib/api';
import { 
  Thermometer, 
  Sun, 
  Droplets, 
  FlaskConical, 
  Waves, 
  Sprout, 
  AlertTriangle,
  Activity,
  Radio
} from 'lucide-react';

interface TelemetryChartsSectionProps {
  readings: SensorReading[];
  sensorsMap: Record<string, { type: string; unit: string }>;
  kpis: Record<string, TelemetryKpi>;
  anomalies?: any[];
}

const METRIC_CONFIG: Record<string, { title: string; unit: string; color: string; gradientStart: string; gradientEnd: string; icon: any }> = {
  temperature: { 
    title: 'Water Temperature', 
    unit: '°C', 
    color: '#f43f5e', 
    gradientStart: 'rgba(244, 63, 94, 0.25)', 
    gradientEnd: 'rgba(244, 63, 94, 0.01)', 
    icon: Thermometer 
  },
  ph: { 
    title: 'pH Level', 
    unit: 'pH', 
    color: '#6366f1', 
    gradientStart: 'rgba(99, 102, 241, 0.25)', 
    gradientEnd: 'rgba(99, 102, 241, 0.01)', 
    icon: FlaskConical 
  },
  light: { 
    title: 'Solar Irradiance (PAR)', 
    unit: 'µmol/m²/s', 
    color: '#f59e0b', 
    gradientStart: 'rgba(245, 158, 11, 0.25)', 
    gradientEnd: 'rgba(245, 158, 11, 0.01)', 
    icon: Sun 
  },
  nitrogen: { 
    title: 'Dissolved Nitrogen (N)', 
    unit: 'mg/L', 
    color: '#10b981', 
    gradientStart: 'rgba(16, 185, 129, 0.25)', 
    gradientEnd: 'rgba(16, 185, 129, 0.01)', 
    icon: Droplets 
  },
  dissolved_oxygen: { 
    title: 'Dissolved Oxygen (DO)', 
    unit: 'mg/L', 
    color: '#0284c7', 
    gradientStart: 'rgba(2, 132, 199, 0.25)', 
    gradientEnd: 'rgba(2, 132, 199, 0.01)', 
    icon: Waves 
  },
  turbidity: { 
    title: 'Optical Turbidity / Density', 
    unit: 'NTU', 
    color: '#14b8a6', 
    gradientStart: 'rgba(20, 184, 166, 0.25)', 
    gradientEnd: 'rgba(20, 184, 166, 0.01)', 
    icon: Sprout 
  },
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

  // Sort chronologically for live streaming chart
  Object.keys(groupedData).forEach((k) => {
    groupedData[k].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  });

  const displayMetrics = ['temperature', 'ph', 'light', 'nitrogen', 'dissolved_oxygen', 'turbidity'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              LIVE SENSOR MONITORING
            </span>
            <span className="text-xs text-slate-400 font-medium">• Multi-Channel Telemetry Bus</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Live Environmental Stream & Telemetry</h2>
          <p className="text-xs font-medium text-slate-500">
            Real-time physical transducer readings with active sample jitter, limit boundaries, and threshold warnings.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-bold self-start sm:self-auto">
          <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span>Active Probes: {readings.length} Packets</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {displayMetrics.map((metricKey) => {
          const cfg = METRIC_CONFIG[metricKey] || {
            title: metricKey,
            unit: '',
            color: '#059669',
            gradientStart: 'rgba(5, 150, 105, 0.25)',
            gradientEnd: 'rgba(5, 150, 105, 0.01)',
            icon: Sprout,
          };
          const data = groupedData[metricKey] || [];
          const kpi = kpis[metricKey];
          const Icon = cfg.icon;
          const gradientId = `live-gradient-${metricKey}`;

          // Find matching anomalies for metric
          const metricAnomalies = anomalies.filter(
            (a) => a.sensor_type?.toLowerCase() === metricKey || a.type?.toLowerCase().includes(metricKey)
          );

          // Get latest reading
          const latestPoint = data.length > 0 ? data[data.length - 1] : null;

          return (
            <div key={metricKey} className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all space-y-4">
              {/* Chart Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                    <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900">{cfg.title}</h3>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                        {cfg.unit}
                      </span>
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 mt-0.5 flex items-center gap-2">
                      {kpi ? (
                        <span>
                          Live: <strong className="text-slate-900 font-black">{kpi.latest} {cfg.unit}</strong>
                          <span className="mx-1.5 text-slate-300">•</span>
                          Avg: <span className="text-slate-600 font-bold">{kpi.avg}</span>
                          <span className="mx-1.5 text-slate-300">•</span>
                          Min/Max: <span className="text-slate-500 font-mono text-[10px]">{kpi.min} - {kpi.max}</span>
                        </span>
                      ) : (
                        'No readings in selected stream'
                      )}
                    </div>
                  </div>
                </div>

                {metricAnomalies.length > 0 ? (
                  <span className="flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-xl">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    {metricAnomalies.length} Anomaly
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Nominal
                  </span>
                )}
              </div>

              {/* Live Area / Step Telemetry Chart */}
              {data.length > 0 ? (
                <div className="h-56 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={cfg.color} stopOpacity={0.28} />
                          <stop offset="95%" stopColor={cfg.color} stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="timeLabel" 
                        tick={{ fontSize: 10, fill: '#64748b' }} 
                        tickLine={false} 
                      />
                      <YAxis 
                        tick={{ fontSize: 10, fill: '#64748b' }} 
                        tickLine={false} 
                        domain={['auto', 'auto']} 
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#090d16',
                          color: '#fff',
                          borderRadius: '0.85rem',
                          border: '1px solid #1e293b',
                          fontSize: '12px',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
                        }}
                        formatter={(val: any) => [`${val} ${cfg.unit}`, cfg.title]}
                        labelFormatter={(label: any) => `Sensor Timestamp: ${label}`}
                      />
                      <Area
                        type="linear"
                        dataKey="val"
                        stroke={cfg.color}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill={`url(#${gradientId})`}
                        dot={{ r: 1.5, fill: cfg.color, strokeWidth: 0 }}
                        activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
                      />

                      {/* Anomaly Highlight Markers */}
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
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-56 flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-semibold">
                  No live telemetry stream available for {cfg.title}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
