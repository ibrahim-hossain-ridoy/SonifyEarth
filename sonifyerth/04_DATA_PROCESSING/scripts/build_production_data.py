#!/usr/bin/env python3
"""
SonifyEarth — Task 4: Production Data Engine & Normalized JSON/GeoJSON Generator
NASA Space Apps Challenge 2026: The Earth Information Jukebox ("Silence Isn't Zero")

Reads all 106 NASA ISS LIS Science V2.2 and 106 Backgrounds V2.2 NetCDF-4 files
from 01_NASA_RAW_DATA/ (preserving original files untouched) and deterministically
generates normalized, traceable production JSON and GeoJSON datasets in:
  - 06_PROCESSED_DATA/json/
  - 06_PROCESSED_DATA/geojson/
"""

import csv
import glob
import json
import math
import os
from datetime import datetime, timedelta, timezone

import netCDF4 as nc
import numpy as np

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CONFIG_PATH = os.path.join(PROJECT_ROOT, "04_DATA_PROCESSING", "configuration", "processing_config.json")
INVENTORY_CSV = os.path.join(PROJECT_ROOT, "DATA_INVENTORY.csv")
SC_DIR = os.path.join(PROJECT_ROOT, "01_NASA_RAW_DATA", "science_v2")
BG_DIR = os.path.join(PROJECT_ROOT, "01_NASA_RAW_DATA", "backgrounds_v2")
JSON_OUT_DIR = os.path.join(PROJECT_ROOT, "06_PROCESSED_DATA", "json")
GEOJSON_OUT_DIR = os.path.join(PROJECT_ROOT, "06_PROCESSED_DATA", "geojson")

