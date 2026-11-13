# SonifyEarth — Conservative SAA Quality Policy & Handling Report
**Project:** SonifyEarth — Silence Isn't Zero  
**NASA Space Apps Challenge 2026:** The Earth Information Jukebox  
**Date:** November 11, 2026  
**Audit Payload:** [`06_PROCESSED_DATA/json/excluded_records_audit.json`](06_PROCESSED_DATA/json/excluded_records_audit.json)

---

## 1. Scientific Context & Policy Authority

As documented in the NASA LIS Algorithm Theoretical Basis Document (`lis_algorithm.pdf`, Section 3.4.3.8.2, p. 37) and User Guide (`science_v2_guide.pdf`, p. 9 & p. 20), trapped energetic protons in the **South Atlantic Anomaly (SAA)** penetrate to Low Earth Orbit altitudes near the Atlantic coast of South America and impact the $128 \times 128$ CCD focal plane, elevating optical background noise and single-frame transient false-alarm rates.

### Explicit Policy Framing (Decision 1)
The SAA handling rule implemented in Task 4 is explicitly documented as a **conservative SonifyEarth data processing decision** designed to uphold *"Silence Isn't Zero"* — **not** a claim that NASA explicitly mandates rejecting all SAA-overlapping records in published `FIN` files:
1. **Identification of SAA-Affected Intervals**:
   - Identified at 1-second resolution from `bg_info_external_alert` (Backgrounds V2.2) and verified identical to `one_second_external_alert` (Science V2.2) using bitmask `0x03`:
     - Bit 1 (`0x01`): `Warning_Satellite_within_SAA_Model1`
     - Bit 2 (`0x02`): `Warning_satellite_within_SAA_Model2`
2. **Observation Interval Classification**:
   - Every `viewtime_*` observation interval (`[viewtime_TAI93_start, viewtime_TAI93_end]`) overlapping a verified 1-second SAA interval (`saa_overlap_seconds > 0`) is classified as **`UNKNOWN`** with reason code **`INSUFFICIENT_EVIDENCE_SAA_RADIATION`**.
   - **Zero** SAA-affected observation intervals are ever claimed as `OBSERVED_NO_DETECTION`.
3. **Candidate Flash Exclusion**:
   - Every flash whose occurrence interval (`[floor(lightning_flash_TAI93_time), ceil(lightning_flash_TAI93_time + delta_time)]`) overlaps a verified 1-second SAA interval (`(bg_info_external_alert & 0x03) != 0`) is excluded from confirmed `DETECTED` events and preserved in [`excluded_records_audit.json`](06_PROCESSED_DATA/json/excluded_records_audit.json) with reason code `INSUFFICIENT_EVIDENCE_SAA_RADIATION`.
4. **Interval Restriction (No Whole-Orbit Rejection)**:
   - This policy is restricted strictly to the **47 verified SAA-affected time intervals** (`18,571` seconds total), preserving the remaining healthy portions of those 44 orbital passes.

---

## 2. Empirical SAA Scope Across the 7-Day Dataset

| Metric | Measured Value | % of Dataset | Provenance / Notes |
| :--- | :---: | :---: | :--- |
| **Total Granule Pairs Evaluated** | `106` | `100.00%` | All 106 Science + 106 Backgrounds V2.2 files |
| **Granules Containing SAA Transits** | **`44`** | `41.51%` | 62 granules have `0` SAA seconds |
| **Contiguous 1-Second SAA Intervals** | **`47`** | — | Average duration `395.1 s` (`6.59 min`) per interval |
| **Total 1-Second SAA Records** | **`18,571`** | `3.16%` | Out of `587,941` total 1-second telemetry records |
| **`viewtime_*` Records Downgraded to `UNKNOWN`** | **`161,468`** | `3.88%` | `141,007` fully inside SAA + `20,461` partially overlapping SAA boundary |
| **Unique $0.5^\circ \times 0.5^\circ$ Grid Cells Touched by SAA** | **`8,496`** | `5.29%` | Out of `160,560` unique observed $0.5^\circ \times 0.5^\circ$ cells |
| **`bg_data_summary` 4-Corner FOV Snapshots in SAA** | **`228`** | `2.14%` | Out of `10,660` total background summary images |
| **Flashes Overlapping 1-Second SAA Intervals** | **`1,486`** | `9.22%` | `1,465` non-fatal (`0x22`/`0x2A`) + `21` also fatal (`0x21`) |

*(Boundary Note: Exactly `71` confirmed flashes occurred outside the 1-second SAA intervals — where `(bg_info_external_alert & 0x03) == 0` and `lightning_flash_alert_flag == 0x02` — inside `17` grid cells whose ~85 s `viewtime` window later entered or earlier exited the SAA).*

---

## 3. Representative Verified SAA Examples

### Example 1: SAA Transit Interval (`SAA_20231110_080926_4630_5030`)
- **Source Files**: `ISS_LIS_SC_V2.2_20231110_080926_FIN.nc` / `ISS_LIS_BG_V2.2_20231110_080926_FIN.nc`
- **1-Second Index Range**: `bg_info[4630:5030]` (`401 seconds`)
- **TAI93 Bounds**: `973762007.0` to `973762407.0`
- **Validated UTC Bounds**: `2023-11-10T09:26:37.000000Z` to `2023-11-10T09:33:17.000000Z`
- **External Alert Byte**: `0x7B` (`123` decimal — Bit 1 SAA Model 1 & Bit 2 SAA Model 2 both active)
- **Affected `viewtime` Cells Reclassified to `UNKNOWN`**: `3,206` cells (`INSUFFICIENT_EVIDENCE_SAA_RADIATION`)

### Example 2: Candidate Flash Excluded Due to SAA Overlap (`ISS_LIS_V2.2_20231110_111511_F000119`)
- **Source Files**: `ISS_LIS_SC_V2.2_20231110_111511_FIN.nc` (`flash_address = 119`) / `ISS_LIS_BG_V2.2_20231110_111511_FIN.nc` (`bg_info[4884]`)
- **Coordinates**: `(-33.69617°, -59.28862°)` (Cell `-33.75_-59.25`)
- **Timestamp**: `TAI93 = 973773406.7714237` (`2023-11-10T12:36:36.771424Z`)
- **Flags**: `lightning_flash_alert_flag = 34` (`0x22`), `bg_info_external_alert = 122` (`0x7A`, SAA Model 2 active)
- **Disposition**: Excluded from `flash_events.json`; preserved in [`excluded_records_audit.json`](06_PROCESSED_DATA/json/excluded_records_audit.json) with `primary_exclusion_reason = "INSUFFICIENT_EVIDENCE_SAA_RADIATION"`.

