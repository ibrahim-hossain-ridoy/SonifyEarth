# Viewtime, Quality Flags & Effective Observation Validation Report
**SonifyEarth — Task 3: Scientific Validation**  
*Generated: November 11, 2026*  
*Source Artifacts: [`quality_validation/quality_flag_summary.csv`](05_SCIENTIFIC_VALIDATION/quality_validation/quality_flag_summary.csv), [`three_state_validation/effective_obs_threshold_comparison.csv`](05_SCIENTIFIC_VALIDATION/three_state_validation/effective_obs_threshold_comparison.csv)*

---

## 1. Quality Flag Bitmask Decoding (Fatal vs. Warning)

Across `viewtime_alert_flag`, `lightning_flash_alert_flag`, `one_second_alert_summary`, and `bg_info_alert_summary`, status flags use an 8-bit mask where **Bit 1 is the Least Significant Bit (LSB)**:
- **Fatal Bitmask (`0x55` / `0b01010101`)**:
  - Bit 1 (`0x01`): `instrument_fatal_flag`
  - Bit 3 (`0x04`): `platform_fatal_flag`
  - Bit 5 (`0x10`): `external_fatal_flag`
  - Bit 7 (`0x40`): `processing_fatal_flag`
- **Warning Bitmask (`0xAA` / `0b10101010`)**:
  - Bit 2 (`0x02`): `instrument_warning_flag`
  - Bit 4 (`0x08`): `platform_warning_flag`
  - Bit 6 (`0x20`): `external_warning_flag`
  - Bit 8 (`0x80`): `processing_warning_flag`

**Critical Rule**: Warning-only records (`flag & 0x55 == 0`) are **VALID observations**. Only records with active fatal bits (`flag & 0x55 != 0`) are invalidated.

---

## 2. Empirical Audit of Viewtime Records (4,160,874 Records)

| Flag Value | Binary | Hex | Subsystem Meaning | Count | % | Classification |
| :---: | :---: | :---: | :--- | :---: | :---: | :--- |
| 2 | `00000010` | `0x02` | Instrument warning only | 2,779,546 | 66.80% | **VALID** |
| 10 | `00001010` | `0x0A` | Instrument + Platform warning | 11,740 | 0.28% | **VALID** |
| 34 | `00100010` | `0x22` | Instrument + External warning | 1,361,071 | 32.71% | **VALID** |
| 42 | `00101010` | `0x2A` | Instrument + Platform + External warning | 8,517 | 0.20% | **VALID** |
| Any Fatal | `xxxxxxx1` | `& 0x55` | Any fatal bit active | **0** | **0.00%** | **INVALID (UNKNOWN)** |

### Key Discovery: How NASA's Viewtime Generator Handles Contiguous Fatal Blocks
In the 6 NASA Class 4 partial orbits (such as `ISS_LIS_SC_V2.2_20231116_172457_FIN.nc`), `one_second_alert_summary` exhibits up to **4,818 contiguous fatal seconds** (80.3 minutes of instrument outage).
Programmatic verification proves that NASA's viewtime processor **automatically excludes contiguous fatal intervals from the `viewtime_*` array**. For `20231116_172457_FIN.nc`, `viewtime_*` contains **0 records** during the 4,818 fatal seconds and populates **6,185 valid grid records** exclusively during the remaining 754 healthy seconds.
Therefore, checking `viewtime_*` naturally treats contiguous fatal hardware outages as unobserved (`UNKNOWN`).

---

## 3. Empirical Audit of 1-Second Telemetry & Flash Alerts

### 3.1 Intermittent Class 1 Telemetry Toggles vs. Contiguous Fatal Runs
- **1-Second Telemetry**: Across 587,941 seconds, `one_second_alert_summary` (identical to `bg_info_alert_summary`) records **25,323 seconds** with fatal bit `0x01` or `0x21` / `0x29`.
- Inspection reveals a periodic **60-second heartbeat framing toggle** (single second of `instrument_alert = 0x21`) and a **180-second packet boundary toggle** (2 seconds of `instrument_alert = 0x60`), matching NASA User Guide Table 16 Class 1 (*"Good files... occasionally fatal flags may be intermittently set... Unless contiguous, data are considered good"*).
- Conversely, 6 partial orbits contain contiguous fatal outages lasting 375 s to 4,818 s (`20231112_185907`, `20231115_085427`, `20231115_102720`, `20231115_181145`, `20231116_155204`, `20231116_172457`), matching `lis_anomalies.pdf` pages 94–95.

