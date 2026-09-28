/**
 * SonifyEarth rainfall data adapter. Browser ESM. No UI code.
 */

export const CITY_NAMES = Object.freeze([
  "Dhaka",
  "Chittagong",
  "Sylhet",
  "Rajshahi",
  "Khulna",
  "Barisal",
  "Rangpur",
  "Mymensingh",
]);

const NATIONAL_AUDIO_FOLDER = "audio/national";
const CITY_AUDIO_FOLDER = "audio/city";

function normalizeBasePath(basePath) {
  return basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
}

function assertFiniteNumber(value, label) {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite number.`);
}

function assertYear(year) {
  const text = String(year);
  if (!/^\d{4}$/.test(text)) throw new TypeError("year must be four-digit year.");
  return text;
}

function assertCity(city) {
  if (!CITY_NAMES.includes(city)) throw new RangeError(`Unknown city: ${city}`);
  return city;
}

function cityAverage(cityData, city) {
  const values = Object.values(cityData[city]);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Cannot load ${path}: HTTP ${response.status}`);
  return response.json();
}

/** Load all package JSON assets from static server path. */
export async function loadPackageData(basePath = ".") {
  const root = normalizeBasePath(basePath);
  const [nationalData, cityData, dataPassport, historicalEvents, riskRules] = await Promise.all([
    fetchJson(`${root}/data/rainfall_bd_yearly.json`),
    fetchJson(`${root}/data/bangladesh_rain_data.json`),
    fetchJson(`${root}/data/data_passport.json`),
    fetchJson(`${root}/data/historical_events.json`),
    fetchJson(`${root}/data/risk_rules.json`),
  ]);
  return { nationalData, cityData, dataPassport, historicalEvents, riskRules };
}

/** Return selected annual rainfall value. city omitted means national Bangladesh. */
export function getRainfallValue({ year, city = null, nationalData, cityData }) {
  const selectedYear = assertYear(year);
  if (city === null || city === "Bangladesh") {
    const value = nationalData?.years?.[selectedYear];
    if (!Number.isFinite(value)) throw new RangeError(`No national data for ${selectedYear}.`);
    return {
      scope: "national",
      year: selectedYear,
      rainfallMmDay: value,
      unit: nationalData.unit,
      label: "Bangladesh",
    };
  }

  const selectedCity = assertCity(city);
  const value = cityData?.[selectedCity]?.[selectedYear];
  if (!Number.isFinite(value)) throw new RangeError(`No ${selectedCity} data for ${selectedYear}.`);
  return {
    scope: "city",
    city: selectedCity,
    year: selectedYear,
    rainfallMmDay: value,
    unit: "mm/day",
    label: selectedCity,
  };
}

/**
 * LISTEN adapter. Returns WAV path plus source metric.
 * City WAVs represent each city's 2005–2025 average, not selected single year.
 */
export function getListenAsset({
  year,
  city = null,
  nationalData,
  cityData,
  assetBasePath = ".",
}) {
  const selected = getRainfallValue({ year, city, nationalData, cityData });
  const root = normalizeBasePath(assetBasePath);

  if (selected.scope === "national") {
    return {
      ...selected,
      audioPath: `${root}/${NATIONAL_AUDIO_FOLDER}/rainfall_BD_${selected.year}.wav`,
      audioBasis: "national annual average",
      audioRainfallMmDay: selected.rainfallMmDay,
    };
  }

  const averageRainfallMmDay = cityAverage(cityData, selected.city);
  return {
    ...selected,
    audioPath: `${root}/${CITY_AUDIO_FOLDER}/rainfall_city_${selected.city}.wav`,
    audioBasis: "city 2005–2025 average",
    audioRainfallMmDay: averageRainfallMmDay,
  };
}

/** COMPARE adapter. Delta equals rainfall B minus rainfall A, in mm/day. */
export function compareRainfall({ yearA, yearB, city = null, nationalData, cityData }) {
  const a = getRainfallValue({ year: yearA, city, nationalData, cityData });
  const b = getRainfallValue({ year: yearB, city, nationalData, cityData });
  const deltaMmDay = b.rainfallMmDay - a.rainfallMmDay;
  return {
    scope: a.scope,
    city: a.city ?? "Bangladesh",
    yearA: a.year,
    rainfallA: a.rainfallMmDay,
    yearB: b.year,
    rainfallB: b.rainfallMmDay,
    deltaMmDay,
    direction: deltaMmDay > 0 ? "up" : deltaMmDay < 0 ? "down" : "flat",
    unit: "mm/day",
  };
}

/**
 * DELTA SOUND. Call after user gesture with active AudioContext.
 * Returns direction plus stop callback. Does not create UI or own AudioContext lifecycle.
 */
