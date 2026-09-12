'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Droplets, Shield, Settings } from 'lucide-react';
import { useRole, ROLE_CONFIGS } from '@/context/RoleContext';

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { role, canAccessRoute, setRole } = useRole();

  const isAllowed = canAccessRoute(pathname);

  if (isAllowed) {
    return <>{children}</>;
  }

  const currentConfig = ROLE_CONFIGS[role];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 max-w-xl mx-auto space-y-6">
      <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-sm">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${currentConfig.color}`}>
          <currentConfig.icon className="w-3.5 h-3.5" />
          <span>Active Role: {currentConfig.label}</span>
        </span>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Access Restricted
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          The workspace route <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">{pathname}</code> is restricted for your active role context (<span className="font-semibold text-slate-700">{currentConfig.label}</span>).
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          href="/"
          className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Overview</span>
        </Link>

        {role !== 'PLATFORM_ADMIN' && (
          <button
            onClick={() => setRole('PLATFORM_ADMIN')}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>Switch to Admin Context</span>
          </button>
        )}
      </div>
    </div>
  );
}
