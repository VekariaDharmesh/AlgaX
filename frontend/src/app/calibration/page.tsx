'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  BarChart, Sliders, CheckCircle2, AlertTriangle, Clock, RefreshCw, 
  PlusCircle, Shield, FileText, Check, X, ArrowRight, Activity, Filter, Search, Info
} from 'lucide-react';
import { 
  fetchFarms, fetchPonds, fetchCalibrationOverview, fetchSensorsCalibrationStatus,
  fetchCalibrations, calculateCalibration, createCalibration, activateCalibration, approveCalibration,
  Farm, Pond, CalibrationOverviewKPIs, SensorCalibrationStatus, SensorCalibrationRecord,
  CalibrationCalculationResponse
} from '@/lib/api';

export default function CalibrationPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [selectedPondId, setSelectedPondId] = useState<string>('');

  const [kpis, setKpis] = useState<CalibrationOverviewKPIs | null>(null);
  const [sensorStatuses, setSensorStatuses] = useState<SensorCalibrationStatus[]>([]);
  const [calibrations, setCalibrations] = useState<SensorCalibrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sensors' | 'new' | 'history'>('sensors');

  // Filters for history
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Wizard state
  const [formSensorId, setFormSensorId] = useState<string>('');
  const [formMethod, setFormMethod] = useState<string>('ZERO_POINT');
  const [formPerformedBy, setFormPerformedBy] = useState('Technician Alpha');
  const [formReferenceStandard, setFormReferenceStandard] = useState('NIST Traceable Buffer Standard');
  const [formRawRef, setFormRawRef] = useState<number>(7.32);
  const [formExpectedRef, setFormExpectedRef] = useState<number>(7.00);
  const [formSecondaryRaw, setFormSecondaryRaw] = useState<number | undefined>(undefined);
  const [formSecondaryExp, setFormSecondaryExp] = useState<number | undefined>(undefined);
  const [formStatus, setFormStatus] = useState<string>('ACTIVE');
  const [formNotes, setFormNotes] = useState('');

  const [calcResult, setCalcResult] = useState<CalibrationCalculationResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Detail Modal
  const [detailRecord, setDetailRecord] = useState<SensorCalibrationRecord | null>(null);

  // Initial load
  useEffect(() => {
    Promise.all([
      fetchFarms().catch(() => []),
      fetchPonds().catch(() => [])
    ]).then(([farmsData, pondsData]) => {
      const safeFarms = Array.isArray(farmsData) ? farmsData : [];
      const safePonds = Array.isArray(pondsData) ? pondsData : [];
      setFarms(safeFarms);
      setPonds(safePonds);
      if (safeFarms.length > 0) setSelectedFarmId(safeFarms[0].id);
      if (safePonds.length > 0) setSelectedPondId(safePonds[0].id);
    }).catch((err) => {
      console.error("Failed to load farms/ponds for calibration:", err);
      setFarms([]);
      setPonds([]);
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewData, statusData, historyData] = await Promise.all([
        fetchCalibrationOverview(selectedFarmId || undefined, selectedPondId || undefined).catch(() => null),
        fetchSensorsCalibrationStatus(selectedFarmId || undefined, selectedPondId || undefined).catch(() => []),
        fetchCalibrations(undefined, selectedPondId || undefined, statusFilter === 'All' ? undefined : statusFilter).catch(() => ({ items: [] }))
      ]);

      setKpis(overviewData);
      setSensorStatuses(statusData);
      setCalibrations(historyData.items || []);

      if (statusData.length > 0 && !formSensorId) {
        setFormSensorId(statusData[0].sensor_id);
      }
    } catch (err) {
      console.error('Error loading calibration data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedFarmId, selectedPondId, statusFilter, formSensorId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Recalculate on wizard input change
  useEffect(() => {
    if (formRawRef !== undefined && formExpectedRef !== undefined) {
      calculateCalibration({
        calibration_method: formMethod,
        raw_reference_value: formRawRef,
        expected_reference_value: formExpectedRef,
        secondary_raw_value: formSecondaryRaw,
        secondary_expected_value: formSecondaryExp
      }).then(res => setCalcResult(res)).catch(() => setCalcResult(null));
    }
  }, [formMethod, formRawRef, formExpectedRef, formSecondaryRaw, formSecondaryExp]);

  const handleStartCalibrationForSensor = (sensorId: string) => {
    setFormSensorId(sensorId);
    const targetSensor = sensorStatuses.find(s => s.sensor_id === sensorId);
    if (targetSensor) {
      if (targetSensor.sensor_type === 'ph') {
        setFormReferenceStandard('NIST Buffer pH 7.00');
        setFormRawRef(7.28);
        setFormExpectedRef(7.00);
      } else if (targetSensor.sensor_type === 'temperature') {
        setFormReferenceStandard('Precision Calibrated Thermal Bath 25.0°C');
        setFormRawRef(26.40);
        setFormExpectedRef(25.00);
      } else if (targetSensor.sensor_type === 'dissolved_oxygen') {
        setFormReferenceStandard('Air-Saturated Water Bath (100% DO)');
        setFormRawRef(8.40);
        setFormExpectedRef(8.10);
      }
    }
    setActiveTab('new');
  };

  const handleCreateCalibration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSensorId) {
      setActionError('Please select a target sensor');
      return;
    }

    setSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await createCalibration({
        sensor_id: formSensorId,
        performed_by: formPerformedBy,
        calibration_method: formMethod as any,
        reference_standard: formReferenceStandard,
        raw_reference_value: formRawRef,
        expected_reference_value: formExpectedRef,
        offset_applied: calcResult?.offset_applied ?? (formExpectedRef - formRawRef),
        gain_applied: calcResult?.gain_applied ?? 1.0,
        pre_calibration_error: calcResult?.pre_calibration_error ?? Math.abs(formRawRef - formExpectedRef),
        post_calibration_error: calcResult?.post_calibration_error ?? 0.0,
        status: formStatus as any,
        notes: formNotes
      });

      setActionSuccess('Calibration record created successfully and sensor status updated!');
      setFormNotes('');
      loadData();
      setActiveTab('sensors');
    } catch (err: any) {
      setActionError(err.message || 'Failed to submit calibration record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await activateCalibration(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Activation failed');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveCalibration(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    }
  };

  const filteredCalibrations = calibrations.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (c.performed_by && c.performed_by.toLowerCase().includes(query)) ||
      (c.reference_standard && c.reference_standard.toLowerCase().includes(query)) ||
      (c.sensor_type && c.sensor_type.toLowerCase().includes(query)) ||
      (c.pond_name && c.pond_name.toLowerCase().includes(query))
    );
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Sensor Calibration & Verification Workspace</h1>
              <p className="text-sm text-slate-500">Traceable offset/gain calibration with permanent raw telemetry preservation</p>
            </div>
          </div>
        </div>

        {/* Location Selectors */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase px-2">Farm:</span>
            <select
              value={selectedFarmId}
              onChange={(e) => {
                setSelectedFarmId(e.target.value);
                const farmPonds = ponds.filter(p => p.farm_id === e.target.value);
                if (farmPonds.length > 0) setSelectedPondId(farmPonds[0].id);
                else setSelectedPondId('');
              }}
              className="bg-white text-sm font-medium text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {farms.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase px-2">Pond:</span>
            <select
              value={selectedPondId}
              onChange={(e) => setSelectedPondId(e.target.value)}
              className="bg-white text-sm font-medium text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Ponds</option>
              {ponds
                .filter(p => !selectedFarmId || p.farm_id === selectedFarmId)
                .map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </select>
          </div>

          <button
            onClick={loadData}
            className="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monitored Sensors</p>
          <p className="text-2xl font-bold text-slate-900">{kpis?.total_sensors ?? 0}</p>
          <p className="text-xs text-slate-400">Total active devices in scope</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Calibrated Active</p>
          <p className="text-2xl font-bold text-emerald-600">{kpis?.active_calibrated_sensors ?? 0}</p>
          <p className="text-xs text-emerald-500 font-medium">Valid gain/offset applied</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending Approval</p>
          <p className="text-2xl font-bold text-amber-600">{kpis?.pending_approval_count ?? 0}</p>
          <p className="text-xs text-amber-500 font-medium">Awaiting QA verification</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Calibration Due</p>
          <p className="text-2xl font-bold text-blue-600">{kpis?.calibration_due_count ?? 0}</p>
          <p className="text-xs text-blue-500">Overdue or uncalibrated</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Sensor Drift Alerts</p>
          <p className="text-2xl font-bold text-rose-600">{kpis?.drift_alert_count ?? 0}</p>
          <p className="text-xs text-rose-500 font-medium">Pre-error &gt; 2.0 units</p>
        </div>
      </div>

      {/* Scientific & Evidence Guarantee Banner */}
      <div className="bg-emerald-950 text-emerald-100 p-5 rounded-2xl border border-emerald-800 shadow-md flex items-start gap-4">
        <Shield className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-sm">
          <h3 className="font-semibold text-white">Immutable Telemetry & Traceable Evidence Guarantee</h3>
          <p className="text-emerald-200 text-xs leading-relaxed">
            AlgaX permanently retains raw sensor measurements (<code className="bg-emerald-900 px-1 py-0.5 rounded text-emerald-300">raw_value</code>) in the database. Active calibration offset and gain equations are applied dynamically to future ingestions without silently rewriting historical observations. Every calibration record is linked to the EvidencePackage SHA-256 chain.
          </p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 space-x-6">
        <button
          onClick={() => setActiveTab('sensors')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'sensors'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Activity className="w-4 h-4" />
          Sensor Calibration Matrix ({sensorStatuses.length})
        </button>

        <button
          onClick={() => setActiveTab('new')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'new'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          Perform Sensor Calibration
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          Calibration Audit History ({calibrations.length})
        </button>
      </div>

      {/* TAB 1: SENSORS MATRIX */}
      {activeTab === 'sensors' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Active Sensor Calibration Matrix</h2>
              <span className="text-xs text-slate-400">Live active offset & gain parameters</span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
                <p className="text-sm">Loading sensor calibration statuses...</p>
              </div>
            ) : sensorStatuses.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p>No sensors found for selected filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                    <tr>
                      <th className="py-3.5 px-5">Sensor</th>
                      <th className="py-3.5 px-5">Pond</th>
                      <th className="py-3.5 px-5">Status</th>
                      <th className="py-3.5 px-5">Active Equation</th>
                      <th className="py-3.5 px-5">Last Calibrated</th>
                      <th className="py-3.5 px-5">Health / Alerts</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {sensorStatuses.map(s => {
                      const gainStr = s.active_gain.toFixed(4);
                      const offsetStr = s.active_offset >= 0 ? `+ ${s.active_offset.toFixed(4)}` : `- ${Math.abs(s.active_offset).toFixed(4)}`;
                      const formula = `y = (${gainStr} * x) ${offsetStr}`;

                      return (
                        <tr key={s.sensor_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-5">
                            <div className="font-semibold text-slate-900 capitalize">{s.sensor_type.replace('_', ' ')}</div>
                            <div className="text-xs text-slate-400 font-mono">Unit: {s.unit} | ID: {s.sensor_id.slice(0, 8)}</div>
                          </td>
                          <td className="py-4 px-5 font-medium text-slate-800">
                            {s.pond_name || 'Unassigned'}
                          </td>
                          <td className="py-4 px-5">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              s.calibration_status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : s.calibration_status === 'PENDING_APPROVAL'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {s.calibration_status}
                            </span>
                          </td>
                          <td className="py-4 px-5 font-mono text-xs font-medium text-slate-800 bg-slate-50/50 rounded-lg">
                            {formula}
                          </td>
                          <td className="py-4 px-5 text-xs text-slate-500">
                            {s.last_calibrated_at ? new Date(s.last_calibrated_at).toLocaleString() : 'Never'}
                          </td>
                          <td className="py-4 px-5 space-y-1">
                            {s.calibration_due && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                <Clock className="w-3 h-3" /> Due
                              </span>
                            )}
                            {s.drift_warning && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded ml-1">
                                <AlertTriangle className="w-3 h-3" /> Drift Alert
                              </span>
                            )}
                            {!s.calibration_due && !s.drift_warning && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                <CheckCircle2 className="w-3 h-3" /> Healthy
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-5 text-right">
                            <button
                              onClick={() => handleStartCalibrationForSensor(s.sensor_id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs transition-colors"
                            >
                              Calibrate Sensor
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PERFORM CALIBRATION WIZARD */}
      {activeTab === 'new' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Perform Sensor Calibration</h2>
              <p className="text-sm text-slate-500">Enter standard reference measurements to solve linear offset and gain parameters.</p>
            </div>

            {actionError && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                {actionError}
              </div>
            )}

            {actionSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                {actionSuccess}
              </div>
            )}

            <form onSubmit={handleCreateCalibration} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Target Sensor</label>
                  <select
                    value={formSensorId}
                    onChange={(e) => setFormSensorId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select Sensor...</option>
                    {sensorStatuses.map(s => (
                      <option key={s.sensor_id} value={s.sensor_id}>
                        {s.pond_name} — {s.sensor_type.toUpperCase()} ({s.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Calibration Method</label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ZERO_POINT">Zero Point (Single Offset Shift)</option>
                    <option value="SPAN">Span Calibration (Gain Scaling)</option>
                    <option value="TWO_POINT">Two Point Calibration (Gain & Offset)</option>
                    <option value="OFFSET_ADJUST">Offset Adjust</option>
                    <option value="LINEAR_REGRESSION">Linear Regression</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Performed By / Operator</label>
                  <input
                    type="text"
                    value={formPerformedBy}
                    onChange={(e) => setFormPerformedBy(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Reference Standard Name</label>
                  <input
                    type="text"
                    value={formReferenceStandard}
                    onChange={(e) => setFormReferenceStandard(e.target.value)}
                    placeholder="e.g. NIST Traceable pH 7.00 Buffer"
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Reference Point 1</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Raw Sensor Reading</label>
                    <input
                      type="number"
                      step="any"
                      value={formRawRef}
                      onChange={(e) => setFormRawRef(parseFloat(e.target.value))}
                      required
                      className="w-full bg-white border border-slate-200 text-sm rounded-xl p-2.5 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Expected Standard Value</label>
                    <input
                      type="number"
                      step="any"
                      value={formExpectedRef}
                      onChange={(e) => setFormExpectedRef(parseFloat(e.target.value))}
                      required
                      className="w-full bg-white border border-slate-200 text-sm rounded-xl p-2.5 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {formMethod === 'TWO_POINT' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Reference Point 2 (Span / High Point)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Second Raw Reading</label>
                      <input
                        type="number"
                        step="any"
                        value={formSecondaryRaw ?? ''}
                        onChange={(e) => setFormSecondaryRaw(parseFloat(e.target.value))}
                        className="w-full bg-white border border-slate-200 text-sm rounded-xl p-2.5 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Second Expected Standard</label>
                      <input
                        type="number"
                        step="any"
                        value={formSecondaryExp ?? ''}
                        onChange={(e) => setFormSecondaryExp(parseFloat(e.target.value))}
                        className="w-full bg-white border border-slate-200 text-sm rounded-xl p-2.5 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Initial Status</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="ACTIVE"
                      checked={formStatus === 'ACTIVE'}
                      onChange={() => setFormStatus('ACTIVE')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    Activate Immediately (Apply to future readings)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="PENDING_APPROVAL"
                      checked={formStatus === 'PENDING_APPROVAL'}
                      onChange={() => setFormStatus('PENDING_APPROVAL')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    Submit for QA Approval
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Notes / Method Justification</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                  placeholder="Record buffer batch numbers, ambient conditions, or maintenance notes..."
                  className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('sensors')}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-colors flex items-center gap-2"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Save & Apply Calibration
                </button>
              </div>
            </form>
          </div>

          {/* Mathematical Equation Real-Time Solver Panel */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <Sliders className="w-5 h-5" />
                <h3 className="font-bold text-white">Live Mathematical Solver</h3>
              </div>
              <p className="text-xs text-slate-400">
                Calculates gain and offset parameters in real-time according to linear transformation:
              </p>
              
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-center text-emerald-400 font-semibold text-sm">
                {calcResult?.equation_formula || 'y = (1.0000 * x) + 0.0000'}
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Gain (m):</span>
                  <span className="font-mono text-white font-bold">{calcResult?.gain_applied.toFixed(4) ?? '1.0000'}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Offset (b):</span>
                  <span className="font-mono text-white font-bold">{calcResult?.offset_applied.toFixed(4) ?? '0.0000'}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Pre-Cal Residual Error:</span>
                  <span className="font-mono text-amber-400 font-bold">{calcResult?.pre_calibration_error.toFixed(4) ?? '0.0000'}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-1">
                  <span className="text-slate-400">Post-Cal Residual Error:</span>
                  <span className="font-mono text-emerald-400 font-bold">{calcResult?.post_calibration_error.toFixed(4) ?? '0.0000'}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase">
                <Info className="w-4 h-4" /> Calibration Impact
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                When activated, every incoming telemetry reading for this sensor will automatically compute:
              </p>
              <div className="bg-slate-900 p-2 rounded text-[11px] font-mono text-slate-300">
                calibrated_value = (raw_value * gain) + offset
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT HISTORY & RECORDS */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search technician, standard, sensor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="All">All Statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="SUPERSEDED">SUPERSEDED</option>
                  <option value="DRAFT">DRAFT</option>
                </select>
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
                <p className="text-sm">Loading calibration audit log...</p>
              </div>
            ) : filteredCalibrations.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <FileText className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-medium text-slate-600">No calibration records found</p>
                <p className="text-xs">Try adjusting search filters or perform a new sensor calibration.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                    <tr>
                      <th className="py-3.5 px-5">Calibrated Date</th>
                      <th className="py-3.5 px-5">Sensor & Pond</th>
                      <th className="py-3.5 px-5">Technician</th>
                      <th className="py-3.5 px-5">Method & Standard</th>
                      <th className="py-3.5 px-5">Offset / Gain</th>
                      <th className="py-3.5 px-5">Status</th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredCalibrations.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-5 text-xs text-slate-500 font-medium">
                          {new Date(c.calibrated_at).toLocaleString()}
                        </td>
                        <td className="py-4 px-5">
                          <div className="font-semibold text-slate-900 capitalize">{c.sensor_type?.replace('_', ' ') || 'Sensor'}</div>
                          <div className="text-xs text-slate-400">{c.pond_name || 'Pond'}</div>
                        </td>
                        <td className="py-4 px-5 font-medium text-slate-800">
                          {c.performed_by}
                        </td>
                        <td className="py-4 px-5">
                          <div className="font-medium text-xs text-slate-800">{c.calibration_method}</div>
                          <div className="text-xs text-slate-400">{c.reference_standard || 'Standard Buffer'}</div>
                        </td>
                        <td className="py-4 px-5 font-mono text-xs">
                          <div>Offset: <span className="font-semibold text-slate-900">{c.offset_applied.toFixed(4)}</span></div>
                          <div>Gain: <span className="font-semibold text-slate-900">{c.gain_applied.toFixed(4)}</span></div>
                        </td>
                        <td className="py-4 px-5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            c.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'PENDING_APPROVAL'
                              ? 'bg-amber-100 text-amber-800'
                              : c.status === 'APPROVED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right space-x-2">
                          {c.status === 'PENDING_APPROVAL' && (
                            <button
                              onClick={() => handleApprove(c.id)}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-medium transition-colors"
                            >
                              Approve
                            </button>
                          )}
                          {c.status !== 'ACTIVE' && (
                            <button
                              onClick={() => handleActivate(c.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition-colors"
                            >
                              Activate
                            </button>
                          )}
                          <button
                            onClick={() => setDetailRecord(c)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Sensor Calibration Audit Detail</h3>
                <p className="text-xs text-slate-500 font-mono">Record ID: {detailRecord.id}</p>
              </div>
              <button
                onClick={() => setDetailRecord(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs text-slate-500 uppercase font-semibold">Sensor Type:</span>
                  <p className="font-semibold text-slate-900 capitalize">{detailRecord.sensor_type}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase font-semibold">Pond:</span>
                  <p className="font-semibold text-slate-900">{detailRecord.pond_name || 'Pond'}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase font-semibold">Status:</span>
                  <p className="font-semibold text-emerald-600">{detailRecord.status}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase font-semibold">Performed By:</span>
                  <p className="font-semibold text-slate-900">{detailRecord.performed_by}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-slate-600">Mathematical Parameters</h4>
                <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-center text-sm font-bold">
                  y = ({detailRecord.gain_applied.toFixed(4)} * x) + ({detailRecord.offset_applied.toFixed(4)})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 font-medium">Raw Reference Value:</span>
                  <p className="font-mono text-sm font-bold text-slate-800">{detailRecord.raw_reference_value}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 font-medium">Expected Standard Value:</span>
                  <p className="font-mono text-sm font-bold text-slate-800">{detailRecord.expected_reference_value}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 font-medium">Pre-Cal Residual Error:</span>
                  <p className="font-mono text-sm font-bold text-amber-600">{detailRecord.pre_calibration_error ?? 'N/A'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 font-medium">Post-Cal Residual Error:</span>
                  <p className="font-mono text-sm font-bold text-emerald-600">{detailRecord.post_calibration_error ?? '0.0000'}</p>
                </div>
              </div>

              {detailRecord.notes && (
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Justification Notes:</span>
                  <p className="p-3 bg-slate-50 rounded-lg text-slate-700 text-xs italic mt-1">{detailRecord.notes}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setDetailRecord(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
