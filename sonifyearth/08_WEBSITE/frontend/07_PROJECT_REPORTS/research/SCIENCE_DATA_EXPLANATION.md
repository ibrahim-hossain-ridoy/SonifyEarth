# Scientific Data Explanation: ISS LIS Science V2.2
**SonifyEarth — Scientific Reference Document**  
*NASA Space Apps Challenge 2026: The Earth Information Jukebox*  
*Collection: `ISS_LIS_SC_V2.2` (Quality Controlled Final Product)*  
*Document Version: 2.0 (Post-Task 2.1 Scientific Audit) — Date: November 11, 2026*

---

## 1. Instrument Background & Optical Measurement Principles

The **Lightning Imaging Sensor (LIS)** aboard the International Space Station is a specialized optical staring imager designed to detect lightning flashes occurring within clouds and between cloud and ground during both day and night conditions.

The instrument utilizes:
- A $128 \times 128$ pixel Charge-Coupled Device (CCD) focal plane array.
- A narrow-band optical interference filter centered on the neutral atomic oxygen emission triplet at **$\lambda = 777.4\text{ nm}$**.
- A high frame rate of **500 frames per second (2.0 ms integration time per frame)**.
- A Real-Time Event Processor (RTEP) that removes background scene radiance on a pixel-by-pixel basis and flags optical pulses that exceed an adaptive threshold.

---

## 2. The Four-Tiered Scientific Data Hierarchy

NASA's LIS data processing pipeline groups raw optical transients into four progressively larger physical phenomena. In the NetCDF-4 files, each tier has dedicated dimensions and linked address pointers:

