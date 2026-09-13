
export interface FarmHarvestProfile {
  farmId: string;
  farmName: string;
  location: string;
  coordinates: { lat: number; lng: number };
  imageUrl: string;
  ponds: string[];
  defaultPond: string;
  areaHa: number;
  biomassDensity: number; // g/L
  densityTrend: string;
  harvestablePct: number;
  lastHarvestDate: string;
  annualCapacity: string;
  records: Array<{
    id: string;
    date: string;
    rawDate: string;
    pond: string;
    pondId: string;
    biomassKg: number;
    method: string;
    status: 'Completed' | 'Pending' | 'Cancelled' | 'Planned';
    carbonLink: 'Verified' | 'Pending' | 'Not Linked';
    operator: string;
    batchCode: string;
    notes?: string;
    fates?: {
      category: string;
      kg: number;
      pct: number;
      destination: string;
    }[];
  }>;
}

export interface FarmCalibrationProfile {
  farmId: string;
  farmName: string;
  location: string;
  imageUrl: string;
  ponds: string[];
  defaultPond: string;
  sensors: Array<{
    id: string;
    code: string;
    name: string;
    type: 'temperature' | 'ph' | 'dissolved_oxygen' | 'turbidity' | 'light';
    unit: string;
    pond: string;
    currentValue: number;
    formattedValue: string;
    range: string;
    status: 'Active' | 'Pending' | 'Overdue' | 'Alert';
    isOnline: boolean;
    lastCalibrated: string;
    nextDue: string;
    dueInDays: number;
    offset: number;
    gain: number;
    referenceStandard: string;
    mapX: number;
    mapY: number;
  }>;
}

export interface FarmCarbonLCAProfile {
  farmId: string;
  farmName: string;
  location: string;
  coordinates: { lat: number; lng: number };
  imageUrl: string;
  totalAreaHa: number;
  activePondCount: number;
  annualCapacity: string;
  energySource: string;
  manager: string;
  grossFixedKg: number;
  processingConversionDeductionKg: number;
  operationalElectricityKwh: number;
  gridEmissionFactor: number;
  endUseFate: string;
  retentionRate: number;
  carbonFraction: number;
  trendData: {
    '7D': { date: string; value: number }[];
    '30D': { date: string; value: number }[];
    '90D': { date: string; value: number }[];
    '1Y': { date: string; value: number }[];
  };
  pondAllocations: Array<{
    pondName: string;
    removalTonnes: number;
    status: string;
  }>;
}

