# SonifyEarth — Final Three-State Counts & Sensitivity Analysis Report
**Project:** SonifyEarth — Silence Isn't Zero  
**NASA Space Apps Challenge 2026:** The Earth Information Jukebox  
**Date:** November 11, 2026  
**Source Payload:** [`06_PROCESSED_DATA/json/three_state_data.json`](06_PROCESSED_DATA/json/three_state_data.json)

---

## 1. Final Production Three-State Census (Baseline: `viewtime_effective_obs > 0.0 s`)

Across the 106 paired ISS LIS V2.2 granules (`2023-11-09T22:52:12.400000Z` to `2023-11-16T21:17:00.000000Z` actual telemetry end / `22:03:35.200000Z` nominal orbit header end):

### 1.1 Lightning Flash Event Level (`16,124` Total Source Flashes)

| Classification / Disposition | Reason Code | Flash Count | % of Source Flashes | Locked Sound Cue |
| :--- | :--- | :---: | :---: | :--- |
| **`DETECTED` (Confirmed)** | `CONFIRMED_LIGHTNING_FLASH` | **14,554** | **90.26%** | `SHORT_PERCUSSIVE_PULSE` |
| **Excluded $\to$ `UNKNOWN` (SAA Only)** | `INSUFFICIENT_EVIDENCE_SAA_RADIATION` | **1,465** | **9.09%** | `DISTINCT_NEUTRAL_TWO_PART_CUE` |
| **Excluded $\to$ `UNKNOWN` (Fatal Flag Only)** | `FATAL_FLASH_ALERT_FLAG` | **84** | **0.52%** | `DISTINCT_NEUTRAL_TWO_PART_CUE` |
| **Excluded $\to$ `UNKNOWN` (Fatal + SAA)** | `FATAL_FLASH_ALERT_FLAG` + `INSUFFICIENT_EVIDENCE_SAA_RADIATION` | **21** | **0.13%** | `DISTINCT_NEUTRAL_TWO_PART_CUE` |
| **Excluded $\to$ `UNKNOWN` (Glint Filter)** | `SOLAR_GLINT_CONTAMINATION` | **0** | **0.00%** | — |
| **Total Reconciled Source Flashes** | — | **16,124** | **100.00%** | — |

### 1.2 Grid-Cell Observation Pass Level (`4,160,874` Total `viewtime_*` Records)

| Scientific State | Reason Code | `viewtime` Cell Passes | % of `viewtime` Records | Unique $0.5^\circ \times 0.5^\circ$ Cells | Locked Sound Cue |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **`DETECTED`** | `CONFIRMED_LIGHTNING_FLASH` | **5,146** | **0.12%** | **2,927** | `SHORT_PERCUSSIVE_PULSE` |
| **`OBSERVED_NO_DETECTION`** | `ACTIVE_OPTICAL_SURVEILLANCE_ZERO_FLASHES` | **3,994,260** | **96.00%** | **157,633** *(clean quiet)* | `SUSTAINED_OBSERVATION_TEXTURE` |
| **`UNKNOWN` (SAA Radiation)** | `INSUFFICIENT_EVIDENCE_SAA_RADIATION` | **161,468** | **3.88%** | **8,496** *(touched by SAA)* | `DISTINCT_NEUTRAL_TWO_PART_CUE` |
| **Total Reconciled `viewtime_*` Passes** | — | **4,160,874** | **100.00%** | **160,560** *(total viewed)* | — |

*(Note: 71 confirmed non-SAA flashes occurred during non-SAA seconds inside 17 boundary `viewtime` cells whose ~85 s viewing window later entered or earlier exited the SAA; under Decision 1, all 161,468 SAA-overlapping `viewtime` windows are classified as `UNKNOWN` in the `viewtime` pass table while the 5,146 strictly non-SAA `viewtime` windows carry `DETECTED`).*

### 1.3 Additional `UNKNOWN` Intervals & Regions Outside `viewtime_*`