### 3.2 Flash Alert Flags (`lightning_flash_alert_flag`)
- **Clean / Warning-Only Flashes (`flag & 0x55 == 0`)**: **16,019 flashes (99.35%)** — Qualified for State A (`DETECTED`).
- **Fatal-Flagged Flashes (`flag & 0x55 != 0`)**: **105 flashes (0.65%)** (81 with `0x01`, 21 with `0x21`, 3 with `0x29`).
  - 102 coincided with 1-second Class 1 telemetry toggles; 3 occurred during $\ge 3\text{s}$ contiguous runs.
  - **Strict Scientific Policy**: Exclude all 105 fatal-flagged flashes from `DETECTED` and preserve their exclusion reason (`FATAL_FLASH_ALERT_FLAG`) in processing logs.

### 3.3 Backgrounds Environmental & SAA Alerts (`bg_info_external_alert`)
- **Bits 4–7 (`0x78`)**: Default heritage TRMM indifferent status bits (412,394 seconds).
- **South Atlantic Anomaly (`0x01` Model 1, `0x02` Model 2)**: Active across **44 of 106 orbits (41.5%)**, totaling **18,571 seconds (3.16% of mission week)**. Average transit duration: **422.1 s (7.0 min)**.
- **Direct Solar Glint Warning (`0x04`)**: Active across **156,976 seconds (26.7%)** during daytime passes.

---

## 4. Effective Observation Threshold Investigation (Step 5)

We audited the empirical distribution of `viewtime_effective_obs` across all **4,160,874 grid-cell observations**:
- **Minimum**: `0.0400 s` (40 ms = 20 CCD integration frames at 500 Hz).
- **Zero or Negative**: **0 records (0.0000%)**.
- **Median / Mean / Max**: `23.000 s` / `26.296 s` / `110.080 s`.

### Threshold Comparison Matrix
| Candidate Rule | Valid Cells Retained | Excluded Edge Cells | % Retained | Scientific & Physical Consequence |
| :--- | :---: | :---: | :---: | :--- |
| **`eff > 0.0 s`** (Positive Observation) | **4,160,874** | **0** | **100.00%** | Preserves 100% of NASA's viewtime swath coverage; minimum cell received 20 CCD frames (40 ms). |
| `eff >= 0.1 s` | 3,803,137 | 357,737 | 91.40% | Arbitrarily drops 8.60% of edge cells despite valid 20–49 frame optical monitoring. |
| `eff >= 1.0 s` | 3,488,923 | 671,951 | 83.85% | Truncates outer ~55 km swath boundaries (16.15% of data), creating false `UNKNOWN` borders. |

### Final Recommended Rule & Limitations
- **Recommended Rule**: **Documented Positive Observation Criterion**:
  $$\mathtt{viewtime\_effective\_obs} > 0.0\text{ s} \quad \land \quad (\mathtt{viewtime\_alert\_flag} \ \& \ \mathtt{0x55}) == 0$$
- **Scientific Justification**: NASA's `viewtime` algorithm already adjusts duration for fractional cell-in-FOV geometry and only emits records where $\Delta t_{\text{eff}} > 0$. Setting an arbitrary cutoff of `0.1 s` or `1.0 s` discards millions of seconds of genuine swath perimeter coverage.
- **Documented Limitation**: Cells with $\Delta t_{\text{eff}} < 1.0\text{ s}$ sit at the extreme perimeter of the swath and have proportionally lower exposure probability for multi-stroke flashes lasting $> 1\text{ s}$; however, they are genuinely observed and must remain classified as `OBSERVED_NO_DETECTION` when silent.

