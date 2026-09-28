# SonifyEarth: Hear the Change — Project Status & Scientific Report
**NASA Space Apps Challenge 2026**

## 1. Project Overview & Deliverable Summary
- **Project Title**: SonifyEarth: Hear the Change
- **Core Statement**: *"Most Earth visualizations show you what changed. SonifyEarth lets you hear the change."*
- **Architecture Paradigm**: Scientific Earth Data Instrument & Museum-Grade Experience with real NASA satellite data, calibrated Web Audio API synthesis, verified geographical coordinates, and mathematical transparency.

---

## 2. Evidence-Based Asset Inventory

### A. Data Files Discovered & Utilized
1. `data/rainfall_bd_yearly.json`: National annual mean precipitation rate (mm/day) across 2005–2026.
2. `data/year_profiles.json`: Statistical profiles for 2005–2026 including days available, annual total (mm), mean daily rate (mm/day), peak daily rate, peak date, heavy/very heavy days count, annual anomaly (mm & z-score), peak-day anomaly, and 2026 common period profiles.
3. `data/bangladesh_rain_data.json`: Verified annual precipitation rates for 8 divisional cities (Dhaka, Chittagong, Sylhet, Rajshahi, Khulna, Barisal, Rangpur, Mymensingh) spanning 2005–2025.
4. `data/daily_rainfall_2005_2026.json`: Complete 7,942 daily records (Jan 1, 2005 to Sep 24, 2026) with rolling 3d/7d/30d sums, baseline mean & standard deviation, standardized anomaly z-scores, audio normalization $u \in [0, 1]$, and calibrated frequency $f$ in Hz.
5. `data/risk_rules.json`: Bangladesh Meteorological Department (BMD) rainfall intensity thresholds: Light ($\le 44$ mm/day), Heavy ($>44–88$ mm/day), and Very Heavy ($>88$ mm/day).
6. `data/historical_events.json`: Ground-truth flood and landslide disaster impact context (2007 World Bank, 2019 WHO, 2024 UN/UNICEF) with direct citations.
7. `data/data_passport.json` & `data/source_passport_v1.json`: Complete provenance records, bounding box dimensions, audio formulas, and official NASA GPM climatology upgrade links.

### B. Audio Files Discovered & Integrated
1. **National Series**: 22 annual master acoustic recordings in `audio/national/rainfall_BD_2005.wav` through `rainfall_BD_2026.wav` (Mono, 48 kHz, 16-bit PCM, 8.0s duration each) plus `sonifyearth_rain_YYYY.wav` archive.
2. **City Series**: 8 divisional city master recordings in `audio/city/rainfall_city_[CityName].wav` (Barisal, Chittagong, Dhaka, Khulna, Mymensingh, Rajshahi, Rangpur, Sylhet; Mono, 48 kHz, 16-bit PCM, 5.0s duration each).

### C. Spatial & Geographic Assets
- **Boundary & Bounding Box**: Accurate Bangladesh outer geographic boundary vector and regional division polygons.
- **NASA Giovanni Bounding Box**: User BBox (`88E, 20.5N, 92.7E, 26.7N`) and Data BBox (`88.05E, 20.55N, 92.65E, 26.65N`) toggleable on the interactive map.
- **8 Verified Divisional Centers**:
  - Dhaka (23.8103°N, 90.4125°E)
  - Chittagong / Chattogram (22.3569°N, 91.7832°E)
  - Sylhet (24.8949°N, 91.8687°E)
  - Rajshahi (24.3745°N, 88.6042°E)
  - Khulna (22.8456°N, 89.5403°E)
  - Barisal / Barishal (22.7010°N, 90.3535°E)
  - Rangpur (25.7439°N, 89.2752°E)
  - Mymensingh (24.7471°N, 90.4203°E)

---

## 3. Implemented Capabilities & Experience Flow

1. **Chapter 01: Hero / Entry**
   - Immediate thesis statement: *"Most Earth visualizations show you what changed. SonifyEarth lets you hear the change."*
   - Real scientific teaser strip with spatial bounding box, 2005–2025 baseline ($2,626.8$ mm), and acoustic translation parameters ($220–880$ Hz).
2. **Chapter 02: Bangladesh Spatial Dashboard (Map-First)**
   - Interactive SVG map with Bangladesh outer polygon, division contours, major river systems, and NASA Bounding Box overlay.
   - Dual spatial layers: National View (bounding-box area-weighted average) vs City View (8 verified divisions).
   - Clickable station pins updating global selection and summary readouts.
3. **Chapter 03: Listen & Dual-Mode Sonifier**
   - **Mode A (Master Recording)**: Pre-synthesized 48 kHz WAV playback with live oscilloscope and spectrum visualizer.
   - **Mode B (Live Numerical Daily Synthesizer)**: Web Audio API real-time synthesis of daily measurements across all 365 days. Includes interactive playhead scrubbing across the daily precipitation timeline, tempo speed adjustment ($0.5\times$ to $2\times$), and pitch readouts ($f = 220 \cdot (880/220)^u$ Hz).
