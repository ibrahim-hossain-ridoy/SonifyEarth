# SonifyEarth — Task 2.1 Scientific Audit & Report Corrections
**NASA Space Apps Challenge 2026: The Earth Information Jukebox**  
*Document Version: 1.0 — Date: November 11, 2026*  
*Classification Status: Complete Scientific Audit & Ground Truth Verification*

---

## 1. Audit Overview & Purpose

Following the completion of Task 2 (NASA NetCDF Data Inspection & Schema Analysis), this scientific audit re-evaluates all findings against official NASA technical documentation and actual data arrays in `01_NASA_RAW_DATA/`.

Every technical finding across the project is explicitly audited and categorized under one of three statuses:
- **`[CONFIRMED]`**: Empirically verified against actual NetCDF-4 variables, file arrays, and NASA documentation.
- **`[CORRECTED]`**: Previously misstated, incomplete, or overgeneralized; now corrected with rigorous mathematical and physical evidence.
- **`[UNVERIFIED]`**: Pending empirical testing in Task 3 (Scientific Validation & Granule Matching).

---

## 2. Audited Findings & Systematic Corrections

### Area 1: Quality Flag Logic (`viewtime_alert_flag` & `bg_info_alert_summary`)
- **Previous Statement**: Applied `viewtime_alert_flag != 0` as the rejection criterion for observations.
- **Audit Assessment**: **`[CORRECTED]`**
- **Defect Identified**: Treating every non-zero value as fatal would have discarded **100% of the 4,160,874 viewtime records** in our archive, because operational warning flags are routinely active during nominal satellite operations.
- **NASA Documentation Reference**: `science_v2_guide.pdf` Table 6 & NetCDF variable comment:
  > *Bit 1 (LSB): instrument_fatal_flag; Bit 2: instrument_warning_flag; Bit 3: platform_fatal_flag; Bit 4: platform_warning_flag; Bit 5: external_fatal_flag; Bit 6: external_warning_flag; Bit 7: processing_fatal_flag; Bit 8: processing_warning_flag.*
- **Corrected Mathematical Bitmasks**:
  $$\text{Fatal Bitmask} = \mathtt{0x55} \quad (\mathtt{0b01010101}, \text{decimal } 85)$$
  $$\text{Warning Bitmask} = \mathtt{0xAA} \quad (\mathtt{0b10101010}, \text{decimal } 170)$$
- **Empirical Evidence Across All 4,160,874 Records**:
  - `Fatal Flags (flags & 0x55 != 0)`: **0 records (0.00%)**. In NASA's Final QC dataset, fatal orbits were removed during quality review.
  - `Warning-Only Flags (flags & 0x55 == 0 and flags & 0xAA != 0)`: **4,160,874 records (100.00%)**.
    - Value `2` (`0x02`): 2,779,546 records (66.80%) — Instrument warning only.
    - Value `10` (`0x0A`): 11,740 records (0.28%) — Instrument + Platform warning.
    - Value `34` (`0x22`): 1,361,071 records (32.71%) — Instrument + External warning (e.g. SAA zone / solar zenith).
    - Value `42` (`0x2A`): 8,517 records (0.20%) — Multi-subsystem warning.
- **Corrected Rule**:
  $$\text{Observation State} = \begin{cases} \text{UNKNOWN}, & \text{if } (\mathtt{viewtime\_alert\_flag} \ \& \ \mathtt{0x55}) \neq 0 \\ \text{VALID}, & \text{if } (\mathtt{viewtime\_alert\_flag} \ \& \ \mathtt{0x55}) = 0 \end{cases}$$
  Warning-only records are **VALID observations**.

---

### Area 2: Geographic & Orbital Coverage
- **Previous Statement**: Stated $\pm 38^\circ$ latitude coverage and a 600 km swath width.
- **Audit Assessment**: **`[CORRECTED]`**
- **Defect Identified**: $\pm 38^\circ$ latitude is the coverage limit of the historical **TRMM LIS** instrument ($35^\circ$ orbit inclination). The current mission is **ISS LIS** on the International Space Station, which operates in a completely different orbital regime.
- **Corrected Parameters**:
  - **Orbital Platform**: International Space Station (ISS) in Low Earth Orbit ($\approx 400 - 420\text{ km}$).
  - **Orbital Inclination**: **$51.6^\circ$**.
  - **Documented Latitude Coverage**: Approximately **$\pm 54^\circ$ latitude** (sensor FOV extends several degrees poleward of the ground track).
  - **Empirical Measured Bounds in Actual Dataset**:
    - Lightning Flash Centroids (`lightning_flash_lat`): **$-49.29^\circ\text{ to }+52.85^\circ$**.
    - Viewtime Grid Centroids (`viewtime_lat`): **$-55.75^\circ\text{ to }+55.25^\circ$**.
    - Background Corner Footprints (`bg_data_summary_corners`): **up to $55.33^\circ$** (with polar projection bounds).
  - **Documented Swath Width**: Approximately **$550\text{ km}$** across track at nadir (instantaneous FOV expands up to $\sim 740\text{ km}$ at maximum slant range).
