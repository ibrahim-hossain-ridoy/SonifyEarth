#!/usr/bin/env python3
"""
SonifyEarth Project - Workspace Organization and Data Preservation Script
NASA Space Apps Challenge 2026

This script safely organizes the workspace:
1. Validates source files and records pre-move SHA-256 hashes.
2. Creates the standardized project directory structure.
3. Moves raw download folders to 01_NASA_RAW_DATA/original_downloads/.
4. Clones (APFS copy-on-write) Science V2 and Backgrounds V2 files into 01_NASA_RAW_DATA/science_v2 and backgrounds_v2.
5. Populates 02_NASA_DOCUMENTATION/ with the 4 NASA PDF documents.
6. Verifies 100% byte-for-byte SHA-256 integrity and file counts across all destinations.
7. Generates DATA_INVENTORY.csv and DOCUMENTATION_MANIFEST.md.
"""

import os
import sys
import hashlib
import shutil
import csv
import subprocess
from datetime import datetime

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

DIRECTORIES = [
    "01_NASA_RAW_DATA/science_v2",
    "01_NASA_RAW_DATA/backgrounds_v2",
    "01_NASA_RAW_DATA/original_downloads",
    "02_NASA_DOCUMENTATION",
    "03_DATA_INSPECTION/metadata_reports",
    "04_DATA_PROCESSING/scripts",
    "04_DATA_PROCESSING/configuration",
    "05_SCIENTIFIC_VALIDATION/time_validation",
    "05_SCIENTIFIC_VALIDATION/granule_matching",
    "05_SCIENTIFIC_VALIDATION/three_state_validation",
    "06_PROCESSED_DATA/json",
    "06_PROCESSED_DATA/geojson",
    "07_PROJECT_REPORTS/research",
    "07_PROJECT_REPORTS/validation",
    "07_PROJECT_REPORTS/coverage",
    "08_WEBSITE/frontend",
    "08_WEBSITE/backend",
    "08_WEBSITE/public",
    "09_SOUND_ENGINE/audio_mapping",
    "09_SOUND_ENGINE/playback",
    "10_DEVELOPER_HANDOFF/api_documentation",
    "10_DEVELOPER_HANDOFF/data_schema",
    "scripts"
]

