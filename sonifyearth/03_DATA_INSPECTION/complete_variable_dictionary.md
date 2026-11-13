# SonifyEarth — Complete NASA LIS Variable Dictionary
**NASA Space Apps Challenge 2026: The Earth Information Jukebox**
*Version: 2.0 (Audited Post-Task 2.1) — November 11, 2026*
*Empirical metadata derived from 106 Science V2.2 and 106 Backgrounds V2.2 NetCDF-4 files.*

---

## Overview & Catalog Summary

| Dataset | Total Variables | Key Tiers / Subsystems | Primary Role in SonifyEarth |
| :--- | :---: | :--- | :--- |
| **ISS LIS Science V2.2** | **147** | Flashes (22), Groups (20), Events (23), Areas (22), Viewtime (8), One-Second (16), Orbit Summary (15), Point Summary (13), Background Summary (6), Browse (2) | Triggers State 1 (DETECTED) short percussive pulses, provides spatial georeferencing, flash duration, and viewtime observation coverage for State 2 (`OBSERVED_NO_DETECTION`). |
| **ISS LIS Backgrounds V2.2** | **33** | Background Imagery (1), Boresight & Footprint Summary (5), 1-Second Ephemeris & Vectors (4), 1-Second Alerts & Flags (7), Observation Metrics (3), Orbit Summary (12) | 128x128 optical background radiance frames, 4-corner FOV swath bounding polygons for 3D visualization, 1-second ephemeris, and instrument/SAA anomaly status for State 3 (`UNKNOWN`). |
| **Total Unique Variables** | **180** | **10 Core Tiers** | Full end-to-end scientific traceability. |

---

## 1. Approved SonifyEarth Sound Engine Specifications

All speculative sound mappings (e.g. mapping latitude to pitch, radiance to volume, or background albedo to synthesizer drones) are excluded. The sound engine adheres strictly to the approved specification:
- **State 1: DETECTED** $\to$ **Short percussive pulse**. Triggered by confirmed, non-fatal flash events.
- **State 2: OBSERVED_NO_DETECTION** $\to$ **Sustained observation texture**. Generated when grid cells were actively observed with zero lightning detections.
- **State 3: UNKNOWN** $\to$ **Distinct neutral two-part cue**. Communicates unobserved regions, orbit gaps, or sensor blinding.
- **Listening Modes**: Both approved listening modes remain supported without unauthorized audio modifications.

---

## 2. ISS LIS Science V2.2 Variable Dictionary (147 Variables)

### Tier: Browse Imagery (2 variables)

| Variable Name | Data Type | Dimensions | Units | Missing Value | SonifyEarth Role & Scientific Meaning |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `raster_image` | `uint8` | `(image_ysize, image_xsize)` | 1 | None | **Static orbit summary map and palette**. raster image plot of the orbit in each file. it is included for quick examination and manual identification of specific orbits of interest |
| `raster_image_color_table` | `uint8` | `(clr_table_dim2, clr_table_dim1)` | 1 | None | **Static orbit summary map and palette**. color table for raster image plot of the orbit in each file |

### Tier: Orbit Summary (15 variables)

| Variable Name | Data Type | Dimensions | Units | Missing Value | SonifyEarth Role & Scientific Meaning |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `orbit_summary_id_number` | `int32` | `()` | 1 | None | **Orbit boundary, timeline synchronization, and granule matching**. The number of this orbit, where the orbit count starts at launch |
| `orbit_summary_TAI93_start` | `float64` | `()` | seconds since 1993-01-01 00:00:00.000 | None | **Orbit boundary, timeline synchronization, and granule matching**. start of this orbit in TAI93 time |
| `orbit_summary_UTC_start` | `<class 'str'>` | `()` | dimensionless | None | **Orbit boundary, timeline synchronization, and granule matching**. start of this orbit in UTC time |
| `orbit_summary_GPS_start` | `float64` | `()` | seconds | None | **Orbit boundary, timeline synchronization, and granule matching**. start of this orbit in GPS time |
| `orbit_summary_TAI93_end` | `float64` | `()` | seconds since 1993-01-01 00:00:00.000 | None | **Orbit boundary, timeline synchronization, and granule matching**. end of this orbit in TAI93 time |
| `orbit_summary_start_longitude` | `float32` | `()` | degrees_east | None | **Orbit boundary, timeline synchronization, and granule matching**. longitude boundary defining start of this orbit |
| `orbit_summary_end_longitude` | `float32` | `()` | degrees_east | None | **Orbit boundary, timeline synchronization, and granule matching**. longitude boundary defining end of this orbit |
| `orbit_summary_point_data_count` | `int16` | `()` | count | None | **Orbit boundary, timeline synchronization, and granule matching**. number of point data elements associated with this orbit |
| `orbit_summary_point_data_address` | `int16` | `()` | 1 | None | **Orbit boundary, timeline synchronization, and granule matching**. address of the first element in point data structure |
| `orbit_summary_one_second_count` | `int32` | `()` | count | None | **Orbit boundary, timeline synchronization, and granule matching**. number of elements in the one-second data |
| `orbit_summary_one_second_address` | `int32` | `()` | 1 | None | **Orbit boundary, timeline synchronization, and granule matching**. address of the first element in the one-second data |
| `orbit_summary_summary_image_count` | `int16` | `()` | count | None | **Orbit boundary, timeline synchronization, and granule matching**. number of summary GIF images |
| `orbit_summary_summary_image_address` | `int16` | `()` | 1 | None | **Orbit boundary, timeline synchronization, and granule matching**. address of the first summary GIF image |
| `orbit_summary_inspection_code` | `uint16` | `()` | 1 | None | **Orbit boundary, timeline synchronization, and granule matching**. code indicating which problem scenarios were checked by the QA inspector |
| `orbit_summary_configuration_code` | `uint16` | `()` | 1 | None | **Orbit boundary, timeline synchronization, and granule matching**. code indicating which code configuration scenario was used when processing the data |

### Tier: Point Summary (13 variables)