export const FACILITY_HARVEST_PROFILES: Record<string, FarmHarvestProfile> = {
  'farm-1': {
    farmId: 'farm-1',
    farmName: 'Kutch Bio-Raceway Facility',
    location: 'Kutch, Gujarat, India',
    coordinates: { lat: 23.733, lng: 69.859 },
    imageUrl: '/images/farms/kutch.jpg',
    ponds: ['Pond Narmada', 'Pond Sabarmati', 'Pond Tapi', 'Pond Mahi'],
    defaultPond: 'Pond Narmada',
    areaHa: 18.5,
    biomassDensity: 52.88,
    densityTrend: '+2.3%',
    harvestablePct: 72,
    lastHarvestDate: 'Sep 10, 2026',
    annualCapacity: '240 tonnes dry biomass',
    records: [
      {
        id: 'HV-KUT-013',
        date: 'Sep 10, 2026',
        rawDate: '2026-09-10T10:24:00Z',
        pond: 'Pond Sabarmati',
        pondId: 'p-2',
        biomassKg: 980,
        method: 'Centrifuge',
        status: 'Completed',
        carbonLink: 'Verified',
        operator: 'Dharmesh V.',
        batchCode: 'ALGX-KUT-260910',
        notes: 'Optimal density achieved. Continuous centrifuge extraction with 96.2% dewatering yield.',
        fates: [
          { category: 'BIOPLASTICS', kg: 588, pct: 60, destination: 'Gujarat BioPolymers Ltd.' },
          { category: 'BIOCHAR', kg: 392, pct: 40, destination: 'Kutch Soil Carbon Sinks' }
        ]
      },
      {
        id: 'HV-KUT-012',
        date: 'Sep 05, 2026',
        rawDate: '2026-09-05T08:15:00Z',
        pond: 'Pond Narmada',
        pondId: 'p-1',
        biomassKg: 750,
        method: 'Filtration',
        status: 'Pending',
        carbonLink: 'Pending',
        operator: 'Vikram Mehta',
        batchCode: 'ALGX-KUT-260905',
        notes: 'Fine mesh membrane filtration batch. Awaiting laboratory moisture & ash verification.'
      },
      {
        id: 'HV-KUT-011',
        date: 'Aug 28, 2026',
        rawDate: '2026-08-28T14:40:00Z',
        pond: 'Pond Narmada',
        pondId: 'p-1',
        biomassKg: 1200,
        method: 'Dewatering',
        status: 'Completed',
        carbonLink: 'Verified',
        operator: 'Dharmesh V.',
        batchCode: 'ALGX-KUT-260828',
        notes: 'Large volume raceway skim. Full moisture removal verified with calibrated gravimetric scale.',
        fates: [
          { category: 'BIOCHAR', kg: 1200, pct: 100, destination: 'CarbonLock Pyrolysis Hub' }
        ]
      },
      {
        id: 'HV-KUT-010',
        date: 'Aug 20, 2026',
        rawDate: '2026-08-20T11:05:00Z',
        pond: 'Pond Tapi',
        pondId: 'p-3',
        biomassKg: 640,
        method: 'Centrifuge',
        status: 'Completed',
        carbonLink: 'Verified',
        operator: 'Dharmesh V.',
        batchCode: 'ALGX-KUT-260820',
        notes: 'Raceway C cycle flush. High lipid content fraction isolated for durable biopolymer synthesis.',
        fates: [
          { category: 'BIOPLASTICS', kg: 640, pct: 100, destination: 'BioStructural Materials India' }
        ]
      }
    ]
  },
  'farm-2': {
    farmId: 'farm-2',
    farmName: 'Rameswaram Coastal Algae Hub',
    location: 'Rameswaram, Tamil Nadu, India',
    coordinates: { lat: 9.287, lng: 79.312 },
    imageUrl: '/images/farms/rameswaram.jpg',
    ponds: ['Pond Kaveri', 'Pond Vaigai', 'Pond Palk Marine'],
    defaultPond: 'Pond Kaveri',
    areaHa: 14.2,
    biomassDensity: 48.50,
    densityTrend: '+3.1%',
    harvestablePct: 81,
    lastHarvestDate: 'Sep 09, 2026',
    annualCapacity: '190 tonnes dry biomass',
    records: [
      {
        id: 'HV-RAM-008',
        date: 'Sep 09, 2026',
        rawDate: '2026-09-09T09:30:00Z',
        pond: 'Pond Kaveri',
        pondId: 'p-5',
        biomassKg: 890,
        method: 'Flocculation + Centrifuge',
        status: 'Completed',
        carbonLink: 'Verified',
        operator: 'Dr. Anand Ramanathan',
        batchCode: 'ALGX-RAM-260909',
        notes: 'Marine high-salinity Chlorella harvest. Electro-flocculation pre-treatment yielded 98.4% recovery.',
        fates: [
          { category: 'BIOPLASTICS', kg: 623, pct: 70, destination: 'Tamil Nadu Marine Bio-resins' },
          { category: 'BIOCHAR', kg: 267, pct: 30, destination: 'Palk Strait Coastal Carbon Sinks' }
        ]
      },
      {
        id: 'HV-RAM-007',
        date: 'Sep 02, 2026',
        rawDate: '2026-09-02T11:15:00Z',
        pond: 'Pond Vaigai',
        pondId: 'p-vaigai',
        biomassKg: 620,
        method: 'Filtration',
        status: 'Completed',
        carbonLink: 'Verified',
        operator: 'K. Sundaram',
        batchCode: 'ALGX-RAM-260902',
        notes: 'Macro-mesh dewatering. Rapid solar tunnel drying completed under coastal breeze.',
        fates: [
          { category: 'BIOCHAR', kg: 620, pct: 100, destination: 'Rameswaram Biochar Facility' }
        ]
      },
      {
        id: 'HV-RAM-006',
        date: 'Aug 24, 2026',
        rawDate: '2026-08-24T15:00:00Z',
        pond: 'Pond Palk Marine',
        pondId: 'p-palk',
        biomassKg: 540,
        method: 'Centrifuge',
        status: 'Completed',
        carbonLink: 'Verified',
        operator: 'Dr. Anand Ramanathan',
        batchCode: 'ALGX-RAM-260824',
        notes: 'High mineral ash retention. Certified for marine biopolymer encapsulation.'
      }
    ]
  },
  'farm-3': {
    farmId: 'farm-3',
    farmName: 'Sambhar Salt Lake Bio-Culture Site',
    location: 'Sambhar Lake, Rajasthan, India',
    coordinates: { lat: 26.901, lng: 75.006 },
    imageUrl: '/images/farms/sambhar.jpg',
    ponds: ['Pond Sambhar North', 'Pond Sambhar East', 'Pond Thar Brine'],
    defaultPond: 'Pond Sambhar North',
    areaHa: 22.0,
    biomassDensity: 64.20,
    densityTrend: '+4.5%',
    harvestablePct: 88,
    lastHarvestDate: 'Sep 11, 2026',
    annualCapacity: '310 tonnes dry biomass',
    records: [
      {
        id: 'HV-SAM-015',
        date: 'Sep 11, 2026',
        rawDate: '2026-09-11T13:45:00Z',
        pond: 'Pond Sambhar North',
        pondId: 'p-sam-n',
        biomassKg: 1350,
        method: 'Rotary Vacuum Filter',
        status: 'Completed',
        carbonLink: 'Verified',
        operator: 'Vikramaditya Singh',
        batchCode: 'ALGX-SAM-260911',
        notes: 'High-saline Spirulina and Dunaliella cake. Rapid desiccation under 42°C ambient desert sun.',
        fates: [
          { category: 'BIOCHAR', kg: 945, pct: 70, destination: 'Rajasthan Soil Mineralization Corp' },
          { category: 'BIOPLASTICS', kg: 405, pct: 30, destination: 'Jaipur Eco-Polymers' }
        ]
      },
      {
        id: 'HV-SAM-014',
        date: 'Sep 03, 2026',
        rawDate: '2026-09-03T10:20:00Z',
        pond: 'Pond Sambhar East',
        pondId: 'p-sam-e',
        biomassKg: 1100,
        method: 'Centrifuge',
        status: 'Completed',
        carbonLink: 'Verified',
        operator: 'Rajendra Rathore',
        batchCode: 'ALGX-SAM-260903',
        notes: 'High alkalinity batch skim. Supernatant recycled back to brine concentration basin.'
      },
      {
        id: 'HV-SAM-013',
        date: 'Aug 26, 2026',
        rawDate: '2026-08-26T08:30:00Z',
        pond: 'Pond Thar Brine',
        pondId: 'p-thar',
        biomassKg: 850,
        method: 'Dewatering Screen',
        status: 'Completed',
        carbonLink: 'Verified',
        operator: 'Vikramaditya Singh',
        batchCode: 'ALGX-SAM-260826',
        notes: 'Pure halophilic culture harvest. Verified 54% elemental carbon fraction.'
      }
    ]
  },
  'farm-4': {
    farmId: 'farm-4',
    farmName: 'Kochi Blue-Carbon Marine Facility',
    location: 'Kochi, Kerala, India',
    coordinates: { lat: 9.931, lng: 76.267 },
    imageUrl: '/images/farms/kochi.jpg',
    ponds: ['Pond Godavari', 'Pond Vembanad PBR', 'Pond Malabar Marine'],
    defaultPond: 'Pond Godavari',
    areaHa: 11.8,
    biomassDensity: 58.10,
    densityTrend: '+1.9%',
    harvestablePct: 69,
    lastHarvestDate: 'Sep 12, 2026',
    annualCapacity: '160 tonnes dry biomass',
    records: [
      {
        id: 'HV-KOC-009',
        date: 'Sep 12, 2026',
        rawDate: '2026-09-12T07:15:00Z',
        pond: 'Pond Godavari',
        pondId: 'p-6',
        biomassKg: 780,
        method: 'Tubular Disc-Stack Centrifuge',
        status: 'Completed',
        carbonLink: 'Verified',
        operator: 'Meera Nair',
        batchCode: 'ALGX-KOC-260912',
        notes: 'High-purity Haematococcus and Scenedesmus extraction from closed tubular PBR loop.',
        fates: [
          { category: 'BIOPLASTICS', kg: 546, pct: 70, destination: 'Cochin Blue-Carbon Biomaterials' },
          { category: 'BIOCHAR', kg: 234, pct: 30, destination: 'Kerala Coastal Mangrove Biochar' }
        ]
      },
      {
        id: 'HV-KOC-008',
        date: 'Sep 04, 2026',
        rawDate: '2026-09-04T12:00:00Z',
        pond: 'Pond Vembanad PBR',
        pondId: 'p-vembanad',
        biomassKg: 610,
        method: 'Micro-Filtration',
        status: 'Completed',
        carbonLink: 'Verified',
        operator: 'Joseph Mathew',
        batchCode: 'ALGX-KOC-260904',
        notes: 'Low energy hollow-fiber membrane harvest. Clean water permeate discharged to estuary.'
      }
    ]
  },
  'farm-5': {
    farmId: 'farm-5',
    farmName: 'Chilika Lagoon Bio-Sequestration Hub',
    location: 'Chilika, Odisha, India',
    coordinates: { lat: 19.716, lng: 85.321 },
    imageUrl: '/images/farms/chilika.jpg',
    ponds: ['Pond Daya Basin', 'Pond Nalabana', 'Pond Chilika Brackish'],
    defaultPond: 'Pond Daya Basin',
    areaHa: 16.5,
    biomassDensity: 51.40,
    densityTrend: '+2.8%',
    harvestablePct: 76,
    lastHarvestDate: 'Sep 08, 2026',
    annualCapacity: '210 tonnes dry biomass',
    records: [
      {
        id: 'HV-CHI-011',
        date: 'Sep 08, 2026',
        rawDate: '2026-09-08T10:00:00Z',
        pond: 'Pond Daya Basin',
        pondId: 'p-daya',
        biomassKg: 920,
        method: 'Continuous Belt Filter',
        status: 'Completed',
        carbonLink: 'Verified',
        operator: 'Subhashree Patnaik',
        batchCode: 'ALGX-CHI-260908',
        notes: 'Brackish Chlorella harvest. Carbon credit provenance logged under Ramsar wetland guidelines.',
        fates: [
          { category: 'BIOPLASTICS', kg: 552, pct: 60, destination: 'Odisha Sustainable Polymers' },
          { category: 'BIOCHAR', kg: 368, pct: 40, destination: 'East Coast Soil Inoculants' }
        ]
      },
      {
        id: 'HV-CHI-010',
        date: 'Aug 31, 2026',
        rawDate: '2026-08-31T14:20:00Z',
        pond: 'Pond Nalabana',
        pondId: 'p-nalabana',
        biomassKg: 780,
        method: 'Centrifuge',
        status: 'Completed',
        carbonLink: 'Verified',
        operator: 'Subhashree Patnaik',
        batchCode: 'ALGX-CHI-260831',
        notes: 'High organic carbon purity. Heavy metals non-detectable via ICP-MS.'
      }
    ]
  },
  'farm-6': {
    farmId: 'farm-6',
    farmName: 'Bhavnagar Marine Algae Centre',
    location: 'Bhavnagar, Gujarat, India',
    coordinates: { lat: 21.764, lng: 72.151 },
    imageUrl: '/images/farms/bhavnagar.jpg',
    ponds: ['Pond Mahi', 'Pond Khambhat Marine', 'Pond Shetrunji'],
    defaultPond: 'Pond Mahi',
    areaHa: 13.9,
    biomassDensity: 46.90,
    densityTrend: '+2.0%',
    harvestablePct: 70,
    lastHarvestDate: 'Aug 30, 2026',
    annualCapacity: '175 tonnes dry biomass',
    records: [
      {
        id: 'HV-BHV-007',
        date: 'Aug 30, 2026',
        rawDate: '2026-08-30T09:15:00Z',
        pond: 'Pond Mahi',
        pondId: 'p-4',
        biomassKg: 720,
        method: 'Centrifuge',
        status: 'Completed',
        carbonLink: 'Verified',
        operator: 'Ketan Patel',
        batchCode: 'ALGX-BHV-260830',
        notes: 'High salinity Dunaliella beta-carotene strain. Dedicated bioplastic cross-linking agent extraction.',
        fates: [
          { category: 'BIOPLASTICS', kg: 504, pct: 70, destination: 'Saurashtra Biopolymers' },
          { category: 'BIOCHAR', kg: 216, pct: 30, destination: 'Gulf of Khambhat Carbon Sinks' }
        ]
      },
      {
        id: 'HV-BHV-006',
        date: 'Aug 22, 2026',
        rawDate: '2026-08-22T13:40:00Z',
        pond: 'Pond Khambhat Marine',
        pondId: 'p-khambhat',
        biomassKg: 650,
        method: 'Filtration',
        status: 'Completed',
        carbonLink: 'Verified',
        operator: 'Ketan Patel',
        batchCode: 'ALGX-BHV-260822',
        notes: 'Marine tidal channel intake raceway cycle. 100% moisture removal verified.'
      }
    ]
  }
};

