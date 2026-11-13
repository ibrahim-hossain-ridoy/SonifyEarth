# SonifyEarth Production JSON & GeoJSON Schema Reference

**Location:** `10_DEVELOPER_HANDOFF/data_schema/PRODUCTION_JSON_AND_GEOJSON_SCHEMA.md`  
**Source Directory:** `06_PROCESSED_DATA/json/` and `06_PROCESSED_DATA/geojson/`  
**Formal JSON Schema File:** [`06_PROCESSED_DATA/json/schema.json`](../../06_PROCESSED_DATA/json/schema.json)

---

## 1. Production JSON Files (`06_PROCESSED_DATA/json/`)

| Filename | Size (Bytes) | Top-Level Keys & Record Counts |
| :--- | :---: | :--- |
| `source_manifest.json` | `155,979` | `schema_version`, `project`, `challenge`, `datasets`, `documentation_references`, `mission_temporal_coverage`, `aggregate_source_totals`, `granule_pairs` (`106` paired Science V2.2 & Backgrounds V2.2 granules). |
| `flash_events.json` | `16,129,369` | `schema_version`, `dataset`, `collection_id` (`ISS_LIS_SC_V2.2`), `doi` (`10.5067/LIS/ISSLIS/DATA111`), `filtering_rules_applied`, `summary_counts`, `flashes` (`14,554` confirmed `DETECTED` flash objects). |
| `observation_windows.json` | `7,167,102` | `schema_version`, `dataset`, `source_collection`, `spatial_grid_resolution` (`0.5`), `global_observation_census` (`4,160,874` total `viewtime` records), `granule_observation_windows` (`106` per-orbit summaries), `grid_observation_records` (`8,459` traceable cell observation records). |
| `three_state_data.json` | `129,656` | `schema_version`, `dataset`, `scientific_principle`, `three_state_definitions` (`DETECTED`, `OBSERVED_NO_DETECTION`, `UNKNOWN`), `decision_3_effective_observation_sensitivity` (`> 0.0 s`, `> 0.1 s`, `> 1.0 s`), `granule_three_state_summaries` (`106` orbits). |
| `sonifyearth_windows.json` | `1,162,415` | `schema_version`, `dataset`, `coverage_disclaimer`, `locked_sound_mapping`, `timeline_bounds`, `orbital_and_gap_windows` (`107` windows: `106` orbits + `1` Nov 11 QC gap), `saa_transit_windows` (`47` windows), `contiguous_fatal_outage_windows` (`10` windows), `swath_keyframes` (`2,350` keyframes). |
| `excluded_records_audit.json` | `1,387,879` | `schema_version`, `dataset`, `policy_statement`, `reconciliation_summary`, `excluded_flashes` (`1,570` excluded flashes: `1,465` SAA-only + `84` fatal-only + `21` fatal+SAA), `saa_affected_intervals` (`47`), `contiguous_fatal_outage_intervals` (`10`), `qc_deleted_orbit_gaps` (`1`). |
| `schema.json` | `2,808` | JSON Schema Draft 2020-12 definitions validated by `04_DATA_PROCESSING/scripts/validate_production_data.py`. |

---

## 2. Production GeoJSON Files (`06_PROCESSED_DATA/geojson/`)

| Filename | Size (Bytes) | Geometry Types & Feature Breakdown |
| :--- | :---: | :--- |
| `lightning_events.geojson` | `10,842,992` | `14,554` `Point` features (`state: "DETECTED"`, `reason_code: "CONFIRMED_LIGHTNING_FLASH"`, `sound_cue: "SHORT_PERCUSSIVE_PULSE"`). |
| `observation_grid.geojson` | `4,358,371` | `5,532` $0.5^\circ \times 0.5^\circ$ `Polygon` features (`2,927` unique `DETECTED` cells + `2,605` representative `OBSERVED_NO_DETECTION` cells). |
| `unknown_coverage.geojson` | `697,198` | `864` `UNKNOWN` features: `624` SAA-affected $0.5^\circ$ `Polygon` cells, `228` SAA 4-corner FOV swath `Polygon` footprints (`INSUFFICIENT_EVIDENCE_SAA_RADIATION`), `11` contiguous fatal outage subsatellite `LineString` segments (`FATAL_QUALITY_FLAG`), and `1` high-latitude unobserved reference `Polygon` cell at Reykjavik `+64.25_-21.75` (`OUTSIDE_OBSERVATION_COVERAGE`). |

