import {
  YearProfilesData,
  YearProfile,
  DailyRainfallRecord,
  CityRainData,
  CityMetadata,
  DataPassportData,
  HistoricalEvent,
  RiskRulesData,
  ComparisonResult,
} from '../types/rainfall';
import {
  DAILY_RATE_NORMALIZATION_MM_DAY,
  NATIONAL_TOTAL_NORMALIZATION_MM,
  rainfallToFrequencyHz,
} from './sonification';

// Division coordinates and metadata for Bangladesh's 8 supported divisional cities
export const CITIES_METADATA: CityMetadata[] = [
  {
    id: 'Dhaka',
    name: 'Dhaka',
    bengaliName: 'ঢাকা',
    lat: 23.8103,
    lon: 90.4125,
    division: 'Dhaka',
    avgRainfallMmDay: 6.37,
    audioFile: '/audio/city/rainfall_city_Dhaka.wav',
    years: {},
  },
  {
    id: 'Chittagong',
    name: 'Chittagong',
    bengaliName: 'চট্টগ্রাম',
    lat: 22.3569,
    lon: 91.7832,
    division: 'Chattogram',
    avgRainfallMmDay: 9.68,
    audioFile: '/audio/city/rainfall_city_Chittagong.wav',
    years: {},
  },
  {
    id: 'Sylhet',
    name: 'Sylhet',
    bengaliName: 'সিলেট',
    lat: 24.8949,
    lon: 91.8687,
    division: 'Sylhet',
    avgRainfallMmDay: 11.95,
    audioFile: '/audio/city/rainfall_city_Sylhet.wav',
    years: {},
  },
  {
    id: 'Rajshahi',
    name: 'Rajshahi',
    bengaliName: 'রাজশাহী',
    lat: 24.3745,
    lon: 88.6042,
    division: 'Rajshahi',
    avgRainfallMmDay: 3.97,
    audioFile: '/audio/city/rainfall_city_Rajshahi.wav',
    years: {},
  },
  {
    id: 'Khulna',
    name: 'Khulna',
    bengaliName: 'খুলনা',
    lat: 22.8456,
    lon: 89.5403,
    division: 'Khulna',
    avgRainfallMmDay: 5.37,
    audioFile: '/audio/city/rainfall_city_Khulna.wav',
    years: {},
  },
  {
    id: 'Barisal',
    name: 'Barisal',
    bengaliName: 'বরিশাল',
    lat: 22.7010,
    lon: 90.3535,
    division: 'Barishal',
    avgRainfallMmDay: 8.94,
    audioFile: '/audio/city/rainfall_city_Barisal.wav',
    years: {},
  },
  {
    id: 'Rangpur',
    name: 'Rangpur',
    bengaliName: 'রংপুর',
    lat: 25.7439,
    lon: 89.2752,
    division: 'Rangpur',
    avgRainfallMmDay: 5.73,
    audioFile: '/audio/city/rainfall_city_Rangpur.wav',
    years: {},
  },
  {
    id: 'Mymensingh',
    name: 'Mymensingh',
    bengaliName: 'ময়মনসিংহ',
    lat: 24.7471,
    lon: 90.4203,
    division: 'Mymensingh',
    avgRainfallMmDay: 8.35,
    audioFile: '/audio/city/rainfall_city_Mymensingh.wav',
    years: {},
  },
];

// In-memory cache for data
let cachedProfiles: YearProfilesData | null = null;
let cachedNationalYearly: Record<string, number> | null = null;
let cachedCityData: CityRainData | null = null;
let cachedPassport: DataPassportData | null = null;
let cachedEvents: HistoricalEvent[] | null = null;
let cachedRiskRules: RiskRulesData | null = null;
let cachedDailyRecords: DailyRainfallRecord[] | null = null;

// Safe fetch with fallback NaN sanitizer
async function fetchSafeJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const text = await res.text();
  // Protect against any literal NaN values in responses
  const sanitized = text.replace(/:\s*NaN\b/g, ': null');
  return JSON.parse(sanitized) as T;
}