export const FACILITY_CALIBRATION_PROFILES: Record<string, FarmCalibrationProfile> = {
  'farm-1': {
    farmId: 'farm-1',
    farmName: 'Kutch Bio-Raceway Facility',
    location: 'Kutch, Gujarat, India',
    imageUrl: '/images/farms/kutch.jpg',
    ponds: ['Pond Narmada', 'Pond Sabarmati', 'Pond Tapi', 'Pond Mahi'],
    defaultPond: 'Pond Narmada',
    sensors: [
      {
        id: 'TEMP-KUT-01',
        code: 'T-01',
        name: 'Temperature Sensor',
        type: 'temperature',
        unit: '°C',
        pond: 'Pond Narmada',
        currentValue: 28.4,
        formattedValue: '28.4 °C',
        range: '0 – 50 °C',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Sep 01, 2026',
        nextDue: 'Sep 10, 2026',
        dueInDays: 8,
        offset: 0.12,
        gain: 0.998,
        referenceStandard: 'NIST Calibrated Thermal Bath 25.0°C',
        mapX: 47,
        mapY: 52
      },
      {
        id: 'PH-KUT-02',
        code: 'PH-02',
        name: 'pH Optical Sensor',
        type: 'ph',
        unit: 'pH',
        pond: 'Pond Narmada',
        currentValue: 8.20,
        formattedValue: '8.20',
        range: '4 – 10 pH',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Aug 28, 2026',
        nextDue: 'Sep 10, 2026',
        dueInDays: 8,
        offset: -0.08,
        gain: 1.005,
        referenceStandard: 'NIST Buffer Solution pH 7.00 & 10.01',
        mapX: 28,
        mapY: 50
      },
      {
        id: 'DO-KUT-03',
        code: 'DO-03',
        name: 'Dissolved Oxygen Probe',
        type: 'dissolved_oxygen',
        unit: 'mg/L',
        pond: 'Pond Narmada',
        currentValue: 7.4,
        formattedValue: '7.4 mg/L',
        range: '0 – 20 mg/L',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Aug 30, 2026',
        nextDue: 'Sep 12, 2026',
        dueInDays: 10,
        offset: 0.05,
        gain: 1.012,
        referenceStandard: 'Air-Saturated Water Bath (100% DO Reference)',
        mapX: 74,
        mapY: 42
      },
      {
        id: 'TURB-KUT-04',
        code: 'TURB-04',
        name: 'Turbidity Sensor',
        type: 'turbidity',
        unit: 'NTU',
        pond: 'Pond Narmada',
        currentValue: 34.0,
        formattedValue: '34.0 NTU',
        range: '0 – 100 NTU',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Aug 25, 2026',
        nextDue: 'Sep 10, 2026',
        dueInDays: 8,
        offset: -0.30,
        gain: 0.995,
        referenceStandard: 'Formazin Turbidity Standard 40.0 NTU',
        mapX: 68,
        mapY: 68
      },
      {
        id: 'LIGHT-KUT-05',
        code: 'L-05',
        name: 'Solar PAR Irradiance Sensor',
        type: 'light',
        unit: 'μmol/m²/s',
        pond: 'Pond Narmada',
        currentValue: 1850,
        formattedValue: '1,850 μmol/m²/s',
        range: '0 – 2500 μmol/m²/s',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Aug 27, 2026',
        nextDue: 'Sep 10, 2026',
        dueInDays: 8,
        offset: 0.0,
        gain: 1.000,
        referenceStandard: 'Calibrated Quantum Flux Radiometer',
        mapX: 52,
        mapY: 33
      }
    ]
  },
  'farm-2': {
    farmId: 'farm-2',
    farmName: 'Rameswaram Coastal Algae Hub',
    location: 'Rameswaram, Tamil Nadu, India',
    imageUrl: '/images/farms/rameswaram.jpg',
    ponds: ['Pond Kaveri', 'Pond Vaigai', 'Pond Palk Marine'],
    defaultPond: 'Pond Kaveri',
    sensors: [
      {
        id: 'TEMP-RAM-01',
        code: 'T-01',
        name: 'Marine Water Temp',
        type: 'temperature',
        unit: '°C',
        pond: 'Pond Kaveri',
        currentValue: 27.8,
        formattedValue: '27.8 °C',
        range: '0 – 50 °C',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Sep 02, 2026',
        nextDue: 'Sep 15, 2026',
        dueInDays: 13,
        offset: 0.08,
        gain: 1.001,
        referenceStandard: 'NIST Thermal Standard 25.0°C',
        mapX: 45,
        mapY: 48
      },
      {
        id: 'PH-RAM-02',
        code: 'PH-02',
        name: 'Marine pH Probe',
        type: 'ph',
        unit: 'pH',
        pond: 'Pond Kaveri',
        currentValue: 8.10,
        formattedValue: '8.10',
        range: '4 – 10 pH',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Aug 29, 2026',
        nextDue: 'Sep 11, 2026',
        dueInDays: 9,
        offset: 0.02,
        gain: 1.003,
        referenceStandard: 'NIST Sea-water TRIS Buffer',
        mapX: 30,
        mapY: 52
      },
      {
        id: 'DO-RAM-03',
        code: 'DO-03',
        name: 'Coastal Dissolved Oxygen',
        type: 'dissolved_oxygen',
        unit: 'mg/L',
        pond: 'Pond Kaveri',
        currentValue: 7.6,
        formattedValue: '7.6 mg/L',
        range: '0 – 20 mg/L',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Sep 01, 2026',
        nextDue: 'Sep 14, 2026',
        dueInDays: 12,
        offset: -0.04,
        gain: 1.008,
        referenceStandard: 'Marine Air-Saturation Bath',
        mapX: 72,
        mapY: 40
      },
      {
        id: 'TURB-RAM-04',
        code: 'TURB-04',
        name: 'Optical Density Probe',
        type: 'turbidity',
        unit: 'NTU',
        pond: 'Pond Kaveri',
        currentValue: 36.0,
        formattedValue: '36.0 NTU',
        range: '0 – 100 NTU',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Aug 26, 2026',
        nextDue: 'Sep 09, 2026',
        dueInDays: 7,
        offset: 0.15,
        gain: 0.997,
        referenceStandard: 'Formazin Standard 40.0 NTU',
        mapX: 65,
        mapY: 65
      },
      {
        id: 'LIGHT-RAM-05',
        code: 'L-05',
        name: 'Coastal PAR Sensor',
        type: 'light',
        unit: 'μmol/m²/s',
        pond: 'Pond Kaveri',
        currentValue: 1720,
        formattedValue: '1,720 μmol/m²/s',
        range: '0 – 2500 μmol/m²/s',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Aug 30, 2026',
        nextDue: 'Sep 12, 2026',
        dueInDays: 10,
        offset: 0.0,
        gain: 1.000,
        referenceStandard: 'Quantum Radiometer Cal Standard',
        mapX: 55,
        mapY: 30
      }
    ]
  },
  'farm-3': {
    farmId: 'farm-3',
    farmName: 'Sambhar Salt Lake Bio-Culture Site',
    location: 'Sambhar Lake, Rajasthan, India',
    imageUrl: '/images/farms/sambhar.jpg',
    ponds: ['Pond Sambhar North', 'Pond Sambhar East', 'Pond Thar Brine'],
    defaultPond: 'Pond Sambhar North',
    sensors: [
      {
        id: 'TEMP-SAM-01',
        code: 'T-01',
        name: 'Desert Ambient/Pond Temp',
        type: 'temperature',
        unit: '°C',
        pond: 'Pond Sambhar North',
        currentValue: 31.2,
        formattedValue: '31.2 °C',
        range: '0 – 55 °C',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Sep 03, 2026',
        nextDue: 'Sep 16, 2026',
        dueInDays: 14,
        offset: 0.22,
        gain: 0.995,
        referenceStandard: 'High-Temp Precision Bath',
        mapX: 48,
        mapY: 50
      },
      {
        id: 'PH-SAM-02',
        code: 'PH-02',
        name: 'High-Alkalinity pH Electrode',
        type: 'ph',
        unit: 'pH',
        pond: 'Pond Sambhar North',
        currentValue: 9.40,
        formattedValue: '9.40',
        range: '6 – 12 pH',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Aug 31, 2026',
        nextDue: 'Sep 13, 2026',
        dueInDays: 11,
        offset: -0.12,
        gain: 1.010,
        referenceStandard: 'NIST Buffer pH 10.01 & 12.45',
        mapX: 32,
        mapY: 48
      },
      {
        id: 'DO-SAM-03',
        code: 'DO-03',
        name: 'Saline Dissolved Oxygen',
        type: 'dissolved_oxygen',
        unit: 'mg/L',
        pond: 'Pond Sambhar North',
        currentValue: 6.2,
        formattedValue: '6.2 mg/L',
        range: '0 – 20 mg/L',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Sep 02, 2026',
        nextDue: 'Sep 15, 2026',
        dueInDays: 13,
        offset: 0.08,
        gain: 1.015,
        referenceStandard: 'Hypersaline Zero & Span DO Standard',
        mapX: 70,
        mapY: 44
      },
      {
        id: 'TURB-SAM-04',
        code: 'TURB-04',
        name: 'Halophilic Turbidity',
        type: 'turbidity',
        unit: 'NTU',
        pond: 'Pond Sambhar North',
        currentValue: 48.0,
        formattedValue: '48.0 NTU',
        range: '0 – 100 NTU',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Aug 27, 2026',
        nextDue: 'Sep 10, 2026',
        dueInDays: 8,
        offset: -0.45,
        gain: 0.990,
        referenceStandard: 'Formazin 40.0 NTU Reference',
        mapX: 62,
        mapY: 66
      },
      {
        id: 'LIGHT-SAM-05',
        code: 'L-05',
        name: 'Desert High-Flux PAR',
        type: 'light',
        unit: 'μmol/m²/s',
        pond: 'Pond Sambhar North',
        currentValue: 1980,
        formattedValue: '1,980 μmol/m²/s',
        range: '0 – 2500 μmol/m²/s',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Sep 01, 2026',
        nextDue: 'Sep 14, 2026',
        dueInDays: 12,
        offset: 0.0,
        gain: 1.000,
        referenceStandard: 'High Solar Flux Radiometer',
        mapX: 50,
        mapY: 32
      }
    ]
  },
  'farm-4': {
    farmId: 'farm-4',
    farmName: 'Kochi Blue-Carbon Marine Facility',
    location: 'Kochi, Kerala, India',
    imageUrl: '/images/farms/kochi.jpg',
    ponds: ['Pond Godavari', 'Pond Vembanad PBR', 'Pond Malabar Marine'],
    defaultPond: 'Pond Godavari',
    sensors: [
      {
        id: 'TEMP-KOC-01',
        code: 'T-01',
        name: 'PBR Water Temperature',
        type: 'temperature',
        unit: '°C',
        pond: 'Pond Godavari',
        currentValue: 26.5,
        formattedValue: '26.5 °C',
        range: '0 – 50 °C',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Sep 04, 2026',
        nextDue: 'Sep 17, 2026',
        dueInDays: 15,
        offset: 0.05,
        gain: 0.999,
        referenceStandard: 'Precision RTD Pt100 Bath',
        mapX: 46,
        mapY: 50
      },
      {
        id: 'PH-KOC-02',
        code: 'PH-02',
        name: 'Digital pH Transducer',
        type: 'ph',
        unit: 'pH',
        pond: 'Pond Godavari',
        currentValue: 7.90,
        formattedValue: '7.90',
        range: '4 – 10 pH',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Sep 02, 2026',
        nextDue: 'Sep 15, 2026',
        dueInDays: 13,
        offset: -0.03,
        gain: 1.002,
        referenceStandard: 'NIST pH 7.00 & 9.21 Buffer',
        mapX: 30,
        mapY: 54
      },
      {
        id: 'DO-KOC-03',
        code: 'DO-03',
        name: 'Optical Luminescent DO',
        type: 'dissolved_oxygen',
        unit: 'mg/L',
        pond: 'Pond Godavari',
        currentValue: 8.0,
        formattedValue: '8.0 mg/L',
        range: '0 – 20 mg/L',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Sep 05, 2026',
        nextDue: 'Sep 18, 2026',
        dueInDays: 16,
        offset: 0.02,
        gain: 1.004,
        referenceStandard: 'Luminescent DO Calibration Cap',
        mapX: 74,
        mapY: 42
      },
      {
        id: 'TURB-KOC-04',
        code: 'TURB-04',
        name: 'Multi-Wavelength Turbidity',
        type: 'turbidity',
        unit: 'NTU',
        pond: 'Pond Godavari',
        currentValue: 28.0,
        formattedValue: '28.0 NTU',
        range: '0 – 100 NTU',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Aug 29, 2026',
        nextDue: 'Sep 12, 2026',
        dueInDays: 10,
        offset: -0.10,
        gain: 1.001,
        referenceStandard: 'Formazin 20.0 NTU Standard',
        mapX: 66,
        mapY: 64
      },
      {
        id: 'LIGHT-KOC-05',
        code: 'L-05',
        name: 'Tropical PBR Quantum Sensor',
        type: 'light',
        unit: 'μmol/m²/s',
        pond: 'Pond Godavari',
        currentValue: 1450,
        formattedValue: '1,450 μmol/m²/s',
        range: '0 – 2500 μmol/m²/s',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Aug 28, 2026',
        nextDue: 'Sep 11, 2026',
        dueInDays: 9,
        offset: 0.0,
        gain: 1.000,
        referenceStandard: 'Calibrated Quantum Flux Meter',
        mapX: 52,
        mapY: 34
      }
    ]
  },
  'farm-5': {
    farmId: 'farm-5',
    farmName: 'Chilika Lagoon Bio-Sequestration Hub',
    location: 'Chilika, Odisha, India',
    imageUrl: '/images/farms/chilika.jpg',
    ponds: ['Pond Daya Basin', 'Pond Nalabana', 'Pond Chilika Brackish'],
    defaultPond: 'Pond Daya Basin',
    sensors: [
      {
        id: 'TEMP-CHI-01',
        code: 'T-01',
        name: 'Lagoon Inflow Temp',
        type: 'temperature',
        unit: '°C',
        pond: 'Pond Daya Basin',
        currentValue: 28.0,
        formattedValue: '28.0 °C',
        range: '0 – 50 °C',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Sep 01, 2026',
        nextDue: 'Sep 14, 2026',
        dueInDays: 12,
        offset: 0.10,
        gain: 0.998,
        referenceStandard: 'NIST Thermal Bath Standard',
        mapX: 47,
        mapY: 51
      },
      {
        id: 'PH-CHI-02',
        code: 'PH-02',
        name: 'Brackish pH Sensor',
        type: 'ph',
        unit: 'pH',
        pond: 'Pond Daya Basin',
        currentValue: 8.00,
        formattedValue: '8.00',
        range: '4 – 10 pH',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Aug 30, 2026',
        nextDue: 'Sep 12, 2026',
        dueInDays: 10,
        offset: -0.05,
        gain: 1.004,
        referenceStandard: 'NIST Buffer pH 7.00 & 10.01',
        mapX: 29,
        mapY: 52
      },
      {
        id: 'DO-CHI-03',
        code: 'DO-03',
        name: 'Wetland DO Probe',
        type: 'dissolved_oxygen',
        unit: 'mg/L',
        pond: 'Pond Daya Basin',
        currentValue: 7.2,
        formattedValue: '7.2 mg/L',
        range: '0 – 20 mg/L',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Aug 28, 2026',
        nextDue: 'Sep 11, 2026',
        dueInDays: 9,
        offset: 0.04,
        gain: 1.009,
        referenceStandard: 'Air-Saturation Bath standard',
        mapX: 73,
        mapY: 43
      },
      {
        id: 'TURB-CHI-04',
        code: 'TURB-04',
        name: 'Estuarine Turbidity Sensor',
        type: 'turbidity',
        unit: 'NTU',
        pond: 'Pond Daya Basin',
        currentValue: 38.0,
        formattedValue: '38.0 NTU',
        range: '0 – 100 NTU',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Aug 26, 2026',
        nextDue: 'Sep 09, 2026',
        dueInDays: 7,
        offset: -0.20,
        gain: 0.996,
        referenceStandard: 'Formazin 40.0 NTU Standard',
        mapX: 67,
        mapY: 67
      },
      {
        id: 'LIGHT-CHI-05',
        code: 'L-05',
        name: 'Solar Flux Quantum Meter',
        type: 'light',
        unit: 'μmol/m²/s',
        pond: 'Pond Daya Basin',
        currentValue: 1620,
        formattedValue: '1,620 μmol/m²/s',
        range: '0 – 2500 μmol/m²/s',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Aug 29, 2026',
        nextDue: 'Sep 12, 2026',
        dueInDays: 10,
        offset: 0.0,
        gain: 1.000,
        referenceStandard: 'Quantum Radiometer Calibrated',
        mapX: 53,
        mapY: 33
      }
    ]
  },
  'farm-6': {
    farmId: 'farm-6',
    farmName: 'Bhavnagar Marine Algae Centre',
    location: 'Bhavnagar, Gujarat, India',
    imageUrl: '/images/farms/bhavnagar.jpg',
    ponds: ['Pond Mahi', 'Pond Khambhat Marine', 'Pond Shetrunji'],
    defaultPond: 'Pond Mahi',
    sensors: [
      {
        id: 'TEMP-BHV-01',
        code: 'T-01',
        name: 'Gulf Marine Temp Sensor',
        type: 'temperature',
        unit: '°C',
        pond: 'Pond Mahi',
        currentValue: 29.2,
        formattedValue: '29.2 °C',
        range: '0 – 50 °C',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Sep 02, 2026',
        nextDue: 'Sep 15, 2026',
        dueInDays: 13,
        offset: 0.11,
        gain: 0.999,
        referenceStandard: 'NIST Thermal Standard 25.0°C',
        mapX: 47,
        mapY: 51
      },
      {
        id: 'PH-BHV-02',
        code: 'PH-02',
        name: 'Tidal pH Electrode',
        type: 'ph',
        unit: 'pH',
        pond: 'Pond Mahi',
        currentValue: 8.30,
        formattedValue: '8.30',
        range: '4 – 10 pH',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Aug 29, 2026',
        nextDue: 'Sep 11, 2026',
        dueInDays: 9,
        offset: -0.06,
        gain: 1.003,
        referenceStandard: 'NIST Buffer pH 7.00 & 10.01',
        mapX: 28,
        mapY: 51
      },
      {
        id: 'DO-BHV-03',
        code: 'DO-03',
        name: 'Marine Dissolved Oxygen',
        type: 'dissolved_oxygen',
        unit: 'mg/L',
        pond: 'Pond Mahi',
        currentValue: 7.1,
        formattedValue: '7.1 mg/L',
        range: '0 – 20 mg/L',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Aug 27, 2026',
        nextDue: 'Sep 10, 2026',
        dueInDays: 8,
        offset: 0.03,
        gain: 1.011,
        referenceStandard: 'Marine Air-Saturation Bath',
        mapX: 74,
        mapY: 42
      },
      {
        id: 'TURB-BHV-04',
        code: 'TURB-04',
        name: 'Halotolerant Turbidity',
        type: 'turbidity',
        unit: 'NTU',
        pond: 'Pond Mahi',
        currentValue: 31.0,
        formattedValue: '31.0 NTU',
        range: '0 – 100 NTU',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Aug 25, 2026',
        nextDue: 'Sep 09, 2026',
        dueInDays: 7,
        offset: -0.25,
        gain: 0.998,
        referenceStandard: 'Formazin 40.0 NTU Reference',
        mapX: 68,
        mapY: 67
      },
      {
        id: 'LIGHT-BHV-05',
        code: 'L-05',
        name: 'Gulf Solar PAR Radiometer',
        type: 'light',
        unit: 'μmol/m²/s',
        pond: 'Pond Mahi',
        currentValue: 1780,
        formattedValue: '1,780 μmol/m²/s',
        range: '0 – 2500 μmol/m²/s',
        status: 'Active',
        isOnline: true,
        lastCalibrated: 'Aug 31, 2026',
        nextDue: 'Sep 14, 2026',
        dueInDays: 12,
        offset: 0.0,
        gain: 1.000,
        referenceStandard: 'Quantum PAR Flux Radiometer',
        mapX: 52,
        mapY: 33
      }
    ]
  }
};

