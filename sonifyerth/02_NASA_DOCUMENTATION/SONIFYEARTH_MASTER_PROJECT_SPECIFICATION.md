# SonifyEarth — Reconstructed Master Project Specification

**Status:** Reconstructed Authoritative Specification (Pre-Task 0 Recovery)  
**Date:** November 11, 2026  
**Workspace Root:** `.`  
**Mandatory Governance Rule:** Follow strictly for Task 5+ (Sound Engine, Frontend, Evidence Inspector, Accessibility, and E2E Verification). If any conflict arises between legacy workspace docs and this specification, follow the latest explicitly approved scientific and product decisions documented below and flag the conflict explicitly.

---

## 0. Document Recovery & Search Audit

### 0.1 Exhaustive Workspace Search Outcome
A complete recursive inspection of `.` — including all project folders (`01_NASA_RAW_DATA/` through `10_DEVELOPER_HANDOFF/`, `scripts/`), hidden directories (`.agents/`, `.playwright/`), Markdown reports, PDFs (`02_NASA_DOCUMENTATION/`, `01_NASA_RAW_DATA/original_downloads/`), CSV dictionaries, JSON/GeoJSON payloads, and configuration files — confirmed:
- **Not Found in Workspace:** `Main Final Project Master` (original historical document) and `Bangladesh Participants Guide` do not exist anywhere inside `.` (zero `.doc`, `.docx`, `.rtf`, `.txt`, or unindexed PDF specifications beyond the 4 official NASA PDFs and project deliverables).
- **Authoritative Local Sources Recovered & Verified:**
  1. Custom project engineering skill: [`.agents/skills/sonifyearth-project/SKILL.md`](../.agents/skills/sonifyearth-project/SKILL.md) (encoding user-locked product identity, 11 product features, sound rules, accessibility mandates, UI/UX workflow, and source-of-truth priority).
  2. Scientific Audit & Validation Suite: [`TASK_2_1_SCIENTIFIC_AUDIT.md`](../TASK_2_1_SCIENTIFIC_AUDIT.md), [`05_SCIENTIFIC_VALIDATION/*.md`](../05_SCIENTIFIC_VALIDATION/), [`REAL_STATE_EXAMPLES.json`](../05_SCIENTIFIC_VALIDATION/REAL_STATE_EXAMPLES.json), and [`TASK_3_FINAL_SCIENTIFIC_VALIDATION.md`](../07_PROJECT_REPORTS/validation/TASK_3_FINAL_SCIENTIFIC_VALIDATION.md).
  3. Production Data Config, Scripts, Outputs & Reports: [`04_DATA_PROCESSING/configuration/processing_config.json`](../04_DATA_PROCESSING/configuration/processing_config.json), [`06_PROCESSED_DATA/json/`](../06_PROCESSED_DATA/json/), [`06_PROCESSED_DATA/geojson/`](../06_PROCESSED_DATA/geojson/), [`07_PROJECT_REPORTS/validation/`](../07_PROJECT_REPORTS/validation/), and [`PROJECT_STATUS.md`](../PROJECT_STATUS.md).
  4. NASA Reference Docs & Local Media Assets: [`02_NASA_DOCUMENTATION/`](./), [`DATA_INVENTORY.csv`](../DATA_INVENTORY.csv), `iss_lightning_sphere_07312023.mp4` (`1920x1080`, `30 fps`, `216.70 s`), `Screenshot 2026-11-09 at 08.26.06.png`, and [`package.json`](../package.json) (`@playwright/cli ^0.1.24`).

### 0.2 Epistemic Classification Standard (Strictly Separated)
Every statement in this document is explicitly tagged by evidentiary status so **inferences or unresolved gaps are never mistaken for original locked decisions**:
- **`[CONFIRMED REQUIREMENT]`** — Explicitly locked product identity, scope, feature, audio, accessibility, or engineering rule verified in workspace project directives and `sonifyearth-project/SKILL.md`.
- **`[VERIFIED SCIENTIFIC FACT]`** — Empirically measured and programmatically reconciled directly against the 212 NASA NetCDF-4 files, 4 NASA PDFs, Task 2.1 audit, Task 3 validation, and Task 4 JSON/GeoJSON outputs.
- **`[DOCUMENTED LIMITATION]`** — Physical, instrumental, QC, or methodological boundary explicitly established in NASA documentation or validation reports.
- **`[INFERRED IMPLEMENTATION DETAIL]`** — Practical architecture or UX detail reasoned from approved requirements, folder scaffolds, and existing data schemas (not an original locked spec mandate).
- **`[UNRESOLVED QUESTION]`** — Source conflict, missing historical document detail, or Task 5 design parameter requiring explicit team/user confirmation or careful handling.

