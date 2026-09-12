'use client';

import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceDot,
  ReferenceLine
} from 'recharts';
import { SensorReading, TelemetryKpi } from '@/lib/api';
import { parseUtcDate, formatLocalTime } from '@/lib/formatters';
import { 
  Thermometer, 
  Sun, 
  Droplets, 
  FlaskConical, 
  Waves, 
  Sprout, 
  AlertTriangle,
  Radio,
  Clock
} from 'lucide-react';

interface TelemetryChartsSectionProps {
  readings: SensorReading[];
  sensorsMap: Record<string, { type: string; unit: string }>;
  kpis: Record<string, TelemetryKpi>;
  anomalies?: any[];
}

const METRIC_CONFIG: Record<string, { title: string; unit: string; color: string; icon: any }> = {
  temperature: { 
    title: 'Water Temperature', 
    unit: '°C', 
    color: '#e11d48', 
    icon: Thermometer 
  },
  ph: { 
    title: 'pH Level', 
    unit: 'pH', 
    color: '#4f46e5', 
    icon: FlaskConical 
  },
  light: { 
    title: 'Solar Irradiance (PAR)', 
    unit: 'µmol/m²/s', 
    color: '#d97706', 
    icon: Sun 
  },
  nitrogen: { 
    title: 'Dissolved Nitrogen (N)', 
    unit: 'mg/L', 
    color: '#059669', 
    icon: Droplets 
  },
  dissolved_oxygen: { 
    title: 'Dissolved Oxygen (DO)', 
    unit: 'mg/L', 
    color: '#0284c7', 
    icon: Waves 
  },
  turbidity: { 
    title: 'Optical Turbidity / Density', 
    unit: 'NTU', 
    color: '#0d9488', 
    icon: Sprout 
  },
};

export function TelemetryChartsSection({ readings, sensorsMap, kpis, anomalies = [] }: TelemetryChartsSectionProps) {
  // Live ticking clock state in user's local timezone (e.g. 22:55:00)
  const [currentClock, setCurrentClock] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentClock(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Group readings by metric type with accurate UTC -> Local Time parsing
  const groupedData: Record<string, { timestamp: string; timeLabel: string; val: number; rawTimestamp: string }[]> = {};

  readings.forEach((r) => {
    const sInfo = sensorsMap[r.sensor_id];
    const mType = sInfo ? sInfo.type : 'unknown';

    if (!groupedData[mType]) {
      groupedData[mType] = [];
    }

    const dateObj = parseUtcDate(r.timestamp);
    groupedData[mType].push({
      timestamp: r.timestamp,
      timeLabel: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      val: Math.round(r.value * 100) / 100,
      rawTimestamp: r.timestamp,
    });
  });

  // Sort chronologically for live streaming chart
  Object.keys(groupedData).forEach((k) => {
    groupedData[k].sort((a, b) => parseUtcDate(a.timestamp).getTime() - parseUtcDate(b.timestamp).getTime());
  });

  const displayMetrics = ['temperature', 'ph', 'light', 'nitrogen', 'dissolved_oxygen', 'turbidity'];

  return (
    <div className="space-y-6 pt-2">
      {/* Section Header with Live Local Clock */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              LIVE SENSOR MONITORING
            </span>
            <span className="text-xs text-slate-400 font-semibold">• Local Time Zone Synchronized</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Real-Time Sensor Transducer Telemetry</h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Real-time biometric and environmental probe telemetry streams in your local timezone.
          </p>
        </div>

        {/* Live Digital Clock Badge */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex items-center gap-2.5 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-sm">
            <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
            <div className="flex flex-col text-left">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Current Local Time</span>
              <span className="font-mono text-sm text-emerald-400 font-black">{currentClock || 'Syncing clock...'}</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-2.5 rounded-xl text-xs font-bold text-emerald-800">
            <Radio className="w-3.5 h-3.5 text-emerald-600" />
            <span>{readings.length} Packets</span>
          </div>
        </div>
      </div>

      {/* Grid of Clean Line-Only Charts with Local Timestamps */}
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

          const latestPoint = data.length > 0 ? data[data.length - 1] : null;

          return (
            <div key={metricKey} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all space-y-4">
              {/* Chart Header with Current Time indication */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900">{cfg.title}</h3>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                        {cfg.unit}
                      </span>
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                      {kpi ? (
                        <span>
                          Live ({latestPoint?.timeLabel || currentClock}): <strong className="text-slate-900 font-black">{kpi.latest} {cfg.unit}</strong>
                          <span className="mx-1.5 text-slate-300">•</span>
                          Avg: <span className="text-slate-600 font-bold">{kpi.avg}</span>
                          <span className="mx-1.5 text-slate-300">•</span>
                          Min/Max: <span className="text-slate-500 font-mono text-[10px]">{kpi.min} - {kpi.max}</span>
                        </span>
                      ) : (
                        'No live data streamed'
                      )}
                    </div>
                  </div>
                </div>

                {metricAnomalies.length > 0 ? (
                  <span className="flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    {metricAnomalies.length} Flag
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="text-[10px] font-bold text-emerald-800">LIVE NOW</span>
                  </div>
                )}
              </div>

              {/* Clean Line Chart ONLY (No Area Color Shade / Fill) */}
              {data.length > 0 ? (
                <div className="h-56 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
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
                          borderRadius: '0.75rem',
                          border: '1px solid #1e293b',
                          fontSize: '12px',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
                        }}
                        formatter={(val: any) => [`${val} ${cfg.unit}`, cfg.title]}
                        labelFormatter={(label: any) => `Local Time: ${label}`}
                      />
                      
                      {/* Current Time Live Reference Line at rightmost point */}
                      {latestPoint && (
                        <ReferenceLine 
                          x={latestPoint.timeLabel} 
                          stroke="#10b981" 
                          strokeDasharray="3 3"
                          strokeWidth={1.5}
                        />
                      )}

                      <Line
                        type="linear"
                        dataKey="val"
                        stroke={cfg.color}
                        strokeWidth={2}
                        dot={{ r: 2, fill: cfg.color, strokeWidth: 0 }}
                        activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
                        isAnimationActive={false}
                      />

                      {/* Anomaly Reference Dots */}
                      {metricAnomalies.map((anom, idx) => {
                        const point = data.find(
                          (d) => Math.abs(parseUtcDate(d.rawTimestamp).getTime() - parseUtcDate(anom.timestamp).getTime()) < 600000
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
