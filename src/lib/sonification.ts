export const MIN_SONIFICATION_HZ = 220;
export const MAX_SONIFICATION_HZ = 880;
export const NATIONAL_TOTAL_NORMALIZATION_MM = 5000;
export const DAILY_RATE_NORMALIZATION_MM_DAY = 20;

export function rainfallToFrequencyHz(rainfallMm: number, normalizationMaximumMm: number): number {
  if (!Number.isFinite(rainfallMm) || rainfallMm < 0) {
    throw new RangeError('Rainfall must be a finite, non-negative value.');
  }
  if (!Number.isFinite(normalizationMaximumMm) || normalizationMaximumMm <= 0) {
    throw new RangeError('Rainfall normalization maximum must be a positive finite value.');
  }

  const normalized = Math.min(1, rainfallMm / normalizationMaximumMm);
  return MIN_SONIFICATION_HZ * Math.pow(MAX_SONIFICATION_HZ / MIN_SONIFICATION_HZ, normalized);
}