```
┌─────────────────────────────────────────────────────────────┐
│  lightning_area_*       (Storm System Complex)              │
│    address, child_address, child_count                      │
└───────────────┬─────────────────────────────────────────────┘
                │ 1 Area contains 1 or more Flashes
┌───────────────▼─────────────────────────────────────────────┐
│  lightning_flash_*      (Individual Lightning Flash)        │
│    address, child_address, child_count                      │
└───────────────┬─────────────────────────────────────────────┘
                │ 1 Flash contains 1 or more Groups
┌───────────────▼─────────────────────────────────────────────┐
│  lightning_group_*      (Instantaneous Stroke / Step)       │
│    address, child_address, child_count                      │
└───────────────┬─────────────────────────────────────────────┘
                │ 1 Group contains 1 or more Events
┌───────────────▼─────────────────────────────────────────────┐
│  lightning_event_*      (Single CCD Pixel in Single 2 ms)   │
│    x_pixel, y_pixel, radiance, TAI93_time                   │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 Lightning Event (`lightning_event_*`)
- **Definition**: The fundamental unit of observation. A single CCD pixel that exceeded the background radiance threshold during a single 2.0 ms integration cycle.
- **Physical Coordinates**: Defined by CCD column and row (`x_pixel`, `y_pixel`) and mapped to Earth latitude and longitude (`lightning_event_lat`, `lightning_event_lon`).
- **Radiance**: Expressed in $\mu\text{J}/\text{m}^2/\text{sr}/\mu\text{m}$.
- **Background Context**: `lightning_event_bg_value` (16-bit counts) and `lightning_event_bg_radiance` provide the scene brightness at the moment of the strike.

### 2.2 Lightning Group (`lightning_group_*`)
- **Definition**: One or more contiguous events occurring in the **same 2.0 ms frame**.
- **Physical Interpretation**: Represents the illuminated optical footprint of a single lightning stroke, return stroke, or energetic leader step as light diffuses through cloud tops.
- **Centroid**: Radiance-weighted center of mass of the component events:
  $$\text{Lat}_{\text{group}} = \frac{\sum_i R_i \cdot \text{Lat}_i}{\sum_i R_i}, \quad \text{Lon}_{\text{group}} = \frac{\sum_i R_i \cdot \text{Lon}_i}{\sum_i R_i}$$
  where $R_i$ is event calibrated radiance.

### 2.3 Lightning Flash (`lightning_flash_*`) — *Primary SonifyEarth Sound Trigger*
- **Definition**: A temporal and spatial cluster of groups. Groups separated by less than **330 ms** and **16.5 km** are assembled into a single Flash.
- **Duration**: `lightning_flash_delta_time` is the elapsed time in seconds between the first group and last group of the flash (typically 10 ms to 800 ms).
- **Total Radiance**: `lightning_flash_radiance` represents the integrated radiant optical energy emitted across all constituent groups.
- **Footprint**: `lightning_flash_footprint` is the total geographical area ($\text{km}^2$) illuminated by the flash.
- **Complexity**: `lightning_flash_child_count` indicates the number of constituent groups (strokes), while `lightning_flash_grandchild_count` indicates the total number of illuminated pixels.

### 2.4 Lightning Area (`lightning_area_*`)
- **Definition**: Represents the spatial envelope of multiple flashes occurring within a coherent thunderstorm cell or mesoscale convective system.

---

## 3. The Viewtime Subsystem (`viewtime_*`) & Scientific Observation Truth

A central premise of SonifyEarth is that **"Silence Isn't Zero"**: absence of lightning sound must mean that the sensor *observed Earth and found no lightning*, rather than being offline, uncalibrated, or facing another part of the planet.

The `viewtime_*` subsystem in the Science NetCDF-4 files provides the mathematical proof of observation:
1. **Grid Resolution**: Global Earth surface is partitioned into $0.5^\circ \times 0.5^\circ$ geographic grid cells (`viewtime_lat`, `viewtime_lon`).
2. **Observation Window**: `viewtime_TAI93_start` and `viewtime_TAI93_end` record the exact whole-second interval when each grid cell was inside the sensor's optical field-of-view (typically ~80 to 95 seconds as the ISS flies overhead at 7.66 km/s).
3. **Effective Observation Duration**: `viewtime_effective_obs` (in seconds) computes the time-integrated fraction of the grid cell area that was within the FOV:
   $$\Delta t_{\text{eff}} = \int_{t_{\text{start}}}^{t_{\text{end}}} \frac{A_{\text{cell}} \cap \text{FOV}(t)}{A_{\text{cell}}} \, dt$$
   If $\Delta t_{\text{eff}} > 0$ and no flashes occurred in that cell, we have verified proof of **OBSERVED_NO_DETECTION**.
4. **Alert Filtering**: `viewtime_alert_flag` (uint8 bitmask) validates sensor health during that observation:
   - Fatal Bitmask: `0x55` (`0b01010101`: bits 1, 3, 5, 7)
   - Warning Bitmask: `0xAA` (`0b10101010`: bits 2, 4, 6, 8)
   - If `(viewtime_alert_flag & 0x55) != 0`, the observation is invalid and the state must be classified as **UNKNOWN**.
   - Warning-only flags (`viewtime_alert_flag & 0x55 == 0`) are valid observations.

---

## 4. Approved Sound Engine Specifications

All speculative sound-mapping proposals (e.g. mapping latitude to pitch, radiance to volume, or background albedo to synthesizer drones) have been removed.

The sound engine adheres strictly to the approved SonifyEarth specification:
1. **State 1: DETECTED** $\to$ **Short percussive pulse**. Triggered by confirmed, non-fatal flash events.
2. **State 2: OBSERVED_NO_DETECTION** $\to$ **Sustained observation texture**. Generated when grid cells were actively observed with zero lightning detections.
3. **State 3: UNKNOWN** $\to$ **Distinct neutral two-part cue**. Communicates unobserved regions, orbit gaps, or sensor blinding.
4. **Listening Modes**: The two approved listening modes remain unchanged.

---

## 5. Scientific Traceability & The Evidence Inspector

When a user clicks on an active lightning audio event in the SonifyEarth interface, the *"Why Did I Hear That?"* inspector traces the exact provenance chain:
1. **Granule Provenance**: Displays `filename`, `orbit_id`, and NASA GHRC collection version.
2. **Flash Provenance**: Displays exact `lightning_flash_address`, `TAI93_time`, centroid lat/lon, stroke count, and calibrated optical energy.
3. **Quality Certification**: Verifies that `lightning_flash_alert_flag == 0` and `lightning_flash_glint_index` confirmed non-glint valid lightning.
