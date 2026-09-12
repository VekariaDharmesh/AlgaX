'use client';

import React from 'react';
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
  Play
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

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full shrink-0 select-none">
      {/* Brand Header */}
      <div className="px-6 py-5 flex items-center gap-3.5 border-b border-gray-100">
        {/* Redesigned AlgaX Logo */}
        <div className="relative flex items-center justify-center">
          <svg className="w-8 h-8 shrink-0" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="algax-l1" x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
              <linearGradient id="algax-l2" x1="26" y1="6" x2="6" y2="26" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#06B6D4" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
            {/* Left-to-right diagonal bio stroke */}
            <path 
              d="M7 6.5C10.5 10 14 13.8 16 16C18 18.2 21.5 22 25 25.5C23.5 26.5 21 26.5 18.5 24.5C16 22.5 13.8 19 12 16.5C10.2 14 7.5 11.5 6.5 9C6 7.8 6.3 6.8 7 6.5Z" 
              fill="url(#algax-l1)"
            />
            {/* Right-to-left diagonal bio stroke */}
            <path 
              d="M25 6.5C21.5 10 18 13.8 16 16C14 18.2 10.5 22 7 25.5C8.5 26.5 11 26.5 13.5 24.5C16 22.5 18.2 19 20 16.5C21.8 14 24.5 11.5 25.5 9C26 7.8 25.7 6.8 25 6.5Z" 
              fill="url(#algax-l2)"
              fillOpacity="0.92"
            />
            {/* Core nucleus */}
            <circle cx="16" cy="16" r="2.2" fill="#FFFFFF" />
            <circle cx="16" cy="16" r="1.2" fill="#059669" />
          </svg>
        </div>

        {/* Redesigned Brand Typography */}
        <div className="flex flex-col">
          <div className="flex items-center tracking-tight">
            <span className="font-extrabold text-xl text-gray-900">Alga</span>
            <span className="font-black text-xl bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">X</span>
          </div>
          <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
            Carbon MRV Platform
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Overview Item */}
        <Link 
          href="/" 
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            pathname === '/' 
              ? 'bg-emerald-50 text-emerald-800 font-semibold' 
              : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-900'
          }`}
        >
          <Home className={`w-4 h-4 ${pathname === '/' ? 'text-emerald-700' : 'text-gray-400'}`} />
          <span>Overview</span>
        </Link>

        {/* Nav Groups */}
        {navItems.map((group, i) => (
          <div key={i} className="space-y-0.5">
            <h3 className="px-3 pt-2 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              {group.group}
            </h3>
            <div className="space-y-0.5">
              {group.items.map((item, j) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname ? pathname.startsWith(item.href) : false);
                return (
                  <Link 
                    key={j}
                    href={item.href}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-emerald-50 text-emerald-800 font-semibold' 
                        : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-emerald-700' : 'text-gray-400 group-hover:text-gray-600'
                      }`} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 mt-auto space-y-3">
        {/* Status indicator */}
        <div className="flex items-center justify-between px-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-medium text-gray-700">Operational</span>
          </div>
          <span className="font-mono text-[11px] text-gray-400">v0.4.0</span>
        </div>

        {/* User profile */}
        <div className="flex items-center gap-3 px-1 pt-1">
          <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
            DS
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-900 leading-tight">Dharmesh</span>
            <span className="text-[11px] text-gray-500">Operator / Verifier</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
