'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, Info, ArrowUpRight } from 'lucide-react';

export type CarbonUnit = 't CO₂e' | 'kg CO₂e' | 'kg C';

export interface CarbonWaterfallStage {
  id: string;
  label: string[]; // e.g. ['Gross CO₂', 'Fixed']
  type: 'positive' | 'negative' | 'subtotal' | 'total';
  valueKgCO2e: number; // base canonical value in kg CO2e
  source?: string;
  description?: string;
}

export interface CarbonWaterfallProps {
  stages?: CarbonWaterfallStage[];
  defaultUnit?: CarbonUnit;
  onSelectStage?: (stage: ComputedStage) => void;
  className?: string;
}

export interface ComputedStage {
  id: string;
  label: string[];
  type: 'positive' | 'negative' | 'subtotal' | 'total';
  rawKgCO2e: number;
  displayValue: number;
  formattedValue: string;
  startValue: number;
  endValue: number;
  runningTotal: number;
  percentOfGross: number;
  source: string;
  description: string;
  color: string;
}

// Unit conversion factors from kg CO2e
const CONVERSION_FACTORS: Record<CarbonUnit, { factor: number; decimals: number; unitLabel: string }> = {
  't CO₂e': { factor: 0.001, decimals: 2, unitLabel: 't CO₂e' },
  'kg CO₂e': { factor: 1.0, decimals: 0, unitLabel: 'kg CO₂e' },
  'kg C': { factor: 12.011 / 44.01, decimals: 1, unitLabel: 'kg C' }, // Stoichiometric ratio: 12/44
};

// Default MRV baseline data matching specification
export const DEFAULT_WATERFALL_STAGES: CarbonWaterfallStage[] = [
  {
    id: 'gross_fixed',
    label: ['Gross CO₂', 'Fixed'],
    type: 'positive',
    valueKgCO2e: 2140, // 2.14 t CO2e
    source: 'Multi-spectral biomass growth model & Monod kinetics',
    description: 'Total atmospheric CO₂ biologically fixed via photosynthesis across raceways.',
  },
  {
    id: 'processing_conversion',
    label: ['Processing', '& Conversion'],
    type: 'negative',
    valueKgCO2e: -860, // -0.86 t CO2e
    source: 'Downstream centrifugation, drying & biopolymer extraction',
    description: 'Volatile off-gas and non-durable organic fraction loss during cell lysis.',
  },
  {
    id: 'end_use_retained',
    label: ['End-Use', 'Retained'],
    type: 'subtotal',
    valueKgCO2e: 1280, // +1.28 t CO2e
    source: 'Durable bioplastic product fate analysis (ISO 14064-2)',
    description: 'Long-term sequestered carbon fraction locked into durable structural biopolymer.',
  },
  {
    id: 'operational_footprint',
    label: ['Operational', 'Footprint'],
    type: 'negative',
    valueKgCO2e: -100, // -0.10 t CO2e (-96.0 kg rounded to -0.10 t)
    source: 'Scope 1 & Scope 2 energy telemetry (paddle wheels + grid factor)',
    description: 'Parasitic energy footprint deductions from electricity and water pumping.',
  },
  {
    id: 'net_removed',
    label: ['Net Removed'],
    type: 'total',
    valueKgCO2e: 1184, // +1.19 t CO2e (rounded display: 1.19 t)
    source: 'Net verified carbon removal (Registry standard compliant)',
    description: 'Final audited net atmospheric carbon removal eligible for carbon credits.',
  },
];

