'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Layers,
  Activity, 
  Image as ImageIcon,
  AlertCircle,
  Zap,
  ShoppingBag,
  BarChart2,
  FileText,
  Shield,
  CheckCircle,
  Play,
  Settings,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

import { useRole, ROLE_CONFIGS } from '@/context/RoleContext';
import { useAnomalyNotification } from '@/context/AnomalyContext';

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
    title: 'FACILITIES',
    items: [
      { name: 'Farms & Ponds', href: '/farms', icon: Layers },
    ]
  },
  {
    title: 'MONITORING',
    items: [
      { name: 'Telemetry', href: '/monitoring', icon: Activity },
      { name: 'Imagery', href: '/imagery', icon: ImageIcon },
      { name: 'Anomalies', href: '/anomalies', icon: AlertCircle, isCritical: true },
    ]
  },
  {
    title: 'CARBON',
    items: [
      { name: 'Carbon LCA', href: '/carbon', icon: Zap },
      { name: 'Harvests', href: '/harvests', icon: ShoppingBag },
      { name: 'Calibration', href: '/calibration', icon: BarChart2 },
    ]
  },
  {
    title: 'VERIFICATION',
    items: [
      { name: 'Reports', href: '/reports', icon: FileText },
      { name: 'Evidence Chain', href: '/evidence', icon: Shield },
      { name: 'Audit', href: '/review', icon: CheckCircle },
    ]
  },
  {
    title: 'SYSTEM',
    items: [
      { name: 'Simulation', href: '/simulation', icon: Play },
      { name: 'Settings', href: '/settings', icon: Settings },
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const { role, canAccessRoute } = useRole();
  const { openCount, criticalCount } = useAnomalyNotification();

  const currentConfig = ROLE_CONFIGS[role];

  // Filter navigation items by active role permissions & inject live anomaly badge
  const filteredNavSections = navSections
    .map(section => ({
      ...section,
      items: section.items
        .filter(item => canAccessRoute(item.href))
        .map(item => {
          if (item.href === '/anomalies') {
            return {
              ...item,
              badge: openCount > 0 ? openCount : 2,
              isCritical: criticalCount > 0 || openCount > 0
            };
          }
          return item;
        })
    }))
    .filter(section => section.items.length > 0);

  const isOverviewActive = pathname === '/';

  return (
    <aside 
      className={`${
        isOpen ? 'w-72' : 'w-24'
      } bg-[#182327] rounded-2xl border border-[#233137] shadow-xl flex flex-col h-full shrink-0 select-none overflow-hidden transition-all duration-300 ease-in-out`}
    >
      {/* Brand Header */}
      <div className={`border-b border-[#233137] flex items-center transition-all ${
        isOpen ? 'px-5 py-4 justify-between' : 'px-3 py-4 flex-col gap-3 justify-center'
      }`}>
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative shrink-0">
            <svg className="w-9 h-9" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M28 8C22.5 13.5 18 18 8 28"
                stroke="url(#algax-g2)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="18" cy="18" r="3.5" fill="#047857" />
              <circle cx="18" cy="18" r="1.75" fill="#A7F3D0" />
            </svg>
          </div>
          
          {isOpen && (
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-white leading-none">
                  Alga<span className="text-[#34d399]">X</span>
                </span>
                <span className="text-[10px] font-bold tracking-wider text-[#8fa4ad] bg-[#24343a] px-2 py-0.5 rounded-md border border-[#2e4048] leading-none">
                  MRV
                </span>
              </div>
              <span className="text-xs text-[#647c87] font-medium tracking-tight mt-1 leading-none truncate">
                Carbon Intelligence
              </span>
            </div>
          )}
        </div>

        {/* Toggle Collapse/Expand Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-[#647c87] hover:text-[#9eb1ba] hover:bg-[#202d33] rounded-xl transition-colors shrink-0"
          title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? (
            <PanelLeftClose className="w-5 h-5" />
          ) : (
            <PanelLeftOpen className="w-5 h-5 text-[#34d399]" />
          )}
        </button>
      </div>

      {/* Navigation Scrollable Area */}
      <div className={`flex-1 overflow-y-auto ${isOpen ? 'px-4 py-3.5 space-y-4' : 'px-2.5 py-3.5 space-y-3'}`}>
        
        {/* Overview Item */}
        <Link
          href="/"
          title="Overview"
          className={`flex items-center rounded-2xl transition-all duration-200 ${
            isOpen ? 'justify-between px-3.5 py-3' : 'justify-center p-3'
          } ${
            isOverviewActive
              ? 'bg-[#23383c] text-[#dcfce7] font-bold border border-[#2d494e]/80 shadow-2xs'
              : 'text-[#9eb1ba] hover:bg-[#1f2b30] hover:text-white font-semibold'
          }`}
        >
          <div className={`flex items-center min-w-0 ${isOpen ? 'gap-3' : ''}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              isOverviewActive ? 'bg-[#1a2d30] text-[#34d399] shadow-2xs' : 'bg-[#1e2a2f] text-[#718a96]'
            }`}>
              <Home className="w-4.5 h-4.5" />
            </div>
            {isOpen && <span className="text-sm">Overview</span>}
          </div>
          {isOpen && <ChevronRight className={`w-4 h-4 shrink-0 ${isOverviewActive ? 'text-[#34d399]' : 'text-[#5a727d]'}`} />}
        </Link>

        {/* Sections */}
        {filteredNavSections.map((section, i) => (
          <div key={i} className="space-y-1">
            {isOpen ? (
              <div className="px-3 text-[11px] font-bold text-[#647c87] uppercase tracking-wider mb-1 mt-3">
                {section.title}
              </div>
            ) : (
              <div className="my-2 border-t border-[#233137] w-8 mx-auto" />
            )}
            
            <div className="space-y-1">
              {section.items.map((item, j) => {
                const isActive = pathname === item.href || (pathname ? pathname.startsWith(item.href + '/') : false);
                
                return (
                  <Link 
                    key={j}
                    href={item.href}
                    title={item.name}
                    className={`group relative flex items-center rounded-2xl text-sm font-semibold transition-all duration-200 ${
                      isOpen ? 'justify-between px-3 py-2.5' : 'justify-center p-3'
                    } ${
                      isActive 
                        ? 'bg-[#23383c] text-[#dcfce7] font-bold border border-[#2d494e]/80 shadow-2xs' 
                        : 'text-[#9eb1ba] hover:bg-[#1f2b30] hover:text-white'
                    }`}
                  >
                    <div className={`flex items-center min-w-0 ${isOpen ? 'gap-3' : ''}`}>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isActive ? 'bg-[#1a2d30] text-[#34d399] shadow-2xs' : 'bg-[#1e2a2f] text-[#718a96] group-hover:bg-[#25343b] group-hover:text-[#9eb1ba]'
                      }`}>
                        <item.icon className="w-4.5 h-4.5" />
                      </div>
                      {isOpen && <span className="truncate">{item.name}</span>}
                    </div>

                    {isOpen ? (
                      <div className="flex items-center gap-2 shrink-0">
                        {item.badge !== undefined && (
                          <span className="bg-[#1f4848] text-[#34d399] border border-[#28605c] text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${isActive ? 'text-[#34d399]' : 'text-[#5a727d]'}`} />
                      </div>
                    ) : (
                      item.badge !== undefined && (
                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#34d399]"></span>
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
      <div className={`border-t border-[#233137] mt-auto transition-all ${
        isOpen ? 'p-4 space-y-3.5' : 'p-3 flex flex-col items-center gap-3'
      }`}>
        {/* Operational Status */}
        {isOpen ? (
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#22c55e]"></span>
              </span>
              <span className="font-semibold text-[#8fa4ad] text-xs">System Operational</span>
            </div>
            <span className="text-xs text-[#5a727d] font-mono">v6.1.0</span>
          </div>
        ) : (
          <div className="relative flex h-3 w-3 my-1" title="System Operational (v6.1.0)">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#22c55e]"></span>
          </div>
        )}

        {/* User Info */}
        <div className={`flex items-center ${isOpen ? 'justify-between px-1 pt-1' : 'justify-center'}`} title={`Dharmesh (${currentConfig.label})`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-[#223932] text-[#34d399] border border-[#2b4c41] flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                DS
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#22c55e] border-2 border-[#182327] rounded-full"></span>
            </div>
            {isOpen && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white truncate leading-tight">Dharmesh</span>
                <span className="text-xs text-[#647c87] font-medium truncate leading-tight mt-0.5">{currentConfig.label}</span>
              </div>
            )}
          </div>
          {isOpen && <ChevronRight className="w-4 h-4 text-[#5a727d] shrink-0" />}
        </div>
      </div>
    </aside>
  );
}
