#!/usr/bin/env python3
"""
SonifyEarth Task 2 - NASA NetCDF Data Inspection and CSV Generation Suite.
Inspects all 106 Science V2 and 106 Backgrounds V2 NetCDF files and extracts:
- File-level metadata
- Variable-level schema, types, shapes, units, fill values, comments
- Granule pairing and orbital timeline continuity
"""

import os
import glob
import re
import csv
import netCDF4 as nc
import numpy as np

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SCI_DIR = os.path.join(BASE_DIR, "01_NASA_RAW_DATA", "science_v2")
BG_DIR = os.path.join(BASE_DIR, "01_NASA_RAW_DATA", "backgrounds_v2")
OUT_DIR = os.path.join(BASE_DIR, "03_DATA_INSPECTION")

os.makedirs(OUT_DIR, exist_ok=True)

def inspect_all_science_files():
    print("Inspecting all 106 Science V2 files...")
    sci_files = sorted(glob.glob(os.path.join(SCI_DIR, "*.nc")))
    records = []
    
    for f in sci_files:
        fname = os.path.basename(f)
        sz = os.path.getsize(f)
        ds = nc.Dataset(f)
        
        orbit_id = int(ds.variables["orbit_summary_id_number"][:]) if "orbit_summary_id_number" in ds.variables else -1
        utc_start = str(ds.variables["orbit_summary_UTC_start"][:]) if "orbit_summary_UTC_start" in ds.variables else "N/A"
        tai_start = float(ds.variables["orbit_summary_TAI93_start"][:]) if "orbit_summary_TAI93_start" in ds.variables else -1.0
        tai_end = float(ds.variables["orbit_summary_TAI93_end"][:]) if "orbit_summary_TAI93_end" in ds.variables else -1.0
        start_lon = float(ds.variables["orbit_summary_start_longitude"][:]) if "orbit_summary_start_longitude" in ds.variables else 0.0
        end_lon = float(ds.variables["orbit_summary_end_longitude"][:]) if "orbit_summary_end_longitude" in ds.variables else 0.0
        insp_code = int(ds.variables["orbit_summary_inspection_code"][:]) if "orbit_summary_inspection_code" in ds.variables else -1
        conf_code = int(ds.variables["orbit_summary_configuration_code"][:]) if "orbit_summary_configuration_code" in ds.variables else -1
        
        fl_cnt = ds.dimensions["flash_dim"].size
        gr_cnt = ds.dimensions["group_dim"].size
        ev_cnt = ds.dimensions["event_dim"].size
        ar_cnt = ds.dimensions["area_dim"].size
        vt_cnt = ds.dimensions["viewtime_dim"].size
        os_cnt = ds.dimensions["one_second_dim"].size
        bg_sum_cnt = ds.dimensions["background_summary_dim"].size
        
        records.append({
            "filename": fname,
            "file_size_bytes": sz,
            "orbit_id": orbit_id,
            "utc_start": utc_start,
            "tai93_start": tai_start,
            "tai93_end": tai_end,
            "duration_seconds": round(tai_end - tai_start, 3),
            "start_longitude": start_lon,
            "end_longitude": end_lon,
            "inspection_code": insp_code,
            "configuration_code": conf_code,
            "flash_count": fl_cnt,
            "group_count": gr_cnt,
            "event_count": ev_cnt,
            "area_count": ar_cnt,
            "viewtime_count": vt_cnt,
            "one_second_count": os_cnt,
            "background_summary_count": bg_sum_cnt,
            "format": ds.file_format,
            "conventions": getattr(ds, "Conventions", "CF-1.6"),
            "qc_status": "QC Final (FIN)"
        })
        ds.close()
        
    out_csv = os.path.join(OUT_DIR, "science_file_inspection.csv")
    fieldnames = list(records[0].keys())
    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)
    print(f"Wrote {len(records)} records to {out_csv}")
    return records