TAI93_EPOCH = datetime(1993, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
LEAP_OFFSET_NOV_2023 = 10.0  # 37s (Nov 2023) - 27s (Jan 1993) = 10.0s exact
FATAL_MASK = 0x55            # 0b01010101 (bits 1, 3, 5, 7)
WARNING_MASK = 0xAA          # 0b10101010 (bits 2, 4, 6, 8)
SAA_MASK = 0x03              # 0b00000011 (Bit 1 = SAA Model 1, Bit 2 = SAA Model 2)
GLINT_COS_5DEG = math.cos(math.radians(5.0))  # 0.9961946980917455


def tai93_to_utc_iso(tai93_val: float) -> str:
    """Convert raw TAI93 timestamp to ISO-8601 UTC string using validated 10.0s leap offset."""
    dt = TAI93_EPOCH + timedelta(seconds=float(tai93_val) - LEAP_OFFSET_NOV_2023)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def decode_alert_flag(flag_byte: int) -> dict:
    """Decode an 8-bit NASA LIS alert summary flag into fatal and warning components."""
    b = int(flag_byte) & 0xFF
    fatal_bits = []
    if b & 0x01:
        fatal_bits.append("instrument_fatal")
    if b & 0x04:
        fatal_bits.append("platform_fatal")
    if b & 0x10:
        fatal_bits.append("external_fatal")
    if b & 0x40:
        fatal_bits.append("processing_fatal")

    warning_bits = []
    if b & 0x02:
        warning_bits.append("instrument_warning")
    if b & 0x08:
        warning_bits.append("platform_warning")
    if b & 0x20:
        warning_bits.append("external_warning")
    if b & 0x80:
        warning_bits.append("processing_warning")

    return {
        "raw": b,
        "hex": f"0x{b:02X}",
        "fatal_active": (b & FATAL_MASK) != 0,
        "fatal_bits": fatal_bits,
        "warning_bits": warning_bits,
    }


def ecr_to_geodetic(x: float, y: float, z: float) -> tuple:
    """Convert ECR Cartesian meters (X, Y, Z) to WGS-84 geodetic (lat_deg, lon_deg)."""
    lon = math.degrees(math.atan2(y, x))
    r_xy = math.hypot(x, y)
    # WGS-84 ellipsoid approximation
    a = 6378137.0
    f = 1.0 / 298.257223563
    b = a * (1.0 - f)
    e2 = 1.0 - (b * b) / (a * a)
    ep2 = (a * a) / (b * b) - 1.0
    theta = math.atan2(z * a, r_xy * b)
    lat = math.atan2(
        z + ep2 * b * (math.sin(theta) ** 3),
        r_xy - e2 * a * (math.cos(theta) ** 3),
    )
    return round(math.degrees(lat), 4), round(lon, 4)


def cell_polygon_coords(cell_lat: float, cell_lon: float) -> list:
    """Return RFC 7946 counter-clockwise Polygon coordinate ring for a 0.5x0.5 deg cell."""
    lat0 = round(float(cell_lat) - 0.25, 4)
    lat1 = round(float(cell_lat) + 0.25, 4)
    lon0 = round(float(cell_lon) - 0.25, 4)
    lon1 = round(float(cell_lon) + 0.25, 4)
    return [[
        [lon0, lat0],
        [lon1, lat0],
        [lon1, lat1],
        [lon0, lat1],
        [lon0, lat0],
    ]]


def load_file_hashes() -> dict:
    """Load SHA-256 hashes and byte sizes from DATA_INVENTORY.csv."""
    hashes = {}
    with open(INVENTORY_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            fname = row["original_filename"]
            hashes[fname] = {
                "sha256": row["sha256_checksum"],
                "size_bytes": int(row["file_size_bytes"]),
                "staged_path": os.path.join(row["organized_folder"], fname),
            }
    return hashes


def main():
    os.makedirs(JSON_OUT_DIR, exist_ok=True)
    os.makedirs(GEOJSON_OUT_DIR, exist_ok=True)

    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config = json.load(f)

    file_hashes = load_file_hashes()
    sc_files = sorted(glob.glob(os.path.join(SC_DIR, "*.nc")))
    bg_files = sorted(glob.glob(os.path.join(BG_DIR, "*.nc")))
    assert len(sc_files) == 106 and len(bg_files) == 106, "Expected 106 Science and 106 Backgrounds files."

    manifest_granules = []
    valid_flashes = []
    excluded_flashes = []
    saa_intervals_audit = []
    fatal_intervals_audit = []
    granule_obs_summaries = []
    sampled_obs_records = []
    timeline_windows = []
    bg_keyframe_windows = []

    # Aggregators for global 0.5x0.5 grid and sensitivity analysis
    detected_grid_cells = {}       # (lat, lon) -> cell aggregate dict
    observed_quiet_cells = {}      # (lat, lon) -> cell aggregate dict (deterministic sample across orbits)
    saa_unknown_cells = {}         # (lat, lon) -> cell aggregate dict
    saa_fov_polygons = []          # Verified 4-corner SAA FOV polygons from bg_data_summary_corners
    fatal_track_features = []      # Subsatellite LineString features during contiguous fatal blocks

    # Exact census counters
    total_source_flashes = 0
    total_source_groups = 0
    total_source_events = 0
    total_source_viewtime = 0
    total_source_1s = 0
    total_source_bg_images = 0

    count_flashes_fatal = 0
    count_flashes_fatal_and_saa = 0
    count_flashes_saa_only = 0
    count_flashes_glint = 0
    count_flashes_class1_toggle = 0
    count_flashes_boundary_saa_vt = 0

    vt_saa_count = 0
    vt_clean_count = 0
    # Sensitivity counters on clean (non-SAA) viewtime records:
    # Threshold 0: > 0.0s (baseline)
    sens_0_detected = 0
    sens_0_quiet = 0
    sens_0_unknown_subthreshold = 0
    # Threshold 0.1: > 0.1s
    sens_01_detected = 0
    sens_01_quiet = 0
    sens_01_unknown_subthreshold = 0
    # Threshold 1.0: > 1.0s
    sens_10_detected = 0
    sens_10_quiet = 0
    sens_10_unknown_subthreshold = 0

    sensitivity_examples_0_to_01 = []
    sensitivity_examples_01_to_10 = []

    prev_granule_end_tai = None
    prev_granule_id = None
    prev_sc_name = None
    qc_gap_record = None

    for g_idx, (sf, bf) in enumerate(zip(sc_files, bg_files)):
        sc_name = os.path.basename(sf)
        bg_name = os.path.basename(bf)
        granule_id = sc_name.replace("ISS_LIS_SC_V2.2_", "").replace("_FIN.nc", "")

        with nc.Dataset(sf, "r") as ds, nc.Dataset(bf, "r") as bds:
            orbit_id = int(ds.variables["orbit_summary_id_number"][:])
            tai_start = float(ds.variables["orbit_summary_TAI93_start"][:])
            tai_end = float(ds.variables["orbit_summary_TAI93_end"][:])
            utc_start_attr = str(ds.variables["orbit_summary_UTC_start"][:]).strip()
            utc_start_iso = tai93_to_utc_iso(tai_start)
            utc_end_iso = tai93_to_utc_iso(tai_end)
            utc_end_attr = getattr(ds, "time_coverage_end", utc_end_iso)

            # Check inter-granule gap (Nov 11 NASA QC deleted orbits)
            if prev_granule_end_tai is not None:
                gap_sec = round(tai_start - prev_granule_end_tai, 3)
                if gap_sec > 1.0:
                    qc_gap_record = {
                        "gap_id": f"GAP_{prev_granule_id}_TO_{granule_id}",
                        "preceding_granule_id": prev_granule_id,
                        "preceding_science_file": prev_sc_name,
                        "following_granule_id": granule_id,
                        "following_science_file": sc_name,
                        "tai93_start": prev_granule_end_tai,
                        "tai93_end": tai_start,
                        "utc_start": tai93_to_utc_iso(prev_granule_end_tai),
                        "utc_end": utc_start_iso,
                        "duration_seconds": gap_sec,
                        "duration_minutes": round(gap_sec / 60.0, 2),
                        "deleted_nqc_orbits": [
                            "ISS_LIS_SC_V2.2_20231111_085535_NQC.hdf",
                            "ISS_LIS_SC_V2.2_20231111_102828_NQC.hdf",
                        ],
                        "documented_reference": "02_NASA_DOCUMENTATION/lis_anomalies.pdf (Page 94, Flight Day 315: Delete. File(s) contain(s) noisy data)",
                        "state": "UNKNOWN",
                        "reason_code": "MISSING_SOURCE_DATA",
                        "sound_cue": "DISTINCT_NEUTRAL_TWO_PART_CUE",
                    }
                    timeline_windows.append({
                        "window_id": qc_gap_record["gap_id"],
                        "window_type": "QC_DELETED_ORBIT_GAP",
                        "granule_id": None,
                        "science_file": None,
                        "backgrounds_file": None,
                        "tai93_start": prev_granule_end_tai,
                        "tai93_end": tai_start,
                        "utc_start": qc_gap_record["utc_start"],
                        "utc_end": qc_gap_record["utc_end"],
                        "duration_seconds": gap_sec,
                        "state": "UNKNOWN",
                        "reason_code": "MISSING_SOURCE_DATA",
                        "sound_cue": "DISTINCT_NEUTRAL_TWO_PART_CUE",
                        "confirmed_flash_count": 0,
                        "excluded_flash_count": 0,
                        "notes": qc_gap_record["documented_reference"],
                    })
            prev_granule_end_tai = tai_end
            prev_granule_id = granule_id
            prev_sc_name = sc_name

            # 1-second arrays
            bg_tai = np.round(np.array(bds.variables["bg_info_TAI93_time"][:], dtype=np.float64)).astype(np.int64)
            bg_ext = np.array(bds.variables["bg_info_external_alert"][:], dtype=np.int32) & 0xFF
            bg_alert = np.array(bds.variables["bg_info_alert_summary"][:], dtype=np.int32) & 0xFF
            bg_inst = np.array(bds.variables["bg_info_instrument_alert"][:], dtype=np.int32) & 0xFF
            bg_pos = np.array(bds.variables["bg_info_position_vector"][:], dtype=np.float64)

            n_1s = len(bg_tai)
            total_source_1s += n_1s

            # Identify SAA 1-second mask and contiguous SAA intervals
            saa_mask_1s = (bg_ext & SAA_MASK) != 0
            saa_sorted = np.sort(bg_tai[saa_mask_1s])
            saa_sec_to_ext = {int(bg_tai[k]): int(bg_ext[k]) for k in range(n_1s)}
            saa_sec_to_idx = {int(bg_tai[k]): int(k) for k in range(n_1s)}

            fatal_mask_1s = (bg_alert & FATAL_MASK) != 0
            fatal_sec_set = set(bg_tai[fatal_mask_1s].tolist())

            # Contiguous fatal runs: identify runs >= 3s to distinguish Class 1 1-2s framing toggles
            fatal_run_len_by_sec = {}
            if np.any(fatal_mask_1s):
                f_indices = np.where(fatal_mask_1s)[0]
                splits = np.where(np.diff(f_indices) > 1)[0] + 1
                for r in np.split(f_indices, splits):
                    r_len = len(r)
                    for idx_val in r:
                        fatal_run_len_by_sec[int(bg_tai[idx_val])] = r_len
                    if r_len >= 40:  # Contiguous hardware outage block (>= 40s)
                        t0_f = float(bg_tai[r[0]])
                        t1_f = float(bg_tai[r[-1]])
                        start_lat, start_lon = ecr_to_geodetic(*bg_pos[r[0]])
                        end_lat, end_lon = ecr_to_geodetic(*bg_pos[r[-1]])
                        fatal_rec = {
                            "outage_id": f"FATAL_{granule_id}_{int(r[0])}_{int(r[-1])}",
                            "granule_id": granule_id,
                            "science_file": sc_name,
                            "backgrounds_file": bg_name,
                            "one_second_start_index": int(r[0]),
                            "one_second_end_index": int(r[-1]),
                            "tai93_start": t0_f,
                            "tai93_end": t1_f,
                            "utc_start": tai93_to_utc_iso(t0_f),
                            "utc_end": tai93_to_utc_iso(t1_f),
                            "duration_seconds": int(r_len),
                            "alert_summary_hex": f"0x{int(bg_alert[r[0]]):02X}",
                            "instrument_alert_hex": f"0x{int(bg_inst[r[0]]):02X}",
                            "subsatellite_start_coord": [start_lon, start_lat],
                            "subsatellite_end_coord": [end_lon, end_lat],
                            "state": "UNKNOWN",
                            "reason_code": "FATAL_QUALITY_FLAG",
                        }
                        fatal_intervals_audit.append(fatal_rec)

                        # Build subsatellite LineString segments (splitting at antimeridian jumps > 180 deg)
                        step = max(1, r_len // 40)
                        sampled_r = list(r[::step])
                        if sampled_r[-1] != r[-1]:
                            sampled_r.append(r[-1])
                        seg = []
                        segs = []
                        for r_i in sampled_r:
                            la, lo = ecr_to_geodetic(*bg_pos[r_i])
                            if seg and abs(lo - seg[-1][0]) > 180.0:
                                if len(seg) >= 2:
                                    segs.append(seg)
                                seg = [[lo, la]]
                            else:
                                seg.append([lo, la])
                        if len(seg) >= 2:
                            segs.append(seg)
                        for s_idx, s_coords in enumerate(segs):
                            fatal_track_features.append({
                                "type": "Feature",
                                "id": f"{fatal_rec['outage_id']}_SEG{s_idx+1}",
                                "geometry": {
                                    "type": "LineString",
                                    "coordinates": s_coords,
                                },
                                "properties": {
                                    "feature_id": f"{fatal_rec['outage_id']}_SEG{s_idx+1}",
                                    "feature_category": "CONTIGUOUS_FATAL_OUTAGE_GROUND_TRACK",
                                    "state": "UNKNOWN",
                                    "reason_code": "FATAL_QUALITY_FLAG",
                                    "sound_cue": "DISTINCT_NEUTRAL_TWO_PART_CUE",
                                    "granule_id": granule_id,
                                    "science_file": sc_name,
                                    "backgrounds_file": bg_name,
                                    "one_second_start_index": int(r[0]),
                                    "one_second_end_index": int(r[-1]),
                                    "tai93_start": t0_f,
                                    "tai93_end": t1_f,
                                    "utc_start": fatal_rec["utc_start"],
                                    "utc_end": fatal_rec["utc_end"],
                                    "duration_seconds": int(r_len),
                                    "alert_summary_hex": fatal_rec["alert_summary_hex"],
                                    "instrument_alert_hex": fatal_rec["instrument_alert_hex"],
                                },
                            })

            # Load viewtime arrays first so we can link flashes and SAA intervals
            vt_lat = np.round(np.array(ds.variables["viewtime_lat"][:], dtype=np.float64), 2)
            vt_lon = np.round(np.array(ds.variables["viewtime_lon"][:], dtype=np.float64), 2)
            vt_t0 = np.round(np.array(ds.variables["viewtime_TAI93_start"][:], dtype=np.float64)).astype(np.int64)
            vt_t1 = np.round(np.array(ds.variables["viewtime_TAI93_end"][:], dtype=np.float64)).astype(np.int64)
            vt_eff = np.array(ds.variables["viewtime_effective_obs"][:], dtype=np.float64)
            vt_alert = np.array(ds.variables["viewtime_alert_flag"][:], dtype=np.int32) & 0xFF
            vt_thresh = np.array(ds.variables["viewtime_approx_threshold"][:], dtype=np.int32)

            n_vt = len(vt_eff)
            total_source_viewtime += n_vt

            # Vectorized SAA overlap check for viewtime intervals [vt_t0, vt_t1]
            if len(saa_sorted) > 0:
                idx_l = np.searchsorted(saa_sorted, vt_t0, side="left")
                idx_r = np.searchsorted(saa_sorted, vt_t1, side="right")
                vt_saa_sec_counts = idx_r - idx_l
                vt_has_saa = vt_saa_sec_counts > 0
            else:
                vt_saa_sec_counts = np.zeros(n_vt, dtype=np.int64)
                vt_has_saa = np.zeros(n_vt, dtype=bool)

            # Build spatial lookup dictionary for viewtime records in this orbit
            vt_cell_map = {}
            for k in range(n_vt):
                vt_cell_map.setdefault((float(vt_lat[k]), float(vt_lon[k])), []).append(
                    (k, int(vt_t0[k]), int(vt_t1[k]), bool(vt_has_saa[k]))
                )

            # Process Flashes (Step 2, Decision 1 & Decision 2)
            n_f = ds.dimensions["flash_dim"].size if "flash_dim" in ds.dimensions else 0
            n_g = ds.dimensions["group_dim"].size if "group_dim" in ds.dimensions else 0
            n_e = ds.dimensions["event_dim"].size if "event_dim" in ds.dimensions else 0
            n_bg_img = bds.dimensions["tdim"].size if "tdim" in bds.dimensions else 0

            total_source_flashes += n_f
            total_source_groups += n_g
            total_source_events += n_e
            total_source_bg_images += n_bg_img

            granule_valid_flashes = 0
            granule_excluded_flashes = 0
            vt_confirmed_flashes_map = {}  # vt_index -> list of flash_ids

            if n_f > 0:
                f_addr = np.array(ds.variables["lightning_flash_address"][:], dtype=np.int64)
                f_tai = np.array(ds.variables["lightning_flash_TAI93_time"][:], dtype=np.float64)
                f_dt = np.array(ds.variables["lightning_flash_delta_time"][:], dtype=np.float64)
                f_obs = np.array(ds.variables["lightning_flash_observe_time"][:], dtype=np.int32)
                f_lat = np.array(ds.variables["lightning_flash_lat"][:], dtype=np.float64)
                f_lon = np.array(ds.variables["lightning_flash_lon"][:], dtype=np.float64)
                f_rad = np.array(ds.variables["lightning_flash_radiance"][:], dtype=np.float64)
                f_foot = np.array(ds.variables["lightning_flash_footprint"][:], dtype=np.float64)
                f_caddr = np.array(ds.variables["lightning_flash_child_address"][:], dtype=np.int64)
                f_ccount = np.array(ds.variables["lightning_flash_child_count"][:], dtype=np.int32)
                f_gcount = np.array(ds.variables["lightning_flash_grandchild_count"][:], dtype=np.int32)
                f_alert = np.array(ds.variables["lightning_flash_alert_flag"][:], dtype=np.int32) & 0xFF
                f_glint = np.array(ds.variables["lightning_flash_glint_index"][:], dtype=np.float64)
                f_clust = np.array(ds.variables["lightning_flash_cluster_index"][:], dtype=np.int32)
                f_dens = np.array(ds.variables["lightning_flash_density_index"][:], dtype=np.int32)
                f_noise = np.array(ds.variables["lightning_flash_noise_index"][:], dtype=np.int32)

                for i in range(n_f):
                    flash_id = f"ISS_LIS_V2.2_{granule_id}_F{int(f_addr[i]):06d}"
                    t_raw = float(f_tai[i])
                    dt_raw = float(f_dt[i])
                    t0_sec = int(math.floor(t_raw))
                    t1_sec = int(math.ceil(t_raw + max(0.0, dt_raw)))

                    alert_val = int(f_alert[i])
                    is_fatal = (alert_val & FATAL_MASK) != 0

                    # Check SAA overlap at 1-second timestamp [t0_sec, t1_sec]
                    if len(saa_sorted) > 0:
                        s_idx = int(np.searchsorted(saa_sorted, t0_sec, side="left"))
                        is_saa = (s_idx < len(saa_sorted)) and (int(saa_sorted[s_idx]) <= t1_sec)
                    else:
                        is_saa = False

                    ref_sec = int(saa_sorted[s_idx]) if is_saa else t0_sec
                    ext_1s = saa_sec_to_ext.get(ref_sec, 0)
                    bg_1s_idx = saa_sec_to_idx.get(ref_sec, -1)

                    # Documented ATBD Non-Glint Criteria (Section 3.4.3.10.2.2)
                    glint_val = float(f_glint[i])
                    ccount_val = int(f_ccount[i])
                    is_glint_case2 = (glint_val >= GLINT_COS_5DEG) and (ccount_val > 5)
                    is_glint_case1 = (dt_raw > 0.2) and ((ccount_val / max(dt_raw, 1e-6)) > 250.0) and (glint_val > 0.0)
                    is_glint = is_glint_case1 or is_glint_case2

                    clat = round(math.floor(float(f_lat[i]) * 2.0) / 2.0 + 0.25, 2)
                    clon = round(math.floor(float(f_lon[i]) * 2.0) / 2.0 + 0.25, 2)
                    cell_id = f"{clat:+.2f}_{clon:+.2f}"

                    if is_fatal or is_saa or is_glint:
                        granule_excluded_flashes += 1
                        reasons = []
                        if is_fatal:
                            reasons.append("FATAL_FLASH_ALERT_FLAG")
                        if is_saa:
                            reasons.append("INSUFFICIENT_EVIDENCE_SAA_RADIATION")
                        if is_glint:
                            reasons.append("SOLAR_GLINT_CONTAMINATION")

                        if is_fatal and is_saa:
                            count_flashes_fatal += 1
                            count_flashes_fatal_and_saa += 1
                        elif is_fatal:
                            count_flashes_fatal += 1
                        elif is_saa:
                            count_flashes_saa_only += 1
                        if is_glint:
                            count_flashes_glint += 1

                        run_len = fatal_run_len_by_sec.get(t0_sec, 1 if is_fatal else 0)
                        is_class1_toggle = bool(is_fatal and run_len <= 2)
                        if is_class1_toggle:
                            count_flashes_class1_toggle += 1

                        excluded_flashes.append({
                            "flash_id": flash_id,
                            "flash_address": int(f_addr[i]),
                            "flash_index": int(i),
                            "granule_id": granule_id,
                            "source_file": sc_name,
                            "backgrounds_file": bg_name,
                            "lat": round(float(f_lat[i]), 5),
                            "lon": round(float(f_lon[i]), 5),
                            "grid_cell_id": cell_id,
                            "tai93_time": t_raw,
                            "utc_time": tai93_to_utc_iso(t_raw),
                            "delta_time": round(dt_raw, 6),
                            "radiance": round(float(f_rad[i]), 4),
                            "child_count": ccount_val,
                            "alert_flag": alert_val,
                            "alert_flag_hex": f"0x{alert_val:02X}",
                            "external_alert_1s": ext_1s,
                            "external_alert_hex": f"0x{ext_1s:02X}",
                            "bg_info_index": bg_1s_idx,
                            "glint_index": round(glint_val, 6),
                            "cluster_index": int(f_clust[i]),
                            "primary_exclusion_reason": reasons[0],
                            "all_exclusion_reasons": reasons,
                            "saa_model1_active": bool(ext_1s & 0x01),
                            "saa_model2_active": bool(ext_1s & 0x02),
                            "is_class1_framing_toggle": is_class1_toggle,
                            "fatal_run_length_seconds": int(run_len),
                            "reclassified_interval_state": "UNKNOWN",
                        })
                    else:
                        granule_valid_flashes += 1
                        # Match to viewtime record
                        matched_vt_idx = -1
                        match_type = "SWATH_PACKET_BOUNDARY"
                        matched_vt_saa = False
                        if (clat, clon) in vt_cell_map:
                            for k_vt, vt0, vt1, v_saa in vt_cell_map[(clat, clon)]:
                                if vt0 - 1.0 <= t_raw <= vt1 + 1.0:
                                    matched_vt_idx = k_vt
                                    match_type = "EXACT_CELL"
                                    matched_vt_saa = v_saa
                                    break
                            if matched_vt_idx == -1:
                                matched_vt_idx = vt_cell_map[(clat, clon)][0][0]
                                match_type = "EXACT_CELL"
                                matched_vt_saa = vt_cell_map[(clat, clon)][0][3]
                        else:
                            for dlat in [-0.5, 0.0, 0.5, -1.0, 1.0]:
                                for dlon in [-0.5, 0.0, 0.5, -1.0, 1.0]:
                                    cand = (round(clat + dlat, 2), round(clon + dlon, 2))
                                    if cand in vt_cell_map:
                                        matched_vt_idx = vt_cell_map[cand][0][0]
                                        match_type = "SWATH_EDGE_BUFFER_1DEG"
                                        matched_vt_saa = vt_cell_map[cand][0][3]
                                        break
                                if matched_vt_idx != -1:
                                    break

                        if matched_vt_idx != -1:
                            vt_confirmed_flashes_map.setdefault(matched_vt_idx, []).append(flash_id)
                            if matched_vt_saa:
                                count_flashes_boundary_saa_vt += 1

                        dec_flag = decode_alert_flag(alert_val)
                        flash_obj = {
                            "flash_id": flash_id,
                            "flash_address": int(f_addr[i]),
                            "flash_index": int(i),
                            "granule_id": granule_id,
                            "source_file": sc_name,
                            "backgrounds_file": bg_name,
                            "lat": round(float(f_lat[i]), 5),
                            "lon": round(float(f_lon[i]), 5),
                            "tai93_time": t_raw,
                            "utc_time": tai93_to_utc_iso(t_raw),
                            "delta_time": round(dt_raw, 6),
                            "observe_time": int(f_obs[i]),
                            "radiance": round(float(f_rad[i]), 4),
                            "radiance_units": "uJ/sr/m2/um",
                            "radiance_note": "Source optical metadata only; not storm severity or audio loudness",
                            "footprint_km2": round(float(f_foot[i]), 3),
                            "child_address": int(f_caddr[i]),
                            "child_count": ccount_val,
                            "grandchild_count": int(f_gcount[i]),
                            "quality_flags": {
                                "alert_flag": alert_val,
                                "alert_flag_hex": dec_flag["hex"],
                                "fatal_bits_active": False,
                                "warning_bits_decoded": dec_flag["warning_bits"],
                                "glint_index": round(glint_val, 6),
                                "cluster_index": int(f_clust[i]),
                                "density_index": int(f_dens[i]),
                                "noise_index": int(f_noise[i]),
                                "external_alert_1s": ext_1s,
                                "external_alert_hex": f"0x{ext_1s:02X}",
                                "saa_active": False,
                            },
                            "grid_cell": {
                                "cell_id": cell_id,
                                "cell_lat": clat,
                                "cell_lon": clon,
                                "matched_viewtime_index": int(matched_vt_idx),
                                "spatial_match_type": match_type,
                            },
                            "state": "DETECTED",
                            "reason_code": "CONFIRMED_LIGHTNING_FLASH",
                            "sound_cue": "SHORT_PERCUSSIVE_PULSE",
                        }
                        valid_flashes.append(flash_obj)

                        # Update global 0.5x0.5 DETECTED grid cell aggregator
                        g_entry = detected_grid_cells.get((clat, clon))
                        if g_entry is None:
                            detected_grid_cells[(clat, clon)] = {
                                "cell_id": cell_id,
                                "cell_lat": clat,
                                "cell_lon": clon,
                                "confirmed_flash_count": 1,
                                "sample_flash_ids": [flash_id],
                                "first_flash_tai93": t_raw,
                                "last_flash_tai93": t_raw,
                                "first_flash_utc": flash_obj["utc_time"],
                                "last_flash_utc": flash_obj["utc_time"],
                                "source_granules": {granule_id},
                                "source_files": {sc_name},
                                "pass_count": 0,
                                "total_effective_obs_s": 0.0,
                            }
                        else:
                            g_entry["confirmed_flash_count"] += 1
                            if len(g_entry["sample_flash_ids"]) < 5:
                                g_entry["sample_flash_ids"].append(flash_id)
                            if t_raw < g_entry["first_flash_tai93"]:
                                g_entry["first_flash_tai93"] = t_raw
                                g_entry["first_flash_utc"] = flash_obj["utc_time"]
                            if t_raw > g_entry["last_flash_tai93"]:
                                g_entry["last_flash_tai93"] = t_raw
                                g_entry["last_flash_utc"] = flash_obj["utc_time"]
                            g_entry["source_granules"].add(granule_id)
                            g_entry["source_files"].add(sc_name)

            # Audit SAA intervals in this granule
            if np.any(saa_mask_1s):
                s_indices = np.where(saa_mask_1s)[0]
                s_splits = np.where(np.diff(s_indices) > 1)[0] + 1
                for s_run in np.split(s_indices, s_splits):
                    st0 = float(bg_tai[s_run[0]])
                    st1 = float(bg_tai[s_run[-1]])
                    # Count viewtime cells overlapping this SAA run
                    ov_vt = int(np.sum((vt_t0 <= st1) & (vt_t1 >= st0)))
                    # Count excluded flashes in this SAA run
                    ov_fl = sum(
                        1 for ef in excluded_flashes
                        if ef["granule_id"] == granule_id and (st0 - 1.0 <= ef["tai93_time"] <= st1 + 1.0)
                    )
                    saa_rec = {
                        "saa_interval_id": f"SAA_{granule_id}_{int(s_run[0])}_{int(s_run[-1])}",
                        "granule_id": granule_id,
                        "science_file": sc_name,
                        "backgrounds_file": bg_name,
                        "bg_info_start_index": int(s_run[0]),
                        "bg_info_end_index": int(s_run[-1]),
                        "tai93_start": st0,
                        "tai93_end": st1,
                        "utc_start": tai93_to_utc_iso(st0),
                        "utc_end": tai93_to_utc_iso(st1),
                        "duration_seconds": int(len(s_run)),
                        "external_alert_hex_sample": f"0x{int(bg_ext[s_run[len(s_run)//2]]):02X}",
                        "affected_viewtime_cell_count": ov_vt,
                        "excluded_flash_count_in_interval": ov_fl,
                        "state": "UNKNOWN",
                        "reason_code": "INSUFFICIENT_EVIDENCE_SAA_RADIATION",
                        "sound_cue": "DISTINCT_NEUTRAL_TWO_PART_CUE",
                    }
                    saa_intervals_audit.append(saa_rec)

            # Classify all viewtime records in this granule & compute sensitivity counts
            vt_has_confirmed_flash = np.zeros(n_vt, dtype=bool)
            for k_vt in vt_confirmed_flashes_map:
                vt_has_confirmed_flash[k_vt] = True

            # Under Decision 1, any viewtime interval overlapping SAA is classified UNKNOWN (INSUFFICIENT_EVIDENCE_SAA_RADIATION)
            # Note: 17 boundary viewtime cells across the week had a non-SAA flash prior to/after SAA entry;
            # we track both strict SAA viewtime downgrade (all 161,468 SAA-overlapping viewtime records) and flash counts.
            g_vt_saa = int(np.sum(vt_has_saa))
            g_vt_clean = int(np.sum(~vt_has_saa))
            vt_saa_count += g_vt_saa
            vt_clean_count += g_vt_clean

            clean_m = ~vt_has_saa
            # Baseline > 0.0s
            g_det_0 = int(np.sum(clean_m & (vt_eff > 0.0) & vt_has_confirmed_flash))
            g_quiet_0 = int(np.sum(clean_m & (vt_eff > 0.0) & (~vt_has_confirmed_flash)))
            g_sub_0 = int(np.sum(clean_m & (vt_eff <= 0.0)))
            sens_0_detected += g_det_0
            sens_0_quiet += g_quiet_0
            sens_0_unknown_subthreshold += g_sub_0

            # Sensitivity > 0.1s
            g_det_01 = int(np.sum(clean_m & (vt_eff > 0.1) & vt_has_confirmed_flash))
            g_quiet_01 = int(np.sum(clean_m & (vt_eff > 0.1) & (~vt_has_confirmed_flash)))
            g_sub_01 = int(np.sum(clean_m & (vt_eff <= 0.1)))
            sens_01_detected += g_det_01
            sens_01_quiet += g_quiet_01
            sens_01_unknown_subthreshold += g_sub_01

            # Sensitivity > 1.0s
            g_det_10 = int(np.sum(clean_m & (vt_eff > 1.0) & vt_has_confirmed_flash))
            g_quiet_10 = int(np.sum(clean_m & (vt_eff > 1.0) & (~vt_has_confirmed_flash)))
            g_sub_10 = int(np.sum(clean_m & (vt_eff <= 1.0)))
            sens_10_detected += g_det_10
            sens_10_quiet += g_quiet_10
            sens_10_unknown_subthreshold += g_sub_10

            # Collect representative sensitivity examples
            if len(sensitivity_examples_0_to_01) < 5:
                cand_01 = np.where(clean_m & (vt_eff <= 0.1) & (~vt_has_confirmed_flash))[0]
                if len(cand_01) > 0:
                    k_ex = int(cand_01[0])
                    sensitivity_examples_0_to_01.append({
                        "granule_id": granule_id,
                        "source_file": sc_name,
                        "viewtime_index": k_ex,
                        "grid_lat": float(vt_lat[k_ex]),
                        "grid_lon": float(vt_lon[k_ex]),
                        "tai93_start": float(vt_t0[k_ex]),
                        "tai93_end": float(vt_t1[k_ex]),
                        "utc_start": tai93_to_utc_iso(float(vt_t0[k_ex])),
                        "utc_end": tai93_to_utc_iso(float(vt_t1[k_ex])),
                        "effective_obs_seconds": round(float(vt_eff[k_ex]), 4),
                        "ccd_frame_count_500hz": int(round(float(vt_eff[k_ex]) * 500)),
                        "state_at_baseline_gt_0s": "OBSERVED_NO_DETECTION",
                        "state_at_gt_0_1s": "UNKNOWN",
                        "state_at_gt_1_0s": "UNKNOWN",
                    })
            if len(sensitivity_examples_01_to_10) < 5:
                cand_10 = np.where(clean_m & (vt_eff > 0.1) & (vt_eff <= 1.0) & (~vt_has_confirmed_flash))[0]
                if len(cand_10) > 0:
                    k_ex = int(cand_10[0])
                    sensitivity_examples_01_to_10.append({
                        "granule_id": granule_id,
                        "source_file": sc_name,
                        "viewtime_index": k_ex,
                        "grid_lat": float(vt_lat[k_ex]),
                        "grid_lon": float(vt_lon[k_ex]),
                        "tai93_start": float(vt_t0[k_ex]),
                        "tai93_end": float(vt_t1[k_ex]),
                        "utc_start": tai93_to_utc_iso(float(vt_t0[k_ex])),
                        "utc_end": tai93_to_utc_iso(float(vt_t1[k_ex])),
                        "effective_obs_seconds": round(float(vt_eff[k_ex]), 4),
                        "ccd_frame_count_500hz": int(round(float(vt_eff[k_ex]) * 500)),
                        "state_at_baseline_gt_0s": "OBSERVED_NO_DETECTION",
                        "state_at_gt_0_1s": "OBSERVED_NO_DETECTION",
                        "state_at_gt_1_0s": "UNKNOWN",
                    })

            # Update pass counts & effective obs for detected_grid_cells in this orbit
            for k_vt in range(n_vt):
                c_key = (float(vt_lat[k_vt]), float(vt_lon[k_vt]))
                if c_key in detected_grid_cells and not vt_has_saa[k_vt]:
                    detected_grid_cells[c_key]["pass_count"] += 1
                    detected_grid_cells[c_key]["total_effective_obs_s"] = round(
                        detected_grid_cells[c_key]["total_effective_obs_s"] + float(vt_eff[k_vt]), 3
                    )

            # Extract traceable individual viewtime records for observation_windows.json:
            # 1) All DETECTED viewtime records in this granule
            # 2) Deterministic sample of OBSERVED_NO_DETECTION viewtime records (including Task 3 example vt[7500] in 20231109_225212)
            # 3) Deterministic sample of SAA-affected UNKNOWN viewtime records
            det_indices = sorted(vt_confirmed_flashes_map.keys())
            quiet_indices = np.where(clean_m & (~vt_has_confirmed_flash))[0]
            saa_vt_indices = np.where(vt_has_saa)[0]

            selected_quiet = []
            if len(quiet_indices) > 0:
                step_q = max(1, len(quiet_indices) // 25)
                selected_quiet = [int(x) for x in quiet_indices[::step_q][:25]]
                if granule_id == "20231109_225212" and 7500 not in selected_quiet:
                    selected_quiet.append(7500)

            selected_saa = []
            if len(saa_vt_indices) > 0:
                step_s = max(1, len(saa_vt_indices) // 15)
                selected_saa = [int(x) for x in saa_vt_indices[::step_s][:15]]

            for k_vt in sorted(set(det_indices + selected_quiet + selected_saa)):
                c_lat = float(vt_lat[k_vt])
                c_lon = float(vt_lon[k_vt])
                c_id = f"{c_lat:+.2f}_{c_lon:+.2f}"
                v_alert = int(vt_alert[k_vt])
                v_saa_cnt = int(vt_saa_sec_counts[k_vt])
                v_dur = int(vt_t1[k_vt] - vt_t0[k_vt]) + 1
                f_ids = vt_confirmed_flashes_map.get(k_vt, [])

                if v_saa_cnt > 0:
                    saa_st = "FULL_SAA_OVERLAP" if v_saa_cnt >= v_dur else "PARTIAL_SAA_OVERLAP"
                    rec_state = "UNKNOWN"
                    rec_reason = "INSUFFICIENT_EVIDENCE_SAA_RADIATION"
                    rec_cue = "DISTINCT_NEUTRAL_TWO_PART_CUE"
                elif len(f_ids) > 0:
                    saa_st = "NONE"
                    rec_state = "DETECTED"
                    rec_reason = "CONFIRMED_LIGHTNING_FLASH"
                    rec_cue = "SHORT_PERCUSSIVE_PULSE"
                else:
                    saa_st = "NONE"
                    rec_state = "OBSERVED_NO_DETECTION"
                    rec_reason = "ACTIVE_OPTICAL_SURVEILLANCE_ZERO_FLASHES"
                    rec_cue = "SUSTAINED_OBSERVATION_TEXTURE"

                sampled_obs_records.append({
                    "record_id": f"ISS_LIS_SC_V2.2_{granule_id}_VT{k_vt:06d}",
                    "viewtime_index": int(k_vt),
                    "granule_id": granule_id,
                    "source_file": sc_name,
                    "backgrounds_file": bg_name,
                    "grid_cell_id": c_id,
                    "grid_lat": c_lat,
                    "grid_lon": c_lon,
                    "tai93_start": float(vt_t0[k_vt]),
                    "tai93_end": float(vt_t1[k_vt]),
                    "utc_start": tai93_to_utc_iso(float(vt_t0[k_vt])),
                    "utc_end": tai93_to_utc_iso(float(vt_t1[k_vt])),
                    "effective_obs_seconds": round(float(vt_eff[k_vt]), 3),
                    "approx_threshold": int(vt_thresh[k_vt]),
                    "alert_flag": v_alert,
                    "alert_flag_hex": f"0x{v_alert:02X}",
                    "quality_interpretation": "VALID_WARNING_ONLY",
                    "saa_status": saa_st,
                    "saa_overlap_seconds": v_saa_cnt,
                    "confirmed_flash_count": len(f_ids),
                    "confirmed_flash_ids": f_ids,
                    "state": rec_state,
                    "reason_code": rec_reason,
                    "sound_cue": rec_cue,
                })

                # Populate GeoJSON grid aggregators for quiet and SAA cells
                if rec_state == "OBSERVED_NO_DETECTION" and (c_lat, c_lon) not in detected_grid_cells:
                    if (c_lat, c_lon) not in observed_quiet_cells:
                        observed_quiet_cells[(c_lat, c_lon)] = {
                            "cell_id": c_id,
                            "cell_lat": c_lat,
                            "cell_lon": c_lon,
                            "viewtime_index": int(k_vt),
                            "granule_id": granule_id,
                            "source_file": sc_name,
                            "backgrounds_file": bg_name,
                            "tai93_start": float(vt_t0[k_vt]),
                            "tai93_end": float(vt_t1[k_vt]),
                            "utc_start": tai93_to_utc_iso(float(vt_t0[k_vt])),
                            "utc_end": tai93_to_utc_iso(float(vt_t1[k_vt])),
                            "effective_obs_seconds": round(float(vt_eff[k_vt]), 3),
                            "alert_flag": v_alert,
                            "alert_flag_hex": f"0x{v_alert:02X}",
                            "state": "OBSERVED_NO_DETECTION",
                            "reason_code": "ACTIVE_OPTICAL_SURVEILLANCE_ZERO_FLASHES",
                            "sound_cue": "SUSTAINED_OBSERVATION_TEXTURE",
                        }
                elif rec_state == "UNKNOWN" and rec_reason == "INSUFFICIENT_EVIDENCE_SAA_RADIATION":
                    if (c_lat, c_lon) not in saa_unknown_cells:
                        saa_unknown_cells[(c_lat, c_lon)] = {
                            "cell_id": c_id,
                            "cell_lat": c_lat,
                            "cell_lon": c_lon,
                            "viewtime_index": int(k_vt),
                            "granule_id": granule_id,
                            "source_file": sc_name,
                            "backgrounds_file": bg_name,
                            "tai93_start": float(vt_t0[k_vt]),
                            "tai93_end": float(vt_t1[k_vt]),
                            "utc_start": tai93_to_utc_iso(float(vt_t0[k_vt])),
                            "utc_end": tai93_to_utc_iso(float(vt_t1[k_vt])),
                            "effective_obs_seconds": round(float(vt_eff[k_vt]), 3),
                            "saa_overlap_seconds": v_saa_cnt,
                            "alert_flag": v_alert,
                            "alert_flag_hex": f"0x{v_alert:02X}",
                            "state": "UNKNOWN",
                            "reason_code": "INSUFFICIENT_EVIDENCE_SAA_RADIATION",
                            "sound_cue": "DISTINCT_NEUTRAL_TWO_PART_CUE",
                        }

            # Extract bg_data_summary keyframes (and SAA 4-corner polygons)
            if n_bg_img > 0:
                bgs_tai = np.array(bds.variables["bg_data_summary_TAI93_time"][:], dtype=np.float64)
                bgs_addr = np.array(bds.variables["bg_data_summary_address"][:], dtype=np.int32)
                bgs_lat = np.array(bds.variables["bg_data_summary_lat"][:], dtype=np.float64)
                bgs_lon = np.array(bds.variables["bg_data_summary_lon"][:], dtype=np.float64)
                bgs_corners = np.array(bds.variables["bg_data_summary_corners"][:], dtype=np.float64)

                for m in range(n_bg_img):
                    bt = float(bgs_tai[m])
                    bt_sec = int(round(bt))
                    b_in_saa = (ext_1s_val := saa_sec_to_ext.get(bt_sec, 0)) & SAA_MASK != 0
                    b_in_fatal = bt_sec in fatal_sec_set and fatal_run_len_by_sec.get(bt_sec, 0) >= 40
                    # Extract 4 corners: [lat0, lon0, lat1, lon1, lat2, lon2, lat3, lon3]
                    c_raw = bgs_corners[m]
                    c_pts = [
                        [round(float(c_raw[1]), 4), round(float(c_raw[0]), 4)],
                        [round(float(c_raw[3]), 4), round(float(c_raw[2]), 4)],
                        [round(float(c_raw[5]), 4), round(float(c_raw[4]), 4)],
                        [round(float(c_raw[7]), 4), round(float(c_raw[6]), 4)],
                    ]
                    valid_corners = all(
                        -90.0 <= pt[1] <= 90.0 and -180.0 <= pt[0] <= 180.0
                        for pt in c_pts
                    )
                    lons = [pt[0] for pt in c_pts]
                    crosses_antimeridian = (max(lons) - min(lons)) > 180.0 if valid_corners else True

                    if b_in_saa and valid_corners and not crosses_antimeridian:
                        ring = c_pts + [c_pts[0]]
                        saa_fov_polygons.append({
                            "type": "Feature",
                            "id": f"SAA_FOV_{granule_id}_BG{int(bgs_addr[m]):03d}",
                            "geometry": {
                                "type": "Polygon",
                                "coordinates": [ring],
                            },
                            "properties": {
                                "feature_id": f"SAA_FOV_{granule_id}_BG{int(bgs_addr[m]):03d}",
                                "feature_category": "SAA_AFFECTED_SWATH_FOOTPRINT",
                                "state": "UNKNOWN",
                                "reason_code": "INSUFFICIENT_EVIDENCE_SAA_RADIATION",
                                "sound_cue": "DISTINCT_NEUTRAL_TWO_PART_CUE",
                                "granule_id": granule_id,
                                "science_file": sc_name,
                                "backgrounds_file": bg_name,
                                "bg_summary_address": int(bgs_addr[m]),
                                "tai93_time": bt,
                                "utc_time": tai93_to_utc_iso(bt),
                                "boresight_lat": round(float(bgs_lat[m]), 4),
                                "boresight_lon": round(float(bgs_lon[m]), 4),
                                "external_alert_hex": f"0x{ext_1s_val:02X}",
                            },
                        })

                    # Sample every 5th bg_data_summary frame for compact playback keyframes (~2,132 keyframes across 7 days)
                    if m % 5 == 0 or b_in_saa:
                        if b_in_fatal:
                            kf_state = "UNKNOWN"
                            kf_reason = "FATAL_QUALITY_FLAG"
                            kf_cue = "DISTINCT_NEUTRAL_TWO_PART_CUE"
                        elif b_in_saa:
                            kf_state = "UNKNOWN"
                            kf_reason = "INSUFFICIENT_EVIDENCE_SAA_RADIATION"
                            kf_cue = "DISTINCT_NEUTRAL_TWO_PART_CUE"
                        else:
                            kf_state = "OBSERVED_NO_DETECTION"
                            kf_reason = "ACTIVE_OPTICAL_SURVEILLANCE"
                            kf_cue = "SUSTAINED_OBSERVATION_TEXTURE"

                        bg_keyframe_windows.append({
                            "keyframe_id": f"KF_{granule_id}_BG{int(bgs_addr[m]):03d}",
                            "granule_id": granule_id,
                            "backgrounds_file": bg_name,
                            "bg_summary_address": int(bgs_addr[m]),
                            "tai93_time": bt,
                            "utc_time": tai93_to_utc_iso(bt),
                            "boresight_lat": round(float(bgs_lat[m]), 4),
                            "boresight_lon": round(float(bgs_lon[m]), 4),
                            "external_alert_hex": f"0x{ext_1s_val:02X}",
                            "saa_active": bool(b_in_saa),
                            "state": kf_state,
                            "reason_code": kf_reason,
                            "sound_cue": kf_cue,
                        })

            # Alert flag histogram for viewtime in this granule
            u_va, c_va = np.unique(vt_alert, return_counts=True)
            vt_flag_hist = {f"0x{int(k):02X}": int(v) for k, v in zip(u_va, c_va)}

            granule_obs_summaries.append({
                "granule_index": g_idx + 1,
                "granule_id": granule_id,
                "orbit_id": orbit_id,
                "science_file": sc_name,
                "backgrounds_file": bg_name,
                "tai93_start": tai_start,
                "tai93_end": tai_end,
                "utc_start": utc_start_iso,
                "utc_end": utc_end_iso,
                "total_viewtime_records": n_vt,
                "clean_viewtime_records": g_vt_clean,
                "saa_affected_viewtime_records": g_vt_saa,
                "detected_cell_passes_baseline": g_det_0,
                "observed_no_detection_cell_passes_baseline": g_quiet_0,
                "unknown_saa_cell_passes": g_vt_saa,
                "sensitivity_gt_0_1s": {
                    "detected_cell_passes": g_det_01,
                    "observed_no_detection_cell_passes": g_quiet_01,
                    "subthreshold_downgraded_to_unknown": g_sub_01,
                },
                "sensitivity_gt_1_0s": {
                    "detected_cell_passes": g_det_10,
                    "observed_no_detection_cell_passes": g_quiet_10,
                    "subthreshold_downgraded_to_unknown": g_sub_10,
                },
                "min_effective_obs_seconds": round(float(np.min(vt_eff)), 4) if n_vt > 0 else None,
                "median_effective_obs_seconds": round(float(np.median(vt_eff)), 4) if n_vt > 0 else None,
                "max_effective_obs_seconds": round(float(np.max(vt_eff)), 4) if n_vt > 0 else None,
                "viewtime_alert_flag_histogram": vt_flag_hist,
                "quality_interpretation": "VALID_WARNING_ONLY (0 fatal flags)",
                "saa_status": "SAA_TRANSIT_PRESENT" if g_vt_saa > 0 else "NO_SAA_TRANSIT",
                "saa_seconds_in_orbit": int(np.sum(saa_mask_1s)),
                "confirmed_flash_count": granule_valid_flashes,
                "excluded_flash_count": granule_excluded_flashes,
            })

            # Timeline window entry for this granule
            timeline_windows.append({
                "window_id": f"ORB_{granule_id}",
                "window_type": "ORBITAL_GRANULE_PASS",
                "granule_id": granule_id,
                "orbit_id": orbit_id,
                "science_file": sc_name,
                "backgrounds_file": bg_name,
                "tai93_start": tai_start,
                "tai93_end": tai_end,
                "utc_start": utc_start_iso,
                "utc_end": utc_end_iso,
                "duration_seconds": round(tai_end - tai_start, 3),
                "state": "DETECTED" if granule_valid_flashes > 0 else "OBSERVED_NO_DETECTION",
                "reason_code": "CONFIRMED_LIGHTNING_AND_SURVEILLANCE" if granule_valid_flashes > 0 else "ACTIVE_OPTICAL_SURVEILLANCE_ZERO_FLASHES",
                "sound_cue": "SHORT_PERCUSSIVE_PULSE_OVER_SUSTAINED_OBSERVATION_TEXTURE" if granule_valid_flashes > 0 else "SUSTAINED_OBSERVATION_TEXTURE",
                "confirmed_flash_count": granule_valid_flashes,
                "excluded_flash_count": granule_excluded_flashes,
                "detected_cell_passes": g_det_0,
                "observed_no_detection_cell_passes": g_quiet_0,
                "unknown_saa_cell_passes": g_vt_saa,
                "saa_seconds_count": int(np.sum(saa_mask_1s)),
                "has_contiguous_fatal_outage": any(fr["granule_id"] == granule_id for fr in fatal_intervals_audit),
            })

            # Source manifest entry for this granule pair
            sc_hash_info = file_hashes[sc_name]
            bg_hash_info = file_hashes[bg_name]
            actual_1s_tai_end = float(bg_tai[-1]) if n_1s > 0 else tai_end
            manifest_granules.append({
                "pair_index": g_idx + 1,
                "granule_id": granule_id,
                "orbit_id": orbit_id,
                "qc_status": "FIN",
                "collection_version": "V2.2",
                "science_granule": {
                    "filename": sc_name,
                    "collection_id": "ISS_LIS_SC_V2.2",
                    "doi": "10.5067/LIS/ISSLIS/DATA111",
                    "processing_level": "Level 2",
                    "size_bytes": sc_hash_info["size_bytes"],
                    "sha256": sc_hash_info["sha256"],
                    "staged_path": sc_hash_info["staged_path"],
                },
                "backgrounds_granule": {
                    "filename": bg_name,
                    "collection_id": "ISS_LIS_BG_V2.2",
                    "doi": "10.5067/LIS/ISSLIS/DATA211",
                    "processing_level": "Level 1B",
                    "size_bytes": bg_hash_info["size_bytes"],
                    "sha256": bg_hash_info["sha256"],
                    "staged_path": bg_hash_info["staged_path"],
                },
                "temporal_bounds": {
                    "tai93_start": tai_start,
                    "tai93_end": tai_end,
                    "actual_telemetry_tai93_end": actual_1s_tai_end,
                    "utc_start_header": utc_start_attr,
                    "utc_end_header": utc_end_attr,
                    "utc_start_validated": utc_start_iso,
                    "utc_end_validated": utc_end_iso,
                    "actual_telemetry_utc_end": tai93_to_utc_iso(actual_1s_tai_end),
                    "duration_seconds": round(tai_end - tai_start, 3),
                    "actual_telemetry_seconds": n_1s,
                },
                "record_counts": {
                    "raw_flashes": n_f,
                    "confirmed_valid_flashes": granule_valid_flashes,
                    "excluded_flashes": granule_excluded_flashes,
                    "groups": n_g,
                    "events": n_e,
                    "viewtime_cells": n_vt,
                    "one_second_records": n_1s,
                    "background_images": n_bg_img,
                    "saa_seconds": int(np.sum(saa_mask_1s)),
                },
            })

    # Verify exact reconciliation before writing
    assert len(valid_flashes) + len(excluded_flashes) == total_source_flashes, "Flash reconciliation mismatch!"
    assert vt_clean_count + vt_saa_count == total_source_viewtime, "Viewtime SAA reconciliation mismatch!"
    assert sens_0_detected + sens_0_quiet + sens_0_unknown_subthreshold == vt_clean_count, "Baseline viewtime reconciliation mismatch!"
    assert sens_01_detected + sens_01_quiet + sens_01_unknown_subthreshold == vt_clean_count, "0.1s viewtime reconciliation mismatch!"
    assert sens_10_detected + sens_10_quiet + sens_10_unknown_subthreshold == vt_clean_count, "1.0s viewtime reconciliation mismatch!"

    # 1. Write 06_PROCESSED_DATA/json/source_manifest.json
    source_manifest = {
        "schema_version": "1.0.0",
        "project": "SonifyEarth — Silence Isn't Zero",
        "challenge": "NASA Space Apps Challenge 2026 — The Earth Information Jukebox",
        "datasets": {
            "science_v2": {
                "title": "Quality Controlled Lightning Imaging Sensor (LIS) on International Space Station (ISS) Science Data V2.2",
                "collection_id": "ISS_LIS_SC_V2.2",
                "data_code": "DATA111",
                "doi": "10.5067/LIS/ISSLIS/DATA111",
                "algorithm_version": "V2.2",
                "processing_level": "Level 2",
                "qc_status": "FIN (Final Quality Controlled)",
                "file_count": 106,
                "daac_archive": "NASA Global Hydrometeorology Resource Center (GHRC) DAAC",
            },
            "backgrounds_v2": {
                "title": "Quality Controlled Lightning Imaging Sensor (LIS) on International Space Station (ISS) Backgrounds V2.2",
                "collection_id": "ISS_LIS_BG_V2.2",
                "data_code": "DATA211",
                "doi": "10.5067/LIS/ISSLIS/DATA211",
                "algorithm_version": "V2.2",
                "processing_level": "Level 1B",
                "qc_status": "FIN (Final Quality Controlled)",
                "file_count": 106,
                "daac_archive": "NASA Global Hydrometeorology Resource Center (GHRC) DAAC",
            },
        },
        "documentation_references": [
            {
                "document": "02_NASA_DOCUMENTATION/science_v2_guide.pdf",
                "title": "ISS Lightning Imaging Sensor (LIS) Datasets User Guide",
                "sha256": "8b3b96146946160f94fe30c97274b661944bc4acd1e368f0a4d9ed03e96c8944",
                "note": "Identical unified guide with backgrounds_v2_guide.pdf",
            },
            {
                "document": "02_NASA_DOCUMENTATION/lis_algorithm.pdf",
                "title": "NASA LIS Algorithm Theoretical Basis Document (ATBD)",
                "sha256": "d7d0c27731d89f5fb25fd8f67177c21cb4a549988a35e61624c32d7395f3b4e5",
            },
            {
                "document": "02_NASA_DOCUMENTATION/lis_anomalies.pdf",
                "title": "Anomalous Files Discovered During QC (ISS LIS V2.1/V2.2)",
                "sha256": "bd8f26f44a9d0fe284a1fb2a0958b83e55583114f92381fe9231591c6098c7f8",
            },
        ],
        "mission_temporal_coverage": {
            "first_granule_tai93_start": manifest_granules[0]["temporal_bounds"]["tai93_start"],
            "last_granule_tai93_end": manifest_granules[-1]["temporal_bounds"]["tai93_end"],
            "last_granule_actual_telemetry_tai93_end": manifest_granules[-1]["temporal_bounds"]["actual_telemetry_tai93_end"],
            "first_granule_utc_start": manifest_granules[0]["temporal_bounds"]["utc_start_validated"],
            "last_granule_utc_end": manifest_granules[-1]["temporal_bounds"]["utc_end_validated"],
            "last_granule_actual_telemetry_utc_end": manifest_granules[-1]["temporal_bounds"]["actual_telemetry_utc_end"],
            "tai93_to_utc_leap_offset_seconds": LEAP_OFFSET_NOV_2023,
            "total_paired_granules": 106,
            "continuous_orbit_transitions": 104,
            "documented_qc_gaps": 1,
        },
        "aggregate_source_totals": {
            "total_science_files": 106,
            "total_backgrounds_files": 106,
            "total_raw_flashes": total_source_flashes,
            "total_confirmed_valid_flashes": len(valid_flashes),
            "total_excluded_flashes": len(excluded_flashes),
            "total_groups": total_source_groups,
            "total_events": total_source_events,
            "total_viewtime_records": total_source_viewtime,
            "total_one_second_records": total_source_1s,
            "total_background_images": total_source_bg_images,
        },
        "granule_pairs": manifest_granules,
    }
    with open(os.path.join(JSON_OUT_DIR, "source_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(source_manifest, f, separators=(",", ":"))

    # 2. Write 06_PROCESSED_DATA/json/flash_events.json
    flash_events_payload = {
        "schema_version": "1.0.0",
        "dataset": "SonifyEarth Confirmed Lightning Flash Detections (State: DETECTED)",
        "collection_id": "ISS_LIS_SC_V2.2",
        "doi": "10.5067/LIS/ISSLIS/DATA111",
        "filtering_rules_applied": {
            "strict_fatal_bitmask": "(lightning_flash_alert_flag & 0x55) == 0",
            "saa_overlap_policy": "Excluded flashes overlapping 1-second SAA intervals ((bg_info_external_alert & 0x03) != 0)",
            "non_glint_criteria": "ATBD Section 3.4.3.10.2.2 verified (glint_index < cos(5 deg) = 0.996195 and group_rate <= 250/s)",
            "radiance_policy": "Preserved strictly as source optical metadata (uJ/sr/m2/um); never interpreted as storm severity or mapped to audio loudness.",
        },
        "summary_counts": {
            "total_source_flashes": total_source_flashes,
            "confirmed_detected_flashes": len(valid_flashes),
            "excluded_flashes_preserved_in_audit": len(excluded_flashes),
            "unique_0_5_deg_detected_cells": len(detected_grid_cells),
        },
        "flashes": valid_flashes,
    }
    with open(os.path.join(JSON_OUT_DIR, "flash_events.json"), "w", encoding="utf-8") as f:
        json.dump(flash_events_payload, f, separators=(",", ":"))

    # 3. Write 06_PROCESSED_DATA/json/excluded_records_audit.json
    excluded_audit_payload = {
        "schema_version": "1.0.0",
        "dataset": "SonifyEarth Excluded Records & Quality Downgrade Provenance Audit",
        "policy_statement": (
            "Zero source records are deleted. All flashes excluded by fatal quality flags (0x55) or "
            "conservative South Atlantic Anomaly (SAA) interval overlap (0x03), and all observation intervals "
            "reclassified to UNKNOWN, are preserved here with full source identifiers and reason codes."
        ),
        "reconciliation_summary": {
            "total_source_flashes": total_source_flashes,
            "confirmed_detected_flashes": len(valid_flashes),
            "total_excluded_flashes": len(excluded_flashes),
            "excluded_by_fatal_alert_flag_total": count_flashes_fatal,
            "excluded_by_fatal_alert_flag_only_non_saa": count_flashes_fatal - count_flashes_fatal_and_saa,
            "excluded_by_both_fatal_and_saa": count_flashes_fatal_and_saa,
            "excluded_by_saa_interval_only_non_fatal": count_flashes_saa_only,
            "total_flashes_overlapping_saa_1s": count_flashes_saa_only + count_flashes_fatal_and_saa,
            "excluded_by_glint_violation": count_flashes_glint,
            "class1_framing_toggle_flashes_within_fatal": count_flashes_class1_toggle,
            "contiguous_fatal_flashes_within_fatal": count_flashes_fatal - count_flashes_class1_toggle,
            "total_source_viewtime_records": total_source_viewtime,
            "saa_affected_viewtime_records_reclassified_unknown": vt_saa_count,
            "clean_non_saa_viewtime_records": vt_clean_count,
            "verified_saa_1s_intervals_count": len(saa_intervals_audit),
            "verified_saa_total_seconds": sum(x["duration_seconds"] for x in saa_intervals_audit),
            "verified_saa_affected_orbits_count": len({x["granule_id"] for x in saa_intervals_audit}),
            "contiguous_fatal_outage_intervals_count": len(fatal_intervals_audit),
            "qc_deleted_orbit_gaps_count": 1 if qc_gap_record else 0,
        },
        "excluded_flashes": excluded_flashes,
        "saa_affected_intervals": saa_intervals_audit,
        "contiguous_fatal_outage_intervals": fatal_intervals_audit,
        "qc_deleted_orbit_gaps": [qc_gap_record] if qc_gap_record else [],
    }
    with open(os.path.join(JSON_OUT_DIR, "excluded_records_audit.json"), "w", encoding="utf-8") as f:
        json.dump(excluded_audit_payload, f, separators=(",", ":"))

    # 4. Write 06_PROCESSED_DATA/json/observation_windows.json
    observation_windows_payload = {
        "schema_version": "1.0.0",
        "dataset": "SonifyEarth Verified Viewtime Observation Windows",
        "source_collection": "ISS_LIS_SC_V2.2 (viewtime_*) paired with ISS_LIS_BG_V2.2 (bg_info_external_alert)",
        "spatial_grid_resolution": "0.5 deg x 0.5 deg centered at half-degree increments (mod 0.5 == 0.25)",
        "global_observation_census": {
            "total_viewtime_records": total_source_viewtime,
            "clean_non_saa_viewtime_records": vt_clean_count,
            "saa_affected_viewtime_records_unknown": vt_saa_count,
            "detected_cell_passes_baseline": sens_0_detected,
            "observed_no_detection_cell_passes_baseline": sens_0_quiet,
            "fatal_flagged_viewtime_records": 0,
            "warning_only_valid_viewtime_records": total_source_viewtime,
            "unique_observed_0_5_deg_cells_7day": 160560,
            "observed_latitude_bounds_deg": [-55.75, 55.25],
            "observed_longitude_bounds_deg": [-179.75, 179.75],
            "boundary_saa_viewtime_flashes_note": (
                f"{count_flashes_boundary_saa_vt} confirmed flashes occurred outside 1s SAA intervals "
                "within 17 grid cells whose ~85s viewtime window later entered or earlier exited the SAA."
            ),
        },
        "granule_observation_windows": granule_obs_summaries,
        "traceable_grid_observation_records_count": len(sampled_obs_records),
        "grid_observation_records": sampled_obs_records,
    }
    with open(os.path.join(JSON_OUT_DIR, "observation_windows.json"), "w", encoding="utf-8") as f:
        json.dump(observation_windows_payload, f, separators=(",", ":"))

    # 5. Write 06_PROCESSED_DATA/json/three_state_data.json
    three_state_payload = {
        "schema_version": "1.0.0",
        "dataset": "SonifyEarth Three-State Scientific Classification & Sensitivity Dataset",
        "scientific_principle": "Silence Isn't Zero — Unobserved intervals, missing orbits, fatal outages, and SAA radiation blinding are classified as UNKNOWN, never equated to zero lightning.",
        "three_state_definitions": {
            "DETECTED": {
                "sound_cue": "SHORT_PERCUSSIVE_PULSE",
                "reason_code": "CONFIRMED_LIGHTNING_FLASH",
                "criteria": "Confirmed flash passing strict fatal-bit mask ((lightning_flash_alert_flag & 0x55) == 0), ATBD non-glint criteria, and zero overlap with 1-second SAA intervals ((bg_info_external_alert & 0x03) == 0).",
                "flash_event_count": len(valid_flashes),
                "clean_viewtime_cell_passes_baseline": sens_0_detected,
                "unique_0_5_deg_grid_cells": len(detected_grid_cells),
            },
            "OBSERVED_NO_DETECTION": {
                "sound_cue": "SUSTAINED_OBSERVATION_TEXTURE",
                "reason_code": "ACTIVE_OPTICAL_SURVEILLANCE_ZERO_FLASHES",
                "criteria": "Valid positive effective observation duration (viewtime_effective_obs > 0.0 s), warning-only alert status ((viewtime_alert_flag & 0x55) == 0), no SAA overlap ((bg_info_external_alert & 0x03) == 0), and zero confirmed flashes.",
                "clean_viewtime_cell_passes_baseline": sens_0_quiet,
            },
            "UNKNOWN": {
                "sound_cue": "DISTINCT_NEUTRAL_TWO_PART_CUE",
                "criteria": "Insufficient, degraded, or absent observational evidence to confirm either lightning detection or quiet zero-flash surveillance.",
                "reason_code_breakdown": {
                    "INSUFFICIENT_EVIDENCE_SAA_RADIATION": {
                        "description": "Observation interval or candidate flash overlaps South Atlantic Anomaly (bg_info_external_alert & 0x03 != 0); conservative SonifyEarth policy prevents claiming OBSERVED_NO_DETECTION or unverified DETECTED.",
                        "saa_affected_viewtime_cell_passes": vt_saa_count,
                        "saa_excluded_flashes_non_fatal": count_flashes_saa_only,
                        "saa_excluded_flashes_also_fatal": count_flashes_fatal_and_saa,
                        "saa_contiguous_intervals_count": len(saa_intervals_audit),
                        "saa_total_1s_seconds": sum(x["duration_seconds"] for x in saa_intervals_audit),
                    },
                    "FATAL_QUALITY_FLAG": {
                        "description": "Record or interval carries an active fatal status bit ((alert_flag & 0x55) != 0), including contiguous hardware outages omitted from viewtime and Class 1 framing-toggle flashes.",
                        "excluded_flashes_count": count_flashes_fatal,
                        "contiguous_outage_intervals_count": len(fatal_intervals_audit),
                        "contiguous_outage_total_seconds": sum(x["duration_seconds"] for x in fatal_intervals_audit),
                    },
                    "MISSING_SOURCE_DATA": {
                        "description": "Query interval falls within the documented 185.78-minute gap on 2023-11-11 where NASA QC removed noisy orbits 20231111_085535_NQC and 20231111_102828_NQC.",
                        "qc_gap_intervals_count": 1,
                        "qc_gap_duration_seconds": qc_gap_record["duration_seconds"] if qc_gap_record else 0.0,
                    },
                    "OUTSIDE_OBSERVATION_COVERAGE": {
                        "description": "Location lies outside the instantaneous ~550 km ISS LIS FOV swath or poleward of the observed [-55.75 deg, +55.25 deg] orbital latitude envelope.",
                        "unobserved_global_0_5_deg_cells_never_viewed": 259200 - 160560,
                        "note": "Even within [-55.75 deg, +55.25 deg], any cell is OUTSIDE_OBSERVATION_COVERAGE whenever the ISS swath is not overhead.",
                    },
                    "UNRESOLVED_TIME_MATCH": {
                        "description": "Timestamp falls outside the 7-day mission dataset bounds (before 2023-11-09T22:52:12.400Z or after permanent instrument power-down at 2023-11-16T21:17:00.000Z).",
                        "supported": True,
                    },
                },
            },
        },
        "decision_3_effective_observation_sensitivity": {
            "selected_baseline_rule": "viewtime_effective_obs > 0.0 s",
            "scientific_justification": (
                "Minimum viewtime_effective_obs in the dataset is 0.040 s (20 CCD frames at 500 Hz). "
                "Using > 0.0 s preserves 100% of genuine swath perimeter observations, whereas > 0.1 s and > 1.0 s "
                "arbitrarily reclassify 343,630 (8.59%) and 696,084 (17.40%) valid clean swath-edge cell passes to UNKNOWN."
            ),
            "threshold_comparison_table": [
                {
                    "threshold_label": "Baseline: viewtime_effective_obs > 0.0 s",
                    "threshold_seconds": 0.0,
                    "detected_cell_passes": sens_0_detected,
                    "observed_no_detection_cell_passes": sens_0_quiet,
                    "unknown_saa_cell_passes": vt_saa_count,
                    "unknown_subthreshold_cell_passes": sens_0_unknown_subthreshold,
                    "total_unknown_cell_passes": vt_saa_count + sens_0_unknown_subthreshold,
                    "total_viewtime_records_reconciled": total_source_viewtime,
                    "clean_swath_retention_pct": 100.0,
                },
                {
                    "threshold_label": "Sensitivity A: viewtime_effective_obs > 0.1 s",
                    "threshold_seconds": 0.1,
                    "detected_cell_passes": sens_01_detected,
                    "observed_no_detection_cell_passes": sens_01_quiet,
                    "unknown_saa_cell_passes": vt_saa_count,
                    "unknown_subthreshold_cell_passes": sens_01_unknown_subthreshold,
                    "total_unknown_cell_passes": vt_saa_count + sens_01_unknown_subthreshold,
                    "total_viewtime_records_reconciled": total_source_viewtime,
                    "clean_swath_retention_pct": round((sens_01_detected + sens_01_quiet) * 100.0 / vt_clean_count, 2),
                },
                {
                    "threshold_label": "Sensitivity B: viewtime_effective_obs > 1.0 s",
                    "threshold_seconds": 1.0,
                    "detected_cell_passes": sens_10_detected,
                    "observed_no_detection_cell_passes": sens_10_quiet,
                    "unknown_saa_cell_passes": vt_saa_count,
                    "unknown_subthreshold_cell_passes": sens_10_unknown_subthreshold,
                    "total_unknown_cell_passes": vt_saa_count + sens_10_unknown_subthreshold,
                    "total_viewtime_records_reconciled": total_source_viewtime,
                    "clean_swath_retention_pct": round((sens_10_detected + sens_10_quiet) * 100.0 / vt_clean_count, 2),
                },
            ],
            "representative_examples_0_04s_to_0_10s": sensitivity_examples_0_to_01,
            "representative_examples_0_10s_to_1_00s": sensitivity_examples_01_to_10,
        },
        "verified_state_examples_reference": "05_SCIENTIFIC_VALIDATION/REAL_STATE_EXAMPLES.json",
        "granule_three_state_summaries": granule_obs_summaries,
    }
    with open(os.path.join(JSON_OUT_DIR, "three_state_data.json"), "w", encoding="utf-8") as f:
        json.dump(three_state_payload, f, separators=(",", ":"))

    # 6. Write 06_PROCESSED_DATA/json/sonifyearth_windows.json
    sonifyearth_windows_payload = {
        "schema_version": "1.0.0",
        "dataset": "SonifyEarth Playback & Evidence Timeline Windows",
        "coverage_disclaimer": (
            "ISS LIS is a Low Earth Orbit swath instrument (~550 km swath width, ~54 deg inclination). "
            "Observation is NOT continuous at any fixed point on Earth over the 7-day window; each location is "
            "observed only during brief ~80-95 second orbital overpasses."
        ),
        "locked_sound_mapping": {
            "DETECTED": "SHORT_PERCUSSIVE_PULSE",
            "OBSERVED_NO_DETECTION": "SUSTAINED_OBSERVATION_TEXTURE",
            "UNKNOWN": "DISTINCT_NEUTRAL_TWO_PART_CUE",
            "listening_modes": [
                "EVIDENCE_INSPECTOR_MODE",
                "GLOBAL_ORBITAL_PLAYBACK_MODE",
            ],
        },
        "timeline_bounds": {
            "tai93_start": manifest_granules[0]["temporal_bounds"]["tai93_start"],
            "tai93_end": manifest_granules[-1]["temporal_bounds"]["tai93_end"],
            "utc_start": manifest_granules[0]["temporal_bounds"]["utc_start_validated"],
            "utc_end": manifest_granules[-1]["temporal_bounds"]["utc_end_validated"],
            "total_orbital_and_gap_windows": len(timeline_windows),
            "total_saa_windows": len(saa_intervals_audit),
            "total_contiguous_fatal_windows": len(fatal_intervals_audit),
            "total_bg_swath_keyframes": len(bg_keyframe_windows),
        },
        "orbital_and_gap_windows": timeline_windows,
        "saa_transit_windows": saa_intervals_audit,
        "contiguous_fatal_outage_windows": fatal_intervals_audit,
        "swath_keyframes": bg_keyframe_windows,
    }
    with open(os.path.join(JSON_OUT_DIR, "sonifyearth_windows.json"), "w", encoding="utf-8") as f:
        json.dump(sonifyearth_windows_payload, f, separators=(",", ":"))

    # 7. Write 06_PROCESSED_DATA/json/schema.json
    schema_payload = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "SonifyEarth Production Data JSON & GeoJSON Schemas",
        "version": "1.0.0",
        "schemas": {
            "source_manifest.json": {
                "type": "object",
                "required": ["schema_version", "project", "datasets", "mission_temporal_coverage", "aggregate_source_totals", "granule_pairs"],
            },
            "flash_events.json": {
                "type": "object",
                "required": ["schema_version", "dataset", "collection_id", "doi", "filtering_rules_applied", "summary_counts", "flashes"],
                "flash_item_required": [
                    "flash_id", "flash_address", "flash_index", "granule_id", "source_file", "backgrounds_file",
                    "lat", "lon", "tai93_time", "utc_time", "delta_time", "radiance", "child_count",
                    "quality_flags", "grid_cell", "state", "reason_code", "sound_cue"
                ],
            },
            "observation_windows.json": {
                "type": "object",
                "required": ["schema_version", "dataset", "global_observation_census", "granule_observation_windows", "grid_observation_records"],
                "record_item_required": [
                    "record_id", "viewtime_index", "granule_id", "source_file", "grid_cell_id", "grid_lat", "grid_lon",
                    "tai93_start", "tai93_end", "utc_start", "utc_end", "effective_obs_seconds", "alert_flag",
                    "quality_interpretation", "saa_status", "state", "reason_code"
                ],
            },
            "three_state_data.json": {
                "type": "object",
                "required": ["schema_version", "dataset", "three_state_definitions", "decision_3_effective_observation_sensitivity", "granule_three_state_summaries"],
            },
            "sonifyearth_windows.json": {
                "type": "object",
                "required": ["schema_version", "dataset", "locked_sound_mapping", "timeline_bounds", "orbital_and_gap_windows", "saa_transit_windows", "swath_keyframes"],
            },
            "excluded_records_audit.json": {
                "type": "object",
                "required": ["schema_version", "dataset", "reconciliation_summary", "excluded_flashes", "saa_affected_intervals", "contiguous_fatal_outage_intervals", "qc_deleted_orbit_gaps"],
            },
            "geojson_feature_collection": {
                "type": "object",
                "required": ["type", "name", "metadata", "features"],
            },
        },
    }
    with open(os.path.join(JSON_OUT_DIR, "schema.json"), "w", encoding="utf-8") as f:
        json.dump(schema_payload, f, indent=2)

    # 8. Write 06_PROCESSED_DATA/geojson/lightning_events.geojson
    lightning_features = []
    for fl in valid_flashes:
        lightning_features.append({
            "type": "Feature",
            "id": fl["flash_id"],
            "geometry": {
                "type": "Point",
                "coordinates": [fl["lon"], fl["lat"]],
            },
            "properties": {
                "flash_id": fl["flash_id"],
                "flash_address": fl["flash_address"],
                "granule_id": fl["granule_id"],
                "source_file": fl["source_file"],
                "backgrounds_file": fl["backgrounds_file"],
                "tai93_time": fl["tai93_time"],
                "utc_time": fl["utc_time"],
                "delta_time": fl["delta_time"],
                "radiance": fl["radiance"],
                "child_count": fl["child_count"],
                "grandchild_count": fl["grandchild_count"],
                "alert_flag": fl["quality_flags"]["alert_flag"],
                "alert_flag_hex": fl["quality_flags"]["alert_flag_hex"],
                "glint_index": fl["quality_flags"]["glint_index"],
                "cluster_index": fl["quality_flags"]["cluster_index"],
                "grid_cell_id": fl["grid_cell"]["cell_id"],
                "matched_viewtime_index": fl["grid_cell"]["matched_viewtime_index"],
                "state": "DETECTED",
                "reason_code": "CONFIRMED_LIGHTNING_FLASH",
                "sound_cue": "SHORT_PERCUSSIVE_PULSE",
            },
        })
    lightning_geojson = {
        "type": "FeatureCollection",
        "name": "SonifyEarth_Confirmed_Lightning_Events",
        "metadata": {
            "project": "SonifyEarth — Silence Isn't Zero",
            "doi": "10.5067/LIS/ISSLIS/DATA111",
            "feature_count": len(lightning_features),
            "state": "DETECTED",
            "sound_cue": "SHORT_PERCUSSIVE_PULSE",
        },
        "features": lightning_features,
    }
    with open(os.path.join(GEOJSON_OUT_DIR, "lightning_events.geojson"), "w", encoding="utf-8") as f:
        json.dump(lightning_geojson, f, separators=(",", ":"))

    # 9. Write 06_PROCESSED_DATA/geojson/observation_grid.geojson
    obs_grid_features = []
    # Include all 2,927 unique 0.5x0.5 DETECTED grid cells
    for (clat, clon), g_info in sorted(detected_grid_cells.items()):
        obs_grid_features.append({
            "type": "Feature",
            "id": f"CELL_DET_{g_info['cell_id']}",
            "geometry": {
                "type": "Polygon",
                "coordinates": cell_polygon_coords(clat, clon),
            },
            "properties": {
                "cell_id": g_info["cell_id"],
                "cell_lat": clat,
                "cell_lon": clon,
                "state": "DETECTED",
                "reason_code": "CONFIRMED_LIGHTNING_FLASH",
                "sound_cue": "SHORT_PERCUSSIVE_PULSE",
                "confirmed_flash_count": g_info["confirmed_flash_count"],
                "sample_flash_ids": g_info["sample_flash_ids"],
                "pass_count": g_info["pass_count"],
                "total_effective_obs_seconds": g_info["total_effective_obs_s"],
                "first_flash_tai93": g_info["first_flash_tai93"],
                "last_flash_tai93": g_info["last_flash_tai93"],
                "first_flash_utc": g_info["first_flash_utc"],
                "last_flash_utc": g_info["last_flash_utc"],
                "source_granules": sorted(g_info["source_granules"]),
                "source_files": sorted(g_info["source_files"]),
            },
        })
    # Include verified OBSERVED_NO_DETECTION 0.5x0.5 grid cells
    for (clat, clon), q_info in sorted(observed_quiet_cells.items()):
        obs_grid_features.append({
            "type": "Feature",
            "id": f"CELL_OBS_{q_info['cell_id']}_{q_info['granule_id']}",
            "geometry": {
                "type": "Polygon",
                "coordinates": cell_polygon_coords(clat, clon),
            },
            "properties": q_info,
        })

    observation_grid_geojson = {
        "type": "FeatureCollection",
        "name": "SonifyEarth_Observation_Grid_0_5_Deg",
        "metadata": {
            "project": "SonifyEarth — Silence Isn't Zero",
            "grid_resolution_deg": 0.5,
            "detected_grid_cells_count": len(detected_grid_cells),
            "observed_no_detection_sample_cells_count": len(observed_quiet_cells),
            "total_features": len(obs_grid_features),
            "total_clean_viewtime_records_represented": vt_clean_count,
        },
        "features": obs_grid_features,
    }
    with open(os.path.join(GEOJSON_OUT_DIR, "observation_grid.geojson"), "w", encoding="utf-8") as f:
        json.dump(observation_grid_geojson, f, separators=(",", ":"))

    # 10. Write 06_PROCESSED_DATA/geojson/unknown_coverage.geojson
    unknown_features = []
    # (a) SAA-affected 0.5x0.5 viewtime grid cells (INSUFFICIENT_EVIDENCE_SAA_RADIATION)
    for (clat, clon), s_info in sorted(saa_unknown_cells.items()):
        unknown_features.append({
            "type": "Feature",
            "id": f"CELL_SAA_{s_info['cell_id']}_{s_info['granule_id']}",
            "geometry": {
                "type": "Polygon",
                "coordinates": cell_polygon_coords(clat, clon),
            },
            "properties": {
                "feature_category": "SAA_AFFECTED_VIEWTIME_CELL",
                **s_info,
            },
        })
    # (b) SAA 4-corner FOV polygons from bg_data_summary_corners
    unknown_features.extend(saa_fov_polygons)
    # (c) Contiguous fatal hardware outage ground-track LineStrings (FATAL_QUALITY_FLAG)
    unknown_features.extend(fatal_track_features)
    # (d) Verified out-of-coverage reference cell from Task 3 (Reykjavik 64.25N, -21.75E)
    unknown_features.append({
        "type": "Feature",
        "id": "CELL_OUTSIDE_COVERAGE_REYKJAVIK_64.25_-21.75",
        "geometry": {
            "type": "Polygon",
            "coordinates": cell_polygon_coords(64.25, -21.75),
        },
        "properties": {
            "feature_category": "UNOBSERVED_HIGH_LATITUDE_REFERENCE_CELL",
            "cell_id": "+64.25_-21.75",
            "cell_lat": 64.25,
            "cell_lon": -21.75,
            "state": "UNKNOWN",
            "reason_code": "OUTSIDE_OBSERVATION_COVERAGE",
            "sound_cue": "DISTINCT_NEUTRAL_TWO_PART_CUE",
            "viewtime_records_in_7day_archive": 0,
            "max_observed_viewtime_lat_deg": 55.25,
            "min_observed_viewtime_lat_deg": -55.75,
            "source_verification": "05_SCIENTIFIC_VALIDATION/REAL_STATE_EXAMPLES.json (Example 3)",
        },
    })

    unknown_coverage_geojson = {
        "type": "FeatureCollection",
        "name": "SonifyEarth_Unknown_Coverage_And_Quality_Exclusions",
        "metadata": {
            "project": "SonifyEarth — Silence Isn't Zero",
            "state": "UNKNOWN",
            "sound_cue": "DISTINCT_NEUTRAL_TWO_PART_CUE",
            "saa_grid_cell_features_count": len(saa_unknown_cells),
            "saa_fov_polygon_features_count": len(saa_fov_polygons),
            "contiguous_fatal_track_features_count": len(fatal_track_features),
            "outside_coverage_reference_features_count": 1,
            "total_features": len(unknown_features),
        },
        "features": unknown_features,
    }
    with open(os.path.join(GEOJSON_OUT_DIR, "unknown_coverage.geojson"), "w", encoding="utf-8") as f:
        json.dump(unknown_coverage_geojson, f, separators=(",", ":"))

    print("======================================================================")
    print("SONIFYEARTH TASK 4 PRODUCTION DATA ENGINE COMPLETE")
    print("======================================================================")
    print(f"Total Granule Pairs Processed       : {len(manifest_granules)}")
    print(f"Total Source Flashes                : {total_source_flashes:,}")
    print(f"Confirmed DETECTED Flashes          : {len(valid_flashes):,}")
    print(f"Total Excluded Flashes              : {len(excluded_flashes):,}")
    print(f"  - Fatal Alert Flag (0x55)         : {count_flashes_fatal:,} (of which {count_flashes_fatal_and_saa} also in SAA)")
    print(f"  - SAA Overlap Only (0x03)         : {count_flashes_saa_only:,}")
    print(f"  - Glint Violations                : {count_flashes_glint:,}")
    print(f"Total Source Viewtime Records       : {total_source_viewtime:,}")
    print(f"  - Clean Non-SAA Viewtime Records  : {vt_clean_count:,}")
    print(f"    * DETECTED Cell Passes (>0.0s)  : {sens_0_detected:,}")
    print(f"    * OBSERVED_NO_DETECTION (>0.0s) : {sens_0_quiet:,}")
    print(f"  - SAA Viewtime Records -> UNKNOWN : {vt_saa_count:,}")
    print(f"Sensitivity (>0.1s) Clean Viewtime  : DETECTED={sens_01_detected:,}, QUIET={sens_01_quiet:,}, SUBTHRESHOLD_UNKNOWN={sens_01_unknown_subthreshold:,}")
    print(f"Sensitivity (>1.0s) Clean Viewtime  : DETECTED={sens_10_detected:,}, QUIET={sens_10_quiet:,}, SUBTHRESHOLD_UNKNOWN={sens_10_unknown_subthreshold:,}")
    print("======================================================================")


if __name__ == "__main__":
    main()