4. **Chapter 04 & 05: Comparative Analytics & Signature Delta Sound**
   - Comparison of any two supported years (National) or any two divisional cities.
   - Signed Delta ($\Delta = B - A$), percentage change, and basis definition.
   - **Signature Delta Sound**: Upward glissando ($330 \to 660$ Hz) for positive delta, downward glissando ($660 \to 330$ Hz) for negative delta, and neutral steady tone ($440$ Hz) for flat delta. Duration scales with magnitude ($m = \text{clip}(|\Delta|/1500, 0, 1) \implies 1.2 + 1.8m$ seconds).
   - Dedicated comparison presets: 2007 vs 2024, 2024 vs 2007 (invert), 2024 vs 2026 YTD, and Sylhet vs Rajshahi.
5. **Chapter 06: Risk Lens & Hydrological Context**
   - Translates peak daily rainfall into official BMD reference classes (Light $\le 44$, Heavy $44–88$, Very Heavy $>88$ mm/day).
   - Contextualizes real-world factors: river discharge, urban drainage stress, soil saturation, and hilly landslide slope instability.
   - Prominent scientific non-warning disclaimer.
6. **Chapter 07: Anomaly & Baseline Departures**
   - Real departure calculation against the 2005–2025 baseline mean ($2,626.8$ mm) and standard deviation ($273.3$ mm).
   - Interactive 22-year anomaly stem chart with clickable year selection.
   - Standardized anomaly $z$-scores and peak-day departures.
7. **Chapter 08: Historical Event Context**
   - Verified accounts for 2007 (Chittagong floods & landslides, NASA Earth Observatory & World Bank), 2019 (Monsoon floods and landslides, WHO), and 2024 (Eastern flash floods, UN Bangladesh & UNICEF).
   - Explicit non-causal attribution notice.
8. **Chapter 09: Data Passport (Every Sound Has a Source)**
   - Comprehensive provenance panel accessible inline and via floating header button.
   - Technical specifications: collection, product, variable, unit, bounding box, missing data verification, and mathematical equations.
9. **Chapter 10: Creative Mode (Auditory Expression)**
   - Custom controls: Timbre (sine, triangle, square, sawtooth), base register ($220–880$ Hz), stereo pan ($-1.0$ to $+1.0$), tempo speed ($0.5\times$ to $2\times$), and output gain.
   - "Reset to Scientific Default" button that restores the calibrated default.
   - Explicit invariance guarantee: *"Creative settings change expression only. They do not alter underlying rainfall numbers or the documented scientific mapping."*
10. **Chapter 11: Scientific Methodology**
    - 6-stage end-to-end data pipeline: NASA Satellite $\to$ Spatial Extraction $\to$ Normalization $\to$ Pitch Translation $\to$ Comparative Delta $\to$ Data Passport.
    - Expandable mathematical formulation view with LaTeX-style notation.

---

## 4. Known Scientific Caveats & Limitations
1. **Giovanni Bounding Box vs Exact Polygon Mask**:
   The current national series is an area-weighted arithmetic mean across the rectangular bounding box (`88.05E, 20.55N` to `92.65E, 26.65N`), not an exact border-clipped polygon mask. This is explicitly disclosed on the map and inside the Data Passport.
2. **2026 Incomplete Calendar Year**:
   Measurements in the 2026 dataset terminate at **2026-09-24** (267 days). 2026 is strictly labeled *"Available to date (YTD)"* across all views. Comparisons involving 2026 automatically clip the reference year to the common calendar window (Jan 1 – Sep 24) to maintain mathematical validity.
3. **Divisional Station Data vs Gridded Space**:
   Station-level data is provided exclusively for the 8 divisional administrative centers. The UI explicitly refrains from interpolating fictional rainfall values across arbitrary coordinates between stations.
4. **Risk Lens Attribution Boundary**:
   BMD categories are meteorological reference classes, not automated flood probability forecasts or emergency evacuation directives.
5. **Data Format Sanitization**:
   Literal unquoted `NaN` tokens previously present in `daily_rainfall_2005_2026.json` (such as in early rolling rolling windows) were sanitized across `data/`, `public/data/`, and `dist/data/` to standard JSON `null`. In addition, `src/lib/dataService.ts` incorporates a fail-safe sanitizer `fetchSafeJson()` that converts any future `NaN` tokens to `null` and normalizes null numeric fields to 0 during mathematical aggregations.

---

## 5. Build & Execution Commands

### Production Build
```bash
npm run build
```
*(Executes `tsc` type validation and `vite build`. Output is compiled into `/dist` with bundled assets, audio, and data).*

### Local Preview Server
```bash
npm run preview -- --port 4173
```
Open: `http://localhost:4173/`

