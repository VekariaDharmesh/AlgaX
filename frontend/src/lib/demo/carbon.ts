export interface CarbonAccounting {
  period: string;
  grossFixedKg: number;
  endUseRetainedKg: number;
  operationalFootprintKg: number;
  netRemovedKg: number;
}

export const DEMO_CARBON_ACCOUNTING: CarbonAccounting = {
  period: 'This Reporting Period',
  grossFixedKg: 2140,
  endUseRetainedKg: 1284,
  operationalFootprintKg: 96,
  netRemovedKg: 1188,
};