export async function loadCoreData() {
  if (cachedProfiles && cachedCityData && cachedPassport && cachedEvents && cachedRiskRules) {
    return {
      profiles: cachedProfiles,
      cityData: cachedCityData,
      passport: cachedPassport,
      events: cachedEvents,
      riskRules: cachedRiskRules,
      nationalYearly: cachedNationalYearly,
      cities: CITIES_METADATA,
    };
  }

  const [profilesRes, cityRes, passportRes, eventsRes, riskRes, nationalRes] = await Promise.all([
    fetchSafeJson<YearProfilesData>('/data/year_profiles.json'),
    fetchSafeJson<CityRainData>('/data/bangladesh_rain_data.json'),
    fetchSafeJson<DataPassportData>('/data/data_passport.json'),
    fetchSafeJson<{ events: HistoricalEvent[] }>('/data/historical_events.json'),
    fetchSafeJson<RiskRulesData>('/data/risk_rules.json'),
    fetchSafeJson<{ years: Record<string, number> }>('/data/rainfall_bd_yearly.json'),
  ]);

  cachedProfiles = profilesRes;
  cachedCityData = cityRes;
  cachedPassport = passportRes;
  cachedEvents = eventsRes.events || [];
  cachedRiskRules = riskRes;
  cachedNationalYearly = nationalRes.years || {};

  // Enrich city metadata with actual values from bangladesh_rain_data.json
  CITIES_METADATA.forEach((c) => {
    if (cachedCityData && cachedCityData[c.id]) {
      c.years = cachedCityData[c.id];
      const vals = Object.values(c.years).filter((v) => typeof v === 'number' && Number.isFinite(v));
      if (vals.length > 0) {
        c.avgRainfallMmDay = Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
      }
    }
  });

  return {
    profiles: cachedProfiles,
    cityData: cachedCityData,
    passport: cachedPassport,
    events: cachedEvents,
    riskRules: cachedRiskRules,
    nationalYearly: cachedNationalYearly,
    cities: CITIES_METADATA,
  };
}

export async function loadDailyRecords(): Promise<DailyRainfallRecord[]> {
  if (cachedDailyRecords) return cachedDailyRecords;
  const rawList = await fetchSafeJson<Array<Record<string, unknown>>>('/data/daily_rainfall_2005_2026.json');
  
  cachedDailyRecords = rawList.map((r): DailyRainfallRecord => {
    const rain = typeof r.rain_mm_day === 'number' && Number.isFinite(r.rain_mm_day) ? r.rain_mm_day : 0;
    const ytd = typeof r.ytd_mm === 'number' && Number.isFinite(r.ytd_mm) ? r.ytd_mm : 0;
    const baseMean = typeof r.baseline_mean_mm_day === 'number' && Number.isFinite(r.baseline_mean_mm_day) ? r.baseline_mean_mm_day : 0;
    const baseStd = typeof r.baseline_std_mm_day === 'number' && Number.isFinite(r.baseline_std_mm_day) ? r.baseline_std_mm_day : 0;
    const anom = typeof r.anomaly_mm_day === 'number' && Number.isFinite(r.anomaly_mm_day) ? r.anomaly_mm_day : 0;
    const anomZ = typeof r.anomaly_z === 'number' && Number.isFinite(r.anomaly_z) ? r.anomaly_z : null;
    const norm = typeof r.audio_norm_0_1 === 'number' && Number.isFinite(r.audio_norm_0_1) ? r.audio_norm_0_1 : Math.min(1, Math.max(0, rain / 100));
    const freq = typeof r.audio_frequency_hz === 'number' && Number.isFinite(r.audio_frequency_hz) ? r.audio_frequency_hz : 220 * Math.pow(880 / 220, norm);

    return {
      date: String(r.date || ''),
      year: Number(r.year) || 2005,
      month: Number(r.month) || 1,
      day: Number(r.day) || 1,
      doy: Number(r.doy) || 1,
      rain_mm_day: rain,
      bmd_reference_category: String(r.bmd_reference_category || 'No/trace (<1 mm/day)'),
      rolling_3d_mm: typeof r.rolling_3d_mm === 'number' && Number.isFinite(r.rolling_3d_mm) ? r.rolling_3d_mm : null,
      rolling_7d_mm: typeof r.rolling_7d_mm === 'number' && Number.isFinite(r.rolling_7d_mm) ? r.rolling_7d_mm : null,
      rolling_30d_mm: typeof r.rolling_30d_mm === 'number' && Number.isFinite(r.rolling_30d_mm) ? r.rolling_30d_mm : null,
      ytd_mm: ytd,
      baseline_mean_mm_day: baseMean,
      baseline_std_mm_day: baseStd,
      anomaly_mm_day: anom,
      anomaly_z: anomZ,
      reference_percentile: typeof r.reference_percentile === 'number' && Number.isFinite(r.reference_percentile) ? r.reference_percentile : 0,
      audio_norm_0_1: norm,
      audio_frequency_hz: freq,
    };
  });

  return cachedDailyRecords;
}

export function getDailyRecordsForYear(records: DailyRainfallRecord[], year: number): DailyRainfallRecord[] {
  return records.filter((r) => r.year === year);
}

export function getYearProfile(data: YearProfilesData, year: number): YearProfile | undefined {
  return data.profiles.find((p) => p.year === year);
}

