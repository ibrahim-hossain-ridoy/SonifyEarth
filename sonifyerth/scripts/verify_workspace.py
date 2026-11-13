#!/usr/bin/env python3
"""
Comprehensive Final Verification Script for SonifyEarth Task 1.
Runs end-to-end checks against all prompt specifications and outputs exact metrics.
"""

import os
import sys
import hashlib
import csv

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def sha256_file(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def main():
    print("=" * 70)
    print("SONIFYEARTH WORKSPACE VERIFICATION SUITE")
    print("=" * 70)
    
    # 1. Project Root Check
    print(f"1. Project Root: {BASE_DIR}")
    assert os.path.exists(BASE_DIR), "Project root does not exist!"
    
    # Check for any nested sonifyearth folders
    nested = []
    for root, dirs, files in os.walk(BASE_DIR):
        for d in dirs:
            if d.lower() in ["sonifyearth", "sonifyerth"] and os.path.abspath(os.path.join(root, d)) != BASE_DIR:
                nested.append(os.path.join(root, d))
    print(f"   Duplicate nested sonifyearth folders found: {len(nested)}")
    assert len(nested) == 0, f"Found nested folders: {nested}"

    # 2. Final folder structure check
    required_dirs = [
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
    missing_dirs = [d for d in required_dirs if not os.path.isdir(os.path.join(BASE_DIR, d))]
    print(f"2. Required directories check: {len(required_dirs) - len(missing_dirs)}/{len(required_dirs)} present")
    assert len(missing_dirs) == 0, f"Missing directories: {missing_dirs}"

    # 3. Science V2 Files
    sci_dir = os.path.join(BASE_DIR, "01_NASA_RAW_DATA", "science_v2")
    sci_nc = [f for f in os.listdir(sci_dir) if f.endswith(".nc")]
    sci_hdf = [f for f in os.listdir(sci_dir) if f.endswith(".hdf")]
    print(f"3. Science V2 .nc files: {len(sci_nc)}")
    print(f"4. Science V2 .hdf files: {len(sci_hdf)}")
    assert len(sci_nc) == 106, f"Expected 106 Science .nc files, found {len(sci_nc)}"
    assert len(sci_hdf) == 106, f"Expected 106 Science .hdf files, found {len(sci_hdf)}"

    # 4. Backgrounds V2 Files
    bg_dir = os.path.join(BASE_DIR, "01_NASA_RAW_DATA", "backgrounds_v2")
    bg_nc = [f for f in os.listdir(bg_dir) if f.endswith(".nc")]
    bg_hdf = [f for f in os.listdir(bg_dir) if f.endswith(".hdf")]
    print(f"5. Backgrounds V2 .nc files: {len(bg_nc)}")
    print(f"6. Backgrounds V2 .hdf files: {len(bg_hdf)}")
    assert len(bg_nc) == 106, f"Expected 106 Backgrounds .nc files, found {len(bg_nc)}"
    assert len(bg_hdf) == 106, f"Expected 106 Backgrounds .hdf files, found {len(bg_hdf)}"

    # 5. NASA PDF Documents
    doc_dir = os.path.join(BASE_DIR, "02_NASA_DOCUMENTATION")
    required_pdfs = [
        "science_v2_guide.pdf",
        "backgrounds_v2_guide.pdf",
        "lis_algorithm.pdf",
        "lis_anomalies.pdf"
    ]
    found_pdfs = [f for f in os.listdir(doc_dir) if f.endswith(".pdf")]
    print(f"7. NASA PDF documents in 02_NASA_DOCUMENTATION: {len(found_pdfs)} ({found_pdfs})")
    assert set(required_pdfs) == set(found_pdfs), f"PDF mismatch: expected {required_pdfs}, found {found_pdfs}"

    # 6. Missing or Cloud-Only Files
    cloud_only = []
    unreadable = []
    zero_size = []
    for root, dirs, files in os.walk(BASE_DIR):
        # Skip virtual environment and hidden git/cache folders
        dirs[:] = [d for d in dirs if not d.startswith(".") and d != "__pycache__"]
        for f in files:
            if f in [".DS_Store"] or f.startswith("."):
                continue
            p = os.path.join(root, f)
            st = os.stat(p)
            flags = getattr(st, "st_flags", 0)
            if bool(flags & 0x40000000):
                cloud_only.append(p)
            if st.st_size == 0 and not f.endswith(".gitkeep"):
                zero_size.append(p)
            try:
                with open(p, "rb") as fp:
                    fp.read(1024)
            except Exception as e:
                unreadable.append((p, str(e)))

    print(f"8. Cloud-only / dataless files: {len(cloud_only)}")
    print(f"   Unreadable files: {len(unreadable)}")
    print(f"   Unexpected zero-size files: {len(zero_size)}")
    assert len(cloud_only) == 0, f"Found cloud-only files: {cloud_only}"
    assert len(unreadable) == 0, f"Found unreadable files: {unreadable}"
    assert len(zero_size) == 0, f"Found zero-size files: {zero_size}"

    # 7. Checksum verification between original_downloads and organized folders
    orig_sci = os.path.join(BASE_DIR, "01_NASA_RAW_DATA", "original_downloads", "isslis_v2_fin_2-20261110_093840")
    orig_bg = os.path.join(BASE_DIR, "01_NASA_RAW_DATA", "original_downloads", "isslisg_v2_fin_2-20261110_094729")
    
    failed_ops = 0
    # Verify Science
    for f in sci_nc + sci_hdf:
        h_orig = sha256_file(os.path.join(orig_sci, f))
        h_org = sha256_file(os.path.join(sci_dir, f))
        if h_orig != h_org:
            failed_ops += 1
            print(f"Checksum failure on Science file: {f}")
            
    # Verify Backgrounds
    for f in bg_nc + bg_hdf:
        h_orig = sha256_file(os.path.join(orig_bg, f))
        h_org = sha256_file(os.path.join(bg_dir, f))
        if h_orig != h_org:
            failed_ops += 1
            print(f"Checksum failure on Background file: {f}")

    print(f"9. Any failed file operations / checksum failures: {failed_ops}")
    assert failed_ops == 0, f"Encountered {failed_ops} failed file operations!"

    # 8. Confirmation of original data preservation
    orig_download_files = [f for root, dirs, files in os.walk(os.path.join(BASE_DIR, "01_NASA_RAW_DATA", "original_downloads")) for f in files if not f.startswith(".")]
    print(f"10. Confirmation: Original downloaded data preserved in 01_NASA_RAW_DATA/original_downloads/")
    print(f"    Total files archived in original_downloads: {len(orig_download_files)}")
    assert len(orig_download_files) >= 428, f"Original downloads incomplete: {len(orig_download_files)}"

    # 9. Required docs check
    required_docs = ["README.md", "PROJECT_STATUS.md", "DATA_INVENTORY.csv", "requirements.txt"]
    for rd in required_docs:
        p = os.path.join(BASE_DIR, rd)
        assert os.path.isfile(p), f"Missing required document: {rd}"
        print(f"    Document verified: {rd} ({os.path.getsize(p):,} bytes)")

    print("=" * 70)
    print("ALL VERIFICATION CHECKS PASSED PERFECTLY (10/10)")
    print("=" * 70)

if __name__ == "__main__":
    main()

