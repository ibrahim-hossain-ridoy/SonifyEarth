# ECC Architecture Plan: SonifyEarth — Hear the Change
**NASA Space Apps Challenge 2026**

## 1. Executive Summary & Product Vision
- **Project**: SonifyEarth: Hear the Change
- **Core Statement**: *"Most Earth visualizations show you what changed. SonifyEarth lets you hear the change."*
- **Paradigm**: Scientific Earth Data Instrument & Museum-Grade Interactive Experience.
  Earth rainfall data → spatial context → visual pattern → scientific sonification → compare → hear the delta → investigate risk/anomaly → historical context → transparent data passport → controlled creative expression.

## 2. Evidence-Based Asset Inventory (From Repository Inspection)
1. **National Data**:
   - `data/rainfall_bd_yearly.json`: Annual means 2005–2026 in mm/day.
   - `data/year_profiles.json`: Full statistical profiles for 2005–2026 (coverage, peak date, peak mm, BMD class, heavy/very heavy days, anomalies, 2026 common period profiles).
   - `data/daily_rainfall_2005_2026.json`: 7,942 daily records (2005-01-01 to 2026-09-24) with daily mm, rolling 3d/7d/30d, YTD, anomalies, z-scores, audio normalization, and frequency.
2. **City Data**:
   - `data/bangladesh_rain_data.json`: 8 divisional cities (Dhaka, Chittagong, Sylhet, Rajshahi, Khulna, Barisal, Rangpur, Mymensingh) for 2005–2025.
   - `data/city_data_schema.json`: Spatial coordinates (lat/lon) and schema.
3. **Audio Assets**:
   - `audio/national/rainfall_BD_2005.wav` ... `rainfall_BD_2026.wav` (22 WAVs, 8s, 48kHz, mono) + `sonifyearth_rain_YYYY.wav`.
   - `audio/city/rainfall_city_[CityName].wav` (8 divisional city WAVs, 5s, 48kHz, mono).
4. **Governance & Metadata**:
   - `data/data_passport.json` & `data/source_passport_v1.json`: NASA GES DISC / Giovanni provenance, spatial bounding box (`88.05E, 20.55N, 92.65E, 26.65N`), frequency mappings, formulas.
   - `data/risk_rules.json`: Bangladesh Meteorological Department (BMD) intensity classes: Light (≤44 mm/day), Heavy (>44–88 mm/day), Very Heavy (>88 mm/day).
   - `data/historical_events.json`: 2007 (World Bank), 2019 (WHO), 2024 (UN/UNICEF) historical context.

## 3. Technology Stack & Design System
- **Framework**: React + TypeScript + Vite.
- **Styling**: Tailwind CSS + Custom CSS Variables for scientific instrument aesthetics.
  - Palette: Deep observatory obsidian (`#070b14`), atmospheric slate (`#0f172a`), celestial cyan/azure (`#38bdf8`, `#0284c7`), monsoon indigo (`#6366f1`), warm amber warning (`#f59e0b`), coral alert (`#f43f5e`), emerald baseline (`#10b981`).
  - Typography: Modern clean geometric sans (`Inter`, `Plus Jakarta Sans`, `system-ui`) and tabular monospace (`JetBrains Mono`, `ui-monospace`).
  - Aesthetics: High-end double-bezel hardware styling, subtle SVG grid textures, no cheap gradients, no neon slop, restrained scientific typography.
- **Audio Engine**: Dual-mode Web Audio API:
  - *Mode A*: Real pre-synthesized WAV playback (`audio/national/*.wav`, `audio/city/*.wav`).
  - *Mode B*: Real-time scientific sonification synthesized from numerical daily series ($u = \text{clip}(\text{rain}/100, 0, 1)$, $f = 220 \times (880/220)^u$) with visual playhead scrubbing.
  - *Delta Sound*: Upward/downward glissando synthesis ($m = \text{clip}(|\Delta|/1500, 0, 1)$).
- **Map Architecture**: Real Bangladesh boundary vector + division bounds + 8 verified divisional coordinates with interactive hover tooltips, click selection, and NASA bounding box indicator.

## 4. Component & Feature Architecture
```
src/
├── types/
│   └── rainfall.ts                # TypeScript interfaces for data, profiles, compare, risk, audio
├── lib/
│   ├── dataService.ts             # Clean data layer with zero invented numbers
│   ├── audioEngine.ts             # Web Audio API engine (synthesizer, WAV player, delta sound, creative filter)
│   └── bangladeshGeo.ts           # Bangladesh boundary and 8 division geometries & coordinates
├── components/
│   ├── common/
│   │   ├── Header.tsx             # Floating island nav with live audio monitor & layer badge
│   │   ├── DoubleBezelCard.tsx    # Precision instrument card shell
│   │   ├── StatBadge.tsx          # Numerical badge with unit and delta indicator
│   │   └── TabularNumber.tsx      # Formatted animated numbers
│   ├── chapters/
│   │   ├── Chapter01_Hero.tsx     # Hero entry with real scientific teaser & soundwave
│   │   ├── Chapter02_MapExplore.tsx # Bangladesh interactive map + National/City dashboard
│   │   ├── Chapter03_Listen.tsx   # Dual-mode sonifier (WAV + numerical daily synthesizer)
│   │   ├── Chapter04_Compare.tsx  # Year vs Year / City vs City comparative instrument
│   │   ├── Chapter05_DeltaSound.tsx # Dedicated signature Delta Sound interaction
│   │   ├── Chapter06_RiskLens.tsx # BMD reference classification & hydrological context
│   │   ├── Chapter07_Anomaly.tsx  # Standardized anomaly departures & baseline comparison
│   │   ├── Chapter08_History.tsx  # Verified NASA/UN historical event timeline
│   │   ├── Chapter09_Passport.tsx # Interactive instrument metadata drawer / inspection panel
│   │   ├── Chapter10_Creative.tsx # Scientific parameter modifier with reset
│   │   └── Chapter11_Science.tsx  # End-to-end methodology visual pipeline
└── App.tsx                        # Master scroll-linked container with state synchronization
```

## 5. Verification & Quality Gates
- Mathematical consistency: Delta $B - A$ matches displayed numbers.
- 2026 data integrity: Correctly marked "Available to date (2026-09-24)" and compared using common-period Jan 1–Sep 24 baseline.
- Risk honesty: Never labels BMD classes as flood/landslide probabilities; explicitly labels as reference context.
- Zero mock data: All numbers derived from `year_profiles.json`, `rainfall_bd_yearly.json`, `bangladesh_rain_data.json`, and `daily_rainfall_2005_2026.json`.