---

## 1. Project Purpose, Problem Statement & Final Approved Concept

### 1.1 Project Identity & Challenge Alignment `[CONFIRMED REQUIREMENT]`
- **Project Name:** SonifyEarth
- **Experience Title:** Silence Isn't Zero
- **Product Descriptor:** An Observation-Aware Lightning Jukebox
- **Challenge Alignment:** NASA Space Apps Challenge 2026 — *The Earth Information Jukebox*
- **Single Topic Scope:** **ISS Lightning only.** No other Earth-science datasets or phenomena may be added.
- **Live Feed Constraint:** Must never claim to be a live or real-time lightning feed; uses the validated historical 7-day archival NASA dataset (`2023-11-09` to `2023-11-16`).

### 1.2 Core Problem Statement `[CONFIRMED REQUIREMENT]` + `[VERIFIED SCIENTIFIC FACT]`
- **Scientific Misconception Addressed `[CONFIRMED REQUIREMENT]`:** Standard lightning maps and naïve sonifications frequently treat silence or blank regions as zero lightning (`0 flashes`). For a Low Earth Orbit staring sensor like the International Space Station Lightning Imaging Sensor (ISS LIS), absence of a flash detection can result from three fundamentally different truths: (a) active optical surveillance confirming zero flashes, (b) the narrow orbital swath not viewing that location at that time, or (c) degraded/deleted data (SAA proton radiation, fatal hardware outages, or QC orbit deletion).
- **Solution — Observation-Aware Sonification `[CONFIRMED REQUIREMENT]`:** SonifyEarth distinguishes *confirmed silence under active observation* from *missing or unverified evidence* visually and sonically across **three explicit scientific states** (`DETECTED`, `OBSERVED_NO_DETECTION`, `UNKNOWN`), paired with full record-level scientific traceability via the *"Why Did I Hear That?"* evidence inspector.

---

## 2. NASA Datasets & Official Visualization

### 2.1 Scientific Source Datasets `[CONFIRMED REQUIREMENT]` + `[VERIFIED SCIENTIFIC FACT]`
- **Science Dataset `[VERIFIED SCIENTIFIC FACT]`:** Quality Controlled ISS LIS Science Data V2.2 (`ISS_LIS_SC_V2.2`, `DATA111`, DOI `10.5067/LIS/ISSLIS/DATA111`, Processing Level 2, Final QC `FIN`), `106` paired `.nc` (NetCDF-4 / CF-1.6) + `106` `.hdf` files stored untouched in [`01_NASA_RAW_DATA/science_v2/`](../01_NASA_RAW_DATA/science_v2/). Contains `147` variables including `lightning_area_*`, `lightning_flash_*`, `lightning_group_*`, `lightning_event_*`, `viewtime_*`, `one_second_*`, and `orbit_summary_*`.
- **Backgrounds Dataset `[VERIFIED SCIENTIFIC FACT]`:** Quality Controlled ISS LIS Backgrounds Data V2.2 (`ISS_LIS_BG_V2.2`, `DATA211`, DOI `10.5067/LIS/ISSLIS/DATA211`, Processing Level 1B, Final QC `FIN`), `106` paired `.nc` + `106` `.hdf` files stored untouched in [`01_NASA_RAW_DATA/backgrounds_v2/`](../01_NASA_RAW_DATA/backgrounds_v2/). Contains `33` variables including `bg_data` ($128 \times 128$ background radiance snapshots), `bg_data_summary_corners` (4-corner FOV swath footprints), and `bg_info_*` (1-second ECR navigation vectors and SAA/quality alert streams).
- **Aggregate Source Census (7-Day Archive) `[VERIFIED SCIENTIFIC FACT]`:**
  - Temporal span: `2023-11-09T22:52:12.400000Z` (`TAI93: 973723942.4`) to `2023-11-16T21:17:00.000000Z` actual telemetry end (`TAI93: 974323030.0`; nominal final granule header end `2023-11-16T22:03:35.200000Z`).
  - Total raw records: `16,124` flashes, `144,611` groups, `549,106` events, `4,160,874` `viewtime_*` $0.5^\circ \times 0.5^\circ$ grid-cell observation records, `587,941` 1-second telemetry records, `10,660` background images.
  - Historical context (`lis_anomalies.pdf` p. 95): Captures the **final operational week of ISS LIS** prior to permanent power-down on November 16, 2023.

