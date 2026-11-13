# Granule Matching & Timeline Continuity Validation Report
**SonifyEarth — Task 3: Scientific Validation**  
*Generated: November 11, 2026*  
*Source Artifact: [`granule_matching/granule_matching_checks.csv`](05_SCIENTIFIC_VALIDATION/granule_matching/granule_matching_checks.csv)*

---

## 1. Executive Summary

- **Pairs Evaluated**: 106 Science V2.2 files $\leftrightarrow$ 106 Backgrounds V2.2 files.
- **Verified Matches**: **106 / 106 (100.00%)**.
- **Mismatches Found**: **0**.
- **Timeline Continuity**: 104 consecutive transitions continuous with $\Delta t = 0.0\text{ s}$; 1 documented NASA QC noise deletion gap of 185.8 minutes on 2023-11-11.

---

## 2. Granule Pairing Verification Criteria

Every pair was programmatically verified across six independent dimensions (not just filenames):
1. **Collection & Version Stem**: Identical `ISS_LIS_SC_V2.2_YYYYMMDD_HHMMSS_FIN` vs `ISS_LIS_BG_V2.2_YYYYMMDD_HHMMSS_FIN`.
2. **Internal Orbit ID Match**: `orbit_summary_id_number == bg_orbit_summary_id_number` (106/106 match).
3. **UTC Start Timestamp Match**: `orbit_summary_UTC_start == bg_orbit_summary_UTC_start` (106/106 match).
4. **TAI93 Interval Exact Match**: Both `TAI93_start` and `TAI93_end` match within $< 0.001\text{ s}$ (106/106 match).
5. **1-Second Record Cadence Equality**: `one_second_dim == bg_info_dim` in every single orbit (106/106 match, ranging from 2,778 s to 5,574 s).
6. **File Quality Status**: All 212 files carry `FIN` (Final QC) designation.

---

## 3. Data Coverage Tiers & Anomalous Granules

### 3.1 Original Granule Coverage vs. Requested Window
- **First Granule Start**: `2023-11-09T22:52:12.400000Z` (Orbit `225212`).
- **Last Granule End**: `2023-11-16T21:17:00.000000Z` (Orbit `203042`).
- **Total Granules**: 106 orbital passes.
- **Orbit Duration**: 105 nominal orbits averaging 5,572.6 s (~92.88 min) + 1 final partial orbit of 2,778.0 s (46.30 min).

### 3.2 Missing & Deleted Orbits (QC Gap)
- Between Orbit 23 (`20231111_072242_FIN`, ending `08:55:35.300 UTC`) and Orbit 24 (`20231111_120122_FIN`, starting `12:01:22.200 UTC`), there is an exact gap of **$11,146.9\text{ seconds}$ ($185.78\text{ minutes}$)**.
- Verified against `lis_anomalies.pdf` (Page 94, Flight Day 315): NASA QC deleted orbits `20231111_085535_NQC` and `20231111_102828_NQC` due to excessive optical noise.
- This interval is classified as `UNKNOWN` (`MISSING_SOURCE_DATA`).

### 3.3 Decommissioning Truncation & Partial Orbits
- `20231116_203042_FIN`: Truncated at 2,778 s (46.3 min) when ISS LIS was permanently powered down on November 16, 2023 (`lis_anomalies.pdf` Page 95).
- Six orbits (`20231112_185907`, `20231115_085427`, `20231115_102720`, `20231115_181145`, `20231116_155204`, `20231116_172457`) contain NASA Class 4 partial contiguous fatal blocks (validated in Step 4).