| Variable Name | Data Type | Dimensions | Units | Missing Value | SonifyEarth Role & Scientific Meaning |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `point_summary_parent_address` | `int32` | `()` | 1 | None | **Global counts of events, groups, flashes per orbit**. address of parent (orbit) |
| `point_summary_event_count` | `int32` | `()` | count | None | **Global counts of events, groups, flashes per orbit**. number of events in orbit |
| `point_summary_event_address` | `int32` | `()` | 1 | None | **Global counts of events, groups, flashes per orbit**. address of first event |
| `point_summary_group_count` | `int32` | `()` | count | None | **Global counts of events, groups, flashes per orbit**. number of groups in orbit |
| `point_summary_group_address` | `int32` | `()` | 1 | None | **Global counts of events, groups, flashes per orbit**. address of first group |
| `point_summary_flash_count` | `int32` | `()` | count | None | **Global counts of events, groups, flashes per orbit**. number of flashes in orbit |
| `point_summary_flash_address` | `int32` | `()` | 1 | None | **Global counts of events, groups, flashes per orbit**. address of first flash |
| `point_summary_area_count` | `int32` | `()` | count | None | **Global counts of events, groups, flashes per orbit**. number of areas in orbit |
| `point_summary_area_address` | `int32` | `()` | 1 | None | **Global counts of events, groups, flashes per orbit**. address of first area |
| `point_summary_bg_count` | `int32` | `()` | count | None | **Global counts of events, groups, flashes per orbit**. number of background image summary records in orbit |
| `point_summary_bg_address` | `int32` | `()` | 1 | None | **Global counts of events, groups, flashes per orbit**. address of first background image summary |
| `point_summary_vt_count` | `int32` | `()` | count | None | **Global counts of events, groups, flashes per orbit**. number of viewtime granules in orbit |
| `point_summary_vt_address` | `int32` | `()` | 1 | None | **Global counts of events, groups, flashes per orbit**. address of first viewtime granule in orbit |

### Tier: Background Summary (6 variables)

| Variable Name | Data Type | Dimensions | Units | Missing Value | SonifyEarth Role & Scientific Meaning |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `bg_summary_TAI93_time` | `float64` | `(background_summary_dim,)` | seconds since 1993-01-01 00:00:00.000 | None | **Summary coordinates of background frames embedded in Science product**. TAI93 time of the background image |
| `bg_summary_address` | `int32` | `(background_summary_dim,)` | 1 | None | **Summary coordinates of background frames embedded in Science product**. image number within orbit |
| `bg_summary_boresight` | `float32` | `(background_summary_dim, latlon_dim)` | degrees | None | **Summary coordinates of background frames embedded in Science product**. lat/lon location of center pixel (63,64) |
| `bg_summary_lat` | `float32` | `(background_summary_dim,)` | degrees_north | None | **Summary coordinates of background frames embedded in Science product**. background image boresight latitude |
| `bg_summary_lon` | `float32` | `(background_summary_dim,)` | degrees_east | None | **Summary coordinates of background frames embedded in Science product**. background image boresight longitude |
| `bg_summary_corners` | `float32` | `(background_summary_dim, corners_dim)` | degree | None | **Summary coordinates of background frames embedded in Science product**. lat/lon locations of corner pixels |

### Tier: Area Tier (22 variables)

| Variable Name | Data Type | Dimensions | Units | Missing Value | SonifyEarth Role & Scientific Meaning |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `lightning_area_TAI93_time` | `float64` | `(area_dim,)` | seconds since 1993-01-01 00:00:00.000 | None | **Grandparent storm cluster tracking**. TAI93 time of 1st event in area |
| `lightning_area_delta_time` | `float32` | `(area_dim,)` | seconds | None | **Grandparent storm cluster tracking**. time between first and last event that compose the area |
| `lightning_area_observe_time` | `int16` | `(area_dim,)` | seconds | None | **Grandparent storm cluster tracking**. duration of observation of the region where the area occurred |
| `lightning_area_location` | `float32` | `(area_dim, latlon_dim)` | degree | None | **Grandparent storm cluster tracking**. lat/lon radiance-weighted centroid |
| `lightning_area_lat` | `float32` | `(area_dim,)` | degrees_north | None | **Grandparent storm cluster tracking**. area latitude |
| `lightning_area_lon` | `float32` | `(area_dim,)` | degrees_east | None | **Grandparent storm cluster tracking**. area longitude |
| `lightning_area_net_radiance` | `float32` | `(area_dim,)` | uJ/sr/m2/um | None | **Grandparent storm cluster tracking**. sum of event radiances composing this area |
| `lightning_area_footprint` | `float32` | `(area_dim,)` | km2 | None | **Grandparent storm cluster tracking**. unique area extent |
| `lightning_area_address` | `int32` | `(area_dim,)` | 1 | None | **Grandparent storm cluster tracking**. area address |
| `lightning_area_parent_address` | `int32` | `(area_dim,)` | 1 | None | **Grandparent storm cluster tracking**. pointer to parent's address (point data) |
| `lightning_area_child_address` | `int32` | `(area_dim,)` | 1 | None | **Grandparent storm cluster tracking**. address of 1st flash in a sequential list |
| `lightning_area_child_count` | `int32` | `(area_dim,)` | count | None | **Grandparent storm cluster tracking**. number of flashes in area |
| `lightning_area_grandchild_count` | `int32` | `(area_dim,)` | count | None | **Grandparent storm cluster tracking**. number of groups in area |
| `lightning_area_greatgrandchild_count` | `int32` | `(area_dim,)` | count | None | **Grandparent storm cluster tracking**. number of events in area |
| `lightning_area_approx_threshold` | `int8` | `(area_dim,)` | 1 | None | **Grandparent storm cluster tracking**. estimated value of 8-bit threshold for the area determined from background level or solar zenith angle |
| `lightning_area_alert_flag` | `uint8` | `(area_dim,)` | 1 | None | **Quality validation flag (Fatal mask 0x55, Warning mask 0xAA)**. bit masked status of instrument, platform, external factors and processing algorithms. Bit1 is the least significant bit (LSB). bit1=1: instrument_fatal_flag; bit2=1: instrument_warning_flag; bit3=1: platform_fatal_flag; bit4=1: platform_warning_flag; bit5=1: external_fatal_flag; bit6=1: external_warning_flag; bit7=1: processing_fatal_flag; bit8=1: processing_warning_flag. |
| `lightning_area_cluster_index` | `int8` | `(area_dim,)` | percent | None | **Grandparent storm cluster tracking**. pixel density metric; higher numbers indicate area is less likely to be noise |
| `lightning_area_density_index` | `int8` | `(area_dim,)` | 1 | None | **Grandparent storm cluster tracking**. spatial density metric; higher if area geolocated in a region of high lightning activity |
| `lightning_area_noise_index` | `int8` | `(area_dim,)` | 100percent | None | **Grandparent storm cluster tracking**. signal-to-signal plus noise ratio |
| `lightning_area_oblong_index` | `float32` | `(area_dim,)` | 1 | None | **Grandparent storm cluster tracking**. metric indicating how oblong the area is |
| `lightning_area_grouping_sequence` | `int32` | `(area_dim,)` | 1 | None | **Grandparent storm cluster tracking**. time sequence of area used when grouping algorithm is applied |
| `lightning_area_grouping_status` | `int8` | `(area_dim,)` | 1 | None | **Grandparent storm cluster tracking**. area grouping_status |

