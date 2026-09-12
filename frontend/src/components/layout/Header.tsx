'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Bell, 
  ChevronDown, 
  Droplets, 
  AlertCircle, 
  CheckCircle, 
  ArrowRight, 
  X, 
  Clock, 
  ShieldAlert 
} from 'lucide-react';
import { useRole, ROLE_CONFIGS } from '@/context/RoleContext';
import { useAnomalyNotification } from '@/context/AnomalyContext';

export function Header() {
  const currentDate = 'Sep 12, 2026';
  const currentTime = '10:24 AM';
  const { role, setRole, availableRoles } = useRole();
  const { 
    openAnomalies, 
    openCount, 
    criticalCount, 
    activeToast, 
    dismissToast, 
    acknowledgeAnomaly 
  } = useAnomalyNotification();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const CurrentRoleIcon = ROLE_CONFIGS[role].icon;

  const handleQuickAcknowledge = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      setActionInProgress(id);
      await acknowledgeAnomaly(id);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 relative z-30">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            Overview
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              AlgaX v5.1
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setDropdownOpen(!dropdownOpen);
                setNotificationsOpen(false);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs ${ROLE_CONFIGS[role].color}`}
            >
              <CurrentRoleIcon className="w-4 h-4" />
              <span>{ROLE_CONFIGS[role].label}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Switch Role Context
                </div>
                {availableRoles.map((r) => {
                  const ItemIcon = ROLE_CONFIGS[r].icon;
                  return (
                    <button
                      key={r}
                      onClick={() => {
                        setRole(r);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-slate-50 transition-colors ${
                        role === r ? 'text-emerald-700 bg-emerald-50/50 font-bold' : 'text-slate-700'
                      }`}
                    >
                      <ItemIcon className="w-4 h-4 text-slate-500" />
                      {ROLE_CONFIGS[r].label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Farm Context */}
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-1.5 hover:bg-gray-50 transition-all text-xs font-medium text-gray-700">
            <Droplets className="w-4 h-4 text-emerald-600" />
            <span>Kutch Bio-Raceway Facility</span>
          </div>

          {/* Real-time Indicator */}
          <div className="flex items-center gap-2 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[11px] font-extrabold text-emerald-800 tracking-wider">LIVE</span>
          </div>

          <div className="text-xs font-medium text-gray-500 hidden sm:block">
            {currentDate} &nbsp; {currentTime}
          </div>

          {/* Interactive Notification Bell */}
          <div className="relative">
            <button 
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setDropdownOpen(false);
              }}
              className={`relative p-2 rounded-xl transition-all ${
                notificationsOpen 
                  ? 'bg-slate-100 text-slate-900' 
                  : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
              }`}
              title="System Alerts & Anomalies"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {openCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-black rounded-full px-1 flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
                  {openCount > 99 ? '99+' : openCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Drawer */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-400" />
                    <div>
                      <h3 className="font-bold text-sm">System Alerts & Deviations</h3>
                      <p className="text-[11px] text-slate-300">
                        {openCount === 0 ? 'All sensors operating normally' : `${openCount} active unresolved anomalies`}
                      </p>
                    </div>
                  </div>
                  {criticalCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {criticalCount} Critical
                    </span>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {openAnomalies.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 space-y-2">
                      <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                      <p className="font-bold text-xs text-slate-700">Zero Active Anomalies</p>
                      <p className="text-[11px]">All pond biokinetics and physical ranges are within nominal thresholds.</p>
                    </div>
                  ) : (
                    openAnomalies.slice(0, 5).map((anomaly) => (
                      <div 
                        key={anomaly.id} 
                        className="p-3.5 hover:bg-slate-50/80 transition-colors flex flex-col gap-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              anomaly.severity === 'CRITICAL' ? 'bg-rose-500' :
                              anomaly.severity === 'HIGH' ? 'bg-orange-500' : 'bg-amber-400'
                            }`} />
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {anomaly.anomaly_type.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                            anomaly.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700' :
                            anomaly.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {anomaly.severity}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                          {anomaly.description}
                        </p>

                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(anomaly.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => handleQuickAcknowledge(e, anomaly.id)}
                              disabled={actionInProgress === anomaly.id}
                              className="text-slate-600 hover:text-slate-900 font-bold hover:underline disabled:opacity-50"
                            >
                              {actionInProgress === anomaly.id ? 'Saving...' : 'Acknowledge'}
                            </button>
                            <span>·</span>
                            <Link 
                              href={`/anomalies/${anomaly.id}`}
                              onClick={() => setNotificationsOpen(false)}
                              className="text-emerald-600 hover:text-emerald-700 font-bold hover:underline flex items-center gap-0.5"
                            >
                              Investigate <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                  <Link 
                    href="/anomalies" 
                    onClick={() => setNotificationsOpen(false)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center justify-center gap-1.5"
                  >
                    Open Anomaly Center <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Real-time Floating Anomaly Alert Toast */}
      {activeToast && (
        <div className="fixed top-20 right-8 z-50 max-w-md w-full bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-rose-500/50 flex items-start gap-3 animate-in slide-in-from-top-4 duration-300">
          <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/40">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-xs text-rose-300 uppercase tracking-wider">
                New {activeToast.severity} Anomaly Alert
              </span>
              <span className="text-[10px] text-slate-400">Just now</span>
            </div>
            <h4 className="font-bold text-sm text-white mt-0.5">
              {activeToast.anomaly_type.replace(/_/g, ' ')}
            </h4>
            <p className="text-xs text-slate-300 mt-1 line-clamp-2">
              {activeToast.description}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Link
                href={`/anomalies/${activeToast.id}`}
                onClick={dismissToast}
                className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                Investigate Anomaly <ArrowRight className="w-3 h-3" />
              </Link>
              <button
                onClick={dismissToast}
                className="text-xs font-medium text-slate-400 hover:text-white px-2 py-1.5"
              >
                Dismiss
              </button>
            </div>
          </div>
          <button 
            onClick={dismissToast}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
