'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Map, 
  Droplets, 
  Activity, 
  AlertCircle, 
  Image as ImageIcon,
  Zap,
  ShoppingBag,
  BarChart,
  FileText,
  Shield,
  CheckCircle,
  Settings,
  Play,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

const navItems = [
  {
    group: 'FARM',
    items: [
      { name: 'Farms', href: '/farms', icon: Map },
      { name: 'Ponds', href: '/ponds', icon: Droplets },
    ]
  },
  {
    group: 'MONITORING',
    items: [
      { name: 'Telemetry', href: '/monitoring', icon: Activity },
      { name: 'Imagery', href: '/imagery', icon: ImageIcon },
      { name: 'Anomalies', href: '/anomalies', icon: AlertCircle, badge: 2 },
    ]
  },
  {
    group: 'CARBON',
    items: [
      { name: 'Carbon LCA', href: '/carbon', icon: Zap },
      { name: 'Harvests', href: '/harvests', icon: ShoppingBag },
      { name: 'Calibration', href: '/calibration', icon: BarChart },
    ]
  },
  {
    group: 'VERIFICATION',
    items: [
      { name: 'Reports', href: '/reports', icon: FileText },
      { name: 'Evidence Chain', href: '/evidence', icon: Shield },
      { name: 'Audit', href: '/review', icon: CheckCircle },
    ]
  },
  {
    group: 'SYSTEM',
    items: [
      { name: 'Simulation', href: '/simulation', icon: Play },
      { name: 'Settings', href: '/settings', icon: Settings },
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  return (
<<<<<<< HEAD
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-green-600 flex items-center justify-center">
          <Droplets className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg leading-tight text-gray-900">AlgaX</span>
          <span className="text-[10px] text-gray-500 font-medium tracking-wide">Carbon Intelligence Platform</span>
=======
    <aside 
      className={`${
        isOpen ? 'w-64' : 'w-20'
      } bg-white rounded-2xl border border-gray-200/90 shadow-sm flex flex-col h-full shrink-0 select-none overflow-hidden transition-all duration-300 ease-in-out`}
    >
      {/* Brand Header with Open / Close Button */}
      <div className={`border-b border-gray-100 flex items-center transition-all ${
        isOpen ? 'px-5 py-4 justify-between' : 'px-3 py-4 flex-col gap-3 justify-center'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <svg className="w-9 h-9" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="algax-g1" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="50%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#047857" />
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
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xl tracking-tight text-gray-900 leading-none">
                  Alga<span className="text-emerald-600">X</span>
                </span>
                <span className="text-[9px] font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded leading-none">
                  MRV
                </span>
              </div>
              <span className="text-[11px] text-gray-400 font-medium tracking-tight mt-1 leading-none truncate">
                Carbon Intelligence
              </span>
            </div>
          )}
>>>>>>> e926610a751bcb2f8a465040bf275bb0c557434f
        </div>

        {/* Toggle Collapse/Expand Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
          title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? (
            <PanelLeftClose className="w-5 h-5" />
          ) : (
            <PanelLeftOpen className="w-5 h-5 text-emerald-600" />
          )}
        </button>
      </div>

      {/* Navigation Scrollable Area */}
      <div className={`flex-1 overflow-y-auto ${isOpen ? 'px-4 py-3 space-y-5' : 'px-2 py-3 space-y-3'}`}>
        {/* Overview Item */}
        <Link 
          href="/" 
          title="Overview"
          className={`flex items-center rounded-lg text-sm font-medium transition-colors ${
            isOpen ? 'gap-3 px-3 py-2' : 'justify-center p-2.5'
          } ${
            pathname === '/' 
              ? 'bg-emerald-50 text-emerald-700 font-semibold' 
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Home className={`w-5 h-5 shrink-0 ${pathname === '/' ? 'text-emerald-600' : 'text-gray-400'}`} />
          {isOpen && <span>Overview</span>}
        </Link>

        {/* Navigation Groups */}
        {navItems.map((group, i) => (
          <div key={i}>
            {isOpen ? (
              <div className="px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                {group.group}
              </div>
            ) : (
              <div className="my-2 border-t border-gray-100 w-8 mx-auto" />
            )}
            
            <div className="space-y-0.5">
              {group.items.map((item, j) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname ? pathname.startsWith(item.href) : false);
                return (
                  <Link 
                    key={j}
                    href={item.href}
                    title={item.name}
                    className={`relative flex items-center rounded-lg text-sm font-medium transition-colors ${
                      isOpen ? 'justify-between px-3 py-2' : 'justify-center p-2.5'
                    } ${
                      isActive 
                        ? 'bg-emerald-50 text-emerald-700 font-semibold' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className={`flex items-center ${isOpen ? 'gap-3' : ''}`}>
                      <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                      {isOpen && <span>{item.name}</span>}
                    </div>

                    {item.badge && (
                      isOpen ? (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      ) : (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                      )
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Unboxed Bottom Section */}
      <div className={`border-t border-gray-100 mt-auto transition-all ${
        isOpen ? 'p-4 space-y-3' : 'p-3 flex flex-col items-center gap-3'
      }`}>
        {/* Operational Status */}
        {isOpen ? (
          <div className="flex items-center justify-between px-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium text-gray-700">System Operational</span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono">v0.4.0</span>
          </div>
        ) : (
          <div className="relative flex h-3 w-3 my-1" title="System Operational (v0.4.0)">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
        )}

        {/* User Info */}
        <div className={`flex items-center ${isOpen ? 'gap-3 px-1 pt-1' : 'justify-center'}`} title="Dharmesh (Operator / Verifier)">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
            DS
          </div>
          {isOpen && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-gray-900 truncate leading-tight">Dharmesh</span>
              <span className="text-xs text-gray-400 truncate">Operator / Verifier</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
