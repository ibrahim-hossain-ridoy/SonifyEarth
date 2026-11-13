#!/usr/bin/env python3
"""
Generate DATA_INVENTORY.csv and DOCUMENTATION_MANIFEST.md for SonifyEarth.
"""

import os
import csv
import re
import hashlib
from datetime import datetime

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def sha256_file(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def human_size(n_bytes):
    for unit in ['B', 'KB', 'MB', 'GB']:
        if n_bytes < 1024.0:
            return f"{n_bytes:.2f} {unit}"
        n_bytes /= 1024.0
    return f"{n_bytes:.2f} TB"

def main():
    csv_path = os.path.join(BASE_DIR, "DATA_INVENTORY.csv")
    doc_manifest_path = os.path.join(BASE_DIR, "02_NASA_DOCUMENTATION", "DOCUMENTATION_MANIFEST.md")
    
    rows = []
    
    # 1. Science V2 (Organized in 01_NASA_RAW_DATA/science_v2)
    sci_dir = os.path.join(BASE_DIR, "01_NASA_RAW_DATA", "science_v2")
    sci_pattern = re.compile(r"ISS_LIS_SC_V2\.2_(\d{8})_(\d{6})_FIN\.(nc|hdf)")
    for f in sorted(os.listdir(sci_dir)):
        if f.startswith("."):
            continue
        p = os.path.join(sci_dir, f)
        sz = os.path.getsize(p)
        h = sha256_file(p)
        ext = os.path.splitext(f)[1].lower()
        
        m = sci_pattern.match(f)
        if m:
            dt_str = f"{m.group(1)[:4]}-{m.group(1)[4:6]}-{m.group(1)[6:8]} {m.group(2)[:2]}:{m.group(2)[2:4]}:{m.group(2)[4:6]} UTC"
        else:
            dt_str = "N/A"
            
        rows.append({
            "dataset_name": "ISS LIS Science V2.2",
            "original_filename": f,
            "file_format": ext,
            "file_size_bytes": sz,
            "file_size_human": human_size(sz),
            "original_folder": "isslis_v2_fin_2-20261110_093840",
            "organized_folder": "01_NASA_RAW_DATA/science_v2",
            "local_availability": "Available (Local)",
            "sha256_checksum": h,
            "granule_timestamp_utc": dt_str,
            "metadata_notes": "Science data granule containing lightning events, groups, and flashes (ISS LIS SC V2.2 FIN)"
        })

    # 2. Backgrounds V2 (Organized in 01_NASA_RAW_DATA/backgrounds_v2)
    bg_dir = os.path.join(BASE_DIR, "01_NASA_RAW_DATA", "backgrounds_v2")
    bg_pattern = re.compile(r"ISS_LIS_BG_V2\.2_(\d{8})_(\d{6})_FIN\.(nc|hdf)")
    for f in sorted(os.listdir(bg_dir)):
        if f.startswith("."):
            continue
        p = os.path.join(bg_dir, f)
        sz = os.path.getsize(p)
        h = sha256_file(p)
        ext = os.path.splitext(f)[1].lower()
        
        m = bg_pattern.match(f)
        if m:
            dt_str = f"{m.group(1)[:4]}-{m.group(1)[4:6]}-{m.group(1)[6:8]} {m.group(2)[:2]}:{m.group(2)[2:4]}:{m.group(2)[4:6]} UTC"
        else:
            dt_str = "N/A"
            
        rows.append({
            "dataset_name": "ISS LIS Backgrounds V2.2",
            "original_filename": f,
            "file_format": ext,
            "file_size_bytes": sz,
            "file_size_human": human_size(sz),
            "original_folder": "isslisg_v2_fin_2-20261110_094729",
            "organized_folder": "01_NASA_RAW_DATA/backgrounds_v2",
            "local_availability": "Available (Local)",
            "sha256_checksum": h,
            "granule_timestamp_utc": dt_str,
            "metadata_notes": "Background imagery granule containing gridded sensor background radiance & threshold (ISS LIS BG V2.2 FIN)"
        })

    # 3. NASA Documentation
    doc_info = [
        {
            "organized_name": "science_v2_guide.pdf",
            "orig_filename": "isslis_v2_fin_dataset.pdf",
            "orig_folder": "isslis_v2_fin_2-20261110_093840",
            "title": "NASA ISS LIS Science Data User Guide (V2.2 Final)",
            "pages": 24
        },
        {
            "organized_name": "backgrounds_v2_guide.pdf",
            "orig_filename": "isslisg_v2_fin_dataset.pdf",
            "orig_folder": "root (workspace)",
            "title": "NASA ISS LIS Backgrounds / Gridded Data User Guide (V2.2 Final)",
            "pages": 24
        },
        {
            "organized_name": "lis_algorithm.pdf",
            "orig_filename": "atbd-lis-2000.pdf",
            "orig_folder": "root (workspace)",
            "title": "Algorithm Theoretical Basis Document (ATBD) for the Lightning Imaging Sensor (LIS)",
            "pages": 47
        },
        {
            "organized_name": "lis_anomalies.pdf",
            "orig_filename": "ISSLIS-Anomalies.pdf",
            "orig_folder": "root (workspace)",
            "title": "ISS LIS Instrument Anomalies and Data Quality User Guide",
            "pages": 11
        }
    ]

    doc_dir = os.path.join(BASE_DIR, "02_NASA_DOCUMENTATION")
    for doc in doc_info:
        p = os.path.join(doc_dir, doc["organized_name"])
        sz = os.path.getsize(p)
        h = sha256_file(p)
        rows.append({
            "dataset_name": "NASA Mission Documentation",
            "original_filename": doc["orig_filename"],
            "file_format": ".pdf",
            "file_size_bytes": sz,
            "file_size_human": human_size(sz),
            "original_folder": doc["orig_folder"],
            "organized_folder": "02_NASA_DOCUMENTATION",
            "local_availability": "Available (Local)",
            "sha256_checksum": h,
            "granule_timestamp_utc": "N/A (Reference Guide)",
            "metadata_notes": f"{doc['title']} (Organized as {doc['organized_name']})"
        })

    # Write DATA_INVENTORY.csv
    fieldnames = [
        "dataset_name",
        "original_filename",
        "file_format",
        "file_size_bytes",
        "file_size_human",
        "original_folder",
        "organized_folder",
        "local_availability",
        "sha256_checksum",
        "granule_timestamp_utc",
        "metadata_notes"
    ]
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} entries to {csv_path}")

    # Write DOCUMENTATION_MANIFEST.md
    manifest_md = [
        "# NASA Technical Documentation Manifest",
        "",
        "This directory contains the official NASA reference documents governing the ISS LIS (Lightning Imaging Sensor) Science and Backgrounds datasets.",
        "",
        "| Document Role | Standardized Filename | Original Filename | Original Source Folder | Size (Bytes) | SHA-256 Checksum | Description |",
        "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |"
    ]
    for doc in doc_info:
        p = os.path.join(doc_dir, doc["organized_name"])
        sz = os.path.getsize(p)
        h = sha256_file(p)
        manifest_md.append(
            f"| **{doc['title'].split('(')[0].strip()}** | `{doc['organized_name']}` | `{doc['orig_filename']}` | `{doc['orig_folder']}` | {sz:,} | `{h}` | {doc['title']} |"
        )
    manifest_md.append("")
    manifest_md.append("## Verification Note")
    manifest_md.append("All PDF documents were verified against initial download copies before relocation. Unaltered raw downloads remain preserved under `01_NASA_RAW_DATA/original_downloads/`.")
    manifest_md.append("")

    with open(doc_manifest_path, "w", encoding="utf-8") as f:
        f.write("\n".join(manifest_md))
    print(f"Wrote documentation manifest to {doc_manifest_path}")

if __name__ == "__main__":
    main()

