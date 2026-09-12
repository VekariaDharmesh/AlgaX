'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Layers,
  Droplets,
  Sprout,
  Activity, 
  BarChart3,
  AlertCircle, 
  Image as ImageIcon,
  FileText,
  Shield,
  CheckCircle,
  Settings,
  Sliders,
  Play,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

import { useRole, ROLE_CONFIGS } from '@/context/RoleContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  isCritical?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'DASHBOARD',
    items: [
      { name: 'Overview', href: '/', icon: Home, badge: 2 },
      { name: 'Ponds', href: '/ponds', icon: Droplets },
      { name: 'Algae Species & Farms', href: '/farms', icon: Sprout },
    ]
  },
  {
    title: 'MONITORING & ANALYSIS',
    items: [
      { name: 'Data Stream', href: '/monitoring', icon: Activity },
      { name: 'Analytics & Carbon', href: '/carbon', icon: BarChart3 },
      { name: 'Anomalies', href: '/anomalies', icon: AlertCircle, badge: 2, isCritical: true },
      { name: 'Spectral Imagery', href: '/imagery', icon: ImageIcon },
      { name: 'Simulation Engine', href: '/simulation', icon: Play },
      { name: 'Sensor Calibration', href: '/calibration', icon: Sliders },
    ]
  },
  {
    title: 'DATA & SYSTEM',
    items: [
      { name: 'Reports & Exports', href: '/reports', icon: FileText },
      { name: 'Evidence Chain', href: '/evidence', icon: Shield },
      { name: 'Audit Review', href: '/review', icon: CheckCircle },
      { name: 'Settings & Security', href: '/settings', icon: Settings },
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const { role, canAccessRoute } = useRole();

  const currentConfig = ROLE_CONFIGS[role];

  // Filter navigation items by active role permissions
  const filteredNavSections = navSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => canAccessRoute(item.href))
    }))
    .filter(section => section.items.length > 0);

  return (
    <aside 
      className={`${
        isOpen ? 'w-64' : 'w-20'
      } bg-[#141d21] rounded-2xl border border-[#223138] shadow-xl flex flex-col h-full shrink-0 select-none overflow-hidden transition-all duration-300 ease-in-out`}
    >
      {/* Brand Header */}
      <div className={`border-b border-[#1f2b31] flex items-center transition-all ${
        isOpen ? 'px-4 py-4 justify-between' : 'px-3 py-4 flex-col gap-3 justify-center'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <svg className="w-8 h-8" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="algax-g1" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="50%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#34D399" />
                </linearGradient>
                <linearGradient id="algax-g2" x1="32" y1="4" x2="4" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#34D399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
              <path
                d="M8 8C13.5 13.5 18 18 28 28"
                stroke="url(#algax-g1)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                d="M28 8C22.5 13.5 18 18 8 28"
                stroke="url(#algax-g2)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <circle cx="18" cy="18" r="3" fill="#047857" />
              <circle cx="18" cy="18" r="1.5" fill="#6EE7B7" />
            </svg>
          </div>
          
          {isOpen && (
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white leading-none">
                  Alga<span className="text-[#34d399]">X</span>
                </span>
                <span className="text-[9px] font-semibold tracking-wider text-[#8ea6b0] bg-[#1e2a30] px-1.5 py-0.5 rounded border border-[#2d3e47] leading-none">
                  MRV
                </span>
              </div>
              <span className="text-[11px] text-[#6d848f] font-medium tracking-tight mt-1 leading-none truncate">
                Carbon Intelligence
              </span>
            </div>
          )}
        </div>

        {/* Toggle Collapse/Expand Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 text-[#6d848f] hover:text-[#9db1bb] hover:bg-[#1e2a30] rounded-lg transition-colors shrink-0"
          title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? (
            <PanelLeftClose className="w-4 h-4" />
          ) : (
            <PanelLeftOpen className="w-4 h-4 text-[#34d399]" />
          )}
        </button>
      </div>

      {/* Navigation Scrollable Area */}
      <div className={`flex-1 overflow-y-auto ${isOpen ? 'px-3 py-3 space-y-4' : 'px-2 py-3 space-y-3'}`}>
        {filteredNavSections.map((section, i) => (
          <div key={i} className="space-y-1">
            {isOpen ? (
              <div className="px-3 text-[10px] font-bold text-[#647c87] uppercase tracking-wider mb-1 mt-2">
                {section.title}
              </div>
            ) : (
              <div className="my-2 border-t border-[#1f2b31] w-8 mx-auto" />
            )}
            
            <div className="space-y-0.5">
              {section.items.map((item, j) => {
                const isActive = item.href === '/' 
                  ? pathname === '/' 
                  : pathname === item.href || (pathname ? pathname.startsWith(item.href + '/') : false);
                
                return (
                  <Link 
                    key={j}
                    href={item.href}
                    title={item.name}
                    className={`group relative flex items-center rounded-xl text-xs font-medium transition-all duration-200 ${
                      isOpen ? 'justify-between px-3 py-2' : 'justify-center p-2.5'
                    } ${
                      isActive 
                        ? 'bg-[#1f2f34] text-[#34d399] font-semibold border border-[#2a454a]/80 shadow-xs' 
                        : 'text-[#8fa3ad] hover:bg-[#1a262b] hover:text-white'
                    }`}
                  >
                    <div className={`flex items-center min-w-0 ${isOpen ? 'gap-2.5' : ''}`}>
                      <item.icon className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-[#34d399]' : 'text-[#647c87] group-hover:text-[#9db1bb]'
                      }`} />
                      {isOpen && <span className="truncate">{item.name}</span>}
                    </div>

                    {item.badge !== undefined && (
                      isOpen ? (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                          item.isCritical 
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                            : isActive
                              ? 'bg-[#16413a] text-[#34d399] border-[#20584f]'
                              : 'bg-[#1e2a30] text-[#8fa3ad] border-[#2c3d46]'
                        }`}>
                          {item.badge}
                        </span>
                      ) : (
                        <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                          item.isCritical ? 'bg-rose-500' : 'bg-[#34d399]'
                        }`}></span>
                      )
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Status & User Profile */}
      <div className={`border-t border-[#1f2b31] mt-auto transition-all ${
        isOpen ? 'p-3.5 space-y-3' : 'p-2.5 flex flex-col items-center gap-3'
      }`}>
        {/* Operational Status */}
        {isOpen ? (
          <div className="flex items-center justify-between px-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]"></span>
              </span>
              <span className="font-medium text-[#8fa3ad] text-[11px]">System Operational</span>
            </div>
            <span className="text-[10px] text-[#556972] font-mono">v6.1.0</span>
          </div>
        ) : (
          <div className="relative flex h-2.5 w-2.5 my-1" title="System Operational (v6.1.0)">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#22c55e]"></span>
          </div>
        )}

        {/* User Info */}
        <div className={`flex items-center ${isOpen ? 'gap-2.5 px-1 pt-1' : 'justify-center'}`} title={`Dharmesh (${currentConfig.label})`}>
          <div className="w-8 h-8 rounded-full bg-[#1b3b33] text-[#34d399] border border-[#23584c] flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            DS
          </div>
          {isOpen && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate leading-tight">Dharmesh</span>
              <span className="text-[11px] text-[#647c87] truncate leading-tight mt-0.5">{currentConfig.label}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
