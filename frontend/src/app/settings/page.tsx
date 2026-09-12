'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Home, 
  Radio, 
  Box, 
  FileText, 
  Users, 
  Edit3, 
  Check, 
  X, 
  MoreVertical, 
  Plus, 
  Shield, 
  Building2, 
  Zap, 
  Droplets,
  Activity,
  CheckCircle2,
  Trash2,
  Mail,
  UserCheck,
  Sparkles
} from 'lucide-react';
import { DEMO_FARMS } from '@/lib/demo/ponds';

interface FacilityConfig {
  farmName: string;
  location: string;
  pondConfiguration: string;
}

interface SensorConfig {
  sensorIds: string;
  parameters: string;
  samplingInterval: string;
  status: 'Online' | 'Maintenance' | 'Calibrating';
}

interface ModelConfig {
  modelVersion: string;
  growthParameters: string;
  carbonAssumptions: string;
}

interface AccountingConfig {
  electricityEmissionFactor: string;
  endUseAssumption: string;
  carbonFraction: string;
}

interface UserAccess {
  id: string;
  name: string;
  role: 'Operator' | 'Researcher' | 'Reviewer' | 'Investor' | 'Admin';
  status: 'Active' | 'Invited' | 'Suspended';
  lastActive: string;
}

const INITIAL_USERS: UserAccess[] = [
  {
    id: 'u-1',
    name: 'Dharmesh',
    role: 'Operator',
    status: 'Active',
    lastActive: 'Sep 12, 2026 10:24 AM'
  },
  {
    id: 'u-2',
    name: 'Anna L.',
    role: 'Researcher',
    status: 'Active',
    lastActive: 'Sep 12, 2026 09:18 AM'
  },
  {
    id: 'u-3',
    name: 'GlobalTrust Audits',
    role: 'Reviewer',
    status: 'Active',
    lastActive: 'Sep 11, 2026 04:32 PM'
  },
  {
    id: 'u-4',
    name: 'GreenFund Cap',
    role: 'Investor',
    status: 'Invited',
    lastActive: 'Sep 09, 2026 11:21 AM'
  }
];

