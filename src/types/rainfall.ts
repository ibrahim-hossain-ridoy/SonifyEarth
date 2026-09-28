export interface HistoricalEventContext {
  year: number;
  title: string;
  period: string;
  context: string;
  source: string;
  url: string;
  note: string;
}

export interface YearProfile {
  year: number;
  coverage: string;
  days_available: number;
  annual_total_mm: number;
  mean_daily_mm: number;
  max_daily_mm: number;
  peak_date: string;
  peak_bmd_reference_category: string;
  heavy_days: number;
  very_heavy_days: number;
  annual_anomaly_mm: number;
  annual_anomaly_z: number | null;
  annual_anomaly_basis: string;
  peak_day_anomaly_mm: number | null;
  peak_day_anomaly_z: number | null;
  peak_day_reference_percentile: number | null;
  peak_3d_mm: number;
  peak_7d_mm: number;
  peak_30d_mm: number;
  historical_event_context: HistoricalEventContext[];
}

export interface CommonPeriodProfile2026 {
  year: number;
  period_total_mm: number;
  days: number;
}

export interface YearProfilesData {
  dataset: string;
  source_collection: string;
  baseline_years: string;
  "2026_coverage_end": string;
  baseline_annual_total_mm: number;
  baseline_annual_std_total_mm: number;
  baseline_annual_mean_daily_mm: number;
  baseline_annual_std_mean_daily_mm: number;
  "2026_common_period_baseline_total_mm": number;
  "2026_common_period_baseline_std_total_mm": number;
  "2026_common_period_total_mm": number;
  "2026_common_period_mean_daily_mm": number;
  profiles: YearProfile[];
  common_period_profiles_2026: CommonPeriodProfile2026[];
  coverageEnd?: string;
}

export interface DailyRainfallRecord {
  date: string;
  year: number;
  month: number;
  day: number;
  doy: number;
  rain_mm_day: number;
  bmd_reference_category: string;
  rolling_3d_mm: number | null;
  rolling_7d_mm: number | null;
  rolling_30d_mm: number | null;
  ytd_mm: number;
  baseline_mean_mm_day: number;
  baseline_std_mm_day: number;
  anomaly_mm_day: number;
  anomaly_z: number | null;
  reference_percentile: number;
  prev_year_same_date_mm_day?: number | null;
  delta_vs_previous_year_mm_day?: number | null;
  audio_norm_0_1: number;
  audio_frequency_hz: number;
}

export type CityRainData = Record<string, Record<string, number>>;

export interface CityMetadata {
  id: string;
  name: string;
  bengaliName: string;
  lat: number;
  lon: number;
  division: string;
  avgRainfallMmDay: number;
  audioFile: string;
  years: Record<string, number>;
}

export interface DataPassportData {
  schema_version: string;
  package: string;
  national_dataset: {
    dataset: string;
    variable: string;
    unit: string;
    region: string;
    source: string;
    source_url: string;
    temporal_coverage: string;
    annual_values: string;
    "2026_note": string;
  };
  city_dataset: {
    file: string;
    cities: string[];
    temporal_coverage: string;
    unit: string;
    provenance: string;
  };
  frequency_mapping: {
    rule: string;
    formula_hz: string;
    min_rainfall_mm_day: number;
    max_rainfall_mm_day: number;
    min_hz: number;
    max_hz: number;
    mapping_type: string;
  };
  audio_assets: {
    national: {
      folder: string;
      file_pattern: string;
      count: number;
      coverage: string;
      duration_seconds: number;
      format: string;
      synthesis: string;
    };
    city: {
      folder: string;
      file_pattern: string;
      count: number;
      coverage: string;
      duration_seconds: number;
      format: string;
      synthesis: string;
    };
  };
  interpretation_limits: string[];
}

export interface HistoricalEventSource {
  publisher: string;
  title: string;
  url: string;
}

export interface HistoricalEvent {
  id: string;
  year: number;
  label: string;
  period?: string;
  hazards: string[];
  context: string;
  sources: HistoricalEventSource[];
}

export interface RiskRuleClass {
  id: string;
  label: string;
  minMm: number;
  minInclusive: boolean;
  maxMm: number | null;
  maxInclusive: boolean;
  floodLandslideText: string;
}

export interface RiskRulesData {
  schema_version: string;
  name: string;
  input: {
    field: string;
    unit: string;
    meaning: string;
  };
  classes: RiskRuleClass[];
  boundary_summary: string;
  disclaimer: string;
}

export interface ComparisonResult {
  scope: 'national' | 'city';
  placeA: string;
  placeB: string;
  yearA: number;
  yearB: number;
  valueA: number; // mm or mm/day
  valueB: number;
  delta: number; // valueB - valueA
  percentChange: number | null;
  unit: string;
  direction: 'up' | 'down' | 'flat';
  basis: string;
  is2026Comparison: boolean;
  deltaDuration: number;
  deltaMagnitude: number;
  startHz: number;
  endHz: number;
}

export interface CreativeSettings {
  timbre: 'sine' | 'triangle' | 'square' | 'sawtooth';
  baseHz: number;
  pan: number; // -1 to 1
  speed: number; // 0.5x to 2x
  gain: number; // volume 0 to 1
  preset?: 'natural_rain' | 'granular_drops' | 'scientific_calibrated';
  rainNoiseLevel?: number; // 0 to 1
}

export const SCIENTIFIC_DEFAULT_CREATIVE: CreativeSettings = Object.freeze({
  timbre: 'sine',
  baseHz: 440,
  pan: 0,
  speed: 1.0,
  gain: 0.15,
  preset: 'scientific_calibrated',
  rainNoiseLevel: 0.25,
});
