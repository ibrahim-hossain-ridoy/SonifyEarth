# Three-State Classification Validation Report
**SonifyEarth — Silence Isn't Zero**  
*Generated: November 11, 2026*  
*Reproducible Examples: [`REAL_STATE_EXAMPLES.json`](05_SCIENTIFIC_VALIDATION/REAL_STATE_EXAMPLES.json) | Reproducibility Script: [`verify_task3_reproducibility.py`](scripts/verify_task3_reproducibility.py)*

---

## 1. Executive Summary

We have empirically validated the exact mathematical criteria and real supporting NASA records for all three scientific states of SonifyEarth across the 212 NetCDF-4 data files:
1. **STATE A: `DETECTED`** $\to$ **Short percussive pulse** (16,019 verified quality-accepted flashes).
2. **STATE B: `OBSERVED_NO_DETECTION`** $\to$ **Sustained observation texture** (validated via 4,160,874 `viewtime_*` grid cells).
3. **STATE C: `UNKNOWN`** $\to$ **Distinct neutral two-part cue** (verified across out-of-swath coordinates, the 185.8-minute NASA QC deletion gap, contiguous fatal instrument blocks, and South Atlantic Anomaly passes).

Every state and sub-reason has been reproduced directly from raw NASA NetCDF-4 records with **zero synthetic data**.

---

## 2. Validated Three-State Decision Tree

For any planetary evaluation target defined by a $0.5^\circ \times 0.5^\circ$ grid cell $(\phi_{\text{cell}}, \lambda_{\text{cell}})$ and time interval $[t_{\text{start}}, t_{\text{end}}]$:

```
                   Target Cell (lat, lon) & Interval [t0, t1]
                                       │
                                       ▼
          1. Does time interval intersect valid source granule pair?
                               /              \
                             NO                YES
                             │                  │
                             ▼                  ▼
                        [ UNKNOWN ]       2. Is contiguous FATAL alert active
                 (MISSING_SOURCE_DATA /      or SAA optical blinding active?
                 UNRESOLVED_TIME_MATCH)        /              \
                                             YES               NO
                                             │                  │
                                             ▼                  ▼
                                        [ UNKNOWN ]       3. Does >= 1 quality-accepted
                                   (FATAL_QUALITY_FLAG /     flash exist in cell & interval?
                                   INSUFFICIENT_EVIDENCE)  (flash_alert_flag & 0x55 == 0)
                                                               /              \
                                                             YES               NO
                                                             │                  │
                                                             ▼                  ▼
                                                       [ DETECTED ]     4. Does valid viewtime record
                                                                           exist with eff_obs > 0 and
                                                                           (vt_alert_flag & 0x55) == 0?
                                                                               /              \
                                                                             YES               NO
                                                                             │                  │
                                                                             ▼                  ▼
                                                                [ OBSERVED_NO_DETECTION ]  [ UNKNOWN ]
                                                                                     (OUTSIDE_OBSERVATION_COVERAGE)
```

---

## 3. Formal Classification Rules & Empirical Backing

### 3.1 STATE A: `DETECTED`
- **Criterion**: At least one flash record in `lightning_flash_*` falls within the grid cell and evaluation interval AND satisfies `(lightning_flash_alert_flag & 0x55) == 0`.
- **Empirical Census**: **16,019** of 16,124 flashes pass strictly. (105 flashes with fatal bit `0x01` are excluded and preserved in audit logs).
- **Audio Cue**: **Short percussive pulse**.

### 3.2 STATE B: `OBSERVED_NO_DETECTION`
- **Criterion**: Zero quality-accepted flashes exist in the cell/interval, AND a corresponding record exists in `viewtime_*` covering the cell and interval with:
  - `viewtime_effective_obs > 0.0` seconds (minimum in dataset is `0.04 s` = 20 CCD frames).
  - `(viewtime_alert_flag & 0x55) == 0` (warning-only flags `0xAA` are explicitly accepted as valid).
  - No contiguous fatal 1-second blocks or SAA blinding flags (`bg_info_external_alert & 0x03 == 0`) spanning the observation window.
- **Empirical Census**: **4,160,874** total `viewtime_*` observations verified across the week; **100%** satisfy `eff_obs > 0` and `(viewtime_alert_flag & 0x55) == 0`.
- **Audio Cue**: **Sustained observation texture**.

### 3.3 STATE C: `UNKNOWN`
- **Criterion**: Evidence cannot establish either a valid detection or a valid zero-detection surveillance pass. Missing data is **never** equated to zero lightning.
- **Reason Codes Validated**:
  1. `OUTSIDE_OBSERVATION_COVERAGE`: Grid cell was outside the orbital swath footprint at time $t$ (no `viewtime` record).
  2. `MISSING_SOURCE_DATA`: Query interval falls inside the 185.8-minute gap (`2023-11-11 08:55:35` to `12:01:22 UTC`) where NASA QC deleted noisy orbits.
  3. `FATAL_QUALITY_FLAG`: Interval overlaps a contiguous hardware/processing outage (e.g., 4,818 contiguous fatal seconds in `20231116_172457_FIN.nc`, automatically omitted from `viewtime_*`).
  4. `UNRESOLVED_TIME_MATCH`: Query falls outside the granule temporal window.
  5. `INSUFFICIENT_EVIDENCE`: South Atlantic Anomaly (SAA Model 1/2 active in `bg_info_external_alert & 0x03`) where trapped proton radiation corrupts optical transient detection (18,571 seconds across 44 orbits).
- **Audio Cue**: **Distinct neutral two-part cue**.

---

## 4. Verified Real Examples Summary

All 6 real examples documented in [`REAL_STATE_EXAMPLES.json`](05_SCIENTIFIC_VALIDATION/REAL_STATE_EXAMPLES.json) were independently reproduced against the original files by [`verify_task3_reproducibility.py`](scripts/verify_task3_reproducibility.py):

| State | Sub-Type / Reason | Granule Source | Record ID | Verified Result |
| :--- | :--- | :--- | :--- | :--- |
| **DETECTED** | Valid Flash | `20231109_225212_FIN.nc` | `flash[1]`, `vt[9994]` | Flash at `(-6.38°, -72.27°)`, `23:14:02.637Z`, `flag=2` |
| **OBSERVED_NO_DETECTION** | Valid Quiet Cell | `20231109_225212_FIN.nc` | `vt[7500]` | Cell `(-27.75°, -91.75°)`, `49.40 s` obs, **0 flashes**, `flag=2` |
| **UNKNOWN** | `OUTSIDE_OBSERVATION_COVERAGE` | `20231109_225212_FIN.nc` | `(64.15°, -21.94°)` | 0 viewtime records (Reykjavik outside $\pm 54^\circ$ swath) |
| **UNKNOWN** | `MISSING_SOURCE_DATA` | Between `072242` & `120122` | `2023-11-11` Gap | Verified 11,146.9 s (185.8 min) NASA QC deletion gap |
| **UNKNOWN** | `FATAL_QUALITY_FLAG` | `20231116_172457_FIN.nc` | `1s[0:4817]` | 4,818 contiguous fatal seconds omitted from viewtime |
| **UNKNOWN** | `INSUFFICIENT_EVIDENCE` (SAA) | `20231110_080926_FIN.nc` | `bg_info[4830]` | SAA Model 1 & 2 active (`ext_alert=0x7B`) at `(-31.2°, -19.0°)` |

