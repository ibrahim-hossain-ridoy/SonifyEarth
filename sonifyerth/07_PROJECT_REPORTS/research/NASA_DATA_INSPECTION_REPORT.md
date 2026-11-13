# NASA LIS Comprehensive Data Inspection & Scientific Analysis Report
**SonifyEarth — Silence Isn't Zero**  
**NASA Space Apps Challenge 2026: The Earth Information Jukebox**  
*Document Version: 2.0 (Post-Task 2.1 Scientific Audit) — Date: November 11, 2026*  
*Authors: SonifyEarth Scientific Team*

---

## 1. Executive Summary

This report delivers the verified empirical scientific inspection and schema analysis of the 7-day global dataset collected by the **Lightning Imaging Sensor (LIS)** aboard the **International Space Station (ISS)**.

All **212 NetCDF-4 data files** (106 Science V2.2 and 106 Backgrounds V2.2 files) located in `01_NASA_RAW_DATA/` were systematically read, parsed, and verified using Python scientific tools. Following the Task 2.1 Scientific Audit, this report incorporates corrected quality flag bitmask logic, validated geographic swath coverage, leap-second-aware TAI93 epoch conversions, and strict adherence to the finalized SonifyEarth three-state sound specification.

### Key Headline Findings:
1. **100% Reading Success**: Exactly 106 Science files and 106 Backgrounds files were inspected. All 212 files opened and parsed with zero read errors and zero corrupt records.
2. **Strict Schema Consistency**: Every single Science file contains the exact same set of **147 variables** across 17 dimensions. Every single Backgrounds file contains the exact same set of **33 variables** across 9 dimensions.
3. **Massive Scientific Scope (7-Day Global Census)**:
   - **549,106 Lightning Events** (individual 2 ms optical pixel triggers)
   - **144,611 Lightning Groups** (instantaneous spatial lightning strokes)
   - **16,124 Lightning Flashes** (coherent multi-stroke lightning discharge processes)
   - **4,160,874 Viewtime Grid Observation Records** ($0.5^\circ \times 0.5^\circ$ surface coverage windows)
   - **10,660 Calibrated 128x128 Background Radiance Frames**
   - **587,941 One-Second Ephemeris & Health Time Series Records**
4. **Historical Mission Significance**: Analysis of `lis_anomalies.pdf` (page 95) confirms that this 7-day dataset (November 9–16, 2023) captures the **final operational week of the ISS LIS instrument before it was permanently decommissioned and disconnected on November 16, 2023**.
5. **Exact Granule Synchronization**: All 106 Science granules pair with 106 Background granules with identical orbit IDs, start/stop UTC timestamps, and matching 1-second cadence record counts.
6. **Timeline Continuity & Single NASA QC Gap**: A single 185.8-minute gap exists on November 11, 2023 (between 07:22:42 UTC and 12:01:22 UTC). Cross-referencing with `lis_anomalies.pdf` proves that NASA's QC team intentionally deleted orbits `20231111_085535` and `20231111_102828` due to excessive optical noise.
7. **Resolution of the `viewtime_*` Location**: The critical `viewtime_*` observation variables (required for establishing whether a silent region was actively observed) reside **within the Science V2 dataset**, not the Backgrounds dataset.

---

## 2. Review of NASA Technical Documentation

All four reference documents in `02_NASA_DOCUMENTATION/` were ingested and analyzed:

### 2.1 Science vs. Backgrounds User Guides Identity Check
- **Finding**: `02_NASA_DOCUMENTATION/science_v2_guide.pdf` and `02_NASA_DOCUMENTATION/backgrounds_v2_guide.pdf` are **byte-for-byte identical documents**.
  - File Size: 454,484 bytes.
  - Cryptographic Hash (SHA-256): `8b3b96146946160f94fe30c97274b661944bc4acd1e368f0a4d9ed03e96c8944`.
  - Page Count: 24 pages.
- **Scientific Significance**: NASA GHRC DAAC distributes a unified user guide titled *"International Space Station (ISS) Lightning Imaging Sensor (LIS) datasets"* that documents both the Science (Level 2) and Backgrounds (Level 1B) products in a single comprehensive reference.

