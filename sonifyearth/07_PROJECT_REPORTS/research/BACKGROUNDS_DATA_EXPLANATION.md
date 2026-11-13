# Scientific Data Explanation: ISS LIS Backgrounds V2.2
**SonifyEarth — Scientific Reference Document**  
*NASA Space Apps Challenge 2026: The Earth Information Jukebox*  
*Collection: `ISS_LIS_BG_V2.2` (Quality Controlled Final Product)*  
*Document Version: 2.0 (Post-Task 2.1 Scientific Audit) — Date: November 11, 2026*

---

## 1. Instrument Background & Optical Measurement Principles

While the primary role of the Lightning Imaging Sensor is detecting rapid optical transients (lightning), the sensor's CCD array also captures periodic full-frame images of Earth's background scene radiance.

These measurements serve multiple vital scientific functions:
1. **Dynamic Background Threshold Setting**: Lightning occurs over both bright sunlit cloud tops (high background radiance) and pitch-black nocturnal oceans (near-zero background radiance). The instrument measures background radiance to continuously adjust the Real-Time Event Processor (RTEP) detection threshold.
2. **Coastline Discrimination & Geolocation Calibration**: Visible land/water boundaries in the background images allow precise post-flight verification of sensor attitude and pixel georeferencing.
3. **Instrument Stability Monitoring**: Long-term tracking of CCD pixel sensitivity, dark current, and optical degradation.

---

## 2. Background Data Structures in the NetCDF-4 Files

The Backgrounds NetCDF-4 product (`ISS_LIS_BG_V2.2_*.nc`) is organized into three primary operational tiers:

### 2.1 The 2D Optical Scene Array (`bg_data`)
- **Array Dimensions**: `(tdim, ydim, xdim)` = `(102, 128, 128)` in standard orbits.
- **Data Type**: 16-bit signed integer (`int16`), with missing value `_FillValue = -9999`.
- **Temporal Cadence**: Captured approximately once every **90 seconds** throughout the orbit.
- **Physical Meaning**: Calibrated optical brightness at 777.4 nm across the $128 \times 128$ pixel field of view.

### 2.2 Swath Boresight & Footprint Polygon Geometry
For every background image frame in `tdim`:
- `bg_data_summary_TAI93_time`: Precise timestamp of the image acquisition.
- `bg_data_summary_boresight`: `(latitude, longitude)` of the optical axis (center pixel `(63, 64)`).
- `bg_data_summary_lat` / `bg_data_summary_lon`: Geodetic center coordinates.
- `bg_data_summary_corners`: Shape `(tdim, 8)`. Contains the 4 geodetic corner coordinates:
  $$[(\text{lat}_1, \text{lon}_1), (\text{lat}_2, \text{lon}_2), (\text{lat}_3, \text{lon}_3), (\text{lat}_4, \text{lon}_4)]$$
  defining the **exact instantaneous ground footprint polygon** of the sensor on the 3D globe.

### 2.3 Continuous 1-Second Ephemeris & Anomaly Stream (`bg_info_*`)
Spanning the entire orbital pass at 1.0-second resolution (`bg_info_dim`, typically 5,572 seconds ~ 92.8 min):
- `bg_info_TAI93_time`: Continuous 1-second time coordinates.
- `bg_info_position_vector`: 3D Cartesian position $[X, Y, Z]$ in meters in Earth-Centered Rotating (ECR) frame.
- `bg_info_velocity_vector`: 3D Cartesian velocity $[V_x, V_y, V_z]$ in m/s in ECR frame.
- `bg_info_solar_vector`: Unit vector from Earth center to Sun.
- `bg_info_noise_index`: Real-time percentage noise level.
- `bg_info_event_count`: Matrix `(bg_info_dim, 6)` tracking raw pulse detections and the number surviving each filtering stage.

---

## 3. Anomaly Flags & The South Atlantic Anomaly (SAA)

High-energy charged particles in Earth's inner Van Allen radiation belt dip low over the South Atlantic Anomaly ($0^\circ-40^\circ\text{S}$, $60^\circ\text{W}-20^\circ\text{E}$). When particle radiation strikes the LIS CCD detector, it creates false transient hits indistinguishable from optical photons.

The Backgrounds dataset provides 1-second alert tracking for radiation and instrument health:
- `bg_info_alert_summary`: Bitmask summarizing fatal (`0x55`) and warning (`0xAA`) states.
- `bg_info_external_alert` (uint8 bitmask):
  - **Bit 1 (`0x01`)**: Warning — Satellite within SAA Model 1.
  - **Bit 2 (`0x02`)**: Warning — Satellite within SAA Model 2.
  - **Bit 3 (`0x04`)**: Warning — Direct solar reflection possible within FOV (sun glint).
- `bg_info_instrument_alert` (uint8 bitmask):
  - **Bit 1 (`0x01`)**: Fatal — Instrument Off.
  - **Bit 3 (`0x04`)**: Fatal/Warning — FIFO buffer overflow.
  - **Bit 7 (`0x40`)**: Fatal — Packet gap.

When SAA flags are set or fatal flags occur, the sensor's optical detection capability is compromised, and the observation state is classified as **UNKNOWN** (neutral two-part cue).

---

## 4. Role in SonifyEarth Sound Engine

All speculative audio mapping proposals have been removed. In accordance with project specifications:
1. **Background Imagery & Swath Visualization**: Background frames and corner coordinates provide 3D visual context and define the spatial observation polygon on the globe.
2. **State 2 (OBSERVED_NO_DETECTION)**: Background data verifies operational instrument imaging, supporting the **sustained observation texture**.
3. **State 3 (UNKNOWN)**: Instrument alerts, packet gaps, and SAA radiation flags trigger the **distinct neutral two-part cue**.
4. **Listening Modes**: Both approved listening modes remain supported without unauthorized audio modifications.
