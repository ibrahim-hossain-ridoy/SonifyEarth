# SonifyEarth Frontend Data Adapter, Compatibility Layer & Server Contract

**Location:** `10_DEVELOPER_HANDOFF/api_documentation/FRONTEND_DATA_AND_SERVER_CONTRACT.md`  
**Stage:** Task 5 Complete Website Development  

---

## 1. Local Read-Only Server Contract (`08_WEBSITE/backend/server.py`)

### 1.1 Launch Command
**macOS / Linux:**
```bash
python3 08_WEBSITE/backend/server.py --host 127.0.0.1 --port 8080
```

**Windows (Command Prompt / PowerShell):**
```cmd
python 08_WEBSITE\backend\server.py --host 127.0.0.1 --port 8080
```
*(Or double-click `start_server_windows.bat`)*

### 1.2 Static & Media Endpoints
| Endpoint Path | Backing Workspace File / Directory | HTTP Features |
| :--- | :--- | :--- |
| `/` or `/index.html` | `08_WEBSITE/frontend/index.html` | HTML5 Application Shell |
| `/css/styles.css` | `08_WEBSITE/frontend/css/styles.css` | Design System Stylesheet |
| `/js/*.js` | `08_WEBSITE/frontend/js/*.js` | ES2022 Modules (`app.js`, `data_adapter.js`, `map_view.js`, `timeline_view.js`, `inspector_view.js`) |
| `/09_SOUND_ENGINE/**/*.js` | `09_SOUND_ENGINE/**/*.js` | ES2022 Web Audio API Modules (`sound_cue_spec.js`, `sound_engine.js`) |
| `/06_PROCESSED_DATA/json/*.json` | `06_PROCESSED_DATA/json/*.json` | Validated Task 4 JSON Payloads (Read-Only) |
| `/06_PROCESSED_DATA/geojson/*.geojson` | `06_PROCESSED_DATA/geojson/*.geojson` | Validated Task 4 GeoJSON Payloads (`application/geo+json`, Read-Only) |
| `/05_SCIENTIFIC_VALIDATION/REAL_STATE_EXAMPLES.json` | `05_SCIENTIFIC_VALIDATION/REAL_STATE_EXAMPLES.json` | 6 Verified NASA Anchor Records |
| `/iss_lightning_sphere_07312023.mp4` | `iss_lightning_sphere_07312023.mp4` | NASA SVS 5011 Video (`206 Partial Content` Byte-Range Streaming) |
| `/Screenshot 2026-11-09 at 08.26.06.png` | `Screenshot 2026-11-09 at 08.26.06.png` | NASA SVS 5011 Poster Frame |
| `/api/health` | Dynamic JSON Health Check | Returns `{"status": "ok", "project": "SonifyEarth — Silence Isn't Zero", "workspace_root_served": true, "listening_modes": ["EVENT-ONLY", "OBSERVATION-AWARE"]}` |

---

## 2. Listening Mode Compatibility Adapter (`Section 5` Resolution)

- **Observed Task 4 Discrepancy:** `04_DATA_PROCESSING/configuration/processing_config.json` and `06_PROCESSED_DATA/json/sonifyearth_windows.json` store `locked_sound_mapping.listening_modes = ["EVIDENCE_INSPECTOR_MODE", "GLOBAL_ORBITAL_PLAYBACK_MODE"]`.
- **Frontend Resolution (`SonifyEarthDataAdapter.resolveListeningModeCompatibility()`):**
  - Preserves Task 4 files untouched (`0` bytes modified).
  - Maps user-facing listening modes strictly to **`EVENT-ONLY`** and **`OBSERVATION-AWARE`**.
  - Keeps the *"Why Did I Hear That?"* Evidence Inspector (`Page 7`) active as a core interface panel across both modes.
  - Enforces that `window.sonifyEarthApp.setListeningMode('EVENT-ONLY' | 'OBSERVATION-AWARE')` retains the **exact same `DataPackage` object reference** (`packageId`, `region`, `timePreset`, `flashes`, `orbitalWindows`, `saaWindows`, `fatalWindows`, `qcGaps`).

---

## 3. Web Audio API Sound Engine Contract (`09_SOUND_ENGINE/`)

- **Class:** `SonifyEarthSoundEngine` (`09_SOUND_ENGINE/playback/sound_engine.js`)
- **Methods:**
  - `ensureAudioContext()` — Lazily initializes/resumes `AudioContext` only on user gesture (zero autoplay).
  - `setListeningMode('EVENT-ONLY' | 'OBSERVATION-AWARE')` — Switches active cue rules immediately; stops sustained observation texture when entering `EVENT-ONLY`.
  - `play(initialTai93)`, `pause()`, `stop(resetTai93)`, `restart(startTai93)`, `seek(targetTai93)` — Transport controls with immediate node cancellation (`cancelAllScheduledAudio()`).
  - `setVolume(0..1)`, `setMuted(bool)`, `toggleMute()` — Master gain control.
  - `processPlaybackStep({ prevTai93, currTai93, flashesInStep, observationState, reasonCode, windowMeta })` — Deterministic scheduler for timeline playback.
  - `previewApprovedCue(state, metadata)` — Auditions any of the three approved cues (`DETECTED`, `OBSERVED_NO_DETECTION`, `UNKNOWN`).
  - `getDiagnostics()` — Returns live node counts, pulse/texture/unknown cue counters, cancellation count, and recent cue log entries.