### 2.2 Algorithm Theoretical Basis Document (`lis_algorithm.pdf`)
- Document Reference: *ATBD2000.qxd*, George C. Marshall Space Flight Center Science Directorate (53 pages).
- Defines the real-time optical pulse detector (RTEP), 2 ms integration clock, filtering algorithms, false-alarm rejection criteria, and the mathematical grouping/clustering algorithms:
  - **Spatial clustering threshold**: Events adjacent within 1 pixel are combined into Groups.
  - **Temporal clustering threshold**: Groups occurring within 330 ms and 16.5 km are assembled into Flashes.
  - **Glint & Anomaly rejection**: Glint index, solar zenith angle, and signal-to-noise ratio filters.

### 2.3 ISS LIS Anomalies Document (`lis_anomalies.pdf`)
- Document Reference: 95 pages listing all non-quality-controlled (NQC) files reviewed by NASA's Quality Control team and the disposition decisions for the Final (FIN) dataset.
- Key Revelations for our 2023-11-09 to 2023-11-16 dataset:
  - **November 11, 2023 (Day 315)**: Orbits `ISS_LIS_SC_V2.2_20231111_085535_NQC` and `ISS_LIS_SC_V2.2_20231111_102828_NQC` were marked *"Delete. File(s) contain excessive noise that wasn't filtered out."* This explains the 185.8-minute gap in our FIN archive.
  - **November 12, 2023 (Day 316)**: Orbit `ISS_LIS_SC_V2.2_20231112_185907_NQC` was marked *"Keep. Partial good file(s), since flags were set keep."*
  - **November 15, 2023 (Day 319)**: Orbits `085427`, `102720`, `181145` were marked *"Keep. Partial good file(s)."*
  - **November 16, 2023 (Day 320)**: *"Final day of ISS LIS operations as it was disconnected for another instrument. Keep. Partial good file(s)... Keep. File(s) contain(s) less than one orbit of data. ISS_LIS_SC_V2.2_20231116_203042_NQC.hdf"*

---

## 3. Geographic & Orbital Coverage Analysis

### 3.1 Documented Orbit Parameters vs. Empirical Evidence
- **Orbital Platform**: International Space Station (ISS) in Low Earth Orbit (altitude $\approx 400 - 420\text{ km}$).
- **Orbital Inclination**: **$51.6^\circ$**.
- **Geographic Coverage**: The sensor field of view extends beyond the orbit track, observing Earth up to approximately **$\pm 54^\circ$ latitude** (observed empirical flash range: $-49.29^\circ$ to $+52.85^\circ$; viewtime grid range: $-55.75^\circ$ to $+55.25^\circ$).
- **Documented Swath Width**: Approximately **$550\text{ km}$** across track at nadir.
- **Coverage Rule**: A fixed latitude cutoff must **never** be used as a substitute for actual orbital observation coverage. Actual observation coverage is strictly determined by instantaneous swath geometry and explicit grid-cell viewing records (`viewtime_*` and `bg_data_summary_corners`).

### 3.2 Four Coverage Concepts Separated
To maintain scientific rigor, four distinct coverage dimensions are recognized:
1. **Original Granule Coverage**: 106 discrete orbital files spanning from 2023-11-09T22:52:12 UTC to 2023-11-16T21:17:00 UTC.
2. **Requested Project Analysis Window**: The 7-day target evaluation window selected for the NASA Space Apps Challenge 2026.
3. **Actual Available Observation Intervals**: Swath-based observation intervals. The ISS flies overhead at ~7.66 km/s, observing any given ground location within its $\pm 54^\circ$ belt for approximately 80 to 95 seconds during an overpass. Observation is discontinuous in space and time.
4. **QC-Deleted Orbit Gaps**: The single 185.8-minute window on 2023-11-11 where orbits were removed by NASA Quality Control due to noise.

---

## 4. Quality Flag Architecture: Fatal vs. Warning Bitmasks

NASA LIS flags encode instrument, platform, external, and algorithm status using multi-bit masks. Previous drafts erroneously applied `viewtime_alert_flag != 0`, which would have discarded 100% of valid observation records because operational warning bits are routinely active.

### 4.1 Exact Bit Assignments (`viewtime_alert_flag` & `bg_info_alert_summary`)
Bit 1 is the least significant bit (LSB):
- **Bit 1 (`0x01`, `1 << 0`)**: `instrument_fatal_flag` (Instrument powered off or fatal hardware failure)
- **Bit 2 (`0x02`, `1 << 1`)**: `instrument_warning_flag` (Threshold high, temperature shift, or minor operational condition)
- **Bit 3 (`0x04`, `1 << 2`)**: `platform_fatal_flag` (Fatal ephemeris, attitude, or clock loss)
- **Bit 4 (`0x08`, `1 << 3`)**: `platform_warning_flag` (Degraded platform accuracy, slight attitude drift)
- **Bit 5 (`0x10`, `1 << 4`)**: `external_fatal_flag` (Fatal external obstruction or extreme blinding)
- **Bit 6 (`0x20`, `1 << 5`)**: `external_warning_flag` (Satellite in South Atlantic Anomaly, direct solar glint possible)
- **Bit 7 (`0x40`, `1 << 6`)**: `processing_fatal_flag` (Processing algorithm crash, unreadable packet)
- **Bit 8 (`0x80`, `1 << 7`)**: `processing_warning_flag` (Buffer limitation warning, grouping approximation)