- **Core Scientific Policy**: A fixed latitude cutoff must **never** be used as a substitute for actual orbital observation coverage. Observation coverage is strictly determined by instantaneous swath geometry and explicit grid-cell viewing records (`viewtime_*` and `bg_data_summary_corners`).

---

### Area 3: Sound Engine Mapping Scope
- **Previous Statement**: Suggested mapping flash radiance to loudness/distortion, flash latitude to musical pitch, background radiance to ambient synthesizer drones, and solar vectors to filter modulation.
- **Audit Assessment**: **`[CORRECTED]`**
- **Defect Identified**: These were speculative musical interpretations not authorized by the finalized project concept.
- **Corrected Policy**: All unapproved sound mappings have been purged from documentation and variable dictionaries. The sound engine adheres strictly to the approved three-state cues:
  1. **State 1: DETECTED** $\to$ **Short percussive pulse** (triggered by confirmed, non-fatal flash events).
  2. **State 2: OBSERVED_NO_DETECTION** $\to$ **Sustained observation texture** (generated when grid cells were actively observed with zero lightning detections).
  3. **State 3: UNKNOWN** $\to$ **Distinct neutral two-part cue** (communicates unobserved regions, orbit gaps, or sensor blinding).
  4. **Listening Modes**: Both approved listening modes remain supported without unauthorized audio modifications.

---

### Area 4: TAI93 to UTC Conversion & Epoch Validation
- **Previous Statement**: Proposed a fixed 37-second subtraction from TAI93 based on general TAI-UTC tables.
- **Audit Assessment**: **`[CORRECTED]`**
- **Defect Identified**: 37 seconds is the total cumulative leap-second offset since the inception of UTC in 1972. However, the `TAI93` epoch began on **January 1, 1993**, when 27 leap seconds had already elapsed!
- **Leap Second Validation**:
  - $TAI - UTC$ at TAI93 epoch (1993-01-01): **27 seconds**.
  - $TAI - UTC$ in November 2023: **37 seconds**.
  - Net leap seconds added between 1993 and 2023: **Exactly 10 leap seconds** (1993-06, 1994-06, 1995-12, 1997-06, 1998-12, 2005-12, 2008-12, 2012-06, 2015-06, 2016-12).
- **Empirical Granule Cross-Checks**:
  For all 106 granules, comparing `orbit_summary_TAI93_start` against naive UTC seconds from `1993-01-01 00:00:00 UTC` gives:
  $$\Delta = \text{TAI93}_{\text{file}} - \text{NaiveUTCSeconds} = \mathbf{10.000000\text{ seconds}}$$
- **Test Examples**:
  1. Granule `20231109_225212`:
     - `TAI93_start`: `973723942.400`
     - Naive UTC seconds from 1993: `973723932.400`
     - Difference: `10.000 s` $\to$ Matched `2023-11-09T22:52:12.400000Z` with **0.000 s error**.
  2. Granule `20231111_120122`:
     - `TAI93_start`: `973857692.200`
     - Naive UTC seconds from 1993: `973857682.200`
     - Difference: `10.000 s` $\to$ Matched `2023-11-11T12:01:22.200000Z` with **0.000 s error**.
  3. Granule `20231116_203042`:
     - `TAI93_start`: `974320252.000`
     - Naive UTC seconds from 1993: `974320242.000`
     - Difference: `10.000 s` $\to$ Matched `2023-11-16T20:30:42.000000Z` with **0.000 s error**.
- **Corrected Policy**: Raw TAI93 values are preserved untouched. Converted timestamps apply the validated 10-second leap-second offset to maintain microsecond agreement with NASA's official UTC strings.

---

### Area 5: Data Coverage Separation
- **Previous Statement**: Loosely described the dataset as "a continuous 7-day observation".
- **Audit Assessment**: **`[CORRECTED]`**
- **Defect Identified**: Satellite observations from low Earth orbit are inherently discontinuous.
- **Corrected Framework (Four Explicit Dimensions)**:
  1. **Original Granule Coverage**: 106 discrete NetCDF-4 orbit files spanning `2023-11-09T22:52:12.400 UTC` to `2023-11-16T21:17:00.000 UTC`.
  2. **Requested Project Analysis Window**: The 7-day target evaluation window selected for the NASA Space Apps Challenge 2026.
  3. **Actual Available Observation Intervals**: Swath-based overpasses. Locations within $\pm 54^\circ$ latitude are observed only during brief $\approx 80-95\text{ second}$ swath transits as the ISS passes overhead.
  4. **QC-Deleted Orbit Gaps**: The single 185.8-minute gap on 2023-11-11 caused by NASA QC noise removal.

