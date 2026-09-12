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
  Legend,
  ReferenceLine
} from 'recharts';
import { SensorReading } from '@/lib/api';
import { parseUtcDate } from '@/lib/formatters';
import { Layers, Radio, SlidersHorizontal, Clock } from 'lucide-react';

interface CombinedEnvironmentChartProps {
  readings: SensorReading[];
  sensorsMap: Record<string, { type: string; unit: string }>;
}

export function CombinedEnvironmentChart({ readings, sensorsMap }: CombinedEnvironmentChartProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['temperature', 'ph', 'nitrogen', 'light']);
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

  // Aggregate readings by timestamp slot (rounded to 10 min intervals in local time)
  const timeSlotMap: Record<string, { timeLabel: string; timestamp: string; [key: string]: any }> = {};

  readings.forEach((r) => {
    const sInfo = sensorsMap[r.sensor_id];
    if (!sInfo) return;

    const dateObj = parseUtcDate(r.timestamp);
    dateObj.setSeconds(0, 0);
    dateObj.setMinutes(Math.floor(dateObj.getMinutes() / 10) * 10);
    const timeKey = dateObj.toISOString();
    const timeLabel = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    if (!timeSlotMap[timeKey]) {
      timeSlotMap[timeKey] = { timeLabel, timestamp: timeKey };
    }

    // Save metric value
    timeSlotMap[timeKey][sInfo.type] = Math.round(r.value * 100) / 100;
  });

  const chartData = Object.values(timeSlotMap).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const latestPoint = chartData.length > 0 ? chartData[chartData.length - 1] : null;

  const METRIC_PALETTE: Record<string, { name: string; color: string; unit: string; yAxisId: 'left' | 'right' }> = {
    temperature: { name: 'Temp (°C)', color: '#f43f5e', unit: '°C', yAxisId: 'left' },
    ph: { name: 'pH Index', color: '#6366f1', unit: 'pH', yAxisId: 'left' },
    nitrogen: { name: 'Nitrogen (mg/L)', color: '#10b981', unit: 'mg/L', yAxisId: 'left' },
    dissolved_oxygen: { name: 'DO (mg/L)', color: '#0284c7', unit: 'mg/L', yAxisId: 'left' },
    light: { name: 'Solar PAR (µmol)', color: '#f59e0b', unit: 'µmol/m²/s', yAxisId: 'right' },
    turbidity: { name: 'Turbidity (NTU)', color: '#14b8a6', unit: 'NTU', yAxisId: 'right' },
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

  const hasRightAxisMetrics = selectedMetrics.some(
    (k) => METRIC_PALETTE[k]?.yAxisId === 'right'
  );

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              DUAL-AXIS BUS
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Local Time Synchronized</span>
          </div>
          <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            Environmental Multi-Variable Live Alignment
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Cross-variable alignment: Biological/chemical variables on left axis, optical irradiance/turbidity on right axis.
          </p>
        </div>

        {/* Metric Selector Toggles & Clock */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {Object.keys(METRIC_PALETTE).map((key) => {
              const isSelected = selectedMetrics.includes(key);
              const cfg = METRIC_PALETTE[key];

              return (
                <button
                  key={key}
                  onClick={() => toggleMetric(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }}></span>
                  {cfg.name}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 text-emerald-400 font-mono text-xs font-black px-3.5 py-2 rounded-xl shadow-sm">
            <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>{currentClock || 'Syncing...'}</span>
          </div>
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="timeLabel" 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                tickLine={false} 
              />
              
              {/* Left Y Axis for Temperature, pH, Nitrogen, DO */}
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 10, fill: '#64748b' }} 
                tickLine={false} 
                domain={['auto', 'auto']} 
              />

              {/* Right Y Axis for Solar PAR & Turbidity */}
              {hasRightAxisMetrics && (
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10, fill: '#f59e0b' }} 
                  tickLine={false} 
                  domain={[0, 'auto']} 
                />
              )}

              <Tooltip
                contentStyle={{
                  backgroundColor: '#090d16',
                  color: '#fff',
                  borderRadius: '0.85rem',
                  border: '1px solid #1e293b',
                  fontSize: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
                }}
                labelFormatter={(label: any) => `Local Time: ${label}`}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

              {/* Current Time Live Reference Line */}
              {latestPoint && (
                <ReferenceLine 
                  x={latestPoint.timeLabel} 
                  stroke="#10b981" 
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                />
              )}

              {selectedMetrics.map((key) => {
                const cfg = METRIC_PALETTE[key];
                if (!cfg) return null;

                return (
                  <Line
                    key={key}
                    yAxisId={cfg.yAxisId}
                    type="linear"
                    dataKey={key}
                    name={cfg.name}
                    stroke={cfg.color}
                    strokeWidth={2}
                    dot={{ r: 1.5, fill: cfg.color }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-72 flex items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs font-semibold text-slate-400">
          No combined environmental telemetry stream available
        </div>
      )}
    </div>
  );
}