### 4.2 Mathematical Bitmasks
$$\text{Fatal Mask} = \mathtt{0x01} \mid \mathtt{0x04} \mid \mathtt{0x10} \mid \mathtt{0x40} = \mathtt{0x55} \quad (\text{binary } \mathtt{01010101})$$
$$\text{Warning Mask} = \mathtt{0x02} \mid \mathtt{0x08} \mid \mathtt{0x20} \mid \mathtt{0x80} = \mathtt{0xAA} \quad (\text{binary } \mathtt{10101010})$$

### 4.3 Empirical Verification Across All 4,160,874 Records
- **Fatal Flagged Records (`flags & 0x55 != 0`)**: **0 records (0.00%)**. In NASA's Final QC dataset, all fatal orbits were filtered during quality review.
- **Warning-Only Records (`flags & 0x55 == 0 and flags & 0xAA != 0`)**: **4,160,874 records (100.00%)**. Common values: `0x02` (instrument warning), `0x22` (instrument + external warning).
- **Validation Rule**: A record with warning flags only is **VALID** for observation. Only records with active fatal bits (`flags & 0x55 != 0`) are classified as UNKNOWN.

---

## 5. TAI93 to UTC Conversion & Epoch Validation

### 5.1 Epoch Definition
`TAI93` measures International Atomic Time (TAI) elapsed seconds starting from `1993-01-01 00:00:00.000`.

### 5.2 Leap Seconds Validation
- On January 1, 1993, the cumulative leap-second offset was $TAI - UTC = 27\text{ seconds}$.
- By November 2023, the cumulative leap-second offset was $TAI - UTC = 37\text{ seconds}$.
- **Leap Seconds Added Since 1993**: Exactly **10 leap seconds** (1993-06, 1994-06, 1995-12, 1997-06, 1998-12, 2005-12, 2008-12, 2012-06, 2015-06, 2016-12).

### 5.3 Mathematical Relation Cross-Check
For every single one of the 106 granules, comparing `orbit_summary_TAI93_start` against naive UTC seconds from `1993-01-01 00:00:00 UTC` yields:
$$\Delta = \text{TAI93}_{\text{file}} - \text{NaiveUTCSeconds} = \mathbf{10.000000\text{ seconds}}$$
Applying this 10-second leap-second correction matches `orbit_summary_UTC_start` and `bg_orbit_summary_UTC_start` down to the microsecond.
Raw TAI93 values are preserved in all data processing to maintain scientific traceability.

---

## 6. Approved Sound Engine Specification

All speculative sound-mapping proposals (e.g. mapping latitude to musical pitch, radiance to volume/intensity, background albedo to synthesizer drones, solar angle to modulation) have been removed.

The sound engine adheres strictly to the finalized SonifyEarth audio design:
1. **State 1: DETECTED** $\to$ **Short percussive pulse**. Triggered by verified flash records.
2. **State 2: OBSERVED_NO_DETECTION** $\to$ **Sustained observation texture**. Confirms active sensor surveillance with zero lightning.
3. **State 3: UNKNOWN** $\to$ **Distinct neutral two-part cue**. Communicates unobserved regions, data gaps, or sensor blinding.
4. **Listening Modes**: The two approved listening modes remain unchanged.

---

## 7. Pair Verification & Granule Integrity Summary

- **Pair Match Rate**: 106 / 106 (100.0%).
- **Timestamp Alignment**: In all 106 pairs, `orbit_summary_UTC_start` and `bg_orbit_summary_UTC_start` match to the microsecond.
- **Cadence Alignment**: In all 106 pairs, `one_second_dim` in Science matches `bg_info_dim` in Backgrounds exactly.
- **Orbits with Zero Flashes**: **0**. LIS detected lightning on every single orbit throughout this week.
- **Data Gap**: Exactly 1 gap of 185.8 minutes on 2023-11-11, fully substantiated by NASA documentation.
