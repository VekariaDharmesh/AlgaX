export interface Anomaly {
  id: string;
  pondId: string;
  pondName: string;
  title: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  timeAgo: string;
  explanation?: string;
  type: 'Environmental' | 'Sensor' | 'Growth';
}

export const DEMO_ANOMALIES: Anomaly[] = [
  {
    id: 'a-1',
    pondId: 'p-2',
    pondName: 'Pond B',
    title: 'Nitrogen limitation detected',
    description: 'Growth rate degraded by 64%',
    severity: 'HIGH',
    timeAgo: '4 minutes ago',
    type: 'Environmental',
    explanation: 'Nitrogen concentration decreased significantly over the monitored period, dropping the limitation factor f(N) to 0.41.'
  },
  {
    id: 'a-2',
    pondId: 'p-3',
    pondName: 'Pond C',
    title: 'Sensor dropout',
    description: 'DO sensor missed 3 readings',
    severity: 'MEDIUM',
    timeAgo: '27 minutes ago',
    type: 'Sensor',
    explanation: 'DO-003 has not reported data for 15 minutes.'
  },
  {
    id: 'a-3',
    pondId: 'p-1',
    pondName: 'Pond A',
    title: 'pH rising',
    description: 'pH increased to 8.6',
    severity: 'LOW',
    timeAgo: '1 hour ago',
    type: 'Environmental',
    explanation: 'pH is approaching the upper optimal bound due to intense photosynthetic activity.'
  }
];