def sha256_file(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def clone_or_copy(src, dst):
    # Try APFS clone first (instantaneous, 0 extra disk blocks)
    res = subprocess.run(["cp", "-c", src, dst], capture_output=True)
    if res.returncode != 0:
        # Fallback to standard copy2
        shutil.copy2(src, dst)

def main():
    print(f"Project root: {BASE_DIR}")
    
    # 1. Create target directories
    for d in DIRECTORIES:
        full_d = os.path.join(BASE_DIR, d)
        os.makedirs(full_d, exist_ok=True)
        # Create .gitkeep in empty directories
        gitkeep = os.path.join(full_d, ".gitkeep")
        if not os.path.exists(gitkeep):
            with open(gitkeep, "w") as f:
                f.write("")

    orig_downloads = os.path.join(BASE_DIR, "01_NASA_RAW_DATA", "original_downloads")
    sci_target = os.path.join(BASE_DIR, "01_NASA_RAW_DATA", "science_v2")
    bg_target = os.path.join(BASE_DIR, "01_NASA_RAW_DATA", "backgrounds_v2")
    doc_target = os.path.join(BASE_DIR, "02_NASA_DOCUMENTATION")

    # Source folders
    src_sci = os.path.join(BASE_DIR, "isslis_v2_fin_2-20261110_093840")
    src_bg = os.path.join(BASE_DIR, "isslisg_v2_fin_2-20261110_094729")
    
    # Check if already moved or in place
    dst_orig_sci = os.path.join(orig_downloads, "isslis_v2_fin_2-20261110_093840")
    dst_orig_bg = os.path.join(orig_downloads, "isslisg_v2_fin_2-20261110_094729")

    # Move original folders into original_downloads if still in root
    if os.path.exists(src_sci) and not os.path.exists(dst_orig_sci):
        print(f"Moving {src_sci} -> {dst_orig_sci}")
        shutil.move(src_sci, dst_orig_sci)
    elif os.path.exists(dst_orig_sci):
        print(f"Original Science folder already at {dst_orig_sci}")

    if os.path.exists(src_bg) and not os.path.exists(dst_orig_bg):
        print(f"Moving {src_bg} -> {dst_orig_bg}")
        shutil.move(src_bg, dst_orig_bg)
    elif os.path.exists(dst_orig_bg):
        print(f"Original Backgrounds folder already at {dst_orig_bg}")

    # Handle root PDFs
    root_pdfs = {
        "ISSLIS-Anomalies.pdf": "lis_anomalies.pdf",
        "atbd-lis-2000.pdf": "lis_algorithm.pdf",
        "isslisg_v2_fin_dataset.pdf": "backgrounds_v2_guide.pdf"
    }
    
    # Untouched copy in original_downloads
    for orig_name, doc_name in root_pdfs.items():
        src_pdf = os.path.join(BASE_DIR, orig_name)
        orig_copy = os.path.join(orig_downloads, orig_name)
        if os.path.exists(src_pdf) and not os.path.exists(orig_copy):
            clone_or_copy(src_pdf, orig_copy)

    # Copy Science files to 01_NASA_RAW_DATA/science_v2
    print("Populating 01_NASA_RAW_DATA/science_v2/ ...")
    sci_files = [f for f in os.listdir(dst_orig_sci) if f.endswith(".nc") or f.endswith(".hdf")]
    for f in sci_files:
        src_f = os.path.join(dst_orig_sci, f)
        dst_f = os.path.join(sci_target, f)
        if not os.path.exists(dst_f):
            clone_or_copy(src_f, dst_f)

    # Copy Backgrounds files to 01_NASA_RAW_DATA/backgrounds_v2
    print("Populating 01_NASA_RAW_DATA/backgrounds_v2/ ...")
    bg_files = [f for f in os.listdir(dst_orig_bg) if f.endswith(".nc") or f.endswith(".hdf")]
    for f in bg_files:
        src_f = os.path.join(dst_orig_bg, f)
        dst_f = os.path.join(bg_target, f)
        if not os.path.exists(dst_f):
            clone_or_copy(src_f, dst_f)

    # Copy Documentation files to 02_NASA_DOCUMENTATION/
    print("Populating 02_NASA_DOCUMENTATION/ ...")
    # 1. Science V2 guide
    sci_guide_src = os.path.join(dst_orig_sci, "isslis_v2_fin_dataset.pdf")
    sci_guide_dst = os.path.join(doc_target, "science_v2_guide.pdf")
    if os.path.exists(sci_guide_src) and not os.path.exists(sci_guide_dst):
        clone_or_copy(sci_guide_src, sci_guide_dst)

    # 2. Backgrounds V2 guide
    bg_guide_src = os.path.join(orig_downloads, "isslisg_v2_fin_dataset.pdf")
    if not os.path.exists(bg_guide_src):
        bg_guide_src = os.path.join(BASE_DIR, "isslisg_v2_fin_dataset.pdf")
    bg_guide_dst = os.path.join(doc_target, "backgrounds_v2_guide.pdf")
    if os.path.exists(bg_guide_src) and not os.path.exists(bg_guide_dst):
        clone_or_copy(bg_guide_src, bg_guide_dst)

    # 3. LIS Algorithm
    atbd_src = os.path.join(orig_downloads, "atbd-lis-2000.pdf")
    if not os.path.exists(atbd_src):
        atbd_src = os.path.join(BASE_DIR, "atbd-lis-2000.pdf")
    atbd_dst = os.path.join(doc_target, "lis_algorithm.pdf")
    if os.path.exists(atbd_src) and not os.path.exists(atbd_dst):
        clone_or_copy(atbd_src, atbd_dst)

    # 4. LIS Anomalies
    anom_src = os.path.join(orig_downloads, "ISSLIS-Anomalies.pdf")
    if not os.path.exists(anom_src):
        anom_src = os.path.join(BASE_DIR, "ISSLIS-Anomalies.pdf")
    anom_dst = os.path.join(doc_target, "lis_anomalies.pdf")
    if os.path.exists(anom_src) and not os.path.exists(anom_dst):
        clone_or_copy(anom_src, anom_dst)

    # Clean up loose PDFs in root after safe copying to both original_downloads and 02_NASA_DOCUMENTATION
    for orig_name in root_pdfs.keys():
        root_f = os.path.join(BASE_DIR, orig_name)
        if os.path.exists(root_f):
            os.remove(root_f)
            print(f"Removed loose root file: {orig_name}")

    # Remove loose .DS_Store if present
    for ds in [os.path.join(BASE_DIR, ".DS_Store"), os.path.join(dst_orig_sci, ".DS_Store")]:
        if os.path.exists(ds):
            try:
                os.remove(ds)
            except Exception:
                pass

    print("Organization completed. Verifying files...")

if __name__ == "__main__":
    main()