export function CarbonWaterfall({
  stages = DEFAULT_WATERFALL_STAGES,
  defaultUnit = 't CO₂e',
  onSelectStage,
  className = '',
}: CarbonWaterfallProps) {
  const [selectedUnit, setSelectedUnit] = useState<CarbonUnit>(defaultUnit);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [hoveredStageId, setHoveredStageId] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  const unitConfig = CONVERSION_FACTORS[selectedUnit];

  // Programmatically compute waterfall running totals and display values
  const computedStages = useMemo<ComputedStage[]>(() => {
    let currentRunningTotal = 0;
    const grossVal = stages[0]?.valueKgCO2e || 1;

    return stages.map((stage) => {
      let startVal = 0;
      let endVal = 0;
      const rawVal = stage.valueKgCO2e;

      if (stage.type === 'positive') {
        startVal = 0;
        endVal = rawVal;
        currentRunningTotal = rawVal;
      } else if (stage.type === 'negative') {
        startVal = currentRunningTotal;
        currentRunningTotal += rawVal; // rawVal is negative
        endVal = currentRunningTotal;
      } else if (stage.type === 'subtotal') {
        startVal = 0;
        endVal = currentRunningTotal;
      } else if (stage.type === 'total') {
        startVal = 0;
        endVal = currentRunningTotal;
      }

      const displayValue = rawVal * unitConfig.factor;
      const formattedNum = (Math.abs(displayValue)).toFixed(unitConfig.decimals);
      
      let formattedValue = '';
      if (stage.type === 'negative') {
        formattedValue = `−${formattedNum}`;
      } else {
        formattedValue = `${formattedNum}`;
      }

      // Color mapping according to professional MRV spec:
      // Gross CO2 Fixed: Dark forest green (#0e4a2c)
      // Deductions: Muted steel blue-gray (#9bbcd0)
      // End-Use Retained: Muted vibrant sage/teal (#2dd4bf / #34d399)
      // Net Removed: Deep charcoal-green (#09331d)
      let color = '#0e4a2c';
      if (stage.id === 'gross_fixed') {
        color = '#0e4a2c';
      } else if (stage.type === 'negative') {
        color = '#9bbcd0';
      } else if (stage.id === 'end_use_retained') {
        color = '#2dd4bf';
      } else if (stage.type === 'total') {
        color = '#09331d';
      }

      const percentOfGross = grossVal !== 0 ? Math.round((Math.abs(rawVal) / Math.abs(grossVal)) * 100) : 0;

      return {
        id: stage.id,
        label: stage.label,
        type: stage.type,
        rawKgCO2e: rawVal,
        displayValue,
        formattedValue,
        startValue: startVal * unitConfig.factor,
        endValue: endVal * unitConfig.factor,
        runningTotal: currentRunningTotal * unitConfig.factor,
        percentOfGross,
        source: stage.source || 'Audited Sensor Telemetry',
        description: stage.description || '',
        color,
      };
    });
  }, [stages, selectedUnit, unitConfig]);

  // Compute dynamic Y-axis maximum
  const yMax = useMemo(() => {
    const maxVal = Math.max(...computedStages.map((s) => Math.max(s.startValue, s.endValue, s.runningTotal)));
    if (selectedUnit === 't CO₂e') return 2.5;
    if (selectedUnit === 'kg CO₂e') return Math.ceil(maxVal / 500) * 500 || 2500;
    return Math.ceil(maxVal / 100) * 100 || 700;
  }, [computedStages, selectedUnit]);

  // Y-axis tick steps (5 equal segments)
  const yTicks = useMemo(() => {
    const step = yMax / 5;
    return [0, step, step * 2, step * 3, step * 4, yMax];
  }, [yMax]);

  // Chart dimensions & layout coordinates
  const svgWidth = 600;
  const svgHeight = 270;
  const margin = { top: 32, right: 20, bottom: 56, left: 60 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  const barCount = computedStages.length;
  const barSlotWidth = plotWidth / barCount;
  const barWidth = Math.min(barSlotWidth * 0.72, 64);

  const getYCoord = (val: number) => {
    const clamped = Math.max(0, Math.min(val, yMax));
    return margin.top + plotHeight - (clamped / yMax) * plotHeight;
  };

  const getXCoord = (index: number) => {
    return margin.left + index * barSlotWidth + (barSlotWidth - barWidth) / 2;
  };

  const activeHoveredStage = useMemo(() => {
    return computedStages.find((s) => s.id === hoveredStageId) || null;
  }, [computedStages, hoveredStageId]);

  const handleStageClick = (stage: ComputedStage) => {
    setSelectedStageId(stage.id);
    onSelectStage?.(stage);
  };

  return (
    <div
      className={`bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs select-none transition-all ${className}`}
      role="region"
      aria-label="Carbon Waterfall Chart"
    >
      {/* 1. Component Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
            Carbon Waterfall
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            From CO₂ fixation to net removal
          </p>
        </div>

        {/* Top-Right Compact Functional Unit Selector */}
        <div className="relative self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowUnitDropdown(!showUnitDropdown)}
            className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-black text-slate-800 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            aria-haspopup="listbox"
            aria-expanded={showUnitDropdown}
            aria-label="Select carbon unit"
          >
            <span>{selectedUnit}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          </button>

          {showUnitDropdown && (
            <div
              className="absolute right-0 mt-1.5 w-32 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 text-xs animate-in fade-in zoom-in-95 duration-100"
              role="listbox"
            >
              {(['t CO₂e', 'kg CO₂e', 'kg C'] as CarbonUnit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => {
                    setSelectedUnit(u);
                    setShowUnitDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 font-bold transition-colors flex items-center justify-between ${
                    selectedUnit === u ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                  role="option"
                  aria-selected={selectedUnit === u}
                >
                  <span>{u}</span>
                  {selectedUnit === u && <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Responsive Chart Canvas */}
      <div className="relative pt-4 w-full overflow-x-auto">
        <div className="min-w-[500px] w-full">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto overflow-visible font-sans"
            aria-hidden="true"
          >
            {/* Subtle Horizontal Grid Lines & Y-Axis Ticks */}
            {yTicks.map((tick, idx) => {
              const y = getYCoord(tick);
              return (
                <g key={idx} className="transition-all duration-300">
                  <line
                    x1={margin.left}
                    y1={y}
                    x2={svgWidth - margin.right}
                    y2={y}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                  />
                  <text
                    x={margin.left - 10}
                    y={y + 3.5}
                    textAnchor="end"
                    className="text-[11px] font-medium fill-slate-400 font-mono"
                  >
                    {tick.toFixed(selectedUnit === 't CO₂e' ? 1 : 0)}
                  </text>
                </g>
              );
            })}

            {/* Y-Axis Label */}
            <text
              x={margin.left - 42}
              y={margin.top + plotHeight / 2}
              textAnchor="middle"
              transform={`rotate(-90, ${margin.left - 42}, ${margin.top + plotHeight / 2})`}
              className="text-[11px] font-bold fill-slate-500"
            >
              {selectedUnit}
            </text>

            {/* Left Y-Axis Spine */}
            <line
              x1={margin.left}
              y1={margin.top}
              x2={margin.left}
              y2={margin.top + plotHeight}
              stroke="#cbd5e1"
              strokeWidth="1.2"
            />

            {/* Bottom X-Axis Baseline */}
            <line
              x1={margin.left}
              y1={margin.top + plotHeight}
              x2={svgWidth - margin.right}
              y2={margin.top + plotHeight}
              stroke="#cbd5e1"
              strokeWidth="1.2"
            />

            {/* Dashed Connector Lines between stages */}
            {computedStages.map((stage, idx) => {
              if (idx === 0) return null;
              const prevStage = computedStages[idx - 1];
              
              // Previous stage connection level
              let connectY = 0;
              if (prevStage.type === 'positive') {
                connectY = getYCoord(prevStage.endValue);
              } else if (prevStage.type === 'negative') {
                connectY = getYCoord(prevStage.endValue);
              } else {
                connectY = getYCoord(prevStage.endValue);
              }

              const prevX = getXCoord(idx - 1) + barWidth;
              const currX = getXCoord(idx);

              return (
                <line
                  key={`connector-${stage.id}`}
                  x1={prevX}
                  y1={connectY}
                  x2={currX}
                  y2={connectY}
                  stroke="#94a3b8"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                />
              );
            })}

            {/* Waterfall Bars & Value Labels */}
            {computedStages.map((stage, idx) => {
              const x = getXCoord(idx);
              const topY = getYCoord(Math.max(stage.startValue, stage.endValue));
              const botY = getYCoord(Math.min(stage.startValue, stage.endValue));
              const barH = Math.max(botY - topY, 4);

              const isHovered = hoveredStageId === stage.id;
              const isSelected = selectedStageId === stage.id;
              const isFinalNet = stage.type === 'total';

              // Value Label Position
              const labelY = stage.type === 'negative' ? botY + 16 : topY - 8;

              return (
                <g
                  key={stage.id}
                  className="cursor-pointer transition-all duration-300 group"
                  onMouseEnter={() => setHoveredStageId(stage.id)}
                  onMouseLeave={() => setHoveredStageId(null)}
                  onClick={() => handleStageClick(stage)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${stage.label.join(' ')}: ${stage.formattedValue} ${selectedUnit}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleStageClick(stage);
                    }
                  }}
                >
                  {/* Bar Shape */}
                  <rect
                    x={x}
                    y={topY}
                    width={barWidth}
                    height={barH}
                    fill={stage.color}
                    rx={1.5}
                    ry={1.5}
                    className="transition-all duration-300"
                    style={{
                      opacity: isHovered || isSelected ? 1 : 0.95,
                      filter: isHovered ? 'brightness(1.08)' : 'none',
                      stroke: isSelected ? '#0f172a' : 'none',
                      strokeWidth: isSelected ? 2 : 0,
                    }}
                  />

                  {/* Value Label directly above/below bar */}
                  <text
                    x={x + barWidth / 2}
                    y={labelY}
                    textAnchor="middle"
                    className={`font-mono transition-all duration-300 ${
                      isFinalNet
                        ? 'text-[13px] font-black fill-slate-900'
                        : 'text-[12px] font-extrabold fill-slate-900'
                    }`}
                  >
                    {stage.formattedValue}
                  </text>

                  {/* Two-Line X-Axis Labels */}
                  <text
                    x={x + barWidth / 2}
                    y={margin.top + plotHeight + 18}
                    textAnchor="middle"
                    className={`text-[11px] leading-tight ${
                      isFinalNet
                        ? 'font-black fill-slate-900'
                        : 'font-semibold fill-slate-700'
                    }`}
                  >
                    {stage.label.map((line, lIdx) => (
                      <tspan
                        key={lIdx}
                        x={x + barWidth / 2}
                        dy={lIdx === 0 ? 0 : 13}
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* 3. Accessible Interactive Detail Drawer / Tooltip Info */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {activeHoveredStage ? (
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-slate-800 animate-in fade-in duration-150">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: activeHoveredStage.color }}
            />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span className="font-bold text-slate-900">
                {activeHoveredStage.label.join(' ')}:
              </span>
              <span className="font-mono font-black text-slate-900">
                {activeHoveredStage.formattedValue} {selectedUnit}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500">
                Running Total: <strong className="text-slate-700 font-mono">{activeHoveredStage.runningTotal.toFixed(unitConfig.decimals)} {selectedUnit}</strong>
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-emerald-700 font-semibold">
                {activeHoveredStage.percentOfGross}% of gross
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <Info className="w-4 h-4 text-slate-400" />
            <span>Hover over or click any stage bar to inspect traceable audit parameters.</span>
          </div>
        )}

        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 self-end sm:self-auto">
          <span>Net Conversion:</span>
          <strong className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded font-black">
            {((computedStages[computedStages.length - 1]?.rawKgCO2e / computedStages[0]?.rawKgCO2e) * 100).toFixed(1)}%
          </strong>
        </div>
      </div>

      {/* 4. Screen-Reader Accessible Data Table */}
      <table className="sr-only">
        <caption>Carbon Waterfall Accounting Breakdown</caption>
        <thead>
          <tr>
            <th>Stage</th>
            <th>Type</th>
            <th>Value ({selectedUnit})</th>
            <th>Running Total ({selectedUnit})</th>
            <th>Percentage of Gross</th>
          </tr>
        </thead>
        <tbody>
          {computedStages.map((stage) => (
            <tr key={stage.id}>
              <td>{stage.label.join(' ')}</td>
              <td>{stage.type}</td>
              <td>{stage.formattedValue}</td>
              <td>{stage.runningTotal.toFixed(unitConfig.decimals)}</td>
              <td>{stage.percentOfGross}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