| `UNKNOWN` Sub-Reason | Source Evidence | Measured Scope |
| :--- | :--- | :--- |
| **`MISSING_SOURCE_DATA`** | Deleted noisy NQC granules `20231111_085535_NQC` & `20231111_102828_NQC` (`lis_anomalies.pdf` p. 94) | **1 gap** on `2023-11-11` (`08:55:35.300Z` to `12:01:22.200Z`, **`11,146.9 s` / `185.78 min`**) |
| **`FATAL_QUALITY_FLAG`** | Contiguous hardware outage blocks ($\ge 40\text{ s}$) where `(one_second_alert_summary & 0x55) != 0` and NASA omitted `viewtime_*` | **10 contiguous outage intervals** across 7 granules totaling **`8,195 seconds`** (`136.58 min`, longest `4,818 s` in `20231116_172457_FIN.nc`) |
| **`OUTSIDE_OBSERVATION_COVERAGE`** | Instantaneous location outside the ~550 km ISS LIS FOV swath or poleward of `[-55.75°, +55.25°]` | **`98,640` global $0.5^\circ \times 0.5^\circ$ cells** poleward of `[-55.75°, +55.25°]` never viewed (`0` `viewtime` records); all cells within `[-55.75°, +55.25°]` are also `OUTSIDE_OBSERVATION_COVERAGE` between brief ~80–95 s orbital overpasses |
| **`UNRESOLVED_TIME_MATCH`** | Query timestamp outside `[2023-11-09T22:52:12.400Z, 2023-11-16T21:17:00.000Z]` | Any timestamp prior to first granule or after permanent instrument power-down on Nov 16, 2023 |

---

## 2. Decision 3 — Effective Observation Duration Sensitivity Analysis

Per Decision 3, `viewtime_effective_obs > 0.0 s` is used as the baseline positive observation criterion after verifying no fill values (`-9999.0`) and no fatal flags (`(viewtime_alert_flag & 0x55) == 0`). Below is the exact sensitivity comparison across the **3,999,406 clean (non-SAA)** `viewtime` records (plus the **161,468** SAA-affected `viewtime` records):

| Threshold Criterion | `DETECTED` Cell Passes | `OBSERVED_NO_DETECTION` Cell Passes | `UNKNOWN` (SAA Overlap) | `UNKNOWN` (Sub-Threshold Edge Cells) | Total `UNKNOWN` Cell Passes | Clean Swath Retention % | Total Reconciled `viewtime` Records |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Baseline: `eff_obs > 0.0 s`** | **5,146** | **3,994,260** | **161,468** | **0** | **161,468** | **100.00%** | **4,160,874** |
| **Sensitivity A: `eff_obs > 0.1 s`** | **5,090** | **3,650,686** | **161,468** | **343,630** | **505,098** | **91.41%** | **4,160,874** |
| **Sensitivity B: `eff_obs > 1.0 s`** | **5,022** | **3,298,300** | **161,468** | **696,084** | **857,552** | **82.60%** | **4,160,874** |

### 2.1 Representative Real NASA Examples Affected by Higher Thresholds

1. **Swath Perimeter Cell (`0.04 s <= eff_obs <= 0.10 s`)**:
   - **Source File**: `ISS_LIS_SC_V2.2_20231109_225212_FIN.nc`, `viewtime[0]`
   - **Grid Coordinates**: `(-54.75°, -149.75°)`
   - **Window**: `2023-11-09T22:52:17.000000Z` to `22:52:18.000000Z` (`TAI93: 973723947.0` to `973723948.0`)
   - **Effective Observation Duration**: `0.0400 s` (**20 consecutive CCD integration frames** at 500 Hz)
   - **Effect of Threshold**: Classified as `OBSERVED_NO_DETECTION` under Baseline (`> 0.0 s`), but downgraded to `UNKNOWN` under both `> 0.1 s` and `> 1.0 s`.
2. **Outer Swath Chord Cell (`0.10 s < eff_obs <= 1.00 s`)**:
   - **Source File**: `ISS_LIS_SC_V2.2_20231109_225212_FIN.nc`, `viewtime[22]`
   - **Grid Coordinates**: `(-48.25°, -159.25°)`
   - **Window**: `2023-11-09T22:52:19.000000Z` to `22:52:24.000000Z` (`TAI93: 973723949.0` to `973723954.0`)
   - **Effective Observation Duration**: `0.6000 s` (**300 consecutive CCD integration frames** at 500 Hz)
   - **Effect of Threshold**: Classified as `OBSERVED_NO_DETECTION` under Baseline (`> 0.0 s`) and Sensitivity A (`> 0.1 s`), but downgraded to `UNKNOWN` under Sensitivity B (`> 1.0 s`).
3. **Confirmed Lightning Flash in Grazing Swath-Edge Cell (`eff_obs <= 0.10 s`)**:
   - Across the dataset, **56** `DETECTED` cell passes have `0.04 s <= eff_obs <= 0.10 s` and **68** `DETECTED` cell passes have `0.10 s < eff_obs <= 1.00 s` (`124` total `DETECTED` cell passes with `eff_obs <= 1.0 s`), proving empirically that LIS actively detects real lightning even in fractional edge cells with $< 1.0\text{ s}$ effective observation time.

