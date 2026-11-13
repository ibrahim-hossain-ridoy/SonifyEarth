# NASA ISS LIS NetCDF-4 Dataset Schema Report
**SonifyEarth — Task 2: Scientific Data Inspection**  
*Document Version: 1.0 — Generated: November 11, 2026*  
*Datasets: ISS LIS Science V2.2 (DATA111) & ISS LIS Backgrounds V2.2 (DATA211)*

---

## 1. Executive Summary

This report establishes the verified internal architecture, coordinate reference frames, dimensions, and data structures of the two official NASA datasets powering **SonifyEarth**:
1. **ISS LIS Science Data V2.2 (Final QC)**: 106 orbital files, NetCDF-4 format, CF-1.6 compliant, 17 dimensions, 147 variables.
2. **ISS LIS Backgrounds / Gridded Data V2.2 (Final QC)**: 106 orbital files, NetCDF-4 format, CF-1.6 compliant, 9 dimensions, 33 variables.

Every single one of the 212 files in the 7-day mission collection (spanning November 9 to November 16, 2023) was programmatically read and verified. There were **zero failed files** and **zero schema discrepancies** across the entire week.

---

## 2. File Format & Standard Conventions

Both products utilize **NetCDF-4 (Network Common Data Form Version 4)** with an underlying **HDF5 storage layer**:
- **Format Identifier**: `NETCDF4` (confirmed via `netCDF4.Dataset.file_format`).
- **Global Conventions**: `CF-1.6` (Climate and Forecast Metadata Conventions Version 1.6).
- **History Attribute**:
  - Science: `"This TRMM LIS product in netCDF4/HDF5 format is converted from original LIS science data product in hdf4 format"`
  - Backgrounds: `"This LIS background product in netCDF4/HDF5 format is converted from original LIS background data product in hdf4 format"`
- **Time Standard**: `TAI93` (International Atomic Time seconds since `1993-01-01 00:00:00.000 UTC`), providing sub-millisecond continuous time stamps without leap-second discontinuities.

---

## 3. ISS LIS Science V2.2 Schema & Dimensions

### 3.1 Dimension Architecture (17 Dimensions)
| Dimension Name | Typical Size / Orbit | Scientific Role |
| :--- | :---: | :--- |
| `flash_dim` | 12 to 625 (Total: 16,124) | Flashes identified during the orbital pass |
| `group_dim` | 120 to 5,500 (Total: 144,611) | Groups identified during the orbital pass |
| `event_dim` | 500 to 22,000 (Total: 549,106) | Fundamental optical pixel hits (CCD optical transients) |
| `area_dim` | 5 to 150 | Higher-level storm complex clusters |
| `viewtime_dim` | 25,000 to 45,000 (Total: 4,160,874) | 0.5° x 0.5° surface grid cells observed by sensor FOV |
| `one_second_dim` | 2,778 to 5,574 (Mean: 5,546.6) | 1-second cadence platform health, position & alerts |
| `background_summary_dim`| 14 to 106 (Mean: 100.6) | Number of background snapshot frames in orbit |
| `latlon_dim` | 2 | Coordinate pair dimension `(latitude, longitude)` |
| `corners_dim` | 8 | 4 corner points `(lat1, lon1, ..., lat4, lon4)` for FOV polygons |
| `vector_dim` | 3 | 3D Cartesian coordinates in ECR space `(X, Y, Z)` |
| `transform_matrix_dim` | 9 | 3x3 Coordinate transform matrix components |
| `threshold_dim` | 8 | 8-bit dynamic background threshold table |
| `processing_stage_dim` | 6 | Filter stages through which optical events pass |
| `image_xsize` / `image_ysize` | 720 / 500 | Raster summary browse image dimensions |
| `clr_table_dim1` / `clr_table_dim2`| 3 / 256 | RGB palette for browse image |

### 3.2 The Four-Level Lightning Hierarchy
```
Area (Storm System Scale)
 └── Flash (Flash Scale: ~100–500 ms)
      └── Group (Cluster Scale: simultaneous pixels within 2 ms)
           └── Event (Pixel Scale: 1 CCD pixel illuminated in a 2 ms frame)
```

1. **Lightning Event (`lightning_event_*`)**:
   - Represents the illumination of a single $128 \times 128$ CCD pixel exceeding the background threshold during a single 2 ms frame.
   - Primary fields: `lightning_event_lat`, `lightning_event_lon`, `lightning_event_radiance`, `lightning_event_x_pixel`, `lightning_event_y_pixel`, `lightning_event_TAI93_time`.
2. **Lightning Group (`lightning_group_*`)**:
   - One or more adjacent events occurring within the same 2 ms frame.
   - Represents the instantaneous spatial footprint of a return stroke or cloud discharge channel.
3. **Lightning Flash (`lightning_flash_*`)**:
   - A cluster of groups separated by less than 330 ms and less than 16.5 km (per NASA ATBD clustering rules).
   - **Primary SonifyEarth Sound Trigger**: Drives audio note onset, duration (`lightning_flash_delta_time`), pitch (radiance & footprint), and spatial stereo panning (`lightning_flash_lon`).