### Tier: Flash Tier (22 variables)

| Variable Name | Data Type | Dimensions | Units | Missing Value | SonifyEarth Role & Scientific Meaning |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `lightning_flash_TAI93_time` | `float64` | `(flash_dim,)` | seconds since 1993-01-01 00:00:00.000 | None | **Primary temporal trigger for State 1 (DETECTED) short percussive pulse**. TAI93 time of 1st event in flash |
| `lightning_flash_delta_time` | `float32` | `(flash_dim,)` | seconds | None | **Flash optical duration for percussive pulse decay timing**. time between first and last group that compose the flash |
| `lightning_flash_observe_time` | `int16` | `(flash_dim,)` | seconds | None | **State 1 (DETECTED) trigger and evidence tracing, and 3D globe visualization**. duration of observation of the region where the flash occurred |
| `lightning_flash_location` | `float32` | `(flash_dim, latlon_dim)` | degrees | None | **State 1 (DETECTED) trigger and evidence tracing, and 3D globe visualization**. lat/lon radiance-weighted centroid |
| `lightning_flash_lat` | `float32` | `(flash_dim,)` | degrees_north | None | **Georeferenced coordinates for 3D Earth visualization and spatial audio placement**. flash latitude |
| `lightning_flash_lon` | `float32` | `(flash_dim,)` | degrees_east | None | **Georeferenced coordinates for 3D Earth visualization and spatial audio placement**. flash longitude |
| `lightning_flash_radiance` | `float32` | `(flash_dim,)` | uJ/sr/m2/um | None | **Physical calibrated optical radiance for evidence inspection traceability**. sum of event radiances composing this flash |
| `lightning_flash_footprint` | `float32` | `(flash_dim,)` | km2 | None | **State 1 (DETECTED) trigger and evidence tracing, and 3D globe visualization**. unique flash extent |
| `lightning_flash_address` | `int32` | `(flash_dim,)` | 1 | None | **State 1 (DETECTED) trigger and evidence tracing, and 3D globe visualization**. flash address |
| `lightning_flash_parent_address` | `int32` | `(flash_dim,)` | 1 | None | **State 1 (DETECTED) trigger and evidence tracing, and 3D globe visualization**. pointer to parent's address (area) |
| `lightning_flash_child_address` | `int32` | `(flash_dim,)` | 1 | None | **State 1 (DETECTED) trigger and evidence tracing, and 3D globe visualization**. address of 1st group in a sequential list |
| `lightning_flash_child_count` | `int32` | `(flash_dim,)` | count | None | **State 1 (DETECTED) trigger and evidence tracing, and 3D globe visualization**. number of groups in flash |
| `lightning_flash_grandchild_count` | `int32` | `(flash_dim,)` | count | None | **State 1 (DETECTED) trigger and evidence tracing, and 3D globe visualization**. number of events in flash |
| `lightning_flash_approx_threshold` | `int8` | `(flash_dim,)` | 1 | None | **State 1 (DETECTED) trigger and evidence tracing, and 3D globe visualization**. estimated value of 8-bit threshold for the flash determined from background level or solar zenith angle |
| `lightning_flash_alert_flag` | `uint8` | `(flash_dim,)` | 1 | None | **Quality validation flag (Fatal mask 0x55, Warning mask 0xAA)**. bit masked status of instrument, platform, external factors and processing algorithms. Bit1 is the least significant bit (LSB). bit1=1: instrument_fatal_flag; bit2=1: instrument_warning_flag; bit3=1: platform_fatal_flag; bit4=1: platform_warning_flag; bit5=1: external_fatal_flag; bit6=1: external_warning_flag; bit7=1: processing_fatal_flag; bit8=1: processing_warning_flag. |
| `lightning_flash_cluster_index` | `int8` | `(flash_dim,)` | percent | None | **State 1 (DETECTED) trigger and evidence tracing, and 3D globe visualization**. pixel density metric; higher numbers indicate flash is less likely to be noise |
| `lightning_flash_density_index` | `int8` | `(flash_dim,)` | 1 | None | **State 1 (DETECTED) trigger and evidence tracing, and 3D globe visualization**. spatial density metric; higher if flash geolocated in a region of high lightning activity |
| `lightning_flash_noise_index` | `int8` | `(flash_dim,)` | 100percent | None | **State 1 (DETECTED) trigger and evidence tracing, and 3D globe visualization**. signal-to-signal plus noise ratio |
| `lightning_flash_oblong_index` | `float32` | `(flash_dim,)` | 1 | None | **State 1 (DETECTED) trigger and evidence tracing, and 3D globe visualization**. metric indicating how oblong the flash is |
| `lightning_flash_grouping_sequence` | `int32` | `(flash_dim,)` | 1 | None | **State 1 (DETECTED) trigger and evidence tracing, and 3D globe visualization**. time sequence of flash used when grouping algorithm is applied |
| `lightning_flash_grouping_status` | `int8` | `(flash_dim,)` | 1 | None | **State 1 (DETECTED) trigger and evidence tracing, and 3D globe visualization**. flash grouping_status |
| `lightning_flash_glint_index` | `float32` | `(flash_dim,)` | 1 | None | **State 1 (DETECTED) trigger and evidence tracing, and 3D globe visualization**. cosine of angle |