export default function SettingsPage() {
  // State for all 4 config cards
  const [facilityConfig, setFacilityConfig] = useState<FacilityConfig>({
    farmName: 'Kutch Bio-Raceway Facility',
    location: 'Kutch, Gujarat, India',
    pondConfiguration: '4 Active Raceways (Narmada, Sabarmati, Tapi, Mahi)'
  });

  const [sensorConfig, setSensorConfig] = useState<SensorConfig>({
    sensorIds: 'DO-001, PH-002, TEMP-003, NIT-002',
    parameters: 'DO, pH, Temp, Turbidity, Nitrogen',
    samplingInterval: '5 minutes',
    status: 'Online'
  });

  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    modelVersion: 'v1.2.0',
    growthParameters: 'Monod-Droop standard',
    carbonAssumptions: 'Dynamic C-fraction'
  });

  const [accountingConfig, setAccountingConfig] = useState<AccountingConfig>({
    electricityEmissionFactor: '0.71 kg CO₂e/kWh',
    endUseAssumption: 'Bioplastic (0.60 factor)',
    carbonFraction: '0.51 kg C / kg dry biomass'
  });

  const [users, setUsers] = useState<UserAccess[]>(INITIAL_USERS);

  // Edit Modals
  const [activeModal, setActiveModal] = useState<'facility' | 'sensors' | 'model' | 'accounting' | 'users' | 'addUser' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form Temp State
  const [tempFacility, setTempFacility] = useState(facilityConfig);
  const [tempSensors, setTempSensors] = useState(sensorConfig);
  const [tempModel, setTempModel] = useState(modelConfig);
  const [tempAccounting, setTempAccounting] = useState(accountingConfig);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'Operator' | 'Researcher' | 'Reviewer' | 'Investor' | 'Admin'>('Researcher');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveFacility = () => {
    setFacilityConfig(tempFacility);
    setActiveModal(null);
    showToast('Facility details successfully updated.');
  };

  const handleSaveSensors = () => {
    setSensorConfig(tempSensors);
    setActiveModal(null);
    showToast('Sensor configuration saved.');
  };

  const handleSaveModel = () => {
    setModelConfig(tempModel);
    setActiveModal(null);
    showToast('Kinetic model parameters updated.');
  };

  const handleSaveAccounting = () => {
    setAccountingConfig(tempAccounting);
    setActiveModal(null);
    showToast('LCA emission factors updated.');
  };

  const handleAddUser = () => {
    if (!newUserName.trim()) return;
    const newUser: UserAccess = {
      id: `u-${Date.now().toString().slice(-4)}`,
      name: newUserName.trim(),
      role: newUserRole,
      status: 'Invited',
      lastActive: 'Just now'
    };
    setUsers(prev => [...prev, newUser]);
    setNewUserName('');
    setActiveModal(null);
    showToast(`Access invitation sent to ${newUser.name}.`);
  };

  const handleRemoveUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    showToast('User access revoked.');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 p-4 sm:p-6 text-slate-800">
      
      {/* 1. Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <span className="text-slate-500">Settings</span>
        <span>›</span>
        <span className="text-slate-900 font-bold">Overview</span>
      </div>

      {/* 2. Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Settings
        </h1>
        <p className="text-slate-500 mt-1 text-xs sm:text-sm max-w-2xl">
          Manage your facility, sensors, models and accounting configuration.
        </p>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-600 text-white rounded-2xl shadow-md text-xs font-bold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Main 2x2 Grid for Core Settings (Matching Screenshot) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* ========================================================================= */}
        {/* CARD 1: Facility / Farm */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-800 shrink-0">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Facility / Farm</h3>
                <p className="text-xs text-slate-500 mt-0.5">Basic information about your facility</p>
              </div>
            </div>

            <button
              onClick={() => { setTempFacility(facilityConfig); setActiveModal('facility'); }}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-slate-500 font-medium">Farm Name</span>
              <span className="font-bold text-slate-900 text-right">{facilityConfig.farmName}</span>
            </div>
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-slate-500 font-medium">Location</span>
              <span className="font-bold text-slate-900 text-right">{facilityConfig.location}</span>
            </div>
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-slate-500 font-medium">Pond Configuration</span>
              <span className="font-bold text-slate-900 text-right">{facilityConfig.pondConfiguration}</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 2: Sensors */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-800 shrink-0">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Sensors</h3>
                <p className="text-xs text-slate-500 mt-0.5">Configured sensors and parameters</p>
              </div>
            </div>

            <button
              onClick={() => { setTempSensors(sensorConfig); setActiveModal('sensors'); }}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-slate-500 font-medium">Sensor IDs</span>
              <span className="font-mono font-bold text-slate-900 text-right">{sensorConfig.sensorIds}</span>
            </div>
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-slate-500 font-medium">Parameters</span>
              <span className="font-bold text-slate-900 text-right">{sensorConfig.parameters}</span>
            </div>
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-slate-500 font-medium">Sampling Interval</span>
              <span className="font-bold text-slate-900 text-right">{sensorConfig.samplingInterval}</span>
            </div>
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-slate-500 font-medium">Status</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1.5 self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {sensorConfig.status}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 3: Model */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-800 shrink-0">
                <Box className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Model</h3>
                <p className="text-xs text-slate-500 mt-0.5">Model configuration and assumptions</p>
              </div>
            </div>

            <button
              onClick={() => { setTempModel(modelConfig); setActiveModal('model'); }}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-slate-500 font-medium">Model Version</span>
              <span className="font-mono font-bold text-slate-900 text-right">{modelConfig.modelVersion}</span>
            </div>
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-slate-500 font-medium">Growth Parameters</span>
              <span className="font-bold text-slate-900 text-right">{modelConfig.growthParameters}</span>
            </div>
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-slate-500 font-medium">Carbon Assumptions</span>
              <span className="font-bold text-slate-900 text-right">{modelConfig.carbonAssumptions}</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 4: Accounting */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-800 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Accounting</h3>
                <p className="text-xs text-slate-500 mt-0.5">Emission factors and end-use assumptions</p>
              </div>
            </div>

            <button
              onClick={() => { setTempAccounting(accountingConfig); setActiveModal('accounting'); }}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-slate-500 font-medium">Electricity Emission Factor</span>
              <span className="font-bold text-slate-900 text-right">{accountingConfig.electricityEmissionFactor}</span>
            </div>
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-slate-500 font-medium">End-use Assumption</span>
              <span className="font-bold text-slate-900 text-right">{accountingConfig.endUseAssumption}</span>
            </div>
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-slate-500 font-medium">Carbon Fraction</span>
              <span className="font-bold text-slate-900 text-right">{accountingConfig.carbonFraction}</span>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* CARD 5 (Bottom Full Width): Users (Matching Screenshot) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-800 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Users</h3>
              <p className="text-xs text-slate-500 mt-0.5">People with access to this facility</p>
            </div>
          </div>

          <button
            onClick={() => setActiveModal('addUser')}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Last Active</th>
                <th className="px-6 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      {user.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span>{user.name}</span>
                  </td>
                  <td className="px-6 py-3.5 font-medium">{user.role}</td>
                  <td className="px-6 py-3.5">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className={`w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span className={user.status === 'Active' ? 'text-slate-900' : 'text-slate-500'}>
                        {user.status}
                      </span>
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-500 font-medium">
                    {user.lastActive}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button 
                      onClick={() => handleRemoveUser(user.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                      title="Revoke access"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EDIT MODALS */}
      {/* ========================================================================= */}

      {/* Facility Edit Modal */}
      {activeModal === 'facility' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Edit Facility Configuration</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1">Farm Name</label>
                <input
                  type="text"
                  value={tempFacility.farmName}
                  onChange={(e) => setTempFacility({ ...tempFacility, farmName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1">Location</label>
                <input
                  type="text"
                  value={tempFacility.location}
                  onChange={(e) => setTempFacility({ ...tempFacility, location: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1">Pond Configuration</label>
                <input
                  type="text"
                  value={tempFacility.pondConfiguration}
                  onChange={(e) => setTempFacility({ ...tempFacility, pondConfiguration: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl">
                Cancel
              </button>
              <button onClick={handleSaveFacility} className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sensors Edit Modal */}
      {activeModal === 'sensors' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Edit Sensor Array Settings</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1">Sensor IDs</label>
                <input
                  type="text"
                  value={tempSensors.sensorIds}
                  onChange={(e) => setTempSensors({ ...tempSensors, sensorIds: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1">Parameters Monitored</label>
                <input
                  type="text"
                  value={tempSensors.parameters}
                  onChange={(e) => setTempSensors({ ...tempSensors, parameters: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1">Sampling Interval</label>
                <input
                  type="text"
                  value={tempSensors.samplingInterval}
                  onChange={(e) => setTempSensors({ ...tempSensors, samplingInterval: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl">
                Cancel
              </button>
              <button onClick={handleSaveSensors} className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Model Edit Modal */}
      {activeModal === 'model' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Edit Model Parameters</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1">Model Version</label>
                <input
                  type="text"
                  value={tempModel.modelVersion}
                  onChange={(e) => setTempModel({ ...tempModel, modelVersion: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1">Growth Parameters</label>
                <input
                  type="text"
                  value={tempModel.growthParameters}
                  onChange={(e) => setTempModel({ ...tempModel, growthParameters: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1">Carbon Assumptions</label>
                <input
                  type="text"
                  value={tempModel.carbonAssumptions}
                  onChange={(e) => setTempModel({ ...tempModel, carbonAssumptions: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl">
                Cancel
              </button>
              <button onClick={handleSaveModel} className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accounting Edit Modal */}
      {activeModal === 'accounting' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Edit LCA Emission Factors</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1">Electricity Emission Factor</label>
                <input
                  type="text"
                  value={tempAccounting.electricityEmissionFactor}
                  onChange={(e) => setTempAccounting({ ...tempAccounting, electricityEmissionFactor: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1">End-use Assumption</label>
                <input
                  type="text"
                  value={tempAccounting.endUseAssumption}
                  onChange={(e) => setTempAccounting({ ...tempAccounting, endUseAssumption: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1">Carbon Fraction</label>
                <input
                  type="text"
                  value={tempAccounting.carbonFraction}
                  onChange={(e) => setTempAccounting({ ...tempAccounting, carbonFraction: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl">
                Cancel
              </button>
              <button onClick={handleSaveAccounting} className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {activeModal === 'addUser' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Invite User / Grant Access</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1">User / Stakeholder Name</label>
                <input
                  type="text"
                  placeholder="e.g. Vikramaditya Singh"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase text-[10px] mb-1">Access Role</label>
                <select
                  value={newUserRole}
                  onChange={(e: any) => setNewUserRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="Operator">Operator</option>
                  <option value="Researcher">Researcher</option>
                  <option value="Reviewer">Reviewer (Auditor)</option>
                  <option value="Investor">Investor</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl">
                Cancel
              </button>
              <button onClick={handleAddUser} className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl">
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
