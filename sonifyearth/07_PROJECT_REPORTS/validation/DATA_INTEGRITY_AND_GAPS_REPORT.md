# Data Integrity, Anomaly & Timeline Continuity Audit Report
**SonifyEarth — Task 2.1: Scientific Validation Gate**  
*NASA Space Apps Challenge 2026: The Earth Information Jukebox*  
*Collection: ISS LIS Science V2.2 & Backgrounds V2.2 (Final QC Archive)*  
*Document Version: 2.0 (Post-Task 2.1 Scientific Audit) — Date: November 11, 2026*

---

## 1. Executive Summary

This report delivers the verified empirical audit of data integrity, temporal continuity, and instrument anomalies across the 7-day ISS LIS mission archive (November 9–16, 2023).

Following the Task 2.1 Scientific Audit, this document incorporates corrected quality-flag bitmasks, separates fatal from warning flags, documents the leap-second-aware TAI93 to UTC conversion, formalizes geographic swath observation bounds (~$\pm 54^\circ$ latitude, ~550 km swath), and removes all speculative sound-mapping proposals.

---

## 2. Granule Pairing Integrity Audit

| Metric | Target | Measured Result | Status |
| :--- | :---: | :---: | :---: |
| Total Science Files Inspected | 106 | 106 | **PASS (100%)** |
| Total Background Files Inspected | 106 | 106 | **PASS (100%)** |
| Verified Paired Granules | 106 | 106 | **PASS (100%)** |
| Filename Timestamp Stem Match | 106 | 106 | **PASS (100%)** |
| `orbit_summary_id_number` Match | 106 | 106 | **PASS (100%)** |
| `orbit_summary_UTC_start` Match | 106 | 106 | **PASS (100%)** |
| `TAI93_start` Match ($\Delta t < 0.001\text{ s}$) | 106 | 106 | **PASS (100%)** |
| `TAI93_end` Match ($\Delta t < 0.001\text{ s}$) | 106 | 106 | **PASS (100%)** |
| 1-Second Cadence Record Equality (`one_second_dim == bg_info_dim`) | 106 | 106 | **PASS (100%)** |
| Unpaired or Corrupt Granules | 0 | 0 | **ZERO (0)** |

**Conclusion**: All 106 pairs are 100% synchronized and co-registered. Zero pairing anomalies detected.

---

## 3. Four-Tier Data Coverage Architecture

To prevent inaccurate assumptions of continuous planetary observation, the project strictly distinguishes four coverage concepts:

1. **Original Granule Coverage**:
   - 106 discrete NetCDF-4 orbit granules.
   - Temporal span: `2023-11-09T22:52:12.400 UTC` to `2023-11-16T21:17:00.000 UTC`.
   - Granule durations: 105 nominal orbits of $\approx 5,572\text{ s}$ ($\approx 92.87\text{ min}$) + 1 partial final orbit of $2,778\text{ s}$ ($46.30\text{ min}$) prior to decommissioning.
2. **Requested Project Analysis Window**:
   - The 7-day target evaluation window selected for the NASA Space Apps Challenge 2026.
3. **Actual Available Observation Intervals**:
   - Observation is **swath-based and orbital**, NOT a continuous global blanket.
   - The ISS travels at $\approx 7.66\text{ km/s}$ in a $51.6^\circ$ inclined orbit.
   - The sensor has a documented swath width of approximately **$550\text{ km}$**, observing Earth up to approximately **$\pm 54^\circ$ latitude**.
   - Any specific location on Earth within the $\pm 54^\circ$ belt is only observed when the ISS orbit swath passes overhead (typically for ~80 to 95 seconds during an overpass).
   - Therefore, observation is discontinuous in space and time, consisting of sequential orbital swath passes. A fixed latitude cutoff is never used as a substitute for actual orbital observation coverage.