### Tier: Group Tier (20 variables)

| Variable Name | Data Type | Dimensions | Units | Missing Value | SonifyEarth Role & Scientific Meaning |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `lightning_group_TAI93_time` | `float64` | `(group_dim,)` | seconds since 1993-01-01 00:00:00.000 | None | **Micro-structure clustering and acoustic burst texture**. TAI93 time of all events in group |
| `lightning_group_observe_time` | `int16` | `(group_dim,)` | seconds | None | **Micro-structure clustering and acoustic burst texture**. length of observation of the region where the group occurred (viewtime approximation at group centroid) |
| `lightning_group_location` | `float32` | `(group_dim, latlon_dim)` | degrees | None | **Micro-structure clustering and acoustic burst texture**. lat/lon radiance-weighted centroid |
| `lightning_group_lat` | `float32` | `(group_dim,)` | degrees_north | None | **Micro-structure clustering and acoustic burst texture**. group latitude |
| `lightning_group_lon` | `float32` | `(group_dim,)` | degrees_east | None | **Micro-structure clustering and acoustic burst texture**. group longitude |
| `lightning_group_radiance` | `float32` | `(group_dim,)` | uJ/sr/m2/um | None | **Micro-structure clustering and acoustic burst texture**. sum of event radiances composing this group |
| `lightning_group_footprint` | `float32` | `(group_dim,)` | km2 | None | **Micro-structure clustering and acoustic burst texture**. unique group extent |
| `lightning_group_address` | `int32` | `(group_dim,)` | 1 | None | **Micro-structure clustering and acoustic burst texture**. group address |
| `lightning_group_parent_address` | `int32` | `(group_dim,)` | 1 | None | **Micro-structure clustering and acoustic burst texture**. pointer to parent's address (flash) |
| `lightning_group_child_address` | `int32` | `(group_dim,)` | 1 | None | **Micro-structure clustering and acoustic burst texture**. address of 1st event in a sequential list |
| `lightning_group_child_count` | `int32` | `(group_dim,)` | count | None | **Micro-structure clustering and acoustic burst texture**. number of events in group |
| `lightning_group_approx_threshold` | `int8` | `(group_dim,)` | 1 | None | **Micro-structure clustering and acoustic burst texture**. estimated value of 8-bit threshold for the group determined from background level or solar zenith angle |
| `lightning_group_alert_flag` | `uint8` | `(group_dim,)` | 1 | None | **Quality validation flag (Fatal mask 0x55, Warning mask 0xAA)**. bit masked status of instrument, platform, external factors and processing algorithms. Bit1 is the least significant bit (LSB). bit1=1: instrument_fatal_flag; bit2=1: instrument_warning_flag; bit3=1: platform_fatal_flag; bit4=1: platform_warning_flag; bit5=1: external_fatal_flag; bit6=1: external_warning_flag; bit7=1: processing_fatal_flag; bit8=1: processing_warning_flag. |
| `lightning_group_cluster_index` | `int8` | `(group_dim,)` | percent | None | **Micro-structure clustering and acoustic burst texture**. pixel density metric; higher numbers indicate group is less likely to be noise |
| `lightning_group_density_index` | `int8` | `(group_dim,)` | 1 | None | **Micro-structure clustering and acoustic burst texture**. spatial density metric; higher if group geolocated in a region of high lightning activity |
| `lightning_group_noise_index` | `int8` | `(group_dim,)` | 100percent | None | **Micro-structure clustering and acoustic burst texture**. signal-to-signal plus noise ratio |
| `lightning_group_oblong_index` | `float32` | `(group_dim,)` | 1 | None | **Micro-structure clustering and acoustic burst texture**. metric indicating how oblong the group is |
| `lightning_group_grouping_sequence` | `int32` | `(group_dim,)` | 1 | None | **Micro-structure clustering and acoustic burst texture**. time sequence of group used when grouping algorithm is applied |
| `lightning_group_grouping_status` | `int8` | `(group_dim,)` | 1 | None | **Micro-structure clustering and acoustic burst texture**. group grouping_status |
| `lightning_group_glint_index` | `float32` | `(group_dim,)` | 1 | None | **Micro-structure clustering and acoustic burst texture**. cosine of angle |

### Tier: Event Tier (23 variables)