export function playDeltaSound(audioContext, deltaMmDay, options = {}) {
  assertFiniteNumber(deltaMmDay, "deltaMmDay");
  const duration = options.durationSeconds ?? 0.48;
  const maxGain = options.maxGain ?? 0.16;
  assertFiniteNumber(duration, "durationSeconds");
  assertFiniteNumber(maxGain, "maxGain");
  if (duration <= 0 || maxGain <= 0) throw new RangeError("durationSeconds and maxGain must be positive.");

  const direction = deltaMmDay > 0 ? "up" : deltaMmDay < 0 ? "down" : "flat";
  const now = audioContext.currentTime;
  const magnitude = Math.min(1, Math.abs(deltaMmDay) / 10);
  const endTime = now + duration;
  const startCutoff = direction === "down" ? 2400 : 900;
  const endCutoff = direction === "down" ? 900 : 2400;
  const noiseBuffer = audioContext.createBuffer(1, Math.ceil(audioContext.sampleRate), audioContext.sampleRate);
  const noise = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noise.length; i += 1) noise[i] = (Math.random() * 2 - 1) * 0.4;

  const rainSource = audioContext.createBufferSource();
  rainSource.buffer = noiseBuffer;
  rainSource.loop = true;
  const rainFilter = audioContext.createBiquadFilter();
  rainFilter.type = "lowpass";
  rainFilter.frequency.setValueAtTime(startCutoff, now);
  rainFilter.frequency.linearRampToValueAtTime(endCutoff, endTime);
  const rainGain = audioContext.createGain();
  const startRain = Math.min(maxGain * 0.4, direction === "down" ? 0.035 : 0.012);
  const endRain = Math.min(maxGain * 0.4, direction === "down" ? 0.012 : 0.04);
  rainGain.gain.setValueAtTime(0.0001, now);
  rainGain.gain.linearRampToValueAtTime(startRain, now + 0.04);
  rainGain.gain.linearRampToValueAtTime(endRain, endTime - 0.04);
  rainGain.gain.linearRampToValueAtTime(0.0001, endTime);
  rainSource.connect(rainFilter).connect(rainGain).connect(audioContext.destination);
  rainSource.start(now);
  rainSource.stop(endTime + 0.03);

  const dropCount = Math.floor(4 + 18 * magnitude);
  const timers = [];
  const impacts = [];
  let stopped = false;
  for (let i = 0; i < dropCount; i += 1) {
    const progress = dropCount === 1 ? 0.5 : i / (dropCount - 1);
    const shapedProgress = direction === "up"
      ? progress ** 1.35
      : direction === "down"
        ? 1 - (1 - progress) ** 1.35
        : progress;
    const delay = shapedProgress * Math.max(0, duration - 0.09);
    const timer = setTimeout(() => {
      if (stopped) return;
      const impact = audioContext.createBufferSource();
      impact.buffer = noiseBuffer;
      const filter = audioContext.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(800 + 2200 * progress, audioContext.currentTime);
      filter.Q.setValueAtTime(0.7, audioContext.currentTime);
      const envelope = audioContext.createGain();
      const level = Math.min(maxGain * 0.3, 0.018 + 0.025 * progress);
      envelope.gain.setValueAtTime(0.0001, audioContext.currentTime);
      envelope.gain.linearRampToValueAtTime(level, audioContext.currentTime + 0.003);
      envelope.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.065);
      impact.connect(filter).connect(envelope).connect(audioContext.destination);
      impact.start(audioContext.currentTime, Math.random() * (noiseBuffer.duration - 0.08));
      impact.stop(audioContext.currentTime + 0.07);
      impacts.push({ source: impact, gain: envelope });
    }, delay * 1000);
    timers.push(timer);
  }

  const stop = () => {
    if (stopped) return;
    stopped = true;
    for (const timer of timers) clearTimeout(timer);
    const stopTime = audioContext.currentTime;
    rainGain.gain.cancelScheduledValues(stopTime);
    rainGain.gain.setValueAtTime(rainGain.gain.value, stopTime);
    rainGain.gain.linearRampToValueAtTime(0.0001, stopTime + 0.04);
    rainSource.stop(stopTime + 0.05);
    for (const impact of impacts) {
      impact.gain.gain.cancelScheduledValues(stopTime);
      impact.gain.gain.setValueAtTime(impact.gain.gain.value, stopTime);
      impact.gain.gain.linearRampToValueAtTime(0.0001, stopTime + 0.03);
      impact.source.stop(stopTime + 0.04);
    }
  };

  setTimeout(() => {
    stopped = true;
  }, duration * 1000 + 60);
  return { direction, durationSeconds: duration, stop };
}

function isWithinRule(value, rule) {
  const aboveMin = rule.minInclusive ? value >= rule.minMm : value > rule.minMm;
  const belowMax = rule.maxMm === null
    ? true
    : rule.maxInclusive ? value <= rule.maxMm : value < rule.maxMm;
  return aboveMin && belowMax;
}

/** RISK LENS. Peak daily rainfall only; not forecast or warning service. */
export function getRiskLens(peakDailyRainMm, riskRules) {
  assertFiniteNumber(peakDailyRainMm, "peakDailyRainMm");
  if (peakDailyRainMm < 0) throw new RangeError("peakDailyRainMm cannot be negative.");
  const match = riskRules.classes.find((rule) => isWithinRule(peakDailyRainMm, rule));
  if (!match) throw new Error("No risk rule matches peakDailyRainMm.");
  return {
    peakDailyRainMm,
    unit: "mm/day",
    classId: match.id,
    label: match.label,
    floodLandslideText: match.floodLandslideText,
    disclaimer: riskRules.disclaimer,
  };
}

/** DATA PASSPORT adapter. Return provenance and audio mapping metadata unchanged. */
export function getDataPassport(dataPassport) {
  return dataPassport;
}

/** Return display-only historical event context matching year. */
export function getHistoricalEvents(year, historicalEvents) {
  const selectedYear = Number(assertYear(year));
  return historicalEvents.events.filter((event) => event.year === selectedYear);
}