4. **Lightning Area (`lightning_area_*`)**:
   - Spatial accumulation of flashes representing active mesoscale convective systems (MCS).

### 3.3 The Viewtime Subsystem (`viewtime_*`)
- **CRITICAL ARCHITECTURAL FINDING**: `viewtime_*` is located **inside the Science V2 dataset**, not the Backgrounds dataset.
- Variables:
  - `viewtime_location` / `viewtime_lat` / `viewtime_lon`: Grid cell centroid (0.5° resolution).
  - `viewtime_TAI93_start` / `viewtime_TAI93_end`: Time bounds of when that grid cell was inside the sensor field-of-view.
  - `viewtime_effective_obs`: Exact duration of observation adjusted for partial grid cell coverage (in seconds).
  - `viewtime_alert_flag`: Bitmask indicating instrument/platform health during grid viewing.
  - `viewtime_approx_threshold`: Dynamic sensitivity threshold based on solar zenith angle.

---

## 4. ISS LIS Backgrounds V2.2 Schema & Dimensions

### 4.1 Dimension Architecture (9 Dimensions)
| Dimension Name | Size / Orbit | Scientific Role |
| :--- | :---: | :--- |
| `tdim` | 14 to 106 (Mean: 100.6) | Number of 128x128 optical background snapshot frames |
| `ydim` | 128 | CCD pixel array rows |
| `xdim` | 128 | CCD pixel array columns |
| `bg_info_dim` | 2,778 to 5,574 (Mean: 5,546.6) | 1-second cadence platform health, vectors & quality flags |
| `latlon_dim` | 2 | Coordinate pair `(lat, lon)` |
| `corners_dim` | 8 | 4 corner pixels defining the ground swath footprint |
| `vector_dim` | 3 | Cartesian ECR vectors (position, velocity, solar) |
| `transform_matrix_dim` | 9 | Boresight to ECR transformation matrix |
| `event_count_dim` | 6 | Event counts at each filter stage |

### 4.2 Key Background Data Structures
1. **Calibrated Background Imagery (`bg_data`)**:
   - Shape: `(tdim, 128, 128)`, type `int16`, missing value `-9999`.
   - Snapshot of Earth's cloud-top and ground radiance taken roughly every 90 seconds.
   - Provides ambient optical brightness, cloud reflectivity, and day/night contrast.
2. **Swath Footprint Polygons (`bg_data_summary_corners`)**:
   - Shape: `(tdim, 8)`, type `float32`.
   - Coordinates of the 4 corner pixels of the sensor view on Earth's surface, defining the exact polygon of observation for 3D visualization.
3. **1-Second Platform Navigation & Ephemeris**:
   - `bg_info_position_vector`: Position of ISS in ECR coordinates (meters).
   - `bg_info_velocity_vector`: Velocity of ISS in ECR coordinates (m/s).
   - `bg_info_solar_vector`: Unit vector from Earth center to Sun.
4. **1-Second Quality & Anomaly Flags**:
   - `bg_info_alert_summary`: Bitmask summarizing instrument, platform, external, and algorithm status.
   - `bg_info_external_alert`: Bit 1/2 explicitly flags passage through the South Atlantic Anomaly (SAA); Bit 3 flags direct solar reflection glint.

---

## 5. Granule Synchronization & Pairing

- All 106 Science files have an exact matching Backgrounds file.
- Start times (`UTC_start`, `TAI93_start`) and stop times (`TAI93_end`) are bit-for-bit identical.
- In all 106 pairs, `one_second_dim` in Science matches `bg_info_dim` in Backgrounds to the exact single second.
- **Continuity**: The dataset provides near-continuous orbital coverage from 2023-11-09 22:52:12 UTC to 2023-11-16 20:30:42 UTC, with exactly **one 185.8-minute gap** on 2023-11-11 caused by NASA QC deletion of two high-noise orbits.

---

## 6. Scientific Data Extraction Recommendations for SonifyEarth

1. **Direct Sound Synthesis Pipeline (Mode A)**:
   - Extract `lightning_flash_TAI93_time`, `lightning_flash_lat`, `lightning_flash_lon`, `lightning_flash_radiance`, `lightning_flash_delta_time`, and `lightning_flash_child_count`.
   - Filter records where `lightning_flash_alert_flag` fatal bits are set or where `lightning_flash_glint_index` indicates false-alarm solar glint.
2. **Ambient Soundscape Pipeline (Mode B)**:
   - Extract `bg_data` downsampled or regionally integrated radiance along the orbital swath.
   - Modulate ambient harmonic drone filters based on `bg_info_solar_vector` (solar zenith angle / day-night transition).
3. **Observation Coverage Grid & Three-State Classifier**:
   - Ingest `viewtime_*` to determine when Earth grid cells were actively observed.
   - Mark cells with `viewtime_effective_obs > 0` and no lightning as `OBSERVED_NO_DETECTION`.
   - Mark areas outside FOV, during the 185.8-min gap, or under fatal alert flags as `UNKNOWN`.

