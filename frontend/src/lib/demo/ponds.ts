export interface Pond {
  id: string;
  name: string;
  species: string;
  status: 'Healthy' | 'Attention' | 'Critical' | 'Offline';
  biomass: number;
  temperature: number;
  ph: number;
  dissolvedOxygen: number;
  turbidity: number;
  nitrogen: number;
}

export const DEMO_PONDS: Pond[] = [
  {
    id: 'p-1',
    name: 'Pond A',
    species: 'Chlorella vulgaris',
    status: 'Healthy',
    biomass: 0.84, // g/L (but UI says 0.84 g/L for biomass)
    temperature: 28.1,
    ph: 8.1,
    dissolvedOxygen: 7.2,
    turbidity: 32,
    nitrogen: 8.4,
  },
  {
    id: 'p-2',
    name: 'Pond B',
    species: 'Chlorella vulgaris',
    status: 'Attention',
    biomass: 0.86,
    temperature: 28.4,
    ph: 8.4,
    dissolvedOxygen: 5.8, // Low DO
    turbidity: 38,
    nitrogen: 4.1, // Nitrogen limitation
  },
  {
    id: 'p-3',
    name: 'Pond C',
    species: 'Scenedesmus sp.',
    status: 'Healthy',
    biomass: 0.81,
    temperature: 27.9,
    ph: 8.0,
    dissolvedOxygen: 7.5,
    turbidity: 34,
    nitrogen: 8.2,
  }
];