export const FACILITY_CARBON_LCA_PROFILES: Record<string, FarmCarbonLCAProfile> = {
  'farm-1': {
    farmId: 'farm-1',
    farmName: 'Kutch Bio-Raceway Facility',
    location: 'Kutch, Gujarat, India',
    coordinates: { lat: 23.733, lng: 69.859 },
    imageUrl: '/images/farms/kutch.jpg',
    totalAreaHa: 18.5,
    activePondCount: 4,
    annualCapacity: '240 tonnes dry biomass',
    energySource: '100% On-site Solar PV (3.2 MW)',
    manager: 'Dharmesh V.',
    grossFixedKg: 2140,
    processingConversionDeductionKg: 860,
    operationalElectricityKwh: 120,
    gridEmissionFactor: 0.08, // Low solar emission factor
    endUseFate: 'Bioplastic (Durable)',
    retentionRate: 0.60,
    carbonFraction: 0.51,
    trendData: {
      '7D': [
        { date: 'Sep 06', value: 0.85 },
        { date: 'Sep 07', value: 0.90 },
        { date: 'Sep 08', value: 1.05 },
        { date: 'Sep 09', value: 1.12 },
        { date: 'Sep 10', value: 1.15 },
        { date: 'Sep 11', value: 1.48 },
        { date: 'Sep 12', value: 1.19 },
      ],
      '30D': [
        { date: 'Sep 01', value: 0.45 },
        { date: 'Sep 02', value: 0.58 },
        { date: 'Sep 03', value: 0.55 },
        { date: 'Sep 04', value: 0.62 },
        { date: 'Sep 05', value: 0.78 },
        { date: 'Sep 06', value: 0.80 },
        { date: 'Sep 07', value: 0.90 },
        { date: 'Sep 08', value: 1.05 },
        { date: 'Sep 09', value: 1.15 },
        { date: 'Sep 10', value: 1.15 },
        { date: 'Sep 11', value: 1.48 },
        { date: 'Sep 12', value: 1.19 },
      ],
      '90D': [
        { date: 'Jul 15', value: 0.35 },
        { date: 'Aug 01', value: 0.65 },
        { date: 'Aug 15', value: 0.92 },
        { date: 'Sep 01', value: 0.45 },
        { date: 'Sep 12', value: 1.19 },
      ],
      '1Y': [
        { date: 'Q4 2025', value: 0.30 },
        { date: 'Q1 2026', value: 0.68 },
        { date: 'Q2 2026', value: 0.95 },
        { date: 'Q3 2026', value: 1.19 },
      ],
    },
    pondAllocations: [
      { pondName: 'Pond Narmada', removalTonnes: 0.42, status: 'Healthy' },
      { pondName: 'Pond Sabarmati', removalTonnes: 0.51, status: 'Active' },
      { pondName: 'Pond Tapi', removalTonnes: 0.26, status: 'Healthy' }
    ]
  },
  'farm-2': {
    farmId: 'farm-2',
    farmName: 'Rameswaram Coastal Algae Hub',
    location: 'Rameswaram, Tamil Nadu, India',
    coordinates: { lat: 9.287, lng: 79.312 },
    imageUrl: '/images/farms/rameswaram.jpg',
    totalAreaHa: 14.2,
    activePondCount: 3,
    annualCapacity: '190 tonnes dry biomass',
    energySource: 'Coastal Wind & Hybrid Solar (2.8 MW)',
    manager: 'Dr. Anand Ramanathan',
    grossFixedKg: 1780,
    processingConversionDeductionKg: 640,
    operationalElectricityKwh: 95,
    gridEmissionFactor: 0.12,
    endUseFate: 'Marine Biopolymers (Durable)',
    retentionRate: 0.65,
    carbonFraction: 0.50,
    trendData: {
      '7D': [
        { date: 'Sep 06', value: 0.72 },
        { date: 'Sep 07', value: 0.81 },
        { date: 'Sep 08', value: 0.88 },
        { date: 'Sep 09', value: 0.96 },
        { date: 'Sep 10', value: 1.02 },
        { date: 'Sep 11', value: 1.18 },
        { date: 'Sep 12', value: 1.08 },
      ],
      '30D': [
        { date: 'Sep 01', value: 0.40 },
        { date: 'Sep 03', value: 0.52 },
        { date: 'Sep 06', value: 0.72 },
        { date: 'Sep 09', value: 0.96 },
        { date: 'Sep 12', value: 1.08 },
      ],
      '90D': [
        { date: 'Jul 15', value: 0.30 },
        { date: 'Aug 01', value: 0.58 },
        { date: 'Aug 15', value: 0.84 },
        { date: 'Sep 12', value: 1.08 },
      ],
      '1Y': [
        { date: 'Q4 2025', value: 0.25 },
        { date: 'Q1 2026', value: 0.60 },
        { date: 'Q2 2026', value: 0.85 },
        { date: 'Q3 2026', value: 1.08 },
      ],
    },
    pondAllocations: [
      { pondName: 'Pond Kaveri', removalTonnes: 0.58, status: 'Healthy' },
      { pondName: 'Pond Vaigai', removalTonnes: 0.32, status: 'Active' },
      { pondName: 'Pond Palk Marine', removalTonnes: 0.18, status: 'Healthy' }
    ]
  },
  'farm-3': {
    farmId: 'farm-3',
    farmName: 'Sambhar Salt Lake Bio-Culture Site',
    location: 'Sambhar Lake, Rajasthan, India',
    coordinates: { lat: 26.901, lng: 75.006 },
    imageUrl: '/images/farms/sambhar.jpg',
    totalAreaHa: 22.0,
    activePondCount: 3,
    annualCapacity: '310 tonnes dry biomass',
    energySource: 'Rooftop & Floating Solar PV (4.0 MW)',
    manager: 'Vikramaditya Singh',
    grossFixedKg: 2850,
    processingConversionDeductionKg: 920,
    operationalElectricityKwh: 85,
    gridEmissionFactor: 0.05,
    endUseFate: 'Biochar Soil Amendment (90% durable)',
    retentionRate: 0.85,
    carbonFraction: 0.54,
    trendData: {
      '7D': [
        { date: 'Sep 06', value: 1.10 },
        { date: 'Sep 07', value: 1.25 },
        { date: 'Sep 08', value: 1.40 },
        { date: 'Sep 09', value: 1.55 },
        { date: 'Sep 10', value: 1.62 },
        { date: 'Sep 11', value: 1.88 },
        { date: 'Sep 12', value: 1.76 },
      ],
      '30D': [
        { date: 'Sep 01', value: 0.65 },
        { date: 'Sep 03', value: 0.85 },
        { date: 'Sep 06', value: 1.10 },
        { date: 'Sep 09', value: 1.55 },
        { date: 'Sep 12', value: 1.76 },
      ],
      '90D': [
        { date: 'Jul 15', value: 0.50 },
        { date: 'Aug 01', value: 0.95 },
        { date: 'Aug 15', value: 1.35 },
        { date: 'Sep 12', value: 1.76 },
      ],
      '1Y': [
        { date: 'Q4 2025', value: 0.40 },
        { date: 'Q1 2026', value: 0.90 },
        { date: 'Q2 2026', value: 1.30 },
        { date: 'Q3 2026', value: 1.76 },
      ],
    },
    pondAllocations: [
      { pondName: 'Pond Sambhar North', removalTonnes: 0.85, status: 'Healthy' },
      { pondName: 'Pond Sambhar East', removalTonnes: 0.61, status: 'Healthy' },
      { pondName: 'Pond Thar Brine', removalTonnes: 0.30, status: 'Active' }
    ]
  },
  'farm-4': {
    farmId: 'farm-4',
    farmName: 'Kochi Blue-Carbon Marine Facility',
    location: 'Kochi, Kerala, India',
    coordinates: { lat: 9.931, lng: 76.267 },
    imageUrl: '/images/farms/kochi.jpg',
    totalAreaHa: 11.8,
    activePondCount: 3,
    annualCapacity: '160 tonnes dry biomass',
    energySource: 'Hydro-Solar Microgrid (1.8 MW)',
    manager: 'Meera Nair',
    grossFixedKg: 1420,
    processingConversionDeductionKg: 490,
    operationalElectricityKwh: 110,
    gridEmissionFactor: 0.10,
    endUseFate: 'Bioplastics & Durable Resin',
    retentionRate: 0.62,
    carbonFraction: 0.49,
    trendData: {
      '7D': [
        { date: 'Sep 06', value: 0.55 },
        { date: 'Sep 07', value: 0.62 },
        { date: 'Sep 08', value: 0.70 },
        { date: 'Sep 09', value: 0.76 },
        { date: 'Sep 10', value: 0.82 },
        { date: 'Sep 11', value: 0.94 },
        { date: 'Sep 12', value: 0.86 },
      ],
      '30D': [
        { date: 'Sep 01', value: 0.32 },
        { date: 'Sep 03', value: 0.45 },
        { date: 'Sep 06', value: 0.55 },
        { date: 'Sep 09', value: 0.76 },
        { date: 'Sep 12', value: 0.86 },
      ],
      '90D': [
        { date: 'Jul 15', value: 0.25 },
        { date: 'Aug 01', value: 0.48 },
        { date: 'Aug 15', value: 0.68 },
        { date: 'Sep 12', value: 0.86 },
      ],
      '1Y': [
        { date: 'Q4 2025', value: 0.20 },
        { date: 'Q1 2026', value: 0.50 },
        { date: 'Q2 2026', value: 0.70 },
        { date: 'Q3 2026', value: 0.86 },
      ],
    },
    pondAllocations: [
      { pondName: 'Pond Godavari', removalTonnes: 0.48, status: 'Healthy' },
      { pondName: 'Pond Vembanad PBR', removalTonnes: 0.26, status: 'Healthy' },
      { pondName: 'Pond Malabar Marine', removalTonnes: 0.12, status: 'Active' }
    ]
  },
  'farm-5': {
    farmId: 'farm-5',
    farmName: 'Chilika Lagoon Bio-Sequestration Hub',
    location: 'Chilika, Odisha, India',
    coordinates: { lat: 19.716, lng: 85.321 },
    imageUrl: '/images/farms/chilika.jpg',
    totalAreaHa: 16.5,
    activePondCount: 3,
    annualCapacity: '210 tonnes dry biomass',
    energySource: 'On-site Solar + Grid Backing (2.5 MW)',
    manager: 'Subhashree Patnaik',
    grossFixedKg: 1950,
    processingConversionDeductionKg: 710,
    operationalElectricityKwh: 125,
    gridEmissionFactor: 0.15,
    endUseFate: 'Bioplastics & Soil Sequestration',
    retentionRate: 0.58,
    carbonFraction: 0.51,
    trendData: {
      '7D': [
        { date: 'Sep 06', value: 0.78 },
        { date: 'Sep 07', value: 0.85 },
        { date: 'Sep 08', value: 0.94 },
        { date: 'Sep 09', value: 1.02 },
        { date: 'Sep 10', value: 1.08 },
        { date: 'Sep 11', value: 1.25 },
        { date: 'Sep 12', value: 1.14 },
      ],
      '30D': [
        { date: 'Sep 01', value: 0.42 },
        { date: 'Sep 03', value: 0.56 },
        { date: 'Sep 06', value: 0.78 },
        { date: 'Sep 09', value: 1.02 },
        { date: 'Sep 12', value: 1.14 },
      ],
      '90D': [
        { date: 'Jul 15', value: 0.32 },
        { date: 'Aug 01', value: 0.62 },
        { date: 'Aug 15', value: 0.88 },
        { date: 'Sep 12', value: 1.14 },
      ],
      '1Y': [
        { date: 'Q4 2025', value: 0.28 },
        { date: 'Q1 2026', value: 0.62 },
        { date: 'Q2 2026', value: 0.90 },
        { date: 'Q3 2026', value: 1.14 },
      ],
    },
    pondAllocations: [
      { pondName: 'Pond Daya Basin', removalTonnes: 0.55, status: 'Healthy' },
      { pondName: 'Pond Nalabana', removalTonnes: 0.42, status: 'Healthy' },
      { pondName: 'Pond Chilika Brackish', removalTonnes: 0.17, status: 'Active' }
    ]
  },
  'farm-6': {
    farmId: 'farm-6',
    farmName: 'Bhavnagar Marine Algae Centre',
    location: 'Bhavnagar, Gujarat, India',
    coordinates: { lat: 21.764, lng: 72.151 },
    imageUrl: '/images/farms/bhavnagar.jpg',
    totalAreaHa: 13.9,
    activePondCount: 3,
    annualCapacity: '175 tonnes dry biomass',
    energySource: 'Wind-Solar Hybrid (2.2 MW)',
    manager: 'Ketan Patel',
    grossFixedKg: 1600,
    processingConversionDeductionKg: 580,
    operationalElectricityKwh: 105,
    gridEmissionFactor: 0.10,
    endUseFate: 'Bioplastics & Durable Polymer',
    retentionRate: 0.60,
    carbonFraction: 0.50,
    trendData: {
      '7D': [
        { date: 'Sep 06', value: 0.62 },
        { date: 'Sep 07', value: 0.70 },
        { date: 'Sep 08', value: 0.78 },
        { date: 'Sep 09', value: 0.84 },
        { date: 'Sep 10', value: 0.90 },
        { date: 'Sep 11', value: 1.05 },
        { date: 'Sep 12', value: 0.95 },
      ],
      '30D': [
        { date: 'Sep 01', value: 0.35 },
        { date: 'Sep 03', value: 0.48 },
        { date: 'Sep 06', value: 0.62 },
        { date: 'Sep 09', value: 0.84 },
        { date: 'Sep 12', value: 0.95 },
      ],
      '90D': [
        { date: 'Jul 15', value: 0.28 },
        { date: 'Aug 01', value: 0.54 },
        { date: 'Aug 15', value: 0.74 },
        { date: 'Sep 12', value: 0.95 },
      ],
      '1Y': [
        { date: 'Q4 2025', value: 0.22 },
        { date: 'Q1 2026', value: 0.54 },
        { date: 'Q2 2026', value: 0.76 },
        { date: 'Q3 2026', value: 0.95 },
      ],
    },
    pondAllocations: [
      { pondName: 'Pond Mahi', removalTonnes: 0.46, status: 'Healthy' },
      { pondName: 'Pond Khambhat Marine', removalTonnes: 0.34, status: 'Healthy' },
      { pondName: 'Pond Shetrunji', removalTonnes: 0.15, status: 'Active' }
    ]
  }
};
