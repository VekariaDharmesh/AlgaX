'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Droplets, Shield, Settings } from 'lucide-react';

export type UserRole = 'FARM_OPERATOR' | 'VERIFIER_AUDITOR' | 'PLATFORM_ADMIN';

export interface RoleConfig {
  label: string;
  color: string;
  icon: any;
  description: string;
}

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  FARM_OPERATOR: {
    label: 'Farm Operator',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: Droplets,
    description: 'Facility operations, pond telemetry, imagery, anomalies, calibration, and evidence preparation.'
  },
  VERIFIER_AUDITOR: {
    label: 'Verifier / Auditor',
    color: 'bg-sky-100 text-sky-800 border-sky-200',
    icon: Shield,
    description: 'Evidence package review, SHA-256 verification, cross-validation, and audit decisions.'
  },
  PLATFORM_ADMIN: {
    label: 'Platform Admin',
    color: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: Settings,
    description: 'Platform user administration, system-wide configuration, and unrestricted governance.'
  }
};

// Route access rules per role
export const ALLOWED_ROUTES: Record<UserRole, string[]> = {
  FARM_OPERATOR: [
    '/',
    '/farms',
    '/ponds',
    '/monitoring',
    '/telemetry',
    '/imagery',
    '/anomalies',
    '/carbon',
    '/harvests',
    '/calibration',
    '/simulation'
  ],
  VERIFIER_AUDITOR: [
    '/',
    '/farms',
    '/ponds',
    '/monitoring',
    '/telemetry',
    '/imagery',
    '/anomalies',
    '/carbon',
    '/reports',
    '/evidence',
    '/review'
  ],
  PLATFORM_ADMIN: [
    '/',
    '/farms',
    '/ponds',
    '/monitoring',
    '/telemetry',
    '/imagery',
    '/anomalies',
    '/carbon',
    '/harvests',
    '/calibration',
    '/simulation',
    '/reports',
    '/evidence',
    '/review',
    '/settings'
  ]
};

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  isFarmOperator: boolean;
  isVerifier: boolean;
  isAdmin: boolean;
  canAccessRoute: (pathname: string) => boolean;
  availableRoles: UserRole[];
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

const STORAGE_KEY = 'algax_active_role';

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('PLATFORM_ADMIN');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const savedRole = localStorage.getItem(STORAGE_KEY) as UserRole | null;
      if (savedRole && (savedRole === 'FARM_OPERATOR' || savedRole === 'VERIFIER_AUDITOR' || savedRole === 'PLATFORM_ADMIN')) {
        setRoleState(savedRole);
      }
    } catch {
      // Storage access unavailable
    }
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    try {
      localStorage.setItem(STORAGE_KEY, newRole);
    } catch {
      // Storage access unavailable
    }
  };

  const isFarmOperator = role === 'FARM_OPERATOR';
  const isVerifier = role === 'VERIFIER_AUDITOR';
  const isAdmin = role === 'PLATFORM_ADMIN';

  const canAccessRoute = (pathname: string): boolean => {
    if (role === 'PLATFORM_ADMIN') return true;
    
    // Normalize path
    const cleanPath = pathname.split('?')[0].replace(/\/$/, '') || '/';
    
    // Exact match or prefix match for dynamic routes (e.g. /review/123, /ponds/abc)
    const allowed = ALLOWED_ROUTES[role] || [];
    return allowed.some(allowedPath => {
      if (allowedPath === '/') return cleanPath === '/';
      return cleanPath === allowedPath || cleanPath.startsWith(allowedPath + '/');
    });
  };

  const availableRoles: UserRole[] = ['FARM_OPERATOR', 'VERIFIER_AUDITOR', 'PLATFORM_ADMIN'];

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        isFarmOperator,
        isVerifier,
        isAdmin,
        canAccessRoute,
        availableRoles
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
