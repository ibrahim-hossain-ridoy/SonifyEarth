# SONIFYEARTH — KNOWN ISSUES & SCIENTIFIC RECONCILIATION NOTES

**Project:** SonifyEarth — Silence Isn't Zero.  
**Date:** 2026-11-12  
**Status:** **0 BLOCKING BUGS · ALL RECONCILIATION NOTES DOCUMENTED**

---

## 1. Documented Scientific & Data Reconciliation Notes

1. **Task 4 `listening_modes` Identifier Reconciliation (Resolved via Frontend Compatibility Adapter)**:
   - Untouched Task 4 files (`04_DATA_PROCESSING/configs/processing_config.json` and `06_PROCESSED_DATA/json/sonifyearth_windows.json`) contain workflow identifiers `["EVIDENCE_INSPECTOR_MODE", "GLOBAL_ORBITAL_PLAYBACK_MODE"]`.
   - Per the locked project specification, `08_WEBSITE/frontend/js/data_adapter.js` (`resolveListeningModeCompatibility()`) maps these cleanly to the two approved user-facing listening modes (`EVENT-ONLY` and `OBSERVATION-AWARE`) while keeping the *"Why Did I Hear That?"* Evidence Inspector active across both modes without modifying Task 4 outputs.
2. **Swath Keyframes Count Reconciliation (`2,350` in JSON vs. `2,213` in Earlier Report Text)**:
   - The actual generated `06_PROCESSED_DATA/json/sonifyearth_windows.json` contains **`2,350` swath keyframes** (`228` SAA-active + `2,122` nominal), whereas an earlier narrative table in `PRODUCTION_DATA_GENERATION_REPORT.md` cited `2,213`.
   - The redesigned website dynamically reads the true JSON count (`2,350`) and explicitly documents this cross-reference in Section 9 Tab 3 (*Complete Archive Statistics*).
3. **NASA SVS 5011 Visual Lineage vs. Analytical V2.2 Lineage**:
   - The official NASA SVS 5011 video (`iss_lightning_sphere_07312023.mp4`) was released July 31, 2023 (V1 lineage), whereas the SonifyEarth analytical engine operates on the November 9–16, 2023 Quality Controlled ISS LIS V2.2 (`FIN`) archive. Section 3 (`#page-eic-visual`) explicitly discloses this lineage difference and makes no false frame-by-frame video synchronization claim.
4. **Browser Web Audio API User-Gesture Requirement**:
   - Per browser autoplay policies and project accessibility rules, `AudioContext` remains suspended/uninitialized on page load (`uninitialized_no_autoplay`) and initializes only when the user clicks `Play`, `Audition`, or `Hear State Cue`.