---

### Area 6: Preserved Core Task 2 Findings
- **Audit Assessment**: **`[CONFIRMED]`**
- All foundational empirical discoveries remain intact and verified:
  - **212 NetCDF-4 Files Inspected**: 106 Science + 106 Backgrounds (`[CONFIRMED]`).
  - **Zero Read Failures**: 212 / 212 files opened and parsed (`[CONFIRMED]`).
  - **Zero Zero-Byte or Corrupt Files**: (`[CONFIRMED]`).
  - **Variable Counts**: Exactly 147 variables in Science, 33 variables in Backgrounds across all files (`[CONFIRMED]`).
  - **106 Synchronized Pairs**: Identical orbit ID, UTC start, and TAI93 start/end times (`[CONFIRMED]`).
  - **Location of `viewtime_*` Subsystem**: Confirmed inside Science V2 (`[CONFIRMED]`).
  - **7-Day Flash Census**: 16,124 Flashes, 144,611 Groups, 549,106 Events, 4,160,874 Viewtime records (`[CONFIRMED]`).
  - **Zero-Flash Orbits**: Exactly 0 (`[CONFIRMED]`).
  - **Historical Decommissioning**: November 16, 2023 was the final operational day of ISS LIS per `lis_anomalies.pdf` page 95 (`[CONFIRMED]`).
  - **Single Orbit Gap Cause**: Orbits `085535` and `102828` were deleted by NASA QC due to noise per `lis_anomalies.pdf` page 94 (`[CONFIRMED]`).

---

## 3. Summary of Document Updates

| Document | Key Corrections Applied |
| :--- | :--- |
| [`NASA_DATA_INSPECTION_REPORT.md`](07_PROJECT_REPORTS/research/NASA_DATA_INSPECTION_REPORT.md) | Corrected quality flag bitmask logic (`0x55` fatal, `0xAA` warning); updated geographic coverage to ISS LIS $\pm 54^\circ$ / ~550 km; removed unapproved sound mappings; documented leap-second-aware TAI93 conversion; separated coverage concepts. |
| [`DATA_INTEGRITY_AND_GAPS_REPORT.md`](07_PROJECT_REPORTS/validation/DATA_INTEGRITY_AND_GAPS_REPORT.md) | Detailed empirical distribution of `viewtime_alert_flag` (100% fatal=0, warning-only valid); updated geographic bounds; detailed 10-second leap-second validation table; separated four coverage tiers. |
| [`complete_variable_dictionary.md`](03_DATA_INSPECTION/complete_variable_dictionary.md) | Purged speculative audio mappings; realigned variable roles to the approved three-state cues (percussive pulse, sustained texture, neutral cue); documented exact bitmasks for alert variables. |
| [`PROJECT_STATUS.md`](PROJECT_STATUS.md) | Updated to Version 2.0; incorporated Task 2.1 audit milestones; clearly categorized confirmed variables, verified empirical facts, and remaining validation questions. |
| [`TASK_2_1_SCIENTIFIC_AUDIT.md`](TASK_2_1_SCIENTIFIC_AUDIT.md) | Master audit document classifying all findings as CONFIRMED, CORRECTED, or UNVERIFIED with empirical proofs. |

---

## 4. Remaining Scientific Validation Questions (For Task 3)

The following specific scientific questions are designated for empirical resolution in Task 3:

1. **Flash Grouping Sequence & Parent Address Integrity (`[UNVERIFIED]`)**:
   - Verify whether `lightning_flash_child_address` and `child_count` point without indexing errors or offsets to `lightning_group_*` arrays across all 106 granules.
2. **Viewtime Effective Observation Threshold Cutoff (`[UNVERIFIED]`)**:
   - Determine whether an effective observation duration cutoff of $\Delta t_{\text{eff}} \ge 0.1\text{ s}$ or $\ge 1.0\text{ s}$ is optimal when rasterizing grid cells to prevent edge-distortion artifacts.
3. **Coordinate Transformation Consistency (`[UNVERIFIED]`)**:
   - Verify mathematical consistency between spacecraft ECR position vectors (`bg_info_position_vector`), transform matrices (`bg_info_transform_matrix`), and geodetic corner coordinates (`bg_data_summary_corners`) during orbital swath reconstruction.
4. **Terminator Threshold Continuity (`[UNVERIFIED]`)**:
   - Evaluate whether dynamic background thresholds (`viewtime_approx_threshold` and `lightning_flash_approx_threshold`) exhibit smooth continuous gradients across the day/night terminator.

---
*Audit completed and certified. Ready for Task 3: Scientific Validation & Granule Matching.*