export function compareNationalYears(
  yearA: number,
  yearB: number,
  profilesData: YearProfilesData
): ComparisonResult {
  const is2026Comparison = yearA === 2026 || yearB === 2026;

  let valueA: number;
  let valueB: number;
  let basis: string;

  if (is2026Comparison) {
    // Both must use the common period: Jan 1 through Sep 24!
    const cpMap = new Map<number, number>();
    profilesData.common_period_profiles_2026.forEach((cp) => cpMap.set(cp.year, cp.period_total_mm));
    // 2026 common period total:
    cpMap.set(2026, profilesData['2026_common_period_total_mm']);

    valueA = cpMap.get(yearA) ?? 0;
    valueB = cpMap.get(yearB) ?? 0;
    basis = 'Jan 1 – Sep 24 common period (mm total)';
  } else {
    // Full calendar year totals
    const pA = getYearProfile(profilesData, yearA);
    const pB = getYearProfile(profilesData, yearB);
    valueA = pA ? pA.annual_total_mm : 0;
    valueB = pB ? pB.annual_total_mm : 0;
    basis = 'Full calendar year (mm total)';
  }

  const delta = valueB - valueA;
  const percentChange = valueA !== 0 ? (delta / valueA) * 100 : null;
  const direction: 'up' | 'down' | 'flat' = delta > 0.05 ? 'up' : delta < -0.05 ? 'down' : 'flat';

  const deltaMagnitude = Math.min(1, Math.abs(delta) / NATIONAL_TOTAL_NORMALIZATION_MM);
  const deltaDuration = Number((1.4 + 1.6 * deltaMagnitude).toFixed(2));
  const startHz = rainfallToFrequencyHz(valueA, NATIONAL_TOTAL_NORMALIZATION_MM);
  const endHz = rainfallToFrequencyHz(valueB, NATIONAL_TOTAL_NORMALIZATION_MM);

  return {
    scope: 'national',
    placeA: 'Bangladesh',
    placeB: 'Bangladesh',
    yearA,
    yearB,
    valueA,
    valueB,
    delta,
    percentChange: percentChange !== null ? Number(percentChange.toFixed(1)) : null,
    unit: 'mm',
    direction,
    basis,
    is2026Comparison,
    deltaDuration,
    deltaMagnitude,
    startHz,
    endHz,
  };
}

export function compareCities(
  cityA: string,
  yearA: number,
  cityB: string,
  yearB: number,
  cityData: CityRainData
): ComparisonResult {
  const valA = cityData[cityA]?.[String(yearA)] ?? 0;
  const valB = cityData[cityB]?.[String(yearB)] ?? 0;
  const delta = valB - valA;
  const percentChange = valA !== 0 ? (delta / valA) * 100 : null;
  const direction: 'up' | 'down' | 'flat' = delta > 0.05 ? 'up' : delta < -0.05 ? 'down' : 'flat';

  const deltaMagnitude = Math.min(1, Math.abs(delta) / DAILY_RATE_NORMALIZATION_MM_DAY);
  const deltaDuration = Number((1.4 + 1.6 * deltaMagnitude).toFixed(2));
  const startHz = rainfallToFrequencyHz(valA, DAILY_RATE_NORMALIZATION_MM_DAY);
  const endHz = rainfallToFrequencyHz(valB, DAILY_RATE_NORMALIZATION_MM_DAY);

  return {
    scope: 'city',
    placeA: cityA,
    placeB: cityB,
    yearA,
    yearB,
    valueA: valA,
    valueB: valB,
    delta,
    percentChange: percentChange !== null ? Number(percentChange.toFixed(1)) : null,
    unit: 'mm/day',
    direction,
    basis: cityA === cityB ? `${cityA} (${yearA} vs ${yearB})` : `${cityA} (${yearA}) vs ${cityB} (${yearB})`,
    is2026Comparison: false,
    deltaDuration,
    deltaMagnitude,
    startHz,
    endHz,
  };
}

export function evaluateRiskClass(peakDailyMm: number, riskRules: RiskRulesData) {
  for (const rule of riskRules.classes) {
    const aboveMin = rule.minInclusive ? peakDailyMm >= rule.minMm : peakDailyMm > rule.minMm;
    const belowMax =
      rule.maxMm === null ? true : rule.maxInclusive ? peakDailyMm <= rule.maxMm : peakDailyMm < rule.maxMm;
    if (aboveMin && belowMax) {
      return {
        classId: rule.id,
        label: rule.label,
        peakDailyMm,
        floodLandslideText: rule.floodLandslideText,
        disclaimer: riskRules.disclaimer,
      };
    }
  }
  return {
    classId: 'light',
    label: 'Light',
    peakDailyMm,
    floodLandslideText: riskRules.classes[0]?.floodLandslideText || '',
    disclaimer: riskRules.disclaimer,
  };
}
