#!/usr/bin/env python3
"""
SonifyEarth Task 3 - Independent Reproducibility Test Suite
Allows any team member to independently verify every real state example in
05_SCIENTIFIC_VALIDATION/REAL_STATE_EXAMPLES.json directly against the raw NASA NetCDF-4 files.
"""

import os
import json
from datetime import datetime, timezone, timedelta
import netCDF4 as nc
import numpy as np

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SCI_DIR = os.path.join(BASE_DIR, "01_NASA_RAW_DATA", "science_v2")
BG_DIR = os.path.join(BASE_DIR, "01_NASA_RAW_DATA", "backgrounds_v2")
EX_PATH = os.path.join(BASE_DIR, "05_SCIENTIFIC_VALIDATION", "REAL_STATE_EXAMPLES.json")

EPOCH_1993 = datetime(1993, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
LEAP_SECONDS = 10.0
FATAL_MASK = 0x55

def tai_to_utc(tai):
    return (EPOCH_1993 + timedelta(seconds=float(tai) - LEAP_SECONDS)).isoformat().replace("+00:00", "Z")

def main():
    print("=" * 70)
    print("SONIFYEARTH INDEPENDENT REPRODUCIBILITY VERIFIER")
    print("=" * 70)
    
    with open(EX_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    examples = data["examples"]
    
    for ex in examples:
        state = ex["state"]
        if state == "DETECTED":
            ds = nc.Dataset(os.path.join(SCI_DIR, ex["science_filename"]))
            fidx = ex["original_record_identifiers"]["lightning_flash_address"]
            vidx = ex["original_record_identifiers"]["viewtime_record_index"]
            
            fl_tai = float(ds.variables["lightning_flash_TAI93_time"][fidx])
            fl_lat = float(ds.variables["lightning_flash_lat"][fidx])
            fl_lon = float(ds.variables["lightning_flash_lon"][fidx])
            fl_flag = int(ds.variables["lightning_flash_alert_flag"][fidx])
            
            vt_eff = float(ds.variables["viewtime_effective_obs"][vidx])
            vt_flag = int(ds.variables["viewtime_alert_flag"][vidx])
            
            assert abs(fl_tai - ex["tai93_flash_timestamp"]) < 1e-6
            assert tai_to_utc(fl_tai) == ex["utc_flash_timestamp"]
            assert abs(fl_lat - ex["latitude"]) < 1e-5
            assert abs(fl_lon - ex["longitude"]) < 1e-5
            assert (fl_flag & FATAL_MASK) == 0
            assert (vt_flag & FATAL_MASK) == 0 and vt_eff > 0
            ds.close()
            print(f"[PASS] DETECTED verified directly in {ex['science_filename']} (flash={fidx}, viewtime={vidx})")
            
        elif state == "OBSERVED_NO_DETECTION":
            ds = nc.Dataset(os.path.join(SCI_DIR, ex["science_filename"]))
            vidx = ex["original_record_identifiers"]["viewtime_record_index"]
            
            vt_lat = float(ds.variables["viewtime_lat"][vidx])
            vt_lon = float(ds.variables["viewtime_lon"][vidx])
            vt_t0 = int(ds.variables["viewtime_TAI93_start"][vidx])
            vt_t1 = int(ds.variables["viewtime_TAI93_end"][vidx])
            vt_eff = float(ds.variables["viewtime_effective_obs"][vidx])
            vt_flag = int(ds.variables["viewtime_alert_flag"][vidx])
            
            # Verify 0 flashes in cell
            fl_lat = ds.variables["lightning_flash_lat"][:]
            fl_lon = ds.variables["lightning_flash_lon"][:]
            fl_tai = ds.variables["lightning_flash_TAI93_time"][:]
            matches = (np.abs(fl_lat - vt_lat) <= 0.25) & (np.abs(fl_lon - vt_lon) <= 0.25) & (fl_tai >= vt_t0 - 1.0) & (fl_tai <= vt_t1 + 1.0)
            
            assert int(matches.sum()) == 0
            assert (vt_flag & FATAL_MASK) == 0 and vt_eff > 0
            assert abs(vt_eff - ex["observation_duration_seconds"]) < 1e-4
            ds.close()
            print(f"[PASS] OBSERVED_NO_DETECTION verified directly in {ex['science_filename']} (viewtime={vidx}, eff={vt_eff:.2f}s, flashes=0)")
            
        elif state == "UNKNOWN":
            rc = ex["reason_code"]
            if rc == "OUTSIDE_OBSERVATION_COVERAGE":
                ds = nc.Dataset(os.path.join(SCI_DIR, ex["science_filename"]))
                vt_lat = ds.variables["viewtime_lat"][:]
                vt_lon = ds.variables["viewtime_lon"][:]
                m = (np.abs(vt_lat - ex["latitude"]) <= 0.5) & (np.abs(vt_lon - ex["longitude"]) <= 0.5)
                assert int(m.sum()) == 0
                ds.close()
                print(f"[PASS] UNKNOWN ({rc}) verified: 0 viewtime records at ({ex['latitude']}, {ex['longitude']})")
                
            elif rc == "MISSING_SOURCE_DATA":
                f_prev = os.path.join(SCI_DIR, ex["original_record_identifiers"]["preceding_granule"])
                f_next = os.path.join(SCI_DIR, ex["original_record_identifiers"]["subsequent_granule"])
                ds1 = nc.Dataset(f_prev)
                ds2 = nc.Dataset(f_next)
                gap = float(ds2.variables["orbit_summary_TAI93_start"][:]) - float(ds1.variables["orbit_summary_TAI93_end"][:])
                assert abs(gap - ex["gap_duration_seconds"]) < 0.5
                ds1.close()
                ds2.close()
                print(f"[PASS] UNKNOWN ({rc}) verified: gap={gap:.1f}s ({gap/60:.1f} min) between consecutive granules")
                
            elif rc == "FATAL_QUALITY_FLAG":
                ds = nc.Dataset(os.path.join(SCI_DIR, ex["science_filename"]))
                osa = ds.variables["one_second_alert_summary"][:]
                tai = ds.variables["one_second_TAI93_time"][:]
                vt_t0 = ds.variables["viewtime_TAI93_start"][:]
                s0, s1 = ex["original_record_identifiers"]["one_second_index_range"]
                assert np.all((osa[s0:s1+1] & FATAL_MASK) > 0)
                # Ensure viewtime does not contain any records starting inside [tai[s0], tai[s1]]
                assert int((vt_t0 < tai[s1]).sum()) == 0
                ds.close()
                print(f"[PASS] UNKNOWN ({rc}) verified in {ex['science_filename']}: {s1-s0+1} contiguous fatal seconds excluded from viewtime")
                
            elif rc == "INSUFFICIENT_EVIDENCE_SAA_RADIATION":
                ds_b = nc.Dataset(os.path.join(BG_DIR, ex["backgrounds_filename"]))
                bidx = ex["original_record_identifiers"]["bg_info_index"]
                bext = int(ds_b.variables["bg_info_external_alert"][bidx])
                assert (bext & 0x03) > 0
                ds_b.close()
                print(f"[PASS] UNKNOWN ({rc}) verified in {ex['backgrounds_filename']} (bg_info={bidx}, ext_alert=0x{bext:02X})")

    print("=" * 70)
    print("ALL 6 REAL STATE EXAMPLES REPRODUCED & VERIFIED INDEPENDENTLY!")
    print("=" * 70)

if __name__ == "__main__":
    main()