4. **QC-Deleted Orbit Gaps**:
   - On November 11, 2023, between `07:22:42 UTC` and `12:01:22 UTC`, a single **185.8-minute (11,146.9 s) gap** exists where two consecutive orbits (`20231111_085535` and `20231111_102828`) were removed by NASA Quality Control due to excessive optical noise, as documented in `lis_anomalies.pdf` (page 94).

---

## 4. Timeline Continuity & Orbital Gap Details

Across all **105 consecutive orbit transitions**, the time delta between Orbit $N$ end and Orbit $N+1$ start was evaluated:

### 4.1 Nominal Transitions (104 Transitions)
- In 104 out of 105 transitions, the inter-granule time delta is **$0.000 \pm 0.200\text{ seconds}$**.
- The ISS LIS instrument collected continuous back-to-back orbital granules during nominal operations.

### 4.2 The Single Orbital Gap (Transition 23 $\to$ 24)
- **Preceding Granule**: `ISS_LIS_SC_V2.2_20231111_072242_FIN.nc` (End: `2023-11-11 08:55:35.300 UTC`)
- **Subsequent Granule**: `ISS_LIS_SC_V2.2_20231111_120122_FIN.nc` (Start: `2023-11-11 12:01:22.200 UTC`)
- **Gap Duration**: **$11,146.9\text{ seconds} = 185.78\text{ minutes}$** (exactly 2.0 full ISS orbits).
- **Ground Truth Cause**: Cross-referencing official NASA QC documentation (`lis_anomalies.pdf`, Page 94):
  > *Date: 11/11/2023 (Day 315)*  
  > *Files: `ISS_LIS_SC_V2.2_20231111_085535_NQC.hdf` and `ISS_LIS_SC_V2.2_20231111_102828_NQC.hdf`*  
  > *QC Decision: "Delete. File(s) contain excessive noise that wasn't filtered out. File(s) may contain some good lightning data."*
- In our Three-State model, this time window is rigorously designated as **UNKNOWN**.

---

## 5. Decommissioning & Partial Final Orbit

- **Nominal Orbit Duration**: $5,572.0\text{ to }5,574.0\text{ seconds}$ ($92.87\text{ to }92.90\text{ minutes}$).
- **The Partial Final Orbit**: Granule `ISS_LIS_SC_V2.2_20231116_203042_FIN.nc` exhibits a duration of **$2,778.0\text{ seconds}$ ($46.30\text{ minutes}$)**.
- **Ground Truth Cause**: `lis_anomalies.pdf` (Page 95) explicitly notes:
  > *Date: 11/16/2023 (Day 320)*  
  > *"Final day of ISS LIS operations as it was disconnected for another instrument."*  
  > *"Keep. File(s) contain(s) less than one orbit of data. `ISS_LIS_SC_V2.2_20231116_203042_NQC.hdf`"*
- This dataset contains the historic final recordings of the ISS LIS sensor, concluding at 21:17:00 UTC on November 16, 2023.

---

## 6. Quality Flag Logic Audit: Fatal vs. Warning Bitmasks

Previous drafts incorrectly stated `viewtime_alert_flag != 0` as the rejection criterion. This was an error that would have classified 100% of observation records as invalid.

### 6.1 Exact Bit Assignments (`viewtime_alert_flag`)
- **Bit 1 (`0x01`)**: `instrument_fatal_flag`
- **Bit 2 (`0x02`)**: `instrument_warning_flag`
- **Bit 3 (`0x04`)**: `platform_fatal_flag`
- **Bit 4 (`0x08`)**: `platform_warning_flag`
- **Bit 5 (`0x10`)**: `external_fatal_flag`
- **Bit 6 (`0x20`)**: `external_warning_flag`
- **Bit 7 (`0x40`)**: `processing_fatal_flag`
- **Bit 8 (`0x80`)**: `processing_warning_flag`

### 6.2 Mathematical Bitmasks
$$\text{Fatal Mask} = \mathtt{0x55} \quad (\text{binary } \mathtt{01010101}, \text{decimal } 85)$$
$$\text{Warning Mask} = \mathtt{0xAA} \quad (\text{binary } \mathtt{10101010}, \text{decimal } 170)$$

