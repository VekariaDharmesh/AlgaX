'use client';

import React, { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { SensorReading } from '@/lib/api';
import { Layers, Sliders } from 'lucide-react';

interface CombinedEnvironmentChartProps {
  readings: SensorReading[];
  sensorsMap: Record<string, { type: string; unit: string }>;
}

export function CombinedEnvironmentChart({ readings, sensorsMap }: CombinedEnvironmentChartProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['temperature', 'ph', 'light', 'nitrogen']);

  // Aggregate readings by timestamp slot (rounded to 5 min intervals)
  const timeSlotMap: Record<string, { timeLabel: string; timestamp: string; [key: string]: any }> = {};

  readings.forEach((r) => {
    const sInfo = sensorsMap[r.sensor_id];
    if (!sInfo) return;

    const dateObj = new Date(r.timestamp);
    // Round to 5 minutes
    dateObj.setSeconds(0, 0);
    dateObj.setMinutes(Math.floor(dateObj.getMinutes() / 5) * 5);
    const timeKey = dateObj.toISOString();
    const timeLabel = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (!timeSlotMap[timeKey]) {
      timeSlotMap[timeKey] = { timeLabel, timestamp: timeKey };
    }

    // Save metric value
    timeSlotMap[timeKey][sInfo.type] = Math.round(r.value * 100) / 100;
  });

  const chartData = Object.values(timeSlotMap).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const METRIC_PALETTE: Record<string, { name: string; color: string; unit: string }> = {
    temperature: { name: 'Temp (°C)', color: '#f43f5e', unit: '°C' },
    ph: { name: 'pH Balance', color: '#6366f1', unit: 'pH' },
    light: { name: 'Solar Irradiance', color: '#f59e0b', unit: 'µmol/m²/s' },
    nitrogen: { name: 'Nitrogen', color: '#10b981', unit: 'mg/L' },
    dissolved_oxygen: { name: 'DO', color: '#0284c7', unit: 'mg/L' },
  };

  const toggleMetric = (key: string) => {
    if (selectedMetrics.includes(key)) {
      if (selectedMetrics.length > 1) {
        setSelectedMetrics(selectedMetrics.filter((m) => m !== key));
      }
    } else {
      setSelectedMetrics([...selectedMetrics, key]);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            Environmental Multi-Variable Comparison
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Cross-variable alignment of temperature, pH, solar irradiance, and nutrient depletion.
          </p>
        </div>

        {/* Metric Selector Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {Object.keys(METRIC_PALETTE).map((key) => {
            const isSelected = selectedMetrics.includes(key);
            const cfg = METRIC_PALETTE[key];

            return (
              <button
                key={key}
                onClick={() => toggleMetric(key)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }}></span>
                {cfg.name}
              </button>
            );
          })}
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

              {selectedMetrics.map((key) => {
                const cfg = METRIC_PALETTE[key];
                if (!cfg) return null;

                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={cfg.name}
                    stroke={cfg.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs font-semibold text-slate-400">
          No combined environmental telemetry data available
        </div>
      )}
    </div>
  );
}
