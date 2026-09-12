'use client';

import React, { useState } from 'react';
import { Bell, ChevronDown, Droplets } from 'lucide-react';
import { useRole, ROLE_CONFIGS, UserRole } from '@/context/RoleContext';

export function Header() {
  const currentDate = 'Sep 12, 2026';
  const currentTime = '10:24 AM';
  const { role, setRole, availableRoles } = useRole();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const CurrentRoleIcon = ROLE_CONFIGS[role].icon;

  return (
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
            onClick={() => setDropdownOpen(!dropdownOpen)}
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

        <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
        </button>
      </div>
    </header>
  );
}
