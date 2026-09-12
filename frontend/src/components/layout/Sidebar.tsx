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
  ShoppingBag, // used for Harvests since no better icon right now
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
      { name: 'Anomalies', href: '/anomalies', icon: AlertCircle, badge: 2 },
      { name: 'Imagery', href: '/imagery', icon: ImageIcon },
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
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-green-600 flex items-center justify-center">
          <Droplets className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg leading-tight text-gray-900">AlgaeMRV</span>
          <span className="text-[10px] text-gray-500 font-medium tracking-wide">Carbon Intelligence Platform</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        <Link 
          href="/" 
          className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
            pathname === '/' ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Home className="w-5 h-5" />
          Overview
        </Link>

        {navItems.map((group, i) => (
          <div key={i} className="mt-6">
            <h3 className="px-3 text-xs font-semibold text-gray-400 tracking-wider mb-2 uppercase">
              {group.group}
            </h3>
            <div className="space-y-1">
              {group.items.map((item, j) => {
                const isActive = pathname ? pathname.startsWith(item.href) : false;
                return (
                  <Link 
                    key={j}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                      isActive ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </div>
                    {item.badge && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
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

      <div className="p-4 border-t border-gray-200 mt-auto">
        <div className="flex items-center gap-3 p-2 border border-gray-200 rounded-lg mb-4">
          <div className="w-2 h-2 rounded-full bg-green-500 ml-1"></div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-green-700">System Operational</span>
            <span className="text-[10px] text-gray-500">All services online</span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2">
          <div className="w-8 h-8 rounded-full bg-green-800 text-white flex items-center justify-center font-bold text-sm">
            DS
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900">Dharmesh</span>
            <span className="text-xs text-gray-500">Operator</span>
          </div>
        </div>
      </div>
    </div>
  );
}
