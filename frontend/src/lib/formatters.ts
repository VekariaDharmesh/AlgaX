/**
 * Formats CO2 values (given in kg CO2e) into readable human units (kg, t, kt, Mt).
 */
export function formatCo2(kg: number | null | undefined): { value: string; unit: string; fullFormatted: string } {
  if (kg === null || kg === undefined || isNaN(kg)) {
    return { value: '-', unit: 'kg CO₂e', fullFormatted: '- kg CO₂e' };
  }

  const absKg = Math.abs(kg);

  if (absKg >= 1_000_000_000) {
    const mt = kg / 1_000_000_000;
    const val = mt.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    return { value: val, unit: 'Mt CO₂e', fullFormatted: `${val} Mt CO₂e` };
  }

  if (absKg >= 1_000_000) {
    const kt = kg / 1_000_000;
    const val = kt.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    return { value: val, unit: 'kt CO₂e', fullFormatted: `${val} kt CO₂e` };
  }

  if (absKg >= 1_000) {
    const t = kg / 1_000;
    const val = t.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    return { value: val, unit: 't CO₂e', fullFormatted: `${val} t CO₂e` };
  }

  const val = kg.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return { value: val, unit: 'kg CO₂e', fullFormatted: `${val} kg CO₂e` };
}

/**
 * Formats Biomass concentration (g/L) cleanly into appropriate units.
 */
export function formatBiomass(gPerL: number | null | undefined): { value: string; unit: string; fullFormatted: string } {
  if (gPerL === null || gPerL === undefined || isNaN(gPerL)) {
    return { value: '-', unit: 'g/L', fullFormatted: '- g/L' };
  }

  const absVal = Math.abs(gPerL);

  if (absVal >= 1_000_000) {
    const val = (gPerL / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    return { value: val, unit: 'kg/L', fullFormatted: `${val} kg/L` };
  }

  if (absVal >= 1_000) {
    const val = (gPerL / 1_000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    return { value: val, unit: 'kg/m³', fullFormatted: `${val} kg/m³` };
  }

  const val = gPerL.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  return { value: val, unit: 'g/L', fullFormatted: `${val} g/L` };
}
