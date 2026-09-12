'use client';

import React, { useState, useMemo } from 'react';
import { 
  Leaf, 
  Cloud, 
  Database, 
  Settings, 
  Calendar, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Edit3, 
  Info, 
  Map, 
  CheckCircle2, 
  Image as ImageIcon, 
  RefreshCw, 
  X, 
  ChevronDown,
  Layers,
  Zap,
  Target,
  FileSpreadsheet,
  FileText,
  Sliders,
  Sparkles,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';

export default function CarbonAccountingPage() {
  // Unit toggle state: 't' (tonnes CO2e) or 'kg' (kg CO2e)
  const [unit, setUnit] = useState<'t' | 'kg'>('t');
  
  // Time range selector for Removal Trend chart
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D' | '1Y'>('30D');

  // Date range dropdown
  const [dateRange, setDateRange] = useState('Sep 01, 2026 – Sep 12, 2026');
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // Modals state
  const [showEditAssumptions, setShowEditAssumptions] = useState(false);
  const [showTraceableDetails, setShowTraceableDetails] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Dynamic Assumptions State
  const [assumptions, setAssumptions] = useState({
    carbonFraction: 0.51, // kg C / kg dry biomass
    operationalElectricity: 120, // kWh
    gridEmissionFactor: 0.71, // kg CO2e / kWh
    endUseFate: 'Bioplastic (Durable)',
    retentionRate: 0.60, // 60% durable
  });

  // Edit Assumptions Form Temp State
  const [tempAssumptions, setTempAssumptions] = useState({ ...assumptions });

  // Base raw calculations in kg
  const grossFixedKg = 2140;
  const processingConversionDeductionKg = 860;
  const endUseRetainedKg = grossFixedKg - processingConversionDeductionKg; // 1280 kg
  const operationalFootprintKg = assumptions.operationalElectricity * assumptions.gridEmissionFactor + 10.8; // ~96.0 kg
  const netRemovedKg = endUseRetainedKg - operationalFootprintKg; // ~1184 kg = 1.184 ~ 1.19 t

  // Conversion helper
  const scale = unit === 't' ? 0.001 : 1.0;
  const unitLabel = unit === 't' ? 't CO₂e' : 'kg CO₂e';

  // Format values
  const grossFixedVal = (grossFixedKg * scale).toFixed(unit === 't' ? 2 : 0);
  const processingLossVal = (processingConversionDeductionKg * scale).toFixed(unit === 't' ? 2 : 0);
  const endUseRetainedVal = (endUseRetainedKg * scale).toFixed(unit === 't' ? 2 : 0);
  const operationalFootprintVal = (operationalFootprintKg * (unit === 't' ? 0.001 : 1)).toFixed(unit === 't' ? 2 : 1);
  const netRemovedVal = (netRemovedKg * scale).toFixed(unit === 't' ? 2 : 0);

  // Trend Data for Removal Trend Chart
  const trendDataMap: Record<string, { date: string; value: number }[]> = {
    '7D': [
      { date: 'Sep 06', value: 0.85 },
      { date: 'Sep 07', value: 0.90 },
      { date: 'Sep 08', value: 1.05 },
      { date: 'Sep 09', value: 1.12 },
      { date: 'Sep 10', value: 1.15 },
      { date: 'Sep 11', value: 1.48 },
      { date: 'Sep 12', value: 1.19 },
    ],
    '30D': [
      { date: 'Sep 01', value: 0.45 },
      { date: 'Sep 02', value: 0.58 },
      { date: 'Sep 03', value: 0.55 },
      { date: 'Sep 04', value: 0.62 },
      { date: 'Sep 05', value: 0.78 },
      { date: 'Sep 06', value: 0.80 },
      { date: 'Sep 07', value: 0.90 },
      { date: 'Sep 08', value: 1.05 },
      { date: 'Sep 09', value: 1.15 },
      { date: 'Sep 10', value: 1.15 },
      { date: 'Sep 11', value: 1.48 },
      { date: 'Sep 12', value: 1.19 },
    ],
    '90D': [
      { date: 'Jul 15', value: 0.35 },
      { date: 'Aug 01', value: 0.65 },
      { date: 'Aug 15', value: 0.92 },
      { date: 'Sep 01', value: 0.45 },
      { date: 'Sep 12', value: 1.19 },
    ],
    '1Y': [
      { date: 'Q4 2025', value: 0.30 },
      { date: 'Q1 2026', value: 0.68 },
      { date: 'Q2 2026', value: 0.95 },
      { date: 'Q3 2026', value: 1.19 },
    ],
  };

  const trendData = (trendDataMap[timeRange] || trendDataMap['30D']).map(item => ({
    ...item,
    val: unit === 't' ? item.value : Math.round(item.value * 1000),
  }));

  // Sparkline data for Net Carbon KPI card
  const sparklineData = [
    { v: 0.8 }, { v: 0.85 }, { v: 0.95 }, { v: 1.05 }, { v: 1.15 }, { v: 1.19 }
  ];

  // Handle assumptions save
  const handleSaveAssumptions = (e: React.FormEvent) => {
    e.preventDefault();
    setAssumptions({ ...tempAssumptions });
    setShowEditAssumptions(false);
  };

  // Export report generator simulation
  const handleExport = (format: 'PDF' | 'CSV') => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      setShowExportModal(false);
      // Create instant simulated download trigger
      const blob = new Blob([
        `AlgaX Carbon MRV Audit Report\nFacility: GreenRiver Algae Facility\nPeriod: ${dateRange}\nNet Carbon Removed: ${netRemovedVal} ${unitLabel}\nGross Fixed: ${grossFixedVal} ${unitLabel}\nEnd-Use Retained: ${endUseRetainedVal} ${unitLabel}\nOperational Footprint: -${operationalFootprintVal} ${unit === 't' ? 't CO2e' : 'kg CO2e'}\nCarbon Fraction: ${assumptions.carbonFraction}\nGrid Factor: ${assumptions.gridEmissionFactor} kg CO2e/kWh\nGenerated: ${new Date().toISOString()}\n`
      ], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AlgaX-Carbon-Report-${dateRange.replace(/\s+/g, '_')}.${format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, 800);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 p-4 sm:p-6 text-slate-800">
      
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shadow-xs shrink-0">
            <Leaf className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Carbon Accounting
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
              Track carbon removal performance across your algae operations.
            </p>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-3 self-start md:self-auto relative">
          {/* Date Range Picker Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              className="flex items-center gap-2 bg-white border border-slate-200/90 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-all"
            >
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{dateRange}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {showDateDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-2 text-xs">
                <div className="font-bold text-slate-400 px-3 py-1.5 uppercase text-[10px]">Select Reporting Period</div>
                {[
                  'Sep 01, 2026 – Sep 12, 2026',
                  'Aug 01, 2026 – Aug 31, 2026',
                  'Last 30 Days',
                  'Year to Date (2026)',
                ].map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      setDateRange(range);
                      setShowDateDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl font-bold transition-all ${
                      dateRange === range ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export Report Button */}
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* 2. Top 4 Metric KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Net Carbon Removed */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Net Carbon Removed</span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Leaf className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {netRemovedVal} <span className="text-sm sm:text-base font-bold text-slate-500">{unitLabel}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+12% <span className="font-normal text-slate-400">vs. previous period</span></span>
              </div>
            </div>
            {/* Sparkline mini chart */}
            <div className="w-16 h-8 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Line type="monotone" dataKey="v" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Card 2: Gross CO2 Fixed */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Gross CO₂ Fixed</span>
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {grossFixedVal} <span className="text-sm sm:text-base font-bold text-slate-500">{unitLabel}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+8%</span>
            </div>
          </div>
        </div>

        {/* Card 3: End-Use Retained */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">End-Use Retained</span>
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {endUseRetainedVal} <span className="text-sm sm:text-base font-bold text-slate-500">{unitLabel}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+15%</span>
            </div>
          </div>
        </div>

        {/* Card 4: Operational Footprint */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Operational Footprint</span>
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              -{operationalFootprintVal} <span className="text-sm sm:text-base font-bold text-slate-500">{unit === 't' ? 't CO₂e' : 'kg CO₂e'}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>-10%</span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Middle Visualizations: Carbon Waterfall & Removal Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Carbon Waterfall Chart */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">Carbon Waterfall</h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">From CO₂ fixation to net removal</p>
            </div>
            
            {/* Unit Dropdown Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setUnit('t')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  unit === 't' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                t CO₂e
              </button>
              <button
                onClick={() => setUnit('kg')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  unit === 'kg' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                kg CO₂e
              </button>
            </div>
          </div>

          {/* Pixel-Perfect Waterfall Diagram matching reference photo */}
          <div className="h-64 w-full relative pt-6 pb-2">
            
            {/* Horizontal Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-12 pt-4">
              {[2.5, 2.0, 1.5, 1.0, 0.5, 0.0].map((val) => (
                <div key={val} className="flex items-center w-full border-b border-slate-100 text-[10px] text-slate-400 font-mono">
                  <span className="w-8 shrink-0">{val.toFixed(1)}</span>
                </div>
              ))}
            </div>

            {/* Bars Container */}
            <div className="relative h-full pl-10 pr-2 flex items-end justify-between gap-3 pb-8">
              
              {/* 1. Gross CO2 Fixed (Dark Green Solid) */}
              <div className="flex-1 flex flex-col items-center h-full justify-end group">
                <span className="text-xs font-black text-slate-900 mb-1.5">{grossFixedVal}</span>
                <div 
                  className="w-full bg-[#164e32] hover:bg-[#123e28] rounded-t-sm transition-all duration-300 shadow-xs"
                  style={{ height: `${(grossFixedKg / 2500) * 100}%` }}
                />
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 text-center mt-2 leading-tight">
                  Gross CO₂<br />Fixed
                </span>
              </div>

              {/* 2. Processing & Conversion Deduction (Light Steel Blue Floating) */}
              <div className="flex-1 flex flex-col items-center h-full justify-end group">
                {/* Floating deduction bar positioned from 2.14 down to 1.28 */}
                <div 
                  className="w-full flex flex-col justify-end"
                  style={{ height: `${(grossFixedKg / 2500) * 100}%` }}
                >
                  <div 
                    className="w-full bg-[#b8c9db] hover:bg-[#a6bbd0] rounded-sm transition-all duration-300 relative flex items-center justify-center"
                    style={{ height: `${(processingConversionDeductionKg / 2500) * 100}%` }}
                  >
                    <span className="text-[11px] font-black text-slate-800 absolute -bottom-5">-{processingLossVal}</span>
                  </div>
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 text-center mt-2 leading-tight">
                  Processing<br />& Conversion
                </span>
              </div>

              {/* 3. End-Use Retained (Soft Green Solid) */}
              <div className="flex-1 flex flex-col items-center h-full justify-end group">
                <span className="text-xs font-black text-slate-900 mb-1.5">{endUseRetainedVal}</span>
                <div 
                  className="w-full bg-[#86efac] hover:bg-[#6ee7b7] rounded-t-sm transition-all duration-300 shadow-xs"
                  style={{ height: `${(endUseRetainedKg / 2500) * 100}%` }}
                />
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 text-center mt-2 leading-tight">
                  End-Use<br />Retained
                </span>
              </div>

              {/* 4. Operational Footprint Deduction (Light Steel Blue Floating) */}
              <div className="flex-1 flex flex-col items-center h-full justify-end group">
                {/* Floating deduction bar positioned from 1.28 down to 1.19 */}
                <div 
                  className="w-full flex flex-col justify-end"
                  style={{ height: `${(endUseRetainedKg / 2500) * 100}%` }}
                >
                  <div 
                    className="w-full bg-[#b8c9db] hover:bg-[#a6bbd0] rounded-sm transition-all duration-300 relative flex items-center justify-center"
                    style={{ height: `${(operationalFootprintKg / 2500) * 100}%` }}
                  >
                    <span className="text-[11px] font-black text-slate-800 absolute -bottom-5">-{operationalFootprintVal}</span>
                  </div>
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 text-center mt-2 leading-tight">
                  Operational<br />Footprint
                </span>
              </div>

              {/* 5. Net Removed (Dark Green Solid Final) */}
              <div className="flex-1 flex flex-col items-center h-full justify-end group">
                <span className="text-xs font-black text-slate-900 mb-1.5">{netRemovedVal}</span>
                <div 
                  className="w-full bg-[#164e32] hover:bg-[#123e28] rounded-t-sm transition-all duration-300 shadow-xs"
                  style={{ height: `${(netRemovedKg / 2500) * 100}%` }}
                />
                <span className="text-[10px] sm:text-[11px] font-black text-slate-900 text-center mt-2 leading-tight">
                  Net Removed
                </span>
              </div>

            </div>

          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-2 border-t border-slate-100">
            <span>Y-axis: {unitLabel}</span>
            <span className="text-emerald-700 font-bold">✓ Net Removal: {netRemovedVal} {unitLabel} (55.3% efficiency)</span>
          </div>
        </div>

        {/* Right: Removal Trend Chart */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">Removal Trend</h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Daily net carbon removed</p>
            </div>

            {/* Time Range Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
              {(['7D', '30D', '90D', '1Y'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    timeRange === range
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* Area Chart matching green aesthetic */}
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#166534" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#166534" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  tickLine={false} 
                  domain={[0, unit === 't' ? 2.0 : 2000]} 
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
                  formatter={(val: any) => [`${val} ${unitLabel}`, 'Net Carbon Removed']}
                />
                <Area
                  type="monotone"
                  dataKey="val"
                  stroke="#166534"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#trendGradient)"
                  dot={{ r: 3, fill: '#166534', strokeWidth: 0 }}
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-2 border-t border-slate-100">
            <span>Trailing Period Peak: 1.48 {unitLabel}</span>
            <span className="text-emerald-700 font-bold">Trajectory: +12.4% MoM</span>
          </div>
        </div>

      </div>

      {/* 4. Bottom 3-Column Section: Assumptions, Traceable Calculation, Site Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Accounting Assumptions */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                Accounting Assumptions
                <Info className="w-4 h-4 text-slate-400" />
              </h3>
              <button
                onClick={() => {
                  setTempAssumptions({ ...assumptions });
                  setShowEditAssumptions(true);
                }}
                className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>

            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <Cloud className="w-4 h-4 text-slate-400" />
                  <span>Carbon fraction (dynamic)</span>
                </div>
                <span className="font-bold text-slate-900">{assumptions.carbonFraction} kg C / kg dry biomass</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <Zap className="w-4 h-4 text-emerald-500" />
                  <span>Operational electricity</span>
                </div>
                <span className="font-bold text-slate-900">{assumptions.operationalElectricity} kWh</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <Target className="w-4 h-4 text-slate-400" />
                  <span>Grid emission factor</span>
                </div>
                <span className="font-bold text-slate-900">{assumptions.gridEmissionFactor} kg CO₂e / kWh</span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <Database className="w-4 h-4 text-slate-400" />
                  <span>End-use assumption</span>
                </div>
                <span className="font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                  {assumptions.endUseFate}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Standard: ISO 14064-2 & Verra VM0042 Protocol</span>
          </div>
        </div>

        {/* Column 2: Traceable Calculation */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                Traceable Calculation
                <Info className="w-4 h-4 text-slate-400" />
              </h3>
              <button
                onClick={() => setShowTraceableDetails(true)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl transition-all"
              >
                View Details
              </button>
            </div>

            <div className="space-y-3 mt-4 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Biomass increase</span>
                <span className="font-bold text-slate-900">248 kg dry biomass</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">× Carbon fraction</span>
                <span className="font-bold text-slate-900">{assumptions.carbonFraction} kg C/kg biomass</span>
              </div>
              <div className="border-t border-dashed border-slate-200 my-1"></div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-semibold">↓ Carbon contained</span>
                <span className="font-black text-slate-900">126.48 kg C</span>
              </div>
              <div className="border-t border-dashed border-slate-200 my-1"></div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-semibold">÷ CO₂ equivalent (44/12)</span>
                <span className="font-black text-emerald-700 text-sm">463.8 kg CO₂e</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Model version: <strong className="font-mono text-slate-700">v1.2.0</strong></span>
            <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              Confidence: 94%
            </span>
          </div>
        </div>

        {/* Column 3: Site Overview */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Site Overview</h3>
              <button
                onClick={() => setShowMapModal(true)}
                className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
              >
                <Map className="w-3.5 h-3.5 text-slate-500" />
                <span>View Map</span>
              </button>
            </div>

            {/* Aerial Site Image with Interactive Pond Badges */}
            <div className="relative h-36 w-full rounded-2xl overflow-hidden bg-slate-900 mt-4 group">
              <img 
                src="/images/farm-hero.jpg" 
                alt="GreenRiver Algae Facility Satellite" 
                className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />

              {/* Pond A Overlay */}
              <div className="absolute top-4 left-6">
                <span className="bg-slate-950/85 backdrop-blur-md text-white font-mono text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-700 shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Pond A • 0.42 t CO₂e
                </span>
              </div>

              {/* Pond B Overlay */}
              <div className="absolute bottom-4 left-4">
                <span className="bg-slate-950/85 backdrop-blur-md text-white font-mono text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-700 shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Pond B • 0.51 t CO₂e
                </span>
              </div>

              {/* Pond C Overlay */}
              <div className="absolute bottom-4 right-4">
                <span className="bg-slate-950/85 backdrop-blur-md text-white font-mono text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-700 shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Pond C • 0.26 t CO₂e
                </span>
              </div>
            </div>
          </div>

          {/* Bottom 3 Facility Indicators */}
          <div className="grid grid-cols-3 divide-x divide-slate-100 text-center pt-2 border-t border-slate-100 text-xs">
            <div className="px-1">
              <div className="font-black text-slate-900">3</div>
              <div className="text-[10px] text-slate-400 font-semibold">Active Ponds</div>
            </div>
            <div className="px-1">
              <div className="font-black text-slate-900">12.5 ha</div>
              <div className="text-[10px] text-slate-400 font-semibold">Total Area</div>
            </div>
            <div className="px-1">
              <div className="font-bold text-emerald-600 flex items-center justify-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Healthy
              </div>
              <div className="text-[10px] text-slate-400 font-semibold">System Status</div>
            </div>
          </div>
        </div>

      </div>

      {/* 5. Recent Activity Section */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-black text-slate-900">Recent Activity</h3>
          <button
            onClick={() => setShowActivityModal(true)}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            View All
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          
          {/* Row 1: Model Run Completed */}
          <div className="py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Model run completed</h4>
                <p className="text-[11px] text-slate-500">Carbon accounting updated successfully</p>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-medium">Today, 10:24 AM</span>
          </div>

          {/* Row 2: New Imagery Processed */}
          <div className="py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">New imagery processed</h4>
                <p className="text-[11px] text-slate-500">NDVI analysis completed</p>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-medium">Today, 08:41 AM</span>
          </div>

          {/* Row 3: Data Sync */}
          <div className="py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Data sync</h4>
                <p className="text-[11px] text-slate-500">Telemetry data synchronized</p>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-medium">Today, 06:12 AM</span>
          </div>

        </div>
      </div>

      {/* MODAL 1: Edit Accounting Assumptions */}
      {showEditAssumptions && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Edit Accounting Assumptions</h3>
              </div>
              <button 
                onClick={() => setShowEditAssumptions(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssumptions} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Carbon Fraction (C-frac) [kg C / kg dry biomass]
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.30"
                  max="0.65"
                  value={tempAssumptions.carbonFraction}
                  onChange={(e) => setTempAssumptions({ ...tempAssumptions, carbonFraction: parseFloat(e.target.value) || 0.51 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Operational Electricity [kWh]
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={tempAssumptions.operationalElectricity}
                  onChange={(e) => setTempAssumptions({ ...tempAssumptions, operationalElectricity: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Grid Emission Factor [kg CO₂e / kWh]
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={tempAssumptions.gridEmissionFactor}
                  onChange={(e) => setTempAssumptions({ ...tempAssumptions, gridEmissionFactor: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  End-Use Fate & Durability Horizon
                </label>
                <select
                  value={tempAssumptions.endUseFate}
                  onChange={(e) => setTempAssumptions({ ...tempAssumptions, endUseFate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
                >
                  <option value="Bioplastic (Durable)">Bioplastic (Durable - 60% retention)</option>
                  <option value="Biochar Soil Amendment">Biochar Soil Amendment (90% retention)</option>
                  <option value="Biofuel Replacement">Biofuel Replacement (40% retention)</option>
                  <option value="Animal Feed Protein">Animal Feed Protein (30% retention)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditAssumptions(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs transition-all"
                >
                  Save & Recalculate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Traceable Calculation Details */}
      {showTraceableDetails && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">MRV Stoichiometric Methodology</h3>
              </div>
              <button 
                onClick={() => setShowTraceableDetails(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600">
              <p className="leading-relaxed">
                Biomass sequestration is computed in strict accordance with **ISO 14064-2** and **Verra VM0042** standards using photosynthetic mass-balance stoichiometry:
              </p>

              <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-[11px] space-y-2">
                <div className="text-emerald-400 font-bold">Equation 1 (Carbon Content):</div>
                <div>C_mass = Dry_Biomass_kg × C_fraction</div>
                <div className="text-slate-400">126.48 kg C = 248 kg × 0.51 kg C/kg</div>
                <div className="border-t border-slate-800 my-1"></div>
                <div className="text-emerald-400 font-bold">Equation 2 (CO₂ Equivalent Conversion):</div>
                <div>Gross_CO2e = C_mass × (44.01 / 12.011)</div>
                <div className="text-slate-400">463.8 kg CO₂e = 126.48 kg × 3.664</div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Cryptographic Provenance Verified
                </div>
                <p className="text-[11px]">
                  All inputs are hash-linked to raw IoT probe telemetry records and sealed in Evidence Chain package #ev-9821.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowTraceableDetails(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs shadow-xs"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Export Report */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Export Carbon MRV Audit Package</h3>
              </div>
              <button 
                onClick={() => setShowExportModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Select your desired audit export format. Packages contain complete lifecycle mass-balance logs, telemetry sensor proofs, and third-party verification hashes.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleExport('PDF')}
                disabled={exporting}
                className="p-4 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer"
              >
                <FileText className="w-7 h-7 text-emerald-600" />
                <div>
                  <div className="text-xs font-black text-slate-900">Executive PDF</div>
                  <div className="text-[10px] text-slate-400">Verra & Registry Format</div>
                </div>
              </button>

              <button
                onClick={() => handleExport('CSV')}
                disabled={exporting}
                className="p-4 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
                <div>
                  <div className="text-xs font-black text-slate-900">Raw CSV Data</div>
                  <div className="text-[10px] text-slate-400">Full Time-Series Records</div>
                </div>
              </button>
            </div>

            {exporting && (
              <div className="text-center py-2 text-xs font-bold text-emerald-600 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating cryptographic audit package...
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: Site Map Overlay */}
      {showMapModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Map className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">GreenRiver Algae Facility Satellite Topography</h3>
              </div>
              <button 
                onClick={() => setShowMapModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative h-80 w-full rounded-2xl overflow-hidden bg-slate-900">
              <img 
                src="/images/farm-hero.jpg" 
                alt="GreenRiver Aerial Map" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
              
              <div className="absolute top-6 left-6">
                <span className="bg-slate-950/90 text-emerald-400 font-mono text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 shadow">
                  ● Raceway Pond Alpha (0.42 t CO₂e)
                </span>
              </div>
              <div className="absolute top-28 left-16">
                <span className="bg-slate-950/90 text-emerald-400 font-mono text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 shadow">
                  ● Raceway Pond Bravo (0.51 t CO₂e)
                </span>
              </div>
              <div className="absolute bottom-8 right-8">
                <span className="bg-slate-950/90 text-emerald-400 font-mono text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 shadow">
                  ● Photobioreactor Unit C (0.26 t CO₂e)
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 pt-2">
              <span>Coordinates: 32.85°N, 115.57°W • Imperial Valley, CA</span>
              <button
                onClick={() => setShowMapModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold shadow-xs"
              >
                Close Topography
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Recent Activity View All */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Carbon MRV Audit Log</h3>
              <button 
                onClick={() => setShowActivityModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1 text-xs">
              {[
                { title: 'Model run completed', desc: 'Carbon accounting updated successfully', time: 'Today, 10:24 AM', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
                { title: 'New imagery processed', desc: 'NDVI multi-spectral analysis completed', time: 'Today, 08:41 AM', icon: ImageIcon, color: 'text-sky-600 bg-sky-50' },
                { title: 'Data sync', desc: 'Telemetry sensor batch synchronized', time: 'Today, 06:12 AM', icon: Database, color: 'text-indigo-600 bg-indigo-50' },
                { title: 'Harvest event batch #981', desc: '180 kg biomass transferred to bioplastic processing', time: 'Yesterday, 04:30 PM', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
                { title: 'Calibration verified', desc: 'DO probe two-point span check passed', time: 'Yesterday, 11:15 AM', icon: ShieldCheck, color: 'text-teal-600 bg-teal-50' },
              ].map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${item.color}`}>
                        <ItemIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{item.title}</div>
                        <div className="text-[11px] text-slate-500">{item.desc}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 shrink-0">{item.time}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowActivityModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