### 2.2 NASA EIC / SVS 5011 Visualization `[CONFIRMED REQUIREMENT]` + `[VERIFIED SCIENTIFIC FACT]`
- **Locked NASA Visual `[CONFIRMED REQUIREMENT]`:** **NASA Scientific Visualization Studio (SVS) 5011** (*Earth Information Center — ISS Lightning*).
- **Local Workspace Assets `[VERIFIED SCIENTIFIC FACT]`:**
  - `iss_lightning_sphere_07312023.mp4` (`133,203,670` bytes, H.264 `1920x1080`, `30 fps`, `216.70 s` duration, no audio track) in the workspace root.
  - `Screenshot 2026-11-09 at 08.26.06.png` (`2,173,239` bytes) — reference still frame showing ISS orbital ground track, swath corridor, and golden optical lightning clusters.
- **Usage Scope `[CONFIRMED REQUIREMENT]`:** Featured as a dedicated storytelling/context visual module (Feature #2) alongside the interactive LIS data map (Feature #3), clearly labeled as archival NASA SVS 5011 visualization distinct from the Nov 9–16, 2023 interactive analytical dataset.

---

## 3. Three Scientific Observation States (Formal Rules & Counts)

### 3.1 Core Classification Rules `[CONFIRMED REQUIREMENT]` + `[VERIFIED SCIENTIFIC FACT]`
Every spatial-temporal query, grid cell, timeline window, map overlay, and sound event resolves strictly into one of three mutually exclusive states backed by traceable source identifiers and documented reason codes:

1. **`DETECTED`** (`SHORT_PERCUSSIVE_PULSE` | Reason Code: `CONFIRMED_LIGHTNING_FLASH`)
   - **Rule `[VERIFIED SCIENTIFIC FACT]`:** Valid flash record passing strict fatal-bit mask `(lightning_flash_alert_flag & 0x55) == 0`, NASA ATBD non-glint criteria (`lightning_flash_glint_index < cos(5°) = 0.996195` & Case 1 group-rate check), and zero 1-second SAA overlap `(bg_info_external_alert & 0x03) == 0`.
   - **Production Census `[VERIFIED SCIENTIFIC FACT]`:** **`14,554` confirmed flashes** (spanning `5,146` clean `viewtime` cell passes across `2,927` unique $0.5^\circ \times 0.5^\circ$ cells).

2. **`OBSERVED_NO_DETECTION`** (`SUSTAINED_OBSERVATION_TEXTURE` | Reason Code: `ACTIVE_OPTICAL_SURVEILLANCE_ZERO_FLASHES`)
   - **Rule `[VERIFIED SCIENTIFIC FACT]`:** Valid positive `viewtime` observation interval (`viewtime_effective_obs > 0.0 s`, baseline threshold verified against `min = 0.040 s` = 20 CCD frames), warning-only alert status `(viewtime_alert_flag & 0x55) == 0`, zero SAA overlap `(bg_info_external_alert & 0x03) == 0`, and zero confirmed flashes.
   - **Production Census `[VERIFIED SCIENTIFIC FACT]`:** **`3,994,260` clean quiet `viewtime` cell passes** (`157,633` unique non-detecting cells; `160,560` total observed cells).

3. **`UNKNOWN`** (`DISTINCT_NEUTRAL_TWO_PART_CUE` | 5 Documented Reason Codes)
   - **Rule `[CONFIRMED REQUIREMENT]` + `[VERIFIED SCIENTIFIC FACT]`:** Available evidence cannot verify either valid detection or valid zero-flash surveillance. Every instance carries one of five verified reason codes:
     - `INSUFFICIENT_EVIDENCE_SAA_RADIATION` (`[CONFIRMED POLICY]` — conservative SonifyEarth Task 4 Decision 1): **`161,468` `viewtime` cell passes** across **`47` contiguous SAA intervals** (`18,571` 1s records in `44` orbits) + **`1,465` non-fatal SAA flashes** (`1,486` total SAA flashes including `21` also fatal). Preserved in [`excluded_records_audit.json`](../06_PROCESSED_DATA/json/excluded_records_audit.json).
     - `FATAL_QUALITY_FLAG`: **`105` excluded flashes** (`84` fatal-only non-SAA + `21` fatal+SAA, including `100` Class 1 telemetry framing-toggle flashes) + **`10` contiguous hardware outage blocks** ($\ge 40\text{ s}$) totaling **`8,232` seconds** across **`8` granules** omitted from NASA's `viewtime_*` array.
     - `MISSING_SOURCE_DATA`: **`1` documented NASA QC gap** on `2023-11-11` (`08:55:35.300Z` to `12:01:22.200Z`, **`11,146.9 s` / `185.78 min`**) where noisy orbits `20231111_085535_NQC` and `20231111_102828_NQC` were deleted (`lis_anomalies.pdf` p. 94).
     - `OUTSIDE_OBSERVATION_COVERAGE`: Instantaneous coordinate outside the ~550 km ISS FOV swath (every ground cell within `[-55.75°, +55.25°]` between overpasses) plus **`98,640` global $0.5^\circ \times 0.5^\circ$ cells** poleward of observed viewtime bounds never viewed during the 7-day archive.
     - `UNRESOLVED_TIME_MATCH`: Timestamp outside mission dataset bounds (`< 2023-11-09T22:52:12.400Z` or `> 2023-11-16T21:17:00.000Z`).

### 3.2 Effective Observation Duration Sensitivity `[VERIFIED SCIENTIFIC FACT]`
- Baseline (`> 0.0 s`): Retains `100.00%` of clean swath (`5,146` `DETECTED` passes, `3,994,260` `OBSERVED_NO_DETECTION`, `0` sub-threshold `UNKNOWN`, `161,468` SAA `UNKNOWN`).
- Sensitivity A (`> 0.1 s`): Drops `343,630` valid edge cells (`8.59%`) to `UNKNOWN` (loses `56` `DETECTED` passes).
- Sensitivity B (`> 1.0 s`): Drops `696,084` valid edge cells (`17.40%`) to `UNKNOWN` (loses `124` `DETECTED` passes).

---

## 4. Two Listening Modes & Sound Design Specification

### 4.1 The Two Listening Modes `[CONFIRMED REQUIREMENT]`
1. **`Event-only`**: Focuses audibly on verified lightning detections (`DETECTED` $\to$ short percussive pulse), while still truthfully labeling observation status visually/textually in telemetry and the evidence inspector without turning silent gaps into false "zero lightning" claims.
2. **`Observation-aware`**: Dynamically sonifies all three observation states across the selected region/window — `DETECTED` (short percussive pulse), `OBSERVED_NO_DETECTION` (sustained observation texture confirming active surveillance), and `UNKNOWN` (distinct neutral two-part cue communicating unobserved intervals, SAA zones, fatal outages, or QC gaps).
- **Shared Package Mandate `[CONFIRMED REQUIREMENT]`:** Both listening modes must operate on the **exact same selected data package** (same region, validated time window, and processed NASA JSON slice) for direct comparative listening.

### 4.2 Approved Sound Design Rules `[CONFIRMED REQUIREMENT]`
- **Technology:** Dynamic synthesis in the browser via **Web Audio API** (zero external prerecorded thunder audio clips or unrelated background music).
- **Three Approved Sound Cues:**
  - `DETECTED` $\to$ **Short percussive pulse**.
  - `OBSERVED_NO_DETECTION` $\to$ **Sustained observation texture**.
  - `UNKNOWN` $\to$ **Distinct neutral two-part cue**.
- **Prohibited Audio Mappings:**
  - Do **NOT** map `lightning_flash_radiance` to storm intensity or loudness without an explicitly approved scientific mapping.
  - Do **NOT** map latitude to musical pitch, `bg_data` background radiance to ambient synthesizer drones, or solar vectors to audio filter modulation (`TASK_2_1_SCIENTIFIC_AUDIT.md`, `processing_config.json`).

---

## 5. Mandatory Product Features & Interactive UX Architecture

### 5.1 Locked 11 Product Features `[CONFIRMED REQUIREMENT]`
1. **Landing and storytelling page** introducing *SonifyEarth — Silence Isn't Zero* (*An Observation-Aware Lightning Jukebox*).
2. **NASA EIC lightning visualization** showcasing **SVS 5011** (`iss_lightning_sphere_07312023.mp4`).
3. **Interactive global-capable LIS data map** rendering real GeoJSON layers ([`lightning_events.geojson`](../06_PROCESSED_DATA/geojson/lightning_events.geojson), [`observation_grid.geojson`](../06_PROCESSED_DATA/geojson/observation_grid.geojson), [`unknown_coverage.geojson`](../06_PROCESSED_DATA/geojson/unknown_coverage.geojson)) with global zoom/pan including high-latitude `UNKNOWN` truth.
4. **Region and validated time-window selection** constrained strictly to actual archival windows (`2023-11-09T22:52:12Z` to `2023-11-16T21:17:00Z`) and selectable preset/custom geographic regions or coordinates.
5. **Synchronized timeline and playback** driven by [`sonifyearth_windows.json`](../06_PROCESSED_DATA/json/sonifyearth_windows.json) (`107` orbital & QC-gap windows, `47` SAA windows, `10` fatal outage windows, `2,350` swath keyframes) with play/pause, scrub, speed, and mute controls.
6. **Two listening modes** (**`Event-only`** and **`Observation-aware`**) sharing the active data selection.
7. **Three scientific states** (`DETECTED`, `OBSERVED_NO_DETECTION`, `UNKNOWN`) displayed uniformly across map, timeline, audio, and text readouts.
8. **Dynamic Web Audio API sound engine** implementing the three approved cues with clean unlock-on-user-gesture compliance (zero autoplay).
9. ***"Why Did I Hear That?"* evidence inspector** revealing complete underlying provenance for any active timestamp, flash, or selected grid cell.
10. **Data and methodology panel** explaining Datasets `DATA111` & `DATA211`, TAI93 $\to$ UTC (`-10.0 s` leap correction), quality bitmasks (`0x55`/`0xAA`/`0x03`), `viewtime` coverage rules, SAA policy, and sensitivity counts.
11. **Accessibility-focused interaction and controls** (full keyboard navigation, ARIA/semantic structure, screen-reader live updates, non-colour-only encoding, synchronous audio text equivalents, reduced-motion support).

### 5.2 Interactive Global Map, Timeline & Dashboard `[CONFIRMED REQUIREMENT]` + `[INFERRED IMPLEMENTATION DETAIL]`
- **Map Geometry Fidelity `[CONFIRMED REQUIREMENT]`:** Render only geometries grounded in real coordinates (`Point` flashes, $0.5^\circ \times 0.5^\circ$ `Polygon` viewtime cells, `bg_data_summary_corners` 4-corner SAA FOV polygons, contiguous fatal `LineString` tracks). **Never** invent storm polygons, city lightning scores, or continuous swath blankets.
- **State Encoding Pairing `[CONFIRMED REQUIREMENT]`:** Distinguish `DETECTED`, `OBSERVED_NO_DETECTION`, and `UNKNOWN` using distinct shapes/patterns/icons + crisp text state badges alongside color (never color alone).
- **Dashboard & Map Stack `[INFERRED IMPLEMENTATION DETAIL]`:** A clean single-page or multi-section modern web app under [`08_WEBSITE/frontend/`](../08_WEBSITE/frontend/) and [`09_SOUND_ENGINE/`](../09_SOUND_ENGINE/) using a lightweight interactive globe/projection renderer (e.g., Canvas/WebGL/SVG/Three.js or GeoJSON-capable map library) consuming static/chunked processed JSON/GeoJSON from [`06_PROCESSED_DATA/`](../06_PROCESSED_DATA/) without an external database. *(Stack selection remains an implementation choice subject to UI/UX planning.)*

### 5.3 *"Why Did I Hear That?"* Evidence Inspector `[CONFIRMED REQUIREMENT]` + `[INFERRED IMPLEMENTATION DETAIL]`
- **Required Provenance Fields `[CONFIRMED REQUIREMENT]`:** Every inspected audio cue or spatial-temporal query must display its scientific state (`DETECTED` / `OBSERVED_NO_DETECTION` / `UNKNOWN`), exact reason code (e.g., `CONFIRMED_LIGHTNING_FLASH`, `ACTIVE_OPTICAL_SURVEILLANCE_ZERO_FLASHES`, `INSUFFICIENT_EVIDENCE_SAA_RADIATION`, `MISSING_SOURCE_DATA`, `FATAL_QUALITY_FLAG`, `OUTSIDE_OBSERVATION_COVERAGE`), original `TAI93` timestamp(s), validated `UTC` timestamp(s), source `science_file` & `backgrounds_file`, `granule_id` / `orbit_id`, record identifier (`flash_id` / `viewtime_index`), `alert_flag` hex decoding, SAA overlap status, and optical metadata (`radiance` in $\mu\text{J/sr/m}^2/\mu\text{m}$ labeled strictly as optical energy, never storm severity; `child_count`, `effective_obs_seconds`).
- **Pre-Verified Anchor Cases `[VERIFIED SCIENTIFIC FACT]`:** [`05_SCIENTIFIC_VALIDATION/REAL_STATE_EXAMPLES.json`](../05_SCIENTIFIC_VALIDATION/REAL_STATE_EXAMPLES.json) provides 6 independently reproducible NASA records spanning all 3 states and major `UNKNOWN` reason codes (ideal for guided inspector presets & automated integration tests).

---

## 6. Mandatory Accessibility Requirements `[CONFIRMED REQUIREMENT]`

1. **Keyboard-Operable Controls:** All navigation, region/time selectors, timeline scrubbers, listening-mode toggles, map inspection targets/presets, playback controls, and inspector drawers reachable and operable via keyboard (`Tab`, `Enter`/`Space`, arrow keys where standard) without keyboard traps.
2. **Semantic HTML & ARIA:** Native semantic landmarks (`header`, `nav`, `main`, `section`, `footer`), clean heading hierarchy, programmatic `<label>` associations, `aria-pressed` / `role="radiogroup"` or segmented controls for modes, and `aria-live` status regions for playback/state announcements.
3. **Visible Focus Indicators:** High-contrast `focus-visible` outlines across all interactive controls.
4. **Non-Colour-Only State Communication:** Explicit iconography/patterns + text state labels for `DETECTED`, `OBSERVED_NO_DETECTION`, and `UNKNOWN`.
5. **Text Equivalents for Audio:** Synchronous visual state readout and event log/transcript explaining the active sound cue in real time as playback runs.
6. **No Autoplay:** Audio synthesis must never start automatically on page load or mode load; starts only on explicit user activation.
7. **Accessible Playback & Mute Controls:** Prominent, always-accessible Play/Pause, Mute/Unmute, Volume (master gain), Timeline Scrub, and Listening Mode switcher.
8. **Reduced Motion Support:** Honor `prefers-reduced-motion: reduce` (plus optional explicit UI toggle) by disabling or minimizing rapid animations, pulsing rings, and continuous globe spin while keeping state updates clear.
9. **Testing Truthfulness Rule:** Run automated **`axe-core`** audits (`0` unresolved critical/serious issues) and **Playwright** keyboard/reduced-motion tests; **never** claim physical blind or low-vision user testing unless formally executed and documented.

---

## 7. Data Processing, Frontend Architecture & Provenance `[CONFIRMED REQUIREMENT]` + `[VERIFIED SCIENTIFIC FACT]`

### 7.1 Pipeline & Storage Architecture
- **Tier 1 — Immutable Raw NASA Archive [`01_NASA_RAW_DATA/`](../01_NASA_RAW_DATA/) `[VERIFIED SCIENTIFIC FACT]`:** `428` original files (`212` Science/Background `.nc` + `212` `.hdf` + `4` PDFs) checksummed in [`DATA_INVENTORY.csv`](../DATA_INVENTORY.csv). Never altered by runtime apps.
- **Tier 2 — Deterministic Python Data Engine [`04_DATA_PROCESSING/`](../04_DATA_PROCESSING/) `[VERIFIED SCIENTIFIC FACT]`:** [`build_production_data.py`](../04_DATA_PROCESSING/scripts/build_production_data.py) and [`validate_production_data.py`](../04_DATA_PROCESSING/scripts/validate_production_data.py) produce & verify `11/11` quality/schema/geometry/reconciliation checks.
- **Tier 3 — Normalized Web-Ready Payloads [`06_PROCESSED_DATA/`](../06_PROCESSED_DATA/) `[VERIFIED SCIENTIFIC FACT]`:**
  - JSON (`7` files): `source_manifest.json` (`155,979` B), `flash_events.json` (`16,129,369` B — `14,554` flashes), `observation_windows.json` (`7,167,102` B — `106` granule summaries + `8,459` sampled cell windows), `three_state_data.json` (`129,656` B), `sonifyearth_windows.json` (`1,162,415` B), `excluded_records_audit.json` (`1,387,879` B — `1,570` excluded flashes + `47` SAA + `10` fatal + `1` QC gap), `schema.json` (`2,808` B).
  - GeoJSON (`3` files): `lightning_events.geojson` (`10,842,992` B — `14,554` Points), `observation_grid.geojson` (`4,358,371` B — `5,532` Polygons), `unknown_coverage.geojson` (`697,198` B — `864` Features).
- **Tier 4 — Frontend & Sound Engine Runtime (`08_WEBSITE/`, `09_SOUND_ENGINE/`) `[CONFIRMED REQUIREMENT]`:**
  - Must NOT introduce an unnecessary database or backend service; consume static/processed JSON & GeoJSON directly unless a demonstrated technical requirement (e.g., payload slicing/indexing of the `16.1 MB` flash file) warrants a tiny read-only helper/API.
  - Note on Payload Optimization `[INFERRED IMPLEMENTATION DETAIL]`: Because `flash_events.json` (`~16.1 MB`) and `lightning_events.geojson` (`~10.8 MB`) exceed typical mobile first-paint budgets if loaded eagerly, Vite/frontend builds may partition or stream chunked JSON derived *strictly deterministically* from [`06_PROCESSED_DATA/`](../06_PROCESSED_DATA/) while keeping exact schema/provenance intact.

---

## 8. Documented Scientific & Technical Limitations `[DOCUMENTED LIMITATION]`

1. **Discontinuous Swath Observation:** Any Earth coordinate inside `[-55.75°, +55.25°]` is only observed for ~80–95 s per overhead ISS pass (~550 km swath at `51.6°` inclination), and high latitudes beyond `[-55.75°, +55.25°]` (`98,640` global $0.5^\circ$ cells) receive zero coverage.
2. **Diurnal Detection Efficiency Variation (`science_v2_guide.pdf` p. 20):** NASA documents optical LIS detection efficiency ranging from **~69% near local solar noon to ~88% at night** due to bright sunlit cloud-top background thresholds.
3. **Conservative SAA Reclassification Rule:** Task 4 Decision 1 (`UNKNOWN` / `INSUFFICIENT_EVIDENCE_SAA_RADIATION` for all `161,468` SAA-overlapping `viewtime` rows and `1,486` SAA-overlapping flashes) is a conservative SonifyEarth policy to prevent false confidence under Van Allen trapped proton noise, not a claim that zero true lightning exists in those 1,486 excluded flashes. Additionally, `71` confirmed non-SAA flashes fell inside `17` boundary cells whose ~85 s `viewtime` window partially crossed an SAA boundary.
4. **Swath-Edge Exposure & Partial Final Orbit:** `696,084` clean `viewtime` cell passes have `0.04 s <= eff_obs <= 1.0 s` along swath edges (`min = 0.040 s` = 20 frames); final granule `20231116_203042_FIN.nc` stops telemetry at `21:17:00Z` (`2,778 s`) due to ISS LIS decommissioning (`lis_anomalies.pdf` p. 95).
5. **Radiance Is Not Storm Severity:** Calibrated optical radiance ($\mu\text{J/sr/m}^2/\mu\text{m}$) measures sensor-level top-of-cloud optical energy, not ground-strike peak current, hail, wind, or thunderstorm hazard severity.

---

## 9. Conflict Ledger & Unresolved Questions `[UNRESOLVED QUESTION]`

These items were verified as conflicts or missing/unspecified details across existing workspace files and MUST NOT be hidden or silently overridden:

| ID | Topic | Observed Conflict or Gap | Governance / Action for Task 5+ |
| :---: | :--- | :--- | :--- |
| **Q1** | **Listening Mode Identifiers** | Locked Master rule requires **`Event-only`** and **`Observation-aware`**. Task 4 config [`processing_config.json`](../04_DATA_PROCESSING/configuration/processing_config.json) & [`sonifyearth_windows.json`](../06_PROCESSED_DATA/json/sonifyearth_windows.json) contain `"EVIDENCE_INSPECTOR_MODE"` and `"GLOBAL_ORBITAL_PLAYBACK_MODE"`. | **Follow Priority 1:** UI labels, controls, state store, and Web Audio modes MUST be **`Event-only`** and **`Observation-aware`**. Treat the JSON keys as legacy metadata until/unless user approves regenerating Task 4 JSON; explicitly note the discrepancy if referencing `locked_sound_mapping`. |
| **Q2** | **Legacy README & Sound Docs** | [`README.md`](../README.md), [`09_SOUND_ENGINE/README.md`](../09_SOUND_ENGINE/README.md), [`dataset_schema_report.md`](../03_DATA_INSPECTION/dataset_schema_report.md), and [`06_PROCESSED_DATA/README.md`](../06_PROCESSED_DATA/README.md) describe $\pm 38^\circ$ TRMM latitude and radiance/latitude audio mappings. | **Superseded by Priorities 1–2:** Strictly ignore legacy Task 1–2 speculative text. Consider updating stale folder READMEs when Task 5 updates docs. |
| **Q3** | **Task 4 Markdown Prose Typo** | [`FINAL_THREE_STATE_COUNTS.md`](../07_PROJECT_REPORTS/validation/FINAL_THREE_STATE_COUNTS.md) wrote `8,195 s` across `7` granules for contiguous fatal outages, whereas actual [`excluded_records_audit.json`](../06_PROCESSED_DATA/json/excluded_records_audit.json) & [`three_state_data.json`](../06_PROCESSED_DATA/json/three_state_data.json) contain **`10` intervals across `8` granules totaling `8,232 s`**. | Use **`10` intervals / `8` granules / `8,232 s`** from the verified JSON payloads whenever displaying telemetry outage metrics. |
| **Q4** | **Historical Master & Bangladesh Guide** | Original `Main Final Project Master` and `Bangladesh Participants Guide` files are not present in `.`. Specific Hackathon submission boilerplate (e.g., team credits, participant-guide formatting rules) cannot be verified locally. | Proceed cleanly on Task 5 using this verified Master Specification; confirm team/submission metadata with the user prior to final Hackathon packaging. |
| **Q5** | **Exact Acoustic Timbre & Frontend Tech Stack** | Approved spec locks the 3 cue archetypes (*short percussive pulse*, *sustained observation texture*, *distinct neutral two-part cue*) and *Event-only / Observation-aware* modes, but exact synth patch frequencies, envelopes, WebGL/map library choice, and exact UI copy/presets remain open design decisions. | Resolve collaboratively during Task 5 Planning (`superpowers:brainstorming` + `writing-plans` + `ui-ux-pro-max`) while strictly obeying all scientific & sound prohibitions above. |

---

## 10. Expected End-to-End User Experience `[CONFIRMED REQUIREMENT]` + `[INFERRED IMPLEMENTATION DETAIL]`

1. **Arrival & Framing `[CONFIRMED REQUIREMENT]`:** Visitor lands on an accessible, high-clarity scientific storytelling experience introducing *"SonifyEarth — Silence Isn't Zero"* and watching/inspecting the NASA **SVS 5011** ISS LIS lightning sphere (`iss_lightning_sphere_07312023.mp4`) with full media controls and captions/descriptions.
2. **Exploration & Time/Region Selection `[CONFIRMED REQUIREMENT]`:** Visitor opens the interactive global-capable LIS workspace, picks a preset scientific story region (e.g., an active tropical storm swath, an empty observed Pacific cell, a high-latitude out-of-swath city like Reykjavik, an SAA transit pass, or the Nov 11 `185.8 min` NASA QC gap) or selects a custom viewport/time window across Nov 9–16, 2023.
3. **Interactive Dual-Mode Listening `[CONFIRMED REQUIREMENT]`:** User explicitly starts playback (zero autoplay) and toggles seamlessly between **`Event-only`** and **`Observation-aware`** on the *same selected data package* — immediately hearing the difference between lightning-only clicks vs. hearing the orbital observation texture and the distinct neutral two-part `UNKNOWN` cue whenever surveillance is blind or absent.
4. **Evidence Traceability (`Why Did I Hear That?`) `[CONFIRMED REQUIREMENT]`:** Clicking any sound cue, timeline segment, grid square, or flash marker opens the evidence inspector displaying exact NASA file names, `granule_id`, raw `TAI93` & validated `UTC`, bitmask alert flags, SAA status, and scientific reason codes — proving every sound is grounded in real NASA orbital observations.
5. **Scientific Literacy & Full Inclusion `[CONFIRMED REQUIREMENT]`:** Screen-reader live regions, visual non-colour state indicators, synchronous audio transcripts, full keyboard control, reduced-motion safety, and the transparent Data & Methodology panel ensure every visitor—sighted, blind/low-vision (via automated WCAG/`axe-core`/keyboard compliance), educator, or scientist—experiences NASA data truthfully.