### Local Development Server
```bash
npm run dev
```
Open: `http://localhost:3000/`

### Run Automated Scientific Verification Suite
```bash
node scripts/verify_sonifyearth.js
```
*(Validates 50 mathematical, audio, and file checks).*

---

## 6. Critical Bug Fix & Architecture Revision Report

### Requirement 1: Authentic Bangladesh Map Geometry & Divisional Boundaries
- **GeoJSON Source**: Extracted and verified Bangladesh administrative boundary data from `public/data/bangladesh.geojson` and `public/data/bd-divisions.json` (544 administrative features).
- **Vector Path Generation**: Implemented [`src/lib/authenticBangladeshMap.ts`](file:///Users/hello/Desktop/SonifyEarth_Rainfall_MVP/src/lib/authenticBangladeshMap.ts) featuring detailed SVG vector paths (`AUTHENTIC_DIVISION_PATHS`) for all 8 divisions: Dhaka, Chittagong, Sylhet, Rajshahi, Khulna, Barisal, Rangpur, and Mymensingh.
- **Accurate Spatial Coordinates**: Projected the exact latitude and longitude of all 8 divisional centers onto the 600×760 canvas:
  - Dhaka: `(314, 355)` — Geographical center
  - Chattogram: `(440, 532)` — Southeastern coast & hill tracts
  - Sylhet: `(450, 222)` — Northeastern high-precipitation basin
  - Rajshahi: `(148, 287)` — Western drought-prone plain
  - Khulna: `(234, 475)` — Southwestern delta / Sundarbans
  - Barishal: `(308, 492)` — Southern tidal floodplain
  - Rangpur: `(210, 117)` — Northern Teesta basin
  - Mymensingh: `(315, 240)` — North-central piedmont
- **Interactive Visuals**: Clean division-level hover glow, active selection rings, station pulse animations, and detailed divisional summary cards.

### Requirement 2: Multi-Page / Dynamic Tab View Navigation
- **Architecture**: Removed continuous long scrolling as the primary layout. Implemented a responsive dynamic view router in [`src/App.tsx`](file:///Users/hello/Desktop/SonifyEarth_Rainfall_MVP/src/App.tsx) controlled by [`src/components/common/Header.tsx`](file:///Users/hello/Desktop/SonifyEarth_Rainfall_MVP/src/components/common/Header.tsx) with browser URL hash routing (`#explore`, `#listen`, `#compare`, `#risk`, `#anomaly`, `#history`, `#passport`, `#creative`, `#science`).
- **Dedicated Experience Views**:
  - `explore`: Bangladesh Spatial Dashboard, interactive SVG map, layer toggles, and station focus cards.
  - `listen`: Dual-Mode Sonifier with 48 kHz WAV playback and live 365-day Web Audio synthesizer.
  - `compare`: Comparative analytics with signature delta glissando sound.
  - `risk`: BMD rainfall intensity classes and hydrological stress factors.
  - `anomaly`: 22-year baseline departure analysis and standardized $z$-scores.
  - `history`: Ground-truth disaster contexts with non-causal attribution safeguards.
  - `passport`: Provenance certificate and scientific metadata.
  - `creative`: Non-destructive auditory expression studio.
  - `science`: NASA satellite data pipeline and mathematical formulation.
- **State Synchronization**: Selecting a City (e.g., "Dhaka") or Year (e.g., "2024") on the Map page automatically persists across all views (`listen`, `compare`, `risk`, etc.).
- **Dynamic Jump Buttons**: Added quick navigation buttons on the Map selection card allowing 1-click jumps directly to "Listen in Sonifier", "Compare Page", "Risk Lens", and "Anomaly Page" with the selection pre-loaded.

### Requirement 3: Audio Playback & Source Path Verification
- **Path Normalization**: In [`src/lib/audioEngine.ts`](file:///Users/hello/Desktop/SonifyEarth_Rainfall_MVP/src/lib/audioEngine.ts), implemented automated city name normalization (`Chattogram` $\to$ `Chittagong`, `Barishal` $\to$ `Barisal`) to guarantee seamless matching with static WAV files in `public/audio/city/`.
- **WAV Asset Verification**: All 22 National WAV files (`rainfall_BD_2005.wav` through `rainfall_BD_2026.wav`) and 8 City WAV files return `HTTP 200 OK` with 48 kHz / 16-bit PCM audio.
- **Seamless Web Audio Fallback**: Configured `audioEngine.ts` with error traps and fallback handling that triggers the Web Audio API live daily synthesizer if any static file fails to load or when live numerical daily synthesis is explicitly activated.

---

## 7. Verification Results
- **TypeScript & Linting**: `npm run build` completed with 0 errors.
- **Automated QA Suite**: `node scripts/verify_sonifyearth.js` completed with **50/50 tests passed (100%)**.
- **Live Preview Server**: Active at `http://localhost:4173/` serving verified static audio, sanitized JSON datasets, and reactive tab views.

