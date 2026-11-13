# SonifyEarth — Production JSON & GeoJSON Automated Validation Report
**Project:** SonifyEarth — Silence Isn't Zero  
**NASA Space Apps Challenge 2026:** The Earth Information Jukebox  
**Date:** November 11, 2026  
**Validation Suite:** [`04_DATA_PROCESSING/scripts/validate_production_data.py`](04_DATA_PROCESSING/scripts/validate_production_data.py)  
**Schema Specification:** [`06_PROCESSED_DATA/json/schema.json`](06_PROCESSED_DATA/json/schema.json)

---

## 1. Automated Validation Summary (11 / 11 Gates Passed)

The automated validation suite [`validate_production_data.py`](04_DATA_PROCESSING/scripts/validate_production_data.py) was executed against all 7 JSON files in `06_PROCESSED_DATA/json/`, all 3 GeoJSON files in `06_PROCESSED_DATA/geojson/`, and all 212 original NASA NetCDF-4 files in `01_NASA_RAW_DATA/`.

| Gate # | Validation Requirement | Scope Tested | Result | Empirical Verification Detail |
| :---: | :--- | :---: | :---: | :--- |
| **1** | **Valid Source IDs on All Event Records** | `16,124` flashes (`14,554` valid + `1,570` excluded) | **PASS** | 100% of records carry valid `flash_id`, `flash_address`, `granule_id`, `source_file`, `backgrounds_file`, and `matched_viewtime_index` matching `source_manifest.json`. |
| **2** | **Geographic Bounds Verification** | `14,554` flashes + `8,459` obs windows + `20,950` GeoJSON features | **PASS** | 100% within valid WGS-84 bounds `[-90°, +90°]` $\times$ `[-180°, +180°]` and ISS LIS orbital envelope `[-55.75°, +55.25°]` lat. |
| **3** | **TAI93 $\to$ UTC Timestamp Consistency** | `33,254` timestamps across manifest, flashes, & windows | **PASS** | Recomputed `Epoch(1993-01-01T00:00:00Z) + (TAI93 - 10.0s)` on every record: **`0.000000 s` maximum error**. |
| **4** | **Quality Flag & SAA Bitmask Decoding** | `16,124` flashes + `8,459` obs records | **PASS** | `0` confirmed flashes have `(alert_flag & 0x55) != 0` or `(external_alert_1s & 0x03) != 0` or `glint_index >= cos(5°)`; 100% of SAA-overlapping `viewtime` records are `UNKNOWN`. |
| **5** | **State & Reason Code Completeness** | `46,477` records & GeoJSON features | **PASS** | Every record/feature carries a valid state in `{"DETECTED", "OBSERVED_NO_DETECTION", "UNKNOWN"}` and a documented reason code. |
| **6** | **No Missing Data Represented as Zero** | `1` QC gap, `10` fatal outages, `47` SAA transits, `8,459` obs records | **PASS** | Zero fill values (`-9999`), missing granules, fatal outages, or SAA intervals are represented as `0` lightning or `OBSERVED_NO_DETECTION`. |
| **7** | **Duplicate Flash Prevention** | `14,554` valid + `1,570` excluded + `14,554` GeoJSON points | **PASS** | `14,554` unique valid IDs and `1,570` unique excluded IDs; `valid ∩ excluded = ∅` (`14,554 + 1,570 = 16,124`). |
| **8** | **Original NASA Data Integrity (SHA-256)** | `212` NetCDF-4 files (`106` SC + `106` BG) | **PASS** | Recomputed SHA-256 hashes of all 212 `.nc` files against `DATA_INVENTORY.csv`: **100% bit-for-bit identical**. |
| **9** | **JSON Schema Validation** | All `6` data JSON files vs `schema.json` | **PASS** | All top-level and item-level required properties validated against formal JSON Schema specifications. |
| **10** | **GeoJSON Geometry Validation** | `20,950` features across `3` GeoJSON files | **PASS** | Verified RFC 7946 `Point` (`14,554`), `Polygon` (`6,385`), and `LineString` (`11`) geometries: closed rings, non-zero area, no antimeridian wrap defects. |
| **11** | **Source-to-Output Count Reconciliation** | `16,124` flashes & `4,160,874` `viewtime` records | **PASS** | Exact 100% reconciliation across flashes (`14,554 + 84 + 21 + 1,465 = 16,124`) and `viewtime` passes at all 3 thresholds (`> 0.0 s`, `> 0.1 s`, `> 1.0 s`). |

---

## 2. GeoJSON Feature & Geometry Breakdown (`20,950` Validated Features)

| GeoJSON File | Geometry Types | Feature Count | Verified Properties & Provenance |
| :--- | :---: | :---: | :--- |
| [`lightning_events.geojson`](06_PROCESSED_DATA/geojson/lightning_events.geojson) | `Point` | **`14,554`** | Confirmed `DETECTED` flashes with `[lon, lat]`, `flash_id`, `tai93_time`, `utc_time`, `radiance`, `child_count`, `grid_cell_id`, `source_file` |
| [`observation_grid.geojson`](06_PROCESSED_DATA/geojson/observation_grid.geojson) | `Polygon` | **`5,532`** | `2,927` unique $0.5^\circ \times 0.5^\circ$ `DETECTED` grid cells (100% of all cells with confirmed flashes) + `2,605` verified `OBSERVED_NO_DETECTION` $0.5^\circ \times 0.5^\circ$ grid cells |
| [`unknown_coverage.geojson`](06_PROCESSED_DATA/geojson/unknown_coverage.geojson) | `Polygon`, `LineString` | **`864`** | `624` SAA-affected $0.5^\circ$ `viewtime` cells + `228` SAA 4-corner FOV swath polygons (`bg_data_summary_corners`) + `11` contiguous fatal subsatellite ground-track `LineString` segments + `1` out-of-coverage polar reference cell |
| **Total Validated Features** | — | **`20,950`** | **0 invalid geometries, 0 synthetic polygons, 0 unclosed rings** |

