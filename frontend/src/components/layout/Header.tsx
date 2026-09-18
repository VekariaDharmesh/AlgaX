'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Bell, ChevronDown, MapPin, AlertCircle, CheckCircle, ArrowRight, Clock, ShieldAlert,
  Home, Building2, Activity, Leaf, ShieldCheck, Settings, Search, Image as ImageIcon, Zap, ShoppingBag, BarChart2, FileText, Shield, Play
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
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Facilities',
    icon: Building2,
    items: [
      { name: 'Farms & Ponds', href: '/farms', icon: Building2 },
    ]
  },
  {
    title: 'Monitoring',
    icon: Activity,
    items: [
      { name: 'Telemetry', href: '/monitoring', icon: Activity },
      { name: 'Imagery', href: '/imagery', icon: ImageIcon },
      { name: 'Anomalies', href: '/anomalies', icon: AlertCircle, isCritical: true },
    ]
  },
  {
    title: 'Carbon',
    icon: Leaf,
    items: [
      { name: 'Carbon LCA', href: '/carbon', icon: Zap },
      { name: 'Harvests', href: '/harvests', icon: ShoppingBag },
      { name: 'Calibration', href: '/calibration', icon: BarChart2 },
    ]
  },
  {
    title: 'Verification',
    icon: ShieldCheck,
    items: [
      { name: 'Reports', href: '/reports', icon: FileText },
      { name: 'Evidence Chain', href: '/evidence', icon: Shield },
      { name: 'Audit', href: '/review', icon: CheckCircle },
    ]
  },
  {
    title: 'System',
    icon: Settings,
    items: [
      { name: 'Simulation', href: '/simulation', icon: Play },
      { name: 'Settings', href: '/settings', icon: Settings },
    ]
  }
];

export function Header() {
  const [currentDate, setCurrentDate] = useState('...');
  const [currentTime, setCurrentTime] = useState('...');

  useEffect(() => {
    // Run immediately
    const now = new Date();
    setCurrentDate(now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    setCurrentTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
    
    // Update every second
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentDate(now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const { role, setRole, availableRoles } = useRole();
  const { openAnomalies, openCount, criticalCount, acknowledgeAnomaly } = useAnomalyNotification();
  const pathname = usePathname();
  const { canAccessRoute } = useRole();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const filteredNavSections = navSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => canAccessRoute(item.href))
    }))
    .filter(section => section.items.length > 0);

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
    <div className="p-3">
      <header className="h-16 bg-white rounded-full border border-gray-200 flex items-center justify-between px-4 lg:px-6 shrink-0 relative z-30 shadow-sm">
      
      {/* LEFT: Logo & Navigation */}
      <div className="flex items-center gap-6 xl:gap-8">
        
        {/* Brand */}
        <Link href="/" prefetch={false} className="flex items-center gap-2">
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
              <path d="M8 8C13.5 13.5 18 18 28 28" stroke="url(#algax-g1)" strokeWidth="4" strokeLinecap="round" />
              <path d="M28 8C22.5 13.5 18 18 8 28" stroke="url(#algax-g2)" strokeWidth="4" strokeLinecap="round" />
              <circle cx="18" cy="18" r="3.5" fill="#047857" />
              <circle cx="18" cy="18" r="1.75" fill="#A7F3D0" />
            </svg>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-lg tracking-tight text-slate-900 leading-none">
              Alga<span className="text-emerald-500">X</span>
            </span>
            <span className="text-[9px] font-bold tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200 leading-none">
              MRV
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden lg:flex items-center gap-2">
          <Link 
            href="/"
            prefetch={false}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all ${
              pathname === '/' ? 'bg-emerald-50/80 text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Home className="w-4 h-4" />
            Overview
          </Link>

          {filteredNavSections.map((section, i) => (
            <div key={i} className="relative group">
              <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all text-slate-600 hover:bg-slate-50 hover:text-slate-900`}>
                <section.icon className="w-4 h-4 text-slate-400" />
                {section.title}
                <ChevronDown className="w-3.5 h-3.5 opacity-50 ml-0.5" />
              </button>
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="p-1.5 flex flex-col gap-0.5">
                  {section.items.map((item, j) => {
                    const isActive = pathname === item.href || (pathname ? pathname.startsWith(item.href + '/') : false);
                    return (
                      <Link 
                        key={j} 
                        href={item.href}
                        prefetch={false}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                          isActive ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-700 font-medium hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <item.icon className="w-4 h-4" />
                          {item.name}
                        </div>
                        {item.href === '/anomalies' && openCount > 0 && (
                          <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {openCount}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* RIGHT: Controls */}
      <div className="flex items-center gap-3 lg:gap-5">
        {/* Date / Time */}
        <div className="hidden sm:flex flex-col items-end justify-center text-[10px] font-semibold text-slate-500 leading-tight">
          <span>{currentDate}</span>
          <span>{currentTime}</span>
        </div>

        {/* Notifications */}
        <div className="relative flex items-center justify-center">
          <button 
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setDropdownOpen(false);
            }}
            className="relative p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {openCount > 0 && (
              <span className="absolute -top-0 -right-0 min-w-[16px] h-[16px] bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                {openCount > 99 ? '99+' : openCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown (Unchanged logic, just styled) */}
          {notificationsOpen && (
            <>
            <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
            <div className="absolute top-full right-0 mt-3 w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  <div>
                    <h3 className="font-bold text-sm">System Alerts</h3>
                    <p className="text-[11px] text-slate-300">
                      {openCount === 0 ? 'All sensors operating normally' : `${openCount} active unresolved anomalies`}
                    </p>
                  </div>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {openAnomalies.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 space-y-2">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="font-bold text-xs text-slate-700">Zero Active Anomalies</p>
                  </div>
                ) : (
                  openAnomalies.slice(0, 5).map((anomaly) => (
                    <div key={anomaly.id} className="p-3 hover:bg-slate-50 transition-colors flex flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900">{anomaly.anomaly_type}</span>
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">{anomaly.severity}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2">{anomaly.description}</p>
                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(anomaly.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleQuickAcknowledge(e, anomaly.id)}
                            disabled={actionInProgress === anomaly.id}
                            className="text-slate-600 font-bold hover:underline"
                          >
                            {actionInProgress === anomaly.id ? 'Saving...' : 'Acknowledge'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            </>
          )}
        </div>

        {/* User Profile / Role Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setDropdownOpen(!dropdownOpen);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-1.5"
          >
            <div className="w-8 h-8 rounded-full bg-[#2B3B2D] text-white flex items-center justify-center text-xs font-bold shadow-sm">
              DV
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 mt-3 w-52 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95">
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
            </>
          )}
        </div>
      </div>
    </header>
    </div>
  );
}