def inspect_all_background_files():
    print("Inspecting all 106 Backgrounds V2 files...")
    bg_files = sorted(glob.glob(os.path.join(BG_DIR, "*.nc")))
    records = []
    
    for f in bg_files:
        fname = os.path.basename(f)
        sz = os.path.getsize(f)
        ds = nc.Dataset(f)
        
        orbit_id = int(ds.variables["bg_orbit_summary_id_number"][:]) if "bg_orbit_summary_id_number" in ds.variables else -1
        utc_start = str(ds.variables["bg_orbit_summary_UTC_start"][:]) if "bg_orbit_summary_UTC_start" in ds.variables else "N/A"
        tai_start = float(ds.variables["bg_orbit_summary_TAI93_start"][:]) if "bg_orbit_summary_TAI93_start" in ds.variables else -1.0
        tai_end = float(ds.variables["bg_orbit_summary_TAI93_end"][:]) if "bg_orbit_summary_TAI93_end" in ds.variables else -1.0
        start_lon = float(ds.variables["bg_orbit_summary_start_longitude"][:]) if "bg_orbit_summary_start_longitude" in ds.variables else 0.0
        end_lon = float(ds.variables["bg_orbit_summary_end_longitude"][:]) if "bg_orbit_summary_end_longitude" in ds.variables else 0.0
        
        tdim = ds.dimensions["tdim"].size
        bg_info_dim = ds.dimensions["bg_info_dim"].size
        
        records.append({
            "filename": fname,
            "file_size_bytes": sz,
            "orbit_id": orbit_id,
            "utc_start": utc_start,
            "tai93_start": tai_start,
            "tai93_end": tai_end,
            "duration_seconds": round(tai_end - tai_start, 3),
            "start_longitude": start_lon,
            "end_longitude": end_lon,
            "background_image_count": tdim,
            "bg_info_one_second_count": bg_info_dim,
            "format": ds.file_format,
            "conventions": getattr(ds, "Conventions", "CF-1.6"),
            "qc_status": "QC Final (FIN)"
        })
        ds.close()
        
    out_csv = os.path.join(OUT_DIR, "backgrounds_file_inspection.csv")
    fieldnames = list(records[0].keys())
    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)
    print(f"Wrote {len(records)} records to {out_csv}")
    return records

def generate_pairing_report(sci_records, bg_records):
    print("Generating file pairing report...")
    records = []
    
    # Sort both by tai_start
    sci_sorted = sorted(sci_records, key=lambda x: x["tai93_start"])
    bg_dict = {re.search(r"_(\d{8}_\d{6})_", r["filename"]).group(1): r for r in bg_records}
    
    for i, s_rec in enumerate(sci_sorted):
        ts = re.search(r"_(\d{8}_\d{6})_", s_rec["filename"]).group(1)
        b_rec = bg_dict.get(ts)
        
        if not b_rec:
            pair_status = "UNPAIRED"
            gap_next = "N/A"
            utc_match = False
            tai_start_match = False
            tai_end_match = False
            cadence_match = False
            bg_fname = "MISSING"
            bg_sz = 0
        else:
            utc_match = (s_rec["utc_start"] == b_rec["utc_start"])
            tai_start_match = (abs(s_rec["tai93_start"] - b_rec["tai93_start"]) < 0.001)
            tai_end_match = (abs(s_rec["tai93_end"] - b_rec["tai93_end"]) < 0.001)
            cadence_match = (s_rec["one_second_count"] == b_rec["bg_info_one_second_count"])
            bg_fname = b_rec["filename"]
            bg_sz = b_rec["file_size_bytes"]
            
            # Check gap to next orbit
            if i < len(sci_sorted) - 1:
                next_start = sci_sorted[i+1]["tai93_start"]
                gap = round(next_start - s_rec["tai93_end"], 3)
            else:
                gap = 0.0
                
            pair_status = "VERIFIED_PAIR" if (utc_match and tai_start_match and tai_end_match and cadence_match) else "MISMATCH"

        records.append({
            "pair_index": i + 1,
            "granule_timestamp": ts,
            "science_filename": s_rec["filename"],
            "backgrounds_filename": bg_fname,
            "science_size_bytes": s_rec["file_size_bytes"],
            "backgrounds_size_bytes": bg_sz,
            "orbit_id": s_rec["orbit_id"],
            "utc_start": s_rec["utc_start"],
            "tai93_start": s_rec["tai93_start"],
            "tai93_end": s_rec["tai93_end"],
            "duration_seconds": s_rec["duration_seconds"],
            "utc_start_match": utc_match,
            "tai_start_match": tai_start_match,
            "tai_end_match": tai_end_match,
            "one_sec_cadence_match": cadence_match,
            "flash_count": s_rec["flash_count"],
            "viewtime_count": s_rec["viewtime_count"],
            "bg_image_count": b_rec["background_image_count"] if b_rec else 0,
            "gap_to_next_orbit_seconds": gap,
            "pair_status": pair_status
        })

    out_csv = os.path.join(OUT_DIR, "file_pairing_report.csv")
    fieldnames = list(records[0].keys())
    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)
    print(f"Wrote {len(records)} pairing rows to {out_csv}")
    return records

