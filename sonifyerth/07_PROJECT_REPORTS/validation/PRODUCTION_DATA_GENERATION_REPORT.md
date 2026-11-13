# SonifyEarth — Task 4 Production Data Generation Report
**Project:** SonifyEarth — Silence Isn't Zero  
**NASA Space Apps Challenge 2026:** The Earth Information Jukebox  
**Date:** November 11, 2026  
**Engine Script:** [`04_DATA_PROCESSING/scripts/build_production_data.py`](04_DATA_PROCESSING/scripts/build_production_data.py)  
**Configuration:** [`04_DATA_PROCESSING/configuration/processing_config.json`](04_DATA_PROCESSING/configuration/processing_config.json)

---

## 1. Executive Summary

The SonifyEarth production scientific data engine has deterministically processed all **106 NASA ISS LIS Science V2.2 (`DATA111`)** and **106 NASA ISS LIS Backgrounds V2.2 (`DATA211`)** NetCDF-4 granules (`212` files total) into **7 normalized JSON payloads** and **3 validated GeoJSON FeatureCollections** without modifying any original NASA file (`212 / 212` SHA-256 hashes verified bit-for-bit identical).

---

## 2. Generated Production Datasets Inventory

| File Path | Format | Exact Size (Bytes) | Primary Records / Features | Scientific Purpose |
| :--- | :---: | :---: | :--- | :--- |
| [`06_PROCESSED_DATA/json/source_manifest.json`](06_PROCESSED_DATA/json/source_manifest.json) | JSON | `155,979` | 106 granule pairs (212 files) | DOIs (`10.5067/LIS/ISSLIS/DATA111`, `DATA211`), collection IDs, SHA-256 hashes, TAI93 & UTC bounds, record counts |
| [`06_PROCESSED_DATA/json/flash_events.json`](06_PROCESSED_DATA/json/flash_events.json) | JSON | `16,129,369` | `14,554` confirmed flashes | Valid `DETECTED` lightning flashes with raw TAI93, validated UTC, coordinates, child counts, quality flags, and matched $0.5^\circ$ grid cells |
| [`06_PROCESSED_DATA/json/observation_windows.json`](06_PROCESSED_DATA/json/observation_windows.json) | JSON | `7,167,102` | `106` granule summaries + `8,459` traceable cell records | Reconciles all `4,160,874` `viewtime_*` records with TAI93/UTC bounds, effective observation duration, alert flags, and SAA status |
| [`06_PROCESSED_DATA/json/three_state_data.json`](06_PROCESSED_DATA/json/three_state_data.json) | JSON | `129,656` | `3` state specs + `106` granule summaries + sensitivity matrix | Formal `DETECTED`, `OBSERVED_NO_DETECTION`, and `UNKNOWN` classification counts and `> 0.0 s` / `> 0.1 s` / `> 1.0 s` sensitivity comparison |
| [`06_PROCESSED_DATA/json/sonifyearth_windows.json`](06_PROCESSED_DATA/json/sonifyearth_windows.json) | JSON | `1,162,415` | `107` orbit/gap windows, `47` SAA windows, `10` fatal windows, `2,350` keyframes | Chronological playback timeline linked to locked sound cues (`SHORT_PERCUSSIVE_PULSE`, `SUSTAINED_OBSERVATION_TEXTURE`, `DISTINCT_NEUTRAL_TWO_PART_CUE`) |
| [`06_PROCESSED_DATA/json/excluded_records_audit.json`](06_PROCESSED_DATA/json/excluded_records_audit.json) | JSON | `1,387,879` | `1,570` excluded flashes + `47` SAA intervals + `10` fatal outages + `1` QC gap | Complete non-destructive provenance audit of every excluded flash and downgraded observation interval |
| [`06_PROCESSED_DATA/json/schema.json`](06_PROCESSED_DATA/json/schema.json) | JSON | `2,808` | 7 formal schema definitions | JSON Schema (Draft 2020-12) validation rules for all JSON and GeoJSON payloads |
| [`06_PROCESSED_DATA/geojson/lightning_events.geojson`](06_PROCESSED_DATA/geojson/lightning_events.geojson) | GeoJSON | `10,842,992` | `14,554` `Point` features | RFC 7946 georeferenced confirmed lightning centroids (`DETECTED`) |
| [`06_PROCESSED_DATA/geojson/observation_grid.geojson`](06_PROCESSED_DATA/geojson/observation_grid.geojson) | GeoJSON | `4,358,371` | `5,532` `Polygon` features | All `2,927` unique $0.5^\circ \times 0.5^\circ$ `DETECTED` grid cells + `2,605` verified `OBSERVED_NO_DETECTION` grid cells |
| [`06_PROCESSED_DATA/geojson/unknown_coverage.geojson`](06_PROCESSED_DATA/geojson/unknown_coverage.geojson) | GeoJSON | `697,198` | `864` `Polygon` & `LineString` features | `624` SAA $0.5^\circ$ cells, `228` SAA 4-corner FOV polygons, `11` contiguous fatal ground-track segments, and `1` out-of-coverage polar reference cell |

---

## 3. Locked Scientific Decisions Implemented

1. **Decision 1 — Conservative SAA Quality Policy**:
   - Identified **47 contiguous 1-second SAA intervals** (`18,571` total seconds across `44` orbits) using `(bg_info_external_alert & 0x03) != 0`.
   - Reclassified all **161,468** overlapping `viewtime_*` cell observations to `UNKNOWN` with reason code `INSUFFICIENT_EVIDENCE_SAA_RADIATION` (never claiming `OBSERVED_NO_DETECTION`).
   - Excluded all **1,486** candidate flashes overlapping 1-second SAA intervals (`1,465` non-fatal SAA flashes + `21` fatal+SAA flashes) from confirmed `DETECTED` events and preserved them in [`excluded_records_audit.json`](06_PROCESSED_DATA/json/excluded_records_audit.json).
2. **Decision 2 — Strict Flash Quality & Non-Glint Filtering**:
   - Applied `(lightning_flash_alert_flag & 0x55) == 0`, excluding all **105** fatal-flagged flashes (`84` non-SAA + `21` also in SAA), including the **100** isolated Class 1 telemetry framing-toggle flashes (`fatal_run_length_seconds <= 2`) and **5** flashes in $\ge 3\text{ s}$ fatal runs.
   - Enforced NASA ATBD Section 3.4.3.10.2.2 non-glint criteria (`lightning_flash_glint_index < cos(5°)` and group rate $\le 250/\text{s}$); `0` flashes in the Final QC V2.2 files violated the glint filter (maximum `glint_index = 0.970547`, corresponding to $13.94^\circ$ specular angle).
   - Preserved `lightning_flash_radiance` strictly as source optical metadata ($\mu\text{J/sr/m}^2/\mu\text{m}$), never interpreting it as storm severity or mapping it to sound loudness.
3. **Decision 3 — Effective Observation Duration Baseline & Sensitivity**:
   - Applied `viewtime_effective_obs > 0.0 s` (`min = 0.040 s` = 20 CCD frames) as the baseline positive observation criterion across all `3,999,406` clean non-SAA `viewtime` records, and executed full sensitivity comparisons at `> 0.1 s` and `> 1.0 s`.

---

## 4. Reproducibility Commands

```bash
# 1. Regenerate all 10 production JSON and GeoJSON files from raw NetCDF-4 granules
.venv/bin/python3 04_DATA_PROCESSING/scripts/build_production_data.py

# 2. Run the 11-gate automated production validation suite
.venv/bin/python3 04_DATA_PROCESSING/scripts/validate_production_data.py
```

