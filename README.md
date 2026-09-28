# SonifyEarth Rainfall MVP

Backend handoff for Tahmid. Static datasets, pre-synthesized WAVs, browser ESM adapter. No HTML, CSS, UI components or server required.

## Package map

```text
SonifyEarth_Rainfall_MVP/
├── README.md
├── src/sonifyearth_rainfall.js
├── data/
│   ├── rainfall_bd_yearly.json
│   ├── bangladesh_rain_data.json
│   ├── data_passport.json
│   ├── historical_events.json
│   └── risk_rules.json
└── audio/
    ├── national/
    └── city/
```

- `data/rainfall_bd_yearly.json`: Bangladesh national annual mean rainfall, 2005–2026. Unit `mm/day`. 2026 ends 24 September.
- `data/bangladesh_rain_data.json`: annual city values, 2005–2025, for Dhaka, Chittagong, Sylhet, Rajshahi, Khulna, Barisal, Rangpur and Mymensingh.
- `data/data_passport.json`: NASA/Giovanni national provenance, city-data limitation, WAV specifications, pitch formula.
- `data/historical_events.json`: display-only 2007, 2019 and 2024 flood/landslide context with source URLs.
- `data/risk_rules.json`: BMD display thresholds. `≤44` Light; `>44–88` Heavy; `>88` Very Heavy.
- `audio/national/`: 22 national WAVs. One per annual national value. Eight seconds each.
- `audio/city/`: eight city WAVs. One per city 2005–2025 average. Five seconds each.
- `src/sonifyearth_rainfall.js`: data loading, listen paths, comparison, delta sound, risk lens and historical-event helpers.

## Load package

Serve package with HTTP. Browser `fetch()` may fail from `file://`.

```js
import { loadPackageData } from "./src/sonifyearth_rainfall.js";

const rainfall = await loadPackageData("/SonifyEarth_Rainfall_MVP");
```

`rainfall` contains `nationalData`, `cityData`, `dataPassport`, `historicalEvents`, `riskRules`.

## LISTEN

National selection maps selected year to one national WAV.

```js
import { getListenAsset } from "./src/sonifyearth_rainfall.js";

const asset = getListenAsset({
  year: 2017,
  nationalData: rainfall.nationalData,
  cityData: rainfall.cityData,
  assetBasePath: "/SonifyEarth_Rainfall_MVP",
});

// asset.audioPath
// /SonifyEarth_Rainfall_MVP/audio/national/rainfall_BD_2017.wav
// asset.rainfallMmDay
// selected national annual value in mm/day
```

City selection uses same adapter shape.

```js
const cityAsset = getListenAsset({
  year: 2024,
  city: "Sylhet",
  nationalData: rainfall.nationalData,
  cityData: rainfall.cityData,
  assetBasePath: "/SonifyEarth_Rainfall_MVP",
});

// cityAsset.audioPath
// /SonifyEarth_Rainfall_MVP/audio/city/rainfall_city_Sylhet.wav
// cityAsset.rainfallMmDay
// Sylhet value for 2024
// cityAsset.audioRainfallMmDay
// Sylhet 2005–2025 average used to synthesize city WAV
```

City JSON stores year-specific values. City WAVs are long-run city-average assets, not per-city-year assets. Keep `rainfallMmDay` for selected-year display and comparison. Label audio basis with `audioBasis` when needed.

## COMPARE

Delta always equals `rainfallB - rainfallA` in `mm/day`.

```js
import { compareRainfall } from "./src/sonifyearth_rainfall.js";

const comparison = compareRainfall({
  yearA: 2010,
  yearB: 2017,
  city: "Dhaka", // omit or use "Bangladesh" for national series
  nationalData: rainfall.nationalData,
  cityData: rainfall.cityData,
});

// comparison.deltaMmDay
// comparison.direction: "up", "down" or "flat"
```

## DELTA SOUND

Use Web Audio only after user interaction. Pass existing `AudioContext`; adapter does not create UI or manage autoplay permissions.

```js
import { playDeltaSound } from "./src/sonifyearth_rainfall.js";

const audioContext = new AudioContext();
const deltaSound = playDeltaSound(audioContext, comparison.deltaMmDay);
// Positive delta: upward pitch sweep. Negative delta: downward sweep.
```

## RISK LENS

Pass peak daily rainfall, not annual average. Result includes class, explanatory flood/landslide text and non-warning disclaimer.

```js
import { getRiskLens } from "./src/sonifyearth_rainfall.js";

const risk = getRiskLens(91, rainfall.riskRules);
// risk.classId === "very_heavy"
// risk.floodLandslideText
```

Thresholds: `≤44 mm` Light; `>44–88 mm` Heavy; `>88 mm` Very Heavy. Treat result as display aid. Use official BMD alerts for warnings and response decisions.

## DATA PASSPORT

```js
import { getDataPassport } from "./src/sonifyearth_rainfall.js";

const passport = getDataPassport(rainfall.dataPassport);
// passport.frequency_mapping.formula_hz
// "220 + (rainfall_mm_day / 40) * 660"
```

National source: NASA GES DISC / Giovanni, GPM IMERG Early Daily. National pitch maps linearly: `0 mm/day → 220 Hz`; `40 mm/day → 880 Hz`. City input provenance was not supplied. Do not present city values as NASA-derived without separate source metadata.

## Historical context

```js
import { getHistoricalEvents } from "./src/sonifyearth_rainfall.js";

const events = getHistoricalEvents(2019, rainfall.historicalEvents);
```

Use for static contextual display only. Annual rainfall averages cannot establish flood or landslide causality.

## Audio contract

- National WAV: `audio/national/rainfall_BD_YYYY.wav`; mono, 48 kHz, 16-bit PCM; eight seconds.
- City WAV: `audio/city/rainfall_city_CityName.wav`; mono, 48 kHz, 16-bit PCM; five seconds.
- Organic synthesis: granular drops, randomized 800–3000 Hz impacts, noise transients, pink/band-pass ambience and mapped-frequency resonances.
- Audio files are pre-synthesized. Frontend only loads paths returned by `getListenAsset()`.

## Zip handoff

Zip `SonifyEarth_Rainfall_MVP/` unchanged. Keep `src/`, `data/` and `audio/` relative paths intact.
