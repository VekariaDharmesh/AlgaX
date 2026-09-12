export interface Pond {
  id: string;
  name: string;
  farmId: string;
  farmName: string;
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
  imageUrl: string;
}

export const DEMO_PONDS: Pond[] = [
  {
    id: 'p-1',
    name: 'Pond Narmada',
    farmId: 'farm-1',
    farmName: 'Kutch Bio-Raceway Facility',
    species: 'Chlorella vulgaris',
    speciesCommon: 'Green Microalgae',
    status: 'Healthy',
    biomass: 0.86,
    temperature: 28.4,
    ph: 8.2,
    dissolvedOxygen: 7.4,
    turbidity: 34,
    nitrogen: 8.8,
    volumeLiters: 120000,
    areaSqM: 3200,
    depthCm: 25,
    pondType: 'Open Raceway',
    description: 'Flagship high-yield raceway pond with paddle wheel circulation. Optimized for Chlorella vulgaris biomass production under Gujarat solar irradiance.',
    lastHarvest: '2026-09-10',
    dailyGrowthRate: 13.2,
    co2InjectionRate: 0.9,
    imageUrl: '/images/ponds/narmada.jpg',
  },
  {
    id: 'p-2',
    name: 'Pond Sabarmati',
    farmId: 'farm-1',
    farmName: 'Kutch Bio-Raceway Facility',
    species: 'Spirulina platensis',
    speciesCommon: 'Blue-Green Spirulina',
    status: 'Attention',
    biomass: 0.82,
    temperature: 28.8,
    ph: 8.5,
    dissolvedOxygen: 6.1,
    turbidity: 39,
    nitrogen: 4.3,
    volumeLiters: 95000,
    areaSqM: 2600,
    depthCm: 22,
    pondType: 'Open Raceway',
    description: 'High-alkalinity raceway dedicated to Spirulina cultivation. Supplemental nitrogen dosing active.',
    lastHarvest: '2026-09-06',
    dailyGrowthRate: 10.4,
    co2InjectionRate: 0.7,
    imageUrl: '/images/ponds/sabarmati.jpg',
  },
  {
    id: 'p-3',
    name: 'Pond Tapi',
    farmId: 'farm-6',
    farmName: 'Bhavnagar Marine Algae Centre',
    species: 'Scenedesmus obliquus',
    speciesCommon: 'Green Scenedesmus',
    status: 'Healthy',
    biomass: 0.88,
    temperature: 28.1,
    ph: 8.0,
    dissolvedOxygen: 7.8,
    turbidity: 35,
    nitrogen: 8.6,
    volumeLiters: 110000,
    areaSqM: 2900,
    depthCm: 25,
    pondType: 'Open Raceway',
    description: 'Enclosed photobioreactor system for high-purity Scenedesmus cultivation with direct flue-gas CO₂ injection.',
    lastHarvest: '2026-09-11',
    dailyGrowthRate: 12.0,
    co2InjectionRate: 1.2,
    imageUrl: '/images/ponds/tapi.jpg',
  },
  {
    id: 'p-4',
    name: 'Pond Mahi',
    farmId: 'farm-3',
    farmName: 'Sambhar Salt Lake Bio-Culture Site',
    species: 'Dunaliella salina',
    speciesCommon: 'Beta-Carotene Halotolerant Algae',
    status: 'Healthy',
    biomass: 0.79,
    temperature: 29.2,
    ph: 8.3,
    dissolvedOxygen: 7.1,
    turbidity: 31,
    nitrogen: 7.9,
    volumeLiters: 85000,
    areaSqM: 2200,
    depthCm: 20,
    pondType: 'High-Salinity Raceway',
    description: 'High-salinity pond utilizing natural brine concentrations for robust beta-carotene accumulation.',
    lastHarvest: '2026-08-30',
    dailyGrowthRate: 11.5,
    co2InjectionRate: 0.85,
    imageUrl: '/images/ponds/mahi.jpg',
  },
  {
    id: 'p-5',
    name: 'Pond Kaveri',
    farmId: 'farm-2',
    farmName: 'Rameswaram Coastal Algae Hub',
    species: 'Chlorella vulgaris',
    speciesCommon: 'High-Yield Lipid Strain',
    status: 'Healthy',
    biomass: 0.91,
    temperature: 27.8,
    ph: 8.1,
    dissolvedOxygen: 7.6,
    turbidity: 36,
    nitrogen: 8.9,
    volumeLiters: 150000,
    areaSqM: 3800,
    depthCm: 28,
    pondType: 'Precision Raceway',
    description: 'High-throughput raceway cultivation basin with integrated hydraulic recirculators and micro-bubble carbonation injectors.',
    lastHarvest: '2026-09-09',
    dailyGrowthRate: 14.1,
    co2InjectionRate: 1.1,
    imageUrl: '/images/ponds/kaveri.jpg',
  },
  {
    id: 'p-6',
    name: 'Pond Godavari',
    farmId: 'farm-4',
    farmName: 'Kochi Blue-Carbon Marine Facility',
    species: 'Haematococcus pluvialis',
    speciesCommon: 'High-Value Astaxanthin Strain',
    status: 'Healthy',
    biomass: 1.15,
    temperature: 26.5,
    ph: 7.9,
    dissolvedOxygen: 8.0,
    turbidity: 28,
    nitrogen: 9.2,
    volumeLiters: 100000,
    areaSqM: 2500,
    depthCm: 24,
    pondType: 'Photobioreactor (PBR)',
    description: 'Advanced closed photobioreactor array engineered for high-purity cultivation and maximum photosynthetic efficiency.',
    lastHarvest: '2026-09-12',
    dailyGrowthRate: 12.8,
    co2InjectionRate: 1.3,
    imageUrl: '/images/ponds/godavari.jpg',
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
  pondCount: number;
  imageUrl: string;
}

export const DEMO_FARMS: FarmDetails[] = [
  {
    id: 'farm-1',
    name: 'Kutch Bio-Raceway Facility',
    location: 'Kutch, Gujarat, India',
    coordinates: { lat: 23.733, lng: 69.859 },
    totalAreaSqM: 18500,
    elevation: '12 m AMSL',
    climate: 'Arid Coastal Basin — 345+ sunny days/year',
    waterSource: 'Gulf of Kutch seawater & brackish aquifers (recycled)',
    operationalSince: '2024-01-10',
    certifications: ['ISO 14001', 'Verra Carbon Standard', 'ISCC PLUS'],
    description: 'Flagship hypersaline and open raceway carbon sequestration hub leveraging Gujarat\'s high solar irradiance corridor for year-round microalgae biomass production.',
    manager: 'Dharmesh V.',
    annualCapacity: '240 tonnes dry biomass',
    energySource: '100% On-site Solar PV (3.2 MW)',
    pondCount: 4,
    imageUrl: '/images/farms/kutch.jpg',
  },
  {
    id: 'farm-2',
    name: 'Rameswaram Coastal Algae Hub',
    location: 'Rameswaram, Tamil Nadu, India',
    coordinates: { lat: 9.287, lng: 79.312 },
    totalAreaSqM: 14200,
    elevation: '5 m AMSL',
    climate: 'Tropical Marine — Year-round warm coastal ambient',
    waterSource: 'Palk Strait Marine Intake',
    operationalSince: '2024-05-18',
    certifications: ['Blue Carbon Protocol', 'ISO 14064-2'],
    description: 'Coastal macro and microalgae carbon sequestration pilot facility capturing atmospheric CO₂ into durable biopolymer feedstocks.',
    manager: 'Dr. Anand Ramanathan',
    annualCapacity: '190 tonnes dry biomass',
    energySource: 'Coastal Wind & Hybrid Solar (2.8 MW)',
    pondCount: 3,
    imageUrl: '/images/farms/rameswaram.jpg',
  },
  {
    id: 'farm-3',
    name: 'Sambhar Salt Lake Bio-Culture Site',
    location: 'Sambhar Lake, Rajasthan, India',
    coordinates: { lat: 26.901, lng: 75.006 },
    totalAreaSqM: 22000,
    elevation: '360 m AMSL',
    climate: 'Semi-Arid Salt Playa — Extreme solar radiation',
    waterSource: 'Natural Inland Hyper-Saline Brine Basin',
    operationalSince: '2024-08-01',
    certifications: ['Gold Standard CER', 'ISO 9001'],
    description: 'Natural inland saline basin optimized for halophilic microalgae cultivation, maximizing permanent biochar and mineralized carbon credits.',
    manager: 'Vikramaditya Singh',
    annualCapacity: '310 tonnes dry biomass',
    energySource: 'Rooftop & Floating Solar PV (4.0 MW)',
    pondCount: 3,
    imageUrl: '/images/farms/sambhar.jpg',
  },
  {
    id: 'farm-4',
    name: 'Kochi Blue-Carbon Marine Facility',
    location: 'Kochi, Kerala, India',
    coordinates: { lat: 9.931, lng: 76.267 },
    totalAreaSqM: 11800,
    elevation: '3 m AMSL',
    climate: 'Tropical Coastal Monsoon Corridor',
    waterSource: 'Vembanad Estuary & Arabian Sea Mixed Feed',
    operationalSince: '2024-11-20',
    certifications: ['Marine Stewardship MRV', 'ISO 14001'],
    description: 'Estuarine closed photobioreactor and raceway hub integrated with coastal aquaculture for net-negative carbon removal.',
    manager: 'Meera Nair',
    annualCapacity: '160 tonnes dry biomass',
    energySource: 'Hydro-Solar Microgrid (1.8 MW)',
    pondCount: 3,
    imageUrl: '/images/farms/kochi.jpg',
  },
  {
    id: 'farm-5',
    name: 'Chilika Lagoon Bio-Sequestration Hub',
    location: 'Chilika, Odisha, India',
    coordinates: { lat: 19.716, lng: 85.321 },
    totalAreaSqM: 16500,
    elevation: '2 m AMSL',
    climate: 'Coastal Brackish Wetland',
    waterSource: 'Chilika Brackish Water Inflow',
    operationalSince: '2025-02-14',
    certifications: ['Ramsar Wetland MRV Guidelines', 'Verra VCS'],
    description: 'Brackish water microalgae bio-sequestration research and commercial MRV carbon sink operating under strict ecological safeguards.',
    manager: 'Subhashree Patnaik',
    annualCapacity: '210 tonnes dry biomass',
    energySource: 'On-site Solar + Grid Backing (2.5 MW)',
    pondCount: 3,
    imageUrl: '/images/farms/chilika.jpg',
  },
  {
    id: 'farm-6',
    name: 'Bhavnagar Marine Algae Centre',
    location: 'Bhavnagar, Gujarat, India',
    coordinates: { lat: 21.764, lng: 72.151 },
    totalAreaSqM: 13900,
    elevation: '11 m AMSL',
    climate: 'Gulf of Khambhat Semi-Arid Marine',
    waterSource: 'Gulf Marine Tidal Channel (Filtered)',
    operationalSince: '2025-04-05',
    certifications: ['ISO 14064-2', 'ISCC PLUS'],
    description: 'Commercial Chlorella and Spirulina biomass production facility for industrial bioplastic feedstocks and durable carbon locking.',
    manager: 'Ketan Patel',
    annualCapacity: '175 tonnes dry biomass',
    energySource: 'Wind-Solar Hybrid (2.2 MW)',
    pondCount: 3,
    imageUrl: '/images/farms/bhavnagar.jpg',
  }
];

export const DEMO_FARM = DEMO_FARMS[0];