| Variable Name | Data Type | Dimensions | Units | Missing Value | SonifyEarth Role & Scientific Meaning |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `lightning_event_TAI93_time` | `float64` | `(event_dim,)` | seconds since 1993-01-01 00:00:00.000 | None | **Fundamental optical pulses (CCD pixel hits), timing jitter**. TAI93 time of event |
| `lightning_event_observe_time` | `int16` | `(event_dim,)` | seconds | None | **Fundamental optical pulses (CCD pixel hits), timing jitter**. duration of observation of the region where the event occurred |
| `lightning_event_location` | `float32` | `(event_dim, latlon_dim)` | degree | None | **Fundamental optical pulses (CCD pixel hits), timing jitter**. lat/lon radiance-weighted centroid |
| `lightning_event_lat` | `float32` | `(event_dim,)` | degrees_north | None | **Fundamental optical pulses (CCD pixel hits), timing jitter**. event latitude |
| `lightning_event_lon` | `float32` | `(event_dim,)` | degrees_east | None | **Fundamental optical pulses (CCD pixel hits), timing jitter**. event longitude |
| `lightning_event_radiance` | `float32` | `(event_dim,)` | uJ/sr/m2/um | None | **Fundamental optical pulses (CCD pixel hits), timing jitter**. radiance of this event |
| `lightning_event_footprint` | `float32` | `(event_dim,)` | km2 | None | **Fundamental optical pulses (CCD pixel hits), timing jitter**. unique area extent |
| `lightning_event_address` | `int32` | `(event_dim,)` | 1 | None | **Fundamental optical pulses (CCD pixel hits), timing jitter**. event address |
| `lightning_event_parent_address` | `int32` | `(event_dim,)` | 1 | None | **Fundamental optical pulses (CCD pixel hits), timing jitter**. pointer to parent address (address of parent group) |
| `lightning_event_x_pixel` | `int8` | `(event_dim,)` | 1 | None | **Fundamental optical pulses (CCD pixel hits), timing jitter**. CCD pixel column |
| `lightning_event_y_pixel` | `int8` | `(event_dim,)` | 1 | None | **Fundamental optical pulses (CCD pixel hits), timing jitter**. CCD pixel row |
| `lightning_event_bg_value` | `int16` | `(event_dim,)` | 1 | None | **Fundamental optical pulses (CCD pixel hits), timing jitter**. level of background illumination (16-bit) at time of event |
| `lightning_event_bg_radiance` | `int16` | `(event_dim,)` | W/sr/m2/um | None | **Fundamental optical pulses (CCD pixel hits), timing jitter**. background radiance associated with pixel at time of event |
| `lightning_event_approx_threshold` | `int8` | `(event_dim,)` | 1 | None | **Fundamental optical pulses (CCD pixel hits), timing jitter**. estimated value of 8-bit threshold for the event; from bg level or solar zenith angle |
| `lightning_event_alert_flag` | `uint8` | `(event_dim,)` | 1 | None | **Quality validation flag (Fatal mask 0x55, Warning mask 0xAA)**. bit masked status of instrument, platform, external factors and processing algorithms. Bit1 is the least significant bit (LSB). bit1=1: instrument_fatal_flag; bit2=1: instrument_warning_flag; bit3=1: platform_fatal_flag; bit4=1: platform_warning_flag; bit5=1: external_fatal_flag; bit6=1: external_warning_flag; bit7=1: processing_fatal_flag; bit8=1: processing_warning_flag. |
| `lightning_event_cluster_index` | `int8` | `(event_dim,)` | percent | None | **Fundamental optical pulses (CCD pixel hits), timing jitter**. pixel density metric; higher numbers indicate event less likely to be noise |
| `lightning_event_density_index` | `int8` | `(event_dim,)` | 1 | None | **Fundamental optical pulses (CCD pixel hits), timing jitter**. spatial density metric; higher if event geolocated in a region of high lightning activity |
| `lightning_event_noise_index` | `int8` | `(event_dim,)` | 100percent | None | **Fundamental optical pulses (CCD pixel hits), timing jitter**. signal-to-signal plus noise ratio |
| `lightning_event_grouping_sequence` | `int32` | `(event_dim,)` | 1 | None | **Fundamental optical pulses (CCD pixel hits), timing jitter**. time sequence of event used when grouping algorithm is applied |
| `lightning_event_amplitude` | `int8` | `(event_dim,)` | 1 | None | **Fundamental optical pulses (CCD pixel hits), timing jitter**. uncalibrated optical amplitude reported by instrument (a 7-bit digital count) |
| `lightning_event_sza_index` | `uint8` | `(event_dim,)` | degree | None | **Fundamental optical pulses (CCD pixel hits), timing jitter**. event solar zenith angle |
| `lightning_event_glint_index` | `uint8` | `(event_dim,)` | degrees | None | **Fundamental optical pulses (CCD pixel hits), timing jitter**. angle between line of sight vector and direct solar reflection vector |
| `lightning_event_bg_value_flag` | `int8` | `(event_dim,)` | 1 | None | **Fundamental optical pulses (CCD pixel hits), timing jitter**. bg radiance has been 0: estimated from sza 1: interpolated from bgs |

### Tier: Viewtime (Observation) (8 variables)

| Variable Name | Data Type | Dimensions | Units | Missing Value | SonifyEarth Role & Scientific Meaning |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `viewtime_location` | `float32` | `(viewtime_dim, latlon_dim)` | degree | None | **Ground truth observation grid establishing State 2 (OBSERVED_NO_DETECTION) vs State 3 (UNKNOWN)**. lat/lon of the center of the grid cell of dimensions 0.5 deg x 0.5 deg |
| `viewtime_lat` | `float32` | `(viewtime_dim,)` | degrees_north | None | **Ground truth observation grid establishing State 2 (OBSERVED_NO_DETECTION) vs State 3 (UNKNOWN)**. viewtime latitude |
| `viewtime_lon` | `float32` | `(viewtime_dim,)` | degrees_east | None | **Ground truth observation grid establishing State 2 (OBSERVED_NO_DETECTION) vs State 3 (UNKNOWN)**. viewtime longitude |
| `viewtime_TAI93_start` | `int32` | `(viewtime_dim,)` | seconds since 1993-01-01 00:00:00.000 | None | **Ground truth observation grid establishing State 2 (OBSERVED_NO_DETECTION) vs State 3 (UNKNOWN)**. TAI93 whole second when loaction was first within FOV |
| `viewtime_TAI93_end` | `int32` | `(viewtime_dim,)` | seconds since 1993-01-01 00:00:00.000 | None | **Ground truth observation grid establishing State 2 (OBSERVED_NO_DETECTION) vs State 3 (UNKNOWN)**. TAI93 whole second when location was last within FOV |
| `viewtime_effective_obs` | `float32` | `(viewtime_dim,)` | seconds | None | **Ground truth observation grid establishing State 2 (OBSERVED_NO_DETECTION) vs State 3 (UNKNOWN)**. time of observation of the grid cell, adjusted by the percentage of area in the grid cell within the FOV |
| `viewtime_alert_flag` | `uint8` | `(viewtime_dim,)` | 1 | None | **Ground truth observation grid establishing State 2 (OBSERVED_NO_DETECTION) vs State 3 (UNKNOWN)**. reflects status of instrument, platform, external factors and processing algorithms. Bit1 is the least significant bit (LSB). bit1=1: instrument_fatal_flag; bit2=1: instrument_warning_flag; bit3=1: platform_fatal_flag; bit4=1: platform_warning_flag; bit5=1: external_fatal_flag; bit6=1: external_warning_flag; bit7=1: processing_fatal_flag; bit8=1: processing_warning_flag. |
| `viewtime_approx_threshold` | `int8` | `(viewtime_dim,)` | 1 | None | **Ground truth observation grid establishing State 2 (OBSERVED_NO_DETECTION) vs State 3 (UNKNOWN)**. threshold of instrument corresponding with grid cell position, proxied from solar zenith angle at a time halfway between start and end time |

