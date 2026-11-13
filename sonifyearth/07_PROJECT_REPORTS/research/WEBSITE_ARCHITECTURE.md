# SONIFYEARTH — REDESIGNED WEBSITE ARCHITECTURE & DATA CONTRACT
## *Silence Isn't Zero — An Observation-Aware Lightning Jukebox*

- **Project**: SonifyEarth — *Silence Isn't Zero.*
- **Challenge**: NASA Space Apps Challenge 2026 — *The Earth Information Jukebox*
- **Architecture Version**: 2.0 (Complete Cinematic Storytelling & Progressive-Disclosure Redesign)

---

## 1. Architectural Vision: "Experience a Story, Not a Spreadsheet"

The redesigned SonifyEarth web application combines **cinematic space-science storytelling** with **100% record-level NASA NetCDF-4 scientific traceability**. It follows three core UX laws:
1. **Simple first**: A first-time visitor with zero satellite background understands the central question (*"When a lightning map is quiet, what does that silence actually mean?"*) within 30 seconds via the animated Earth-and-Orbit Hero and the interactive Orbital Security-Camera Comparator.
2. **Detailed when needed**: Curious visitors explore real NASA data across the 2D/3D Global Explorer, Synchronized Orbital Timeline, and Web Audio Soundscape Laboratory with clean, progressively disclosed controls.
3. **Complete throughout**: Technical NASA Space Apps judges can inspect every single record (`14,554` confirmed flashes, `1,570` audited exclusions, `4,160,874` viewtime passes, `106` granule pairs, `9` pipeline stages, and all validation reports) via the Evidence Inspector and the 7-tab Data, Archive, Methodology & Validation vault.

---

## 2. 9-Section Navigation & Route Architecture

| Nav Order | Primary Nav Label | DOM Section ID | Purpose & Key Interactive Modules |
|---|---|---|---|
| **1** | **HOME** | `#page-landing` | Full-viewport cinematic hero with live Canvas **Animated Earth-and-Orbit Scene** (`#hero-orbit-canvas`), central question, restrained 4-metric archival ribbon, and primary CTAs (**Explore the Earth** & **Discover the Science**). |
| **2** | **THE MISSION** | `#page-mission` | Beginner-friendly visual storytelling: why a quiet lightning map has three different meanings, the **Interactive Orbital Security-Camera Comparator**, and interactive Three-State visual/audio cards (`DETECTED` ◆, `OBSERVED_NO_DETECTION` ◎, `UNKNOWN` ⊘). |
| **3** | **NASA VISUALIZATION** | `#page-eic-visual` | Cinema-grade showcase for official **NASA SVS 5011** (`/iss_lightning_sphere_07312023.mp4`) with transparent disclosure comparing SVS 5011's V1 visual lineage (released July 31, 2023) against SonifyEarth's V2.2 (`FIN`) analytical dataset (Nov 9–16, 2023). |
| **4** | **DATA JOURNEY** | `#page-data-journey` | Interactive 9-stage **NASA Satellite-to-Sound Pipeline**: `1. ISS LIS Instrument` → `2. Science V2.2 (DATA111)` → `3. Backgrounds V2.2 (DATA211)` → `4. Quality Control & TAI93 Metadata` → `5. Observation & Event Processing` → `6. Three-State Classification` → `7. Visual Map & Timeline` → `8. Web Audio Sound Engine` → `9. Evidence Inspector`. |
| **5** | **GLOBAL EXPLORER** | `#page-map-explorer` | Flagship interactive 2D Equirectangular & 3D Orthographic Globe (`GlobalLisMapView`), grouped into **Explore**, **Map Layers**, **View**, and expandable **Advanced Orbit & Granule Controls** (`1–106`), plus synchronized telemetry readout. |
| **6** | **TIMELINE** | `#page-timeline-dashboard` | Synchronized multi-track orbital canvas (`SynchronizedTimelineView`) with `-60s`, `-30s`, `-10s`, `+10s`, `+30s`, `+60s`, `Jump to Next Flash ◆`, `Jump to Next UNKNOWN ⊘`, and expandable Decision 3 `viewtime_effective_obs` sensitivity table. |
| **7** | **LISTEN** | `#page-listening-modes` & `#page-sound-engine` | Immersive Web Audio API sound laboratory comparing **`EVENT-ONLY`** vs **`OBSERVATION-AWARE`** over the identical shared `DataPackage`, featuring a live **Synchronized Acoustic Visualizer Canvas** (`#sound-visualizer-canvas`), transport controls, 3-cue Sound Legend, and accessible Audio Event Transcript (`role="log"`). |
| **8** | **EVIDENCE INSPECTOR** | `#page-evidence-inspector` | Signature *"Why Did I Hear That?"* forensic inspector (`EvidenceInspectorView`) with **Level 1: Human-Readable Explanation First** and **Level 2: Expandable Technical Evidence**, 6 verified NASA benchmark presets (`REAL_STATE_EXAMPLES.json`), and custom coordinate/time lookup. |
| **9** | **DATA & METHODOLOGY** | `#page-methodology` | Complete 7-tab scientific archive: **(A) NASA Dataset Catalog & 106-Granule Browser**, **(B) Archive Coverage & Nov 11 QC Gap**, **(C) Archive Statistics & Source Reconciliation**, **(D) Quality Control & Exclusions Explorer**, **(E) Scientific Methodology**, **(F) Validation Reports Reader**, and **(G) Downloads & Provenance**. |

---

## 3. Single Shared State & Module Graph

```text
08_WEBSITE/frontend/index.html
  └── 08_WEBSITE/frontend/js/app.js (SonifyEarthApplication)
        ├── 08_WEBSITE/frontend/js/data_adapter.js (SonifyEarthDataAdapter)
        │     └── Loads all untouched JSON & GeoJSON from /06_PROCESSED_DATA/ & /05_SCIENTIFIC_VALIDATION/
        ├── 08_WEBSITE/frontend/js/map_view.js (GlobalLisMapView — 2D Equirectangular & 3D Globe)
        ├── 08_WEBSITE/frontend/js/timeline_view.js (SynchronizedTimelineView — Multi-Track Canvas)
        ├── 09_SOUND_ENGINE/playback/sound_engine.js (SonifyEarthSoundEngine — Web Audio API)
        │     └── 09_SOUND_ENGINE/audio_mapping/sound_cue_spec.js (Locked 3-State Cues)
        └── 08_WEBSITE/frontend/js/inspector_view.js (EvidenceInspectorView — Two-Level Provenance)
```

All components remain bound to `window.sonifyEarthApp.state` (`dataPackage`, `cursorTai93`, `cursorStateInfo`, `listeningMode`, `isPlaying`, `playbackSpeed`, `reducedMotion`), ensuring zero drift between map, timeline, audio, and inspector.
