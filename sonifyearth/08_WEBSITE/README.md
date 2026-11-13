# 08_WEBSITE — SonifyEarth Web Application

This directory contains the complete **SonifyEarth — Silence Isn't Zero** (*An Observation-Aware Lightning Jukebox*) web application.

## Structure
- [`frontend/index.html`](./frontend/index.html): Complete 8-section semantic HTML5 application (Landing/Story, NASA SVS 5011 Visualization, Interactive Global Lightning Explorer, Synchronized Orbital Timeline & Dashboard, Two Listening Modes, Dynamic Web Audio API Sound Engine, *"Why Did I Hear That?"* Evidence Inspector, and Data/Methodology/Sources).
- [`frontend/css/styles.css`](./frontend/css/styles.css): Token-driven NASA Earth-science dark observatory stylesheet implementing `07_PROJECT_REPORTS/research/DESIGN_SYSTEM.md`.
- [`frontend/js/`](./frontend/js/):
  - `data_adapter.js`: Connects all 7 JSON and 3 GeoJSON files from `06_PROCESSED_DATA/` plus `05_SCIENTIFIC_VALIDATION/REAL_STATE_EXAMPLES.json`, and implements the Section 5 Listening Mode Compatibility Adapter (`EVENT-ONLY` and `OBSERVATION-AWARE`).
  - `map_view.js`: Interactive 2D Equirectangular & 3D Orthographic Globe GeoJSON renderer with spatial clustering, ISS $\pm 54^\circ$ (`[-55.75°, +55.25°]`) coverage envelope, polar out-of-coverage shading, and click-to-inspect.
  - `timeline_view.js`: Synchronized 3-track orbital timeline renderer.
  - `inspector_view.js`: *"Why Did I Hear That?"* Evidence Inspector with everyday-language explanations first and expandable technical provenance metadata.
  - `app.js`: Central application state and shared playback controller.
- [`backend/server.py`](./backend/server.py): Read-only Python 3.11 HTTP server with byte-range (`206 Partial Content`) support serving `08_WEBSITE/frontend/`, `06_PROCESSED_DATA/`, `05_SCIENTIFIC_VALIDATION/`, `09_SOUND_ENGINE/`, and root SVS 5011 media assets without duplicating raw NASA files.
- [`public/favicon.svg`](./public/favicon.svg): Vector orbital lightning emblem.