### Tier: One-Second Time Series (16 variables)

| Variable Name | Data Type | Dimensions | Units | Missing Value | SonifyEarth Role & Scientific Meaning |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `one_second_TAI93_time` | `float64` | `(one_second_dim,)` | seconds since 1993-01-01 00:00:00.000 | None | **Platform position, velocity, and operational health alert flags**. whole second value starting before and continuing beyond one orbit |
| `one_second_alert_summary` | `uint8` | `(one_second_dim,)` | 1 | None | **Quality validation flag (Fatal mask 0x55, Warning mask 0xAA)**. bit masked summary of alert flags. Bit1 is the least significant bit (LSB). bit1=1: instrument_fatal_flag; bit2=1: instrument_warning_flag; bit3=1: platform_fatal_flag; bit4=1: platform_warning_flag; bit5=1: external_fatal_flag; bit6=1: external_warning_flag; bit7=1: processing_fatal_flag; bit8=1: processing_warning_flag. |
| `one_second_instrument_alert` | `uint8` | `(one_second_dim,)` | 1 | None | **Quality validation flag (Fatal mask 0x55, Warning mask 0xAA)**. bit masked status of instrument. Bit1 is the least significant bit (LSB). bit1=1: Fatal_instrument_off; bit2=1: Indifferent_instrument_command_executed; bit3=1: Fatal/Warning_FIFO_buffer_overflow; bit4=1: Warning_threshold_set_very_high; bit5=1: Fatal_instrument_warning_up; bit6=1: Warning_improper_operating; bit7=1: Fatal_Packet_gap; bit8=1: Warning_data_handling_problem. |
| `one_second_platform_alert` | `uint8` | `(one_second_dim,)` | 1 | None | **Quality validation flag (Fatal mask 0x55, Warning mask 0xAA)**. bit masked status of platform. Bit1 is the least significant bit (LSB). bit1=1: Warning_no_attitude_or_ephemeris_quality_flags_available; bit2=1: Fatal_ephemeris_not_available; bit3=1: Warning_ephemeris_possibly_inaccurate; bit4=1: Fatal_attitude_not_available; bit5=1: Warning_attitude_possibly_inaccurate; bit6=1: Fatal_clock_not_available; bit7=1: Warning_clock_possible_inaccurate; bit8: (reserved). |
| `one_second_external_alert` | `uint8` | `(one_second_dim,)` | 1 | None | **Quality validation flag (Fatal mask 0x55, Warning mask 0xAA)**. bit masked status of external factors. Bit1 is the least significant bit (LSB). bit1=1: Warning_Satellite_within_SAA_Model1; bit2=1: Warning_satellite_within_SAA_Model2; bit3=1: Warning_direct_solar_reflection_possible_within_FOV; bit4=1: Indifferent_TRMM_Microwave_imager_on; bit5=1: Indifferent_Precipitation_Radar_on; bit6=1: Indifferent_Visible_Infrared_Scanner_on; bit7=1: Indifferent_Clouds_and_Earth_Radiant_Enery_System_sensor_on; bit8: (reserved). |
| `one_second_processing_alert` | `uint8` | `(one_second_dim,)` | 1 | None | **Quality validation flag (Fatal mask 0x55, Warning mask 0xAA)**. bit masked status of processing algorithms. Bit1 is the least significant bit (LSB). bit1=1: Warning_QA_inspector_warning_flag; bit2=1: Fatal_QA_inspector_fatal_flag; bit3=1: Fatal_data_too_garbled_for_software_to_read; bit4=1: Fatal_data_set_too_large_to_process; bit5=1: Fatal/Warning_unforseen_software_error_caused_improper_reporting_of_data; bit6=1: Warning_grouping_algorithm_buffer_limitation_problem; bit7=1: Warning_viewtime_algorithm_failure_to_accurately_determine_FOV; bit8: (reserved) |
| `one_second_position_vector` | `float32` | `(one_second_dim, vector_dim)` | m | None | **Platform position, velocity, and operational health alert flags**. location of platform in ECR coordinates |
| `one_second_velocity_vector` | `float32` | `(one_second_dim, vector_dim)` | m/s | None | **Platform position, velocity, and operational health alert flags**. velocity of platform in ECR coordinates |
| `one_second_transform_matrix` | `float32` | `(one_second_dim, transform_matrix_dim)` | 1 | None | **Platform position, velocity, and operational health alert flags**. components of transform from pixel plane-boresight coordinates to ECR coordinates of boresight and pixel plane |
| `one_second_solar_vector` | `float32` | `(one_second_dim, vector_dim)` | 1 | None | **Platform position, velocity, and operational health alert flags**. unit vector from center of earth to sun in ECR coordinates |
| `one_second_ephemeris_quality_flag` | `int32` | `(one_second_dim,)` | 1 | None | **Platform position, velocity, and operational health alert flags**. Bit masked status |
| `one_second_attitude_quality_flag` | `int32` | `(one_second_dim,)` | 1 | None | **Platform position, velocity, and operational health alert flags**. Bit masked status |
| `one_second_boresight_threshold` | `int8` | `(one_second_dim,)` | 1 | None | **Platform position, velocity, and operational health alert flags**. Most likely threshold value applied to the boresight position given the solar zenith angle, assuming clouds present |
| `one_second_thresholds` | `int8` | `(one_second_dim, threshold_dim)` | 1 | None | **Platform position, velocity, and operational health alert flags**. values of the instrument threshold settings for each 256 count background interval |
| `one_second_noise_index` | `int8` | `(one_second_dim,)` | 100percent | None | **Platform position, velocity, and operational health alert flags**. a metric that indicates the noise level |
| `one_second_event_count` | `int16` | `(one_second_dim, processing_stage_dim)` | count | None | **Platform position, velocity, and operational health alert flags**. raw event count and counts surviving filters at each processing stage |

