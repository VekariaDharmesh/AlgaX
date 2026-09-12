export interface Pond {
  id: string;
  name: string;
  species: string;
  speciesCommon: string;
  status: 'Healthy' | 'Attention' | 'Critical' | 'Offline';
  biomass: number;
  temperature: number;
  ph: number;
  dissolvedOxygen: number;
  turbidity: number;
  nitrogen: number;
  volumeLiters: number;
  areaSqM: number;
  depthCm: number;
  pondType: string;
  description: string;
  lastHarvest?: string;
  dailyGrowthRate: number;
  co2InjectionRate: number;
}

export const DEMO_PONDS: Pond[] = [
  {
    id: 'p-1',
    name: 'Raceway Alpha',
    species: 'Chlorella vulgaris',
    speciesCommon: 'Green Microalgae',
    status: 'Healthy',
    biomass: 0.84,
    temperature: 28.1,
    ph: 8.1,
    dissolvedOxygen: 7.2,
    turbidity: 32,
    nitrogen: 8.4,
    volumeLiters: 50000,
    areaSqM: 2500,
    depthCm: 20,
    pondType: 'Open Raceway',
    description: 'Primary high-yield raceway pond with paddle wheel circulation. Optimized for Chlorella vulgaris biomass production under high solar irradiance.',
    lastHarvest: '2026-09-08',
    dailyGrowthRate: 12.5,
    co2InjectionRate: 0.8,
  },
  {
    id: 'p-2',
    name: 'Raceway Bravo',
    species: 'Spirulina platensis',
    speciesCommon: 'Blue-Green Spirulina',
    status: 'Attention',
    biomass: 0.86,
    temperature: 28.4,
    ph: 8.4,
    dissolvedOxygen: 5.8,
    turbidity: 38,
    nitrogen: 4.1,
    volumeLiters: 45000,
    areaSqM: 2250,
    depthCm: 20,
    pondType: 'Open Raceway',
    description: 'Secondary raceway dedicated to Spirulina cultivation. Currently under nitrogen limitation watch — supplemental dosing scheduled.',
    lastHarvest: '2026-09-05',
    dailyGrowthRate: 9.8,
    co2InjectionRate: 0.6,
  },
  {
    id: 'p-3',
    name: 'Photobioreactor C',
    species: 'Scenedesmus obliquus',
    speciesCommon: 'Green Scenedesmus',
    status: 'Healthy',
    biomass: 0.81,
    temperature: 27.9,
    ph: 8.0,
    dissolvedOxygen: 7.5,
    turbidity: 34,
    nitrogen: 8.2,
    volumeLiters: 60000,
    areaSqM: 3000,
    depthCm: 20,
    pondType: 'Closed Tubular PBR',
    description: 'Enclosed photobioreactor system for high-purity Scenedesmus cultivation. Controlled environment with CO₂ enrichment for carbon sequestration research.',
    lastHarvest: '2026-09-10',
    dailyGrowthRate: 11.2,
    co2InjectionRate: 1.1,
  }
];

export interface FarmDetails {
  id: string;
  name: string;
  location: string;
  coordinates: { lat: number; lng: number };
  totalAreaSqM: number;
  elevation: string;
  climate: string;
  waterSource: string;
  operationalSince: string;
  certifications: string[];
  description: string;
  manager: string;
  annualCapacity: string;
  energySource: string;
}

export const DEMO_FARM: FarmDetails = {
  id: 'farm-1',
  name: 'GreenRiver Algae Facility',
  location: 'Imperial Valley, California',
  coordinates: { lat: 32.85, lng: -115.57 },
  totalAreaSqM: 12500,
  elevation: '−18 m (below sea level)',
  climate: 'Hot desert (BWh) — 340+ sunny days/year',
  waterSource: 'Colorado River canal (recycled)',
  operationalSince: '2024-03-15',
  certifications: ['ISO 14001', 'Verra VCS', 'ISCC PLUS'],
  description: 'A state-of-the-art algae cultivation facility leveraging the Imperial Valley\'s extreme solar irradiance for year-round microalgae production. The facility combines open raceway ponds with closed photobioreactor systems to maximize carbon capture and biomass yield.',
  manager: 'Dr. Sarah Chen',
  annualCapacity: '180 tonnes dry biomass',
  energySource: '100% on-site solar PV (2.4 MW)',
};