def build_variable_dictionaries():
    print("Building Science and Backgrounds variable dictionaries...")
    sample_sci = sorted(glob.glob(os.path.join(SCI_DIR, "*.nc")))[0]
    sample_bg = sorted(glob.glob(os.path.join(BG_DIR, "*.nc")))[0]
    
    ds_sci = nc.Dataset(sample_sci)
    sci_vars = []
    
    def classify_sci_var(vname):
        if vname.startswith("lightning_flash_"):
            return ("Flash Tier", "HIGH", "Primary sound trigger, pitch, velocity, and 3D globe visualization")
        elif vname.startswith("lightning_group_"):
            return ("Group Tier", "MEDIUM", "Micro-structure clustering and acoustic burst texture")
        elif vname.startswith("lightning_event_"):
            return ("Event Tier", "MEDIUM", "Fundamental optical pulses (CCD pixel hits), timing jitter")
        elif vname.startswith("lightning_area_"):
            return ("Area Tier", "LOW", "Grandparent storm cluster tracking")
        elif vname.startswith("viewtime_"):
            return ("Viewtime (Observation)", "CRITICAL", "Determines State 2 (OBSERVED_NO_DETECTION) vs State 3 (UNKNOWN)")
        elif vname.startswith("orbit_summary_"):
            return ("Orbit Summary", "HIGH", "Orbit boundaries, time synchronization, and granule timeline matching")
        elif vname.startswith("point_summary_"):
            return ("Point Summary", "MEDIUM", "Global counts of events, groups, flashes per orbit")
        elif vname.startswith("one_second_"):
            return ("One-Second Time Series", "HIGH", "Platform position, velocity, and operational health alert flags")
        elif vname.startswith("bg_summary_"):
            return ("Background Summary", "MEDIUM", "Summary coordinates of background frames embedded in Science product")
        elif vname.startswith("raster_"):
            return ("Browse Imagery", "LOW", "Static orbit summary map and palette")
        return ("General", "LOW", "Internal metadata")

    for vname, var in ds_sci.variables.items():
        tier, utility, role = classify_sci_var(vname)
        attrs = {a: getattr(var, a) for a in var.ncattrs()}
        long_name = attrs.get("long_name", vname)
        std_name = attrs.get("standard_name", "N/A")
        units = attrs.get("units", "dimensionless")
        comment = attrs.get("comment", attrs.get("description", "N/A"))
        fill_val = str(attrs.get("_FillValue", "N/A"))
        scale_fac = str(attrs.get("scale_factor", "1.0"))
        add_off = str(attrs.get("add_offset", "0.0"))
        
        sci_vars.append({
            "dataset": "ISS LIS Science V2.2",
            "variable_name": vname,
            "data_type": str(var.dtype),
            "dimensions": str(var.dimensions),
            "shape": str(var.shape),
            "units": units,
            "long_name": long_name,
            "standard_name": std_name,
            "fill_value": fill_val,
            "scale_factor": scale_fac,
            "add_offset": add_off,
            "tier": tier,
            "useful_for_sonifyearth": utility,
            "sonifyearth_role": role,
            "nasa_comment": comment
        })
    ds_sci.close()
    
    out_sci_csv = os.path.join(OUT_DIR, "science_variable_dictionary.csv")
    with open(out_sci_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(sci_vars[0].keys()))
        writer.writeheader()
        writer.writerows(sci_vars)
    print(f"Wrote {len(sci_vars)} Science variables to {out_sci_csv}")

    # Backgrounds
    ds_bg = nc.Dataset(sample_bg)
    bg_vars = []
    
    def classify_bg_var(vname):
        if vname == "bg_data":
            return ("Background Imagery", "CRITICAL", "128x128 optical radiance matrix driving ambient soundscape synthesis")
        elif vname.startswith("bg_data_summary_"):
            return ("Footprint Geometry", "CRITICAL", "Boresight & 4-corner polygon bounding sensor field of view")
        elif vname.startswith("bg_info_alert_") or "alert" in vname:
            return ("Quality & Alerts", "CRITICAL", "1-second health flags, SAA warning, fatal instrument flags")
        elif vname.startswith("bg_info_position_") or vname.startswith("bg_info_velocity_") or "solar" in vname or "transform" in vname:
            return ("Ephemeris & Orbit", "HIGH", "Spacecraft position, orbital track line on 3D globe, day/night solar angle")
        elif vname.startswith("bg_orbit_summary_"):
            return ("Orbit Summary", "HIGH", "Granule time synchronization and timeline matching")
        elif vname.startswith("bg_info_"):
            return ("Observation Context", "HIGH", "Background value, noise index, and filtered event counts")
        return ("General", "LOW", "Internal metadata")

    for vname, var in ds_bg.variables.items():
        tier, utility, role = classify_bg_var(vname)
        attrs = {a: getattr(var, a) for a in var.ncattrs()}
        long_name = attrs.get("long_name", vname)
        std_name = attrs.get("standard_name", "N/A")
        units = attrs.get("units", "dimensionless")
        comment = attrs.get("comment", attrs.get("description", "N/A"))
        fill_val = str(attrs.get("_FillValue", "N/A"))
        scale_fac = str(attrs.get("scale_factor", "1.0"))
        add_off = str(attrs.get("add_offset", "0.0"))
        
        bg_vars.append({
            "dataset": "ISS LIS Backgrounds V2.2",
            "variable_name": vname,
            "data_type": str(var.dtype),
            "dimensions": str(var.dimensions),
            "shape": str(var.shape),
            "units": units,
            "long_name": long_name,
            "standard_name": std_name,
            "fill_value": fill_val,
            "scale_factor": scale_fac,
            "add_offset": add_off,
            "tier": tier,
            "useful_for_sonifyearth": utility,
            "sonifyearth_role": role,
            "nasa_comment": comment
        })
    ds_bg.close()
    
    out_bg_csv = os.path.join(OUT_DIR, "backgrounds_variable_dictionary.csv")
    with open(out_bg_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(bg_vars[0].keys()))
        writer.writeheader()
        writer.writerows(bg_vars)
    print(f"Wrote {len(bg_vars)} Background variables to {out_bg_csv}")
    
    return sci_vars, bg_vars

if __name__ == "__main__":
    sci_recs = inspect_all_science_files()
    bg_recs = inspect_all_background_files()
    pairing_recs = generate_pairing_report(sci_recs, bg_recs)
    sci_vars, bg_vars = build_variable_dictionaries()
    print("Inspection data extraction successfully finished.")