---

## 3. ISS LIS Backgrounds V2.2 Variable Dictionary (33 Variables)

### Tier: Background Imagery (1 variables)

| Variable Name | Data Type | Dimensions | Units | Missing Value | SonifyEarth Role & Scientific Meaning |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `bg_data` | `int16` | `(tdim, ydim, xdim)` | 1 | `-9999` | **128x128 calibrated optical background radiance frame for visual context and Mode B texture**. background image |

### Tier: Orbit Summary (11 variables)

| Variable Name | Data Type | Dimensions | Units | Missing Value | SonifyEarth Role & Scientific Meaning |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `bg_orbit_summary_id_number` | `int32` | `()` | 1 | None | **Granule time synchronization and timeline matching**. The number of this orbit, where the orbit count starts at launch |
| `bg_orbit_summary_TAI93_start` | `float64` | `()` | seconds since 1993-01-01 00:00:00.000 | None | **Granule time synchronization and timeline matching**. start of this orbit in TAI93 time |
| `bg_orbit_summary_UTC_start` | `<class 'str'>` | `()` | dimensionless | None | **Granule time synchronization and timeline matching**. start of this orbit in UTC time |
| `bg_orbit_summary_GPS_start` | `float64` | `()` | seconds | None | **Granule time synchronization and timeline matching**. start of this orbit in GPS time |
| `bg_orbit_summary_TAI93_end` | `float64` | `()` | seconds since 1993-01-01 00:00:00.000 | None | **Granule time synchronization and timeline matching**. end of this orbit in TAI93 time |
| `bg_orbit_summary_start_longitude` | `float32` | `()` | degrees_east | None | **Granule time synchronization and timeline matching**. longitude boundary defining start of this orbit |
| `bg_orbit_summary_end_longitude` | `float32` | `()` | degrees_east | None | **Granule time synchronization and timeline matching**. longitude boundary defining end of this orbit |
| `bg_orbit_summary_image_summary_count` | `int16` | `()` | count | None | **Granule time synchronization and timeline matching**. number of summary GIF images |
| `bg_orbit_summary_image_summary_address` | `int16` | `()` | 1 | None | **Granule time synchronization and timeline matching**. summary GIF image record number |
| `bg_orbit_summary_image_info_count` | `int16` | `()` | count | None | **Granule time synchronization and timeline matching**. image information count |
| `bg_orbit_summary_image_info_address` | `int16` | `()` | 1 | None | **Granule time synchronization and timeline matching**. image information address |

### Tier: Footprint Geometry (6 variables)

| Variable Name | Data Type | Dimensions | Units | Missing Value | SonifyEarth Role & Scientific Meaning |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `bg_data_summary_TAI93_time` | `float64` | `(tdim,)` | seconds since 1993-01-01 00:00:00.000 | `-9999.0` | **Boresight & 4-corner polygon bounding sensor field of view**. TAI93 time of the background image |
| `bg_data_summary_address` | `int32` | `(tdim,)` | 1 | `-9999` | **Boresight & 4-corner polygon bounding sensor field of view**. image number within orbit |
| `bg_data_summary_boresight` | `float32` | `(tdim, latlon_dim)` | degree | `-9999.0` | **Boresight & 4-corner polygon bounding sensor field of view**. lat/lon location of center pixel (63,64) |
| `bg_data_summary_lat` | `float32` | `(tdim,)` | degrees_north | `-9999.0` | **Boresight & 4-corner polygon bounding sensor field of view**. background image boresight latitude |
| `bg_data_summary_lon` | `float32` | `(tdim,)` | degrees_east | `-9999.0` | **Boresight & 4-corner polygon bounding sensor field of view**. background image boresight longitude |
| `bg_data_summary_corners` | `float32` | `(tdim, corners_dim)` | degree | `-9999.0` | **4-corner geodetic coordinates defining instantaneous swath bounding polygon on 3D globe**. lat/lon locations of corner pixels |

### Tier: Observation Context (6 variables)

| Variable Name | Data Type | Dimensions | Units | Missing Value | SonifyEarth Role & Scientific Meaning |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `bg_info_TAI93_time` | `float64` | `(bg_info_dim,)` | seconds since 1993-01-01 00:00:00.000 | None | **Background value, noise index, and filtered event counts**. whole second value starting before and continuing beyond one orbit |
| `bg_info_ephemeris_quality_flag` | `int32` | `(bg_info_dim,)` | 1 | None | **Background value, noise index, and filtered event counts**. Bit masked status |
| `bg_info_attitude_quality_flag` | `int32` | `(bg_info_dim,)` | 1 | None | **Background value, noise index, and filtered event counts**. Bit masked status |
| `bg_info_bg_value` | `int16` | `(bg_info_dim,)` | 1 | None | **Background value, noise index, and filtered event counts**. background value |
| `bg_info_noise_index` | `int8` | `(bg_info_dim,)` | percent | None | **Background value, noise index, and filtered event counts**. a metric that indicates the noise level |
| `bg_info_event_count` | `int16` | `(bg_info_dim, event_count_dim)` | count | None | **Background value, noise index, and filtered event counts**. raw event count and counts surviving filters at each processing stage |

### Tier: Quality & Alerts (5 variables)