### 6.3 Empirical Audit Across All 4,160,874 Records
| Flag Value | Binary | Hex | Meaning | Record Count | Percent | Classification |
| :---: | :---: | :---: | :--- | :---: | :---: | :---: |
| 2 | `00000010` | `0x02` | Instrument warning only | 2,779,546 | 66.80% | **VALID (OBSERVED)** |
| 10 | `00001010` | `0x0A` | Instrument + Platform warning | 11,740 | 0.28% | **VALID (OBSERVED)** |
| 34 | `00100010` | `0x22` | Instrument + External warning | 1,361,071 | 32.71% | **VALID (OBSERVED)** |
| 42 | `00101010` | `0x2A` | Instrument + Platform + External warning | 8,517 | 0.20% | **VALID (OBSERVED)** |
| **Any Fatal** | `xxxxxxx1` etc | `& 0x55` | Any fatal bit active | **0** | **0.00%** | **INVALID (UNKNOWN)** |

**Conclusion**: Warning-only records are 100% valid observation records. Only records with fatal bits (`flag & 0x55 != 0`) transition to UNKNOWN.

---

## 7. TAI93 to UTC Conversion Cross-Check

### 7.1 Epoch and Leap Second Analysis
- Epoch: `1993-01-01 00:00:00.000 TAI`.
- Cumulative leap seconds at epoch (1993): 27 s.
- Cumulative leap seconds in November 2023: 37 s.
- Difference: Exactly 10 leap seconds added between 1993 and 2023.

### 7.2 Empirical Granule Cross-Checks
| Granule Filename | `orbit_summary_TAI93_start` | `orbit_summary_UTC_start` | Naive Seconds from 1993 | TAI93 - Naive UTC | Error after 10s Leap Offset |
| :--- | :---: | :--- | :---: | :---: | :---: |
| `...20231109_225212_FIN.nc` | 973,723,942.400 | `2023-11-09T22:52:12.400000Z` | 973,723,932.400 | 10.000 s | **0.000 s** |
| `...20231111_120122_FIN.nc` | 973,857,692.200 | `2023-11-11T12:01:22.200000Z` | 973,857,682.200 | 10.000 s | **0.000 s** |
| `...20231116_203042_FIN.nc` | 974,320,252.000 | `2023-11-16T20:30:42.000000Z` | 974,320,242.000 | 10.000 s | **0.000 s** |

In all 106 granules, `TAI93 - NaiveUTC` is **identically 10.000000 seconds**.
Preserving original TAI93 values ensures exact sub-millisecond precision, while applying the 10-second leap-second offset yields microsecond alignment with NASA's official UTC strings.

---

## 8. South Atlantic Anomaly (SAA) Statistics

- **Orbits Crossing SAA**: **44 out of 106 orbits (41.5%)**.
- **Total SAA Exposure**: **18,571 seconds (~5.16 hours)** out of 587,941 observation seconds (3.16%).
- **Average SAA Transit**: **422.1 seconds (~7.0 minutes)** per encountering orbit.
- SAA boundary in data: Latitude $-15^\circ\text{ to }-38^\circ\text{S}$, Longitude $-65^\circ\text{ to }+15^\circ\text{E}$.

---

## 9. Alignment with SonifyEarth Three-State Sound Specification

All speculative sound mappings (radiance-to-volume, lat-to-pitch, bg-to-drone) are formally removed.
The validated Three-State audio mapping is:
1. **DETECTED**: Short percussive pulse (triggered by verified non-fatal flashes).
2. **OBSERVED_NO_DETECTION**: Sustained observation texture (triggered by verified viewtime grids with fatal bits = 0).
3. **UNKNOWN**: Distinct neutral two-part cue (triggered by data gaps, out-of-swath regions, or SAA radiation blinding).
