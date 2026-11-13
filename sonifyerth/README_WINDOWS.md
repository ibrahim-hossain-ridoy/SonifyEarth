# SonifyEarth — Windows Setup & Startup Guide
### *Observation-Aware NASA ISS LIS Lightning Jukebox*

This document provides exact, step-by-step instructions for setting up and running **SonifyEarth** on **Windows 10 / Windows 11**.

---

## 1. Quick Start (Zero-Configuration Launch)

### Prerequisites
- **Windows 10** or **Windows 11** (64-bit)
- **Python 3.8+** (Python 3.11 or 3.12 recommended).
  > **Python Installation Tip:** If Python is not already installed on your system, download it from [python.org](https://www.python.org/downloads/). During setup, make sure to check the box:
  > **☑ Add python.exe to PATH**
- Any modern web browser: **Google Chrome**, **Microsoft Edge**, **Mozilla Firefox**, or **Brave** (Web Audio API compatible).

### Launching the Web Server

#### Option A: One-Click Batch Launcher (Recommended for Windows)
Simply double-click `start_server_windows.bat` in the root project folder.

#### Option B: Windows Command Prompt (`cmd.exe`)
1. Open Command Prompt and navigate into the project directory:
   ```cmd
   cd path\to\sonifyerth
   ```
2. Start the local server:
   ```cmd
   python 08_WEBSITE\backend\server.py --port 8080
   ```
   *(If your environment uses the Python launcher, you can also run: `py 08_WEBSITE\backend\server.py --port 8080`)*

#### Option C: Windows PowerShell
1. Open PowerShell and navigate into the project directory:
   ```powershell
   cd path\to\sonifyerth
   ```
2. Start the local server:
   ```powershell
   python 08_WEBSITE/backend/server.py --port 8080
   ```
   *(Or run: `.\start_server_windows.ps1`)*

### Accessing the Web Application
Once the server starts, you will see:
```text
SonifyEarth server listening at http://127.0.0.1:8080/
```
Open your browser and navigate to:
```text
http://127.0.0.1:8080/
```
*(or `http://localhost:8080/`)*

---

## 2. Dependencies & Runtime Architecture Explained

### A. Web Application & Sound Engine (Zero External Dependencies)
- **Python Runtime:** Python standard library only (`http.server`, `socketserver`, `mimetypes`, `urllib.parse`, `argparse`, `json`).
- **External Pip Packages:** **0 packages required.** You do **NOT** need to run `pip install` to launch and experience the full SonifyEarth web application.
- **Backend Role:** The backend server (`08_WEBSITE\backend\server.py`) acts as a high-performance, strictly read-only local HTTP/1.1 server. It serves:
  - `08_WEBSITE\frontend\index.html` at root (`/`)
  - CSS styles (`/css/styles.css`) and modular ES JavaScript (`/js/`)
  - Processed NASA JSON and GeoJSON datasets from `/06_PROCESSED_DATA/`
  - Deterministic Web Audio API synthesis modules from `/09_SOUND_ENGINE/`
  - High-definition NASA SVS 5011 visualization video (`iss_lightning_sphere_07312023.mp4`) with HTTP 206 Range byte streaming
- **Frontend Sound Engine:** Audio is synthesized entirely client-side inside the browser using the **Web Audio API** (Oscillators, BiquadFilters, GainNodes). It does not require any backend audio generation or external media servers.

### B. Optional: Scientific Data Reprocessing (Python)
- **Only required if you want to reprocess the raw NetCDF-4 / HDF5 datasets in `01_NASA_RAW_DATA\`**:
  ```cmd
  pip install -r requirements.txt
  ```
  Packages included in `requirements.txt`:
  - `netCDF4>=1.6.5` and `h5py>=3.11.0`: Direct reading of NASA orbital NetCDF-4 and HDF5 files.
  - `numpy>=1.26.0`, `scipy>=1.13.0`, `pandas>=2.2.0`, `xarray>=2024.0.0`: Numerical computation and tabular alignment.
  - `shapely>=2.0.0`, `pyproj>=3.6.0`, `geojson>=3.1.0`: Geospatial boundaries and GeoJSON serialization.

### C. Optional: Automated Test Suites (Python & Node.js)
- **Built-in Python Verification Suites (No extra packages required for server/production JSON checks):**
  ```cmd
  python scripts\verify_workspace.py
  python 08_WEBSITE\backend\server.py --self-test
  python 04_DATA_PROCESSING\scripts\validate_production_data.py
  ```
- **Only required for developers running unit tests or Playwright E2E browser tests:**
  - Requires **Node.js 18+**.
  ```cmd
  npm install
  npx playwright install chromium
  node scripts\test_task5_unit_and_integration.mjs
  node scripts\verify_task5_playwright_e2e.mjs
  ```

---

## 3. Project Directory Map

```text
sonifyerth\
├── 01_NASA_RAW_DATA\             # Untouched primary raw NASA datasets (428 files, 2.5 GB)
│   ├── science_v2\               # 106 .nc and 106 .hdf ISS LIS Science V2.2 granules
│   ├── backgrounds_v2\           # 106 .nc and 106 .hdf ISS LIS Backgrounds V2.2 granules
│   └── original_downloads\       # Byte-for-byte archived download folders and NASA PDFs
├── 02_NASA_DOCUMENTATION\        # Official NASA reference guides & Master Project Specification
├── 03_DATA_INSPECTION\           # NetCDF-4 variable dictionaries & schema reports
├── 04_DATA_PROCESSING\           # Reproducible extraction & validation scripts
├── 05_SCIENTIFIC_VALIDATION\     # Granule matching, TAI93 & 3-state verification
├── 06_PROCESSED_DATA\            # Validated website-ready JSON & GeoJSON payloads
│   ├── json\                     # source_manifest, flash_events, observation_windows, three_state_data, sonifyearth_windows, excluded_records_audit, schema
│   └── geojson\                  # lightning_events, observation_grid, unknown_coverage
├── 07_PROJECT_REPORTS\           # Research, architecture, design system & validation reports
├── 08_WEBSITE\                   # Complete SonifyEarth web application
│   ├── backend\server.py         # Read-only HTTP 1.1 server with byte-range 206 streaming
│   ├── frontend\index.html       # Complete 8-section scientific web application
│   ├── frontend\css\styles.css   # Dark observatory NASA design token stylesheet
│   ├── frontend\js\              # Data adapter, map, timeline, inspector, app controller
│   └── public\favicon.svg        # Brand icon
├── 09_SOUND_ENGINE\              # Deterministic Web Audio API synthesis engine
├── 10_DEVELOPER_HANDOFF\         # API contracts & production JSON/GeoJSON schemas
├── scripts\                      # Workspace and data validation scripts
├── DATA_INVENTORY.csv            # Comprehensive inventory of all 428 NASA granules
├── PROJECT_STATUS.md             # Project roadmap and milestone audit
├── README.md                     # Main project overview and scientific documentation
├── README_WINDOWS.md             # This Windows setup and startup guide
├── start_server_windows.bat      # One-click Windows Command Prompt server launcher
├── start_server_windows.ps1      # One-click Windows PowerShell server launcher
├── iss_lightning_sphere_07312023.mp4 # NASA SVS 5011 visualization video asset (127 MB)
└── requirements.txt              # Optional scientific Python dependencies
```

---

## 4. Troubleshooting on Windows

1. **`'python' is not recognized as an internal or external command`**:
   - Python is not registered in your Windows `PATH` environment variable.
   - Run the Python installer again, choose **Modify**, and make sure **"Add Python to environment variables"** is checked.
   - Alternatively, try using the Python launcher: `py 08_WEBSITE\backend\server.py --port 8080`.
2. **Port 8080 is already bound (`OSError: [Errno 10048]`)**:
   - Another application is using port 8080. Start on a different port (e.g. 8081 or 8888):
     ```cmd
     python 08_WEBSITE\backend\server.py --port 8888
     ```
     Then visit `http://127.0.0.1:8888/`.
3. **Audio is silent when the page loads**:
   - Web browsers (Chrome, Edge, Firefox) require user gesture interaction before activating audio.
   - Click the **"Listen to Orbit"** or **"Play"** button on the page to enable the Web Audio API synthesizer.