| Variable Name | Data Type | Dimensions | Units | Missing Value | SonifyEarth Role & Scientific Meaning |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `bg_info_alert_summary` | `uint8` | `(bg_info_dim,)` | 1 | None | **Quality and anomaly status; flags SAA radiation hits and hardware faults for State 3 (UNKNOWN)**. bit masked summary of alert flags. Bit1 is the least significant bit (LSB). bit1=1: instrument_fatal_flag; bit2=1: instrument_warning_flag; bit3=1: platform_fatal_flag; bit4=1: platform_warning_flag; bit5=1: external_fatal_flag; bit6=1: external_warning_flag; bit7=1: processing_fatal_flag; bit8=1: processing_warning_flag. |
| `bg_info_instrument_alert` | `uint8` | `(bg_info_dim,)` | 1 | None | **Quality and anomaly status; flags SAA radiation hits and hardware faults for State 3 (UNKNOWN)**. bit masked status of instrument. Bit1 is the least significant bit (LSB). bit1=1: Fatal_instrument_off; bit2=1: Indifferent_instrument_command_executed; bit3=1: Fatal/Warning_FIFO_buffer_overflow; bit4=1: Warning_threshold_set_very_high; bit5=1: Fatal_instrument_warning_up; bit6=1: Warning_improper_operating; bit7=1: Fatal_Packet_gap; bit8=1: Warning_data_handling_problem. |
| `bg_info_platform_alert` | `uint8` | `(bg_info_dim,)` | 1 | None | **Quality and anomaly status; flags SAA radiation hits and hardware faults for State 3 (UNKNOWN)**. bit masked status of platform. Bit1 is the least significant bit (LSB). bit1=1: Warning_no_attitude_or_ephemeris_quality_flags_available; bit2=1: Fatal_ephemeris_not_available; bit3=1: Warning_ephemeris_possibly_inaccurate; bit4=1: Fatal_attitude_not_available; bit5=1: Warning_attitude_possibly_inaccurate; bit6=1: Fatal_clock_not_available; bit7=1: Warning_clock_possible_inaccurate; bit8: (reserved). |
| `bg_info_external_alert` | `uint8` | `(bg_info_dim,)` | 1 | None | **Quality and anomaly status; flags SAA radiation hits and hardware faults for State 3 (UNKNOWN)**. bit masked status of external factors. Bit1 is the least significant bit (LSB). bit1=1: Warning_Satellite_within_SAA_Model1; bit2=1: Warning_satellite_within_SAA_Model2; bit3=1: Warning_direct_solar_reflection_possible_within_FOV; bit4=1: Indifferent_TRMM_Microwave_imager_on; bit5=1: Indifferent_Precipitation_Radar_on; bit6=1: Indifferent_Visible_Infrared_Scanner_on; bit7=1: Indifferent_Clouds_and_Earth_Radiant_Enery_System_sensor_on; bit8: (reserved). |
| `bg_info_processing_alert` | `uint8` | `(bg_info_dim,)` | 1 | None | **Quality and anomaly status; flags SAA radiation hits and hardware faults for State 3 (UNKNOWN)**. bit masked status of processing algorithms. Bit1 is the least significant bit (LSB). bit1=1: Warning_QA_inspector_warning_flag; bit2=1: Fatal_QA_inspector_fatal_flag; bit3=1: Fatal_data_too_garbled_for_software_to_read; bit4=1: Fatal_data_set_too_large_to_process; bit5=1: Fatal/Warning_unforseen_software_error_caused_improper_reporting_of_data; bit6=1: Warning_grouping_algorithm_buffer_limitation_problem; bit7=1: Warning_viewtime_algorithm_failure_to_accurately_determine_FOV; bit8: (reserved) |

### Tier: Ephemeris & Orbit (4 variables)

| Variable Name | Data Type | Dimensions | Units | Missing Value | SonifyEarth Role & Scientific Meaning |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `bg_info_position_vector` | `float32` | `(bg_info_dim, vector_dim)` | m | None | **Spacecraft ephemeris, orbit ground-track, and solar zenith angle geometry**. location of platform in ECR coordinates |
| `bg_info_velocity_vector` | `float32` | `(bg_info_dim, vector_dim)` | m/s | None | **Spacecraft ephemeris, orbit ground-track, and solar zenith angle geometry**. velocity of platform in ECR coordinates |
| `bg_info_transform_matrix` | `float32` | `(bg_info_dim, transform_matrix_dim)` | 1 | None | **Spacecraft ephemeris, orbit ground-track, and solar zenith angle geometry**. components of transform from pixel plane-boresight coordinates to ECR coordinates of boresight and pixel plane |
| `bg_info_solar_vector` | `float32` | `(bg_info_dim, vector_dim)` | 1 | None | **Spacecraft ephemeris, orbit ground-track, and solar zenith angle geometry**. unit vector from center of earth to sun in ECR coordinates |

---

## 4. Key Quality Flag Bitmasks & Classification Logic

In `viewtime_alert_flag` and `bg_info_alert_summary`, status flags are bit-encoded:
- **Bit 1 (`0x01`)**: Instrument Fatal
- **Bit 2 (`0x02`)**: Instrument Warning
- **Bit 3 (`0x04`)**: Platform Fatal
- **Bit 4 (`0x08`)**: Platform Warning
- **Bit 5 (`0x10`)**: External Fatal
- **Bit 6 (`0x20`)**: External Warning (SAA / solar glint warning)
- **Bit 7 (`0x40`)**: Processing Fatal
- **Bit 8 (`0x80`)**: Processing Warning

- **Fatal Bitmask**: `0x55` (`0b01010101`). If `(flag & 0x55) != 0`, observation is **INVALID (UNKNOWN)**.
- **Warning Bitmask**: `0xAA` (`0b10101010`). If `(flag & 0x55) == 0`, observation is **VALID** (warning flags do not invalidate observations).

---

## 5. TAI93 to UTC Conversion Standard

- **Epoch**: `1993-01-01 00:00:00.000 TAI`.
- **Leap Second Offset**: Between 1993 and November 2023, exactly **10 leap seconds** were introduced into UTC.
- **Conversion Formula**: $\text{UTC Elapsed Seconds} = \text{TAI93} - 10.000\text{ s}$.
- Verified: Cross-checking against `orbit_summary_UTC_start` confirms exact microsecond alignment across all 106 granules.
- Raw TAI93 timestamps are preserved across all processing.
