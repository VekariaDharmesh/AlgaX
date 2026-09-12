'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchAnomalies, updateAnomalyStatus } from '@/lib/api';

export interface AnomalyItem {
  id: string;
  pond_id: string;
  sensor_id?: string;
  sensor_type?: string;
  timestamp: string;
  detected_at: string;
  anomaly_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence_score: number;
  observed_value?: number;
  expected_value?: number;
  deviation?: number;
  description: string;
  source_provenance: string;
  status: 'OPEN' | 'INVESTIGATING' | 'ACKNOWLEDGED' | 'RESOLVED';
  priority_score: number;
  explanation_record?: any;
}

interface AnomalyContextType {
  openAnomalies: AnomalyItem[];
  openCount: number;
  criticalCount: number;
  loading: boolean;
  activeToast: AnomalyItem | null;
  dismissToast: () => void;
  acknowledgeAnomaly: (id: string) => Promise<void>;
  resolveAnomaly: (id: string) => Promise<void>;
  refreshAnomalies: () => Promise<void>;
}

const AnomalyContext = createContext<AnomalyContextType | undefined>(undefined);

export function AnomalyProvider({ children }: { children: React.ReactNode }) {
  const [openAnomalies, setOpenAnomalies] = useState<AnomalyItem[]>([]);
  const [openCount, setOpenCount] = useState<number>(0);
  const [criticalCount, setCriticalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeToast, setActiveToast] = useState<AnomalyItem | null>(null);
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());
  const [initialLoaded, setInitialLoaded] = useState<boolean>(false);

  const refreshAnomalies = useCallback(async () => {
    try {
      const data = await fetchAnomalies(1, 50, 'OPEN', true);
      const items: AnomalyItem[] = data?.items || [];
      
      // Sort by priority score and severity
      const sorted = items.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
      
      setOpenAnomalies(sorted);
      setOpenCount(data?.total || sorted.length);
      
      const criticals = sorted.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH').length;
      setCriticalCount(criticals);

      // Check for newly spawned critical/high anomalies for live toast alert
      if (initialLoaded) {
        const newCritical = sorted.find(a => !knownIds.has(a.id) && (a.severity === 'CRITICAL' || a.severity === 'HIGH'));
        if (newCritical) {
          setActiveToast(newCritical);
        }
      }

      setKnownIds(new Set(sorted.map(a => a.id)));
      if (!initialLoaded) setInitialLoaded(true);
    } catch (err) {
      console.warn('Error fetching anomaly notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [initialLoaded, knownIds]);

  useEffect(() => {
    refreshAnomalies();
    const interval = setInterval(refreshAnomalies, 8000);
    return () => clearInterval(interval);
  }, [refreshAnomalies]);

  const dismissToast = () => {
    setActiveToast(null);
  };

  const acknowledgeAnomaly = async (id: string) => {
    try {
      await updateAnomalyStatus(id, 'ACKNOWLEDGED');
      setOpenAnomalies(prev => prev.filter(a => a.id !== id));
      setOpenCount(prev => Math.max(0, prev - 1));
      if (activeToast?.id === id) setActiveToast(null);
      await refreshAnomalies();
    } catch (err) {
      console.error('Failed to acknowledge anomaly:', err);
      throw err;
    }
  };

  const resolveAnomaly = async (id: string) => {
    try {
      await updateAnomalyStatus(id, 'RESOLVED');
      setOpenAnomalies(prev => prev.filter(a => a.id !== id));
      setOpenCount(prev => Math.max(0, prev - 1));
      if (activeToast?.id === id) setActiveToast(null);
      await refreshAnomalies();
    } catch (err) {
      console.error('Failed to resolve anomaly:', err);
      throw err;
    }
  };

  return (
    <AnomalyContext.Provider
      value={{
        openAnomalies,
        openCount,
        criticalCount,
        loading,
        activeToast,
        dismissToast,
        acknowledgeAnomaly,
        resolveAnomaly,
        refreshAnomalies
      }}
    >
      {children}
    </AnomalyContext.Provider>
  );
}

export function useAnomalyNotification() {
  const context = useContext(AnomalyContext);
  if (!context) {
    throw new Error('useAnomalyNotification must be used within AnomalyProvider');
  }
  return context;
}
