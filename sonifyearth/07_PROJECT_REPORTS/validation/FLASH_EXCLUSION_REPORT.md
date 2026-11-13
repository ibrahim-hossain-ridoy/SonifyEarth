# SonifyEarth — Flash Quality Filtering & Exclusion Audit Report
**Project:** SonifyEarth — Silence Isn't Zero  
**NASA Space Apps Challenge 2026:** The Earth Information Jukebox  
**Date:** November 11, 2026  
**Audit Payload:** [`06_PROCESSED_DATA/json/excluded_records_audit.json`](06_PROCESSED_DATA/json/excluded_records_audit.json)  
**Confirmed Payload:** [`06_PROCESSED_DATA/json/flash_events.json`](06_PROCESSED_DATA/json/flash_events.json)

---

## 1. Executive Summary

Out of **16,124** source lightning flash records across the 106 NASA ISS LIS Science V2.2 (`DATA111`) files:
- **14,554 flashes (90.26%)** pass all strict quality, non-glint, and non-SAA criteria and are emitted as confirmed **`DETECTED`** events in [`flash_events.json`](06_PROCESSED_DATA/json/flash_events.json) and [`lightning_events.geojson`](06_PROCESSED_DATA/geojson/lightning_events.geojson).
- **1,570 flashes (9.74%)** are excluded from confirmed detections and preserved with full source provenance in [`excluded_records_audit.json`](06_PROCESSED_DATA/json/excluded_records_audit.json).
- **0 source records are deleted.**

---

## 2. Complete Flash Exclusion Breakdown

| Exclusion Category | Bitmask / Rule Triggered | Flash Count | % of 16,124 Flashes | Reason Code(s) in Audit |
| :--- | :--- | :---: | :---: | :--- |
| **1. Fatal Alert Flag Only (Non-SAA)** | `(lightning_flash_alert_flag & 0x55) != 0` & `(ext_alert & 0x03) == 0` | **84** | `0.52%` | `["FATAL_FLASH_ALERT_FLAG"]` |
| **2. Fatal Alert Flag + SAA Overlap** | `(lightning_flash_alert_flag & 0x55) != 0` & `(ext_alert & 0x03) != 0` | **21** | `0.13%` | `["FATAL_FLASH_ALERT_FLAG", "INSUFFICIENT_EVIDENCE_SAA_RADIATION"]` |
| **3. SAA Interval Overlap Only (Non-Fatal)** | `(lightning_flash_alert_flag & 0x55) == 0` & `(ext_alert & 0x03) != 0` | **1,465** | `9.09%` | `["INSUFFICIENT_EVIDENCE_SAA_RADIATION"]` |
| **4. Solar Glint Filter Violation** | `glint_index >= cos(5°)` (`0.996195`) or Case 1 rate $> 250/\text{s}$ | **0** | `0.00%` | *(0 violations in Final QC V2.2; max `glint_index = 0.970547` = $13.94^\circ$)* |
| **Total Excluded Flashes** | — | **1,570** | **9.74%** | Preserved in `excluded_records_audit.json` |
| **Confirmed `DETECTED` Flashes** | `(alert_flag & 0x55) == 0` & `(ext_alert & 0x03) == 0` & non-glint | **14,554** | **90.26%** | Emitted in `flash_events.json` (`CONFIRMED_LIGHTNING_FLASH`) |
| **Total Reconciled Source Flashes** | — | **16,124** | **100.00%** | Exact reconciliation (`14,554 + 1,570 = 16,124`) |

---

## 3. Analysis of the 105 Fatal-Flagged Flashes (`(lightning_flash_alert_flag & 0x55) != 0`)

Across all 105 flashes with an active fatal bit in `lightning_flash_alert_flag`:
- **Exact Flag Values**:
  - `33` (`0x21`: `instrument_fatal` + `external_warning`): **21 flashes** (all 21 occurred during SAA or solar glint warning windows).
  - `1` (`0x01`: `instrument_fatal` only): **81 flashes**.
  - `41` (`0x29`: `instrument_fatal` + `platform_warning` + `external_warning`): **3 flashes**.
- **Class 1 Framing Toggles vs. Multi-Second Fatal Runs**:
  - **100 flashes** occurred during isolated 1–2 second periodic telemetry framing toggles (`fatal_run_length_seconds <= 2`, per NASA User Guide Table 16 Class 1). Per Decision 2, all 100 invalid Class 1 framing-toggle flashes are strictly excluded from confirmed `DETECTED` records and flagged with `is_class1_framing_toggle = true` in [`excluded_records_audit.json`](06_PROCESSED_DATA/json/excluded_records_audit.json).
  - **5 flashes** occurred during $\ge 3\text{ s}$ contiguous fatal runs (`fatal_run_length_seconds >= 3`, flagged with `is_class1_framing_toggle = false`).

---

## 4. Non-Glint Verification & Radiance Metadata Policy

1. **Non-Glint Verification (ATBD Section 3.4.3.10.2.2)**:
   - Tested all 16,124 flashes against Case 2 (`lightning_flash_glint_index >= cos(5°) = 0.996195` with `child_count > 5`) and Case 1 (`delta_time > 0.2 s` and `child_count / delta_time > 250.0` during daytime).
   - Highest `lightning_flash_glint_index` in the dataset is `0.970547` ($\theta_{\text{glint}} = 13.94^\circ$ in `ISS_LIS_SC_V2.2_20231116_080740_FIN.nc`, `flash[37]`), confirming NASA's Level-2 QC processor removed all direct specular glint artifacts prior to `FIN` publication.
2. **Radiance Metadata Policy**:
   - Every flash record preserves `lightning_flash_radiance` ($\mu\text{J/sr/m}^2/\mu\text{m}$) with explicit attribute `radiance_note: "Source optical metadata only; not storm severity or audio loudness"`.

