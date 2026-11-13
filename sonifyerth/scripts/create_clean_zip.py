#!/usr/bin/env python3
"""
Create a clean, Windows-compatible ZIP of the SonifyEarth project.
Strictly excludes macOS metadata (__MACOSX, .DS_Store, ._*), caches,
virtual environments, and node_modules while preserving all NASA data,
processed payloads, website, sound engine, reports, and documentation.
"""

import os
import sys
import zipfile
import hashlib

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUTPUT_ZIP_PATH = os.path.join(WORKSPACE_ROOT, "SonifyEarth.zip")

EXCLUDED_DIR_NAMES = {
    ".venv",
    "node_modules",
    ".playwright",
    "__pycache__",
    "__MACOSX",
    ".git",
}

EXCLUDED_EXACT_FILES = {
    ".DS_Store",
}

def is_excluded(rel_path: str, is_dir: bool = False) -> bool:
    # Normalize path separators
    norm = rel_path.replace("\\", "/")
    parts = norm.split("/")
    
    # Check directory components
    for p in parts:
        if p in EXCLUDED_DIR_NAMES:
            return True
        if p.startswith("._"):
            return True
        if p == "__MACOSX":
            return True
            
    if is_dir:
        return False
        
    filename = parts[-1]
    if filename in EXCLUDED_EXACT_FILES:
        return True
    if filename.startswith("._"):
        return True
    if filename.endswith(".pyc") or filename.endswith(".pyo"):
        return True
    if filename.endswith(".zip"):
        return True
        
    return False

def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def main():
    print("=" * 70)
    print("CREATING CLEAN WINDOWS-COMPATIBLE ZIP FOR SONIFYEARTH")
    print(f"Workspace Root: {WORKSPACE_ROOT}")
    print(f"Target ZIP:     {OUTPUT_ZIP_PATH}")
    print("=" * 70)

    # Remove existing zip if any
    if os.path.exists(OUTPUT_ZIP_PATH):
        os.remove(OUTPUT_ZIP_PATH)

    files_to_pack = []
    total_uncompressed_bytes = 0

    for root, dirs, files in os.walk(WORKSPACE_ROOT):
        # Filter directories in-place to avoid descending into excluded trees
        dirs[:] = [
            d for d in dirs 
            if not is_excluded(os.path.relpath(os.path.join(root, d), WORKSPACE_ROOT), is_dir=True)
        ]
        
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, WORKSPACE_ROOT)
            
            if is_excluded(rel_path, is_dir=False):
                continue
                
            files_to_pack.append((full_path, rel_path))
            total_uncompressed_bytes += os.path.getsize(full_path)

    files_to_pack.sort(key=lambda x: x[1])
    print(f"Total files identified to pack: {len(files_to_pack):,}")
    print(f"Total uncompressed size:       {total_uncompressed_bytes / (1024*1024):.2f} MB ({total_uncompressed_bytes / (1024*1024*1024):.2f} GB)")
    print("-" * 70)

    # Build ZIP archive
    packed_count = 0
    with zipfile.ZipFile(OUTPUT_ZIP_PATH, mode="w", compression=zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=True) as zf:
        for full_path, rel_path in files_to_pack:
            # Normalize archive entry path to standard forward slashes
            arcname = rel_path.replace("\\", "/")
            
            # Read stat for timestamps and clean permissions
            st = os.stat(full_path)
            zinfo = zipfile.ZipInfo(arcname, date_time=(2026, 11, 12, 12, 0, 0))
            zinfo.compress_type = zipfile.ZIP_DEFLATED
            
            # Clean permissions: 0o644 for regular files, 0o755 for scripts/executables
            if rel_path.endswith((".py", ".sh", ".bat", ".ps1", ".mjs", ".js")):
                zinfo.external_attr = (0o755 << 16) | 0o100000 # regular file with executable bits
            else:
                zinfo.external_attr = (0o644 << 16) | 0o100000 # regular file
                
            with open(full_path, "rb") as src_f:
                content = src_f.read()
                zf.writestr(zinfo, content)
                
            packed_count += 1
            if packed_count % 200 == 0 or packed_count == len(files_to_pack):
                print(f"  [Archived {packed_count:4d}/{len(files_to_pack):4d}] -> {arcname}")

    zip_size = os.path.getsize(OUTPUT_ZIP_PATH)
    print("-" * 70)
    print("ZIP CREATION COMPLETE!")
    print(f"Archive file:   {OUTPUT_ZIP_PATH}")
    print(f"Archive size:   {zip_size / (1024*1024):.2f} MB ({zip_size / (1024*1024*1024):.2f} GB)")
    print("=" * 70)

    # Verification phase
    print("RUNNING POST-CREATION VERIFICATION")
    print("=" * 70)
    
    with zipfile.ZipFile(OUTPUT_ZIP_PATH, "r") as zf:
        # 1. Test zip integrity
        bad_file = zf.testzip()
        if bad_file:
            print(f"[FAIL] Corrupt file found in zip: {bad_file}")
            sys.exit(1)
        else:
            print("[PASS] testzip() CRC-32 integrity check passed for all entries.")

        namelist = zf.namelist()
        print(f"[PASS] Total entries in ZIP: {len(namelist):,}")

        # 2. Check exclusions
        forbidden_found = []
        for name in namelist:
            parts = name.split("/")
            if "__MACOSX" in parts or any(p.startswith("._") for p in parts) or any(p == ".DS_Store" for p in parts):
                forbidden_found.append(name)
            if any(p in EXCLUDED_DIR_NAMES for p in parts):
                forbidden_found.append(name)
            if name.endswith(".pyc") or name.endswith(".pyo"):
                forbidden_found.append(name)

        if forbidden_found:
            print(f"[FAIL] Found {len(forbidden_found)} forbidden entries in zip!")
            for f in forbidden_found[:10]:
                print(f"  Forbidden: {f}")
            sys.exit(1)
        else:
            print("[PASS] Zero forbidden macOS metadata, cache, or venv entries found.")

        # 3. Verify 08_WEBSITE/frontend/index.html
        target_html = "08_WEBSITE/frontend/index.html"
        if target_html not in namelist:
            print(f"[FAIL] Required file missing from zip: {target_html}")
            sys.exit(1)
            
        zip_html_bytes = zf.read(target_html)
        disk_html_path = os.path.join(WORKSPACE_ROOT, "08_WEBSITE", "frontend", "index.html")
        with open(disk_html_path, "rb") as f:
            disk_html_bytes = f.read()

        if hashlib.sha256(zip_html_bytes).hexdigest() != hashlib.sha256(disk_html_bytes).hexdigest():
            print("[FAIL] Checksum mismatch for 08_WEBSITE/frontend/index.html!")
            sys.exit(1)
        else:
            print(f"[PASS] Verified '{target_html}' in ZIP matches disk ({len(zip_html_bytes):,} bytes).")

        # 4. Verify NASA raw data presence
        nasa_science_nc = [n for n in namelist if n.startswith("01_NASA_RAW_DATA/science_v2/") and n.endswith(".nc")]
        nasa_science_hdf = [n for n in namelist if n.startswith("01_NASA_RAW_DATA/science_v2/") and n.endswith(".hdf")]
        nasa_bg_nc = [n for n in namelist if n.startswith("01_NASA_RAW_DATA/backgrounds_v2/") and n.endswith(".nc")]
        nasa_bg_hdf = [n for n in namelist if n.startswith("01_NASA_RAW_DATA/backgrounds_v2/") and n.endswith(".hdf")]
        nasa_orig = [n for n in namelist if n.startswith("01_NASA_RAW_DATA/original_downloads/")]
        
        print(f"[PASS] Science V2 .nc files in zip:       {len(nasa_science_nc)} (expected 106)")
        print(f"[PASS] Science V2 .hdf files in zip:      {len(nasa_science_hdf)} (expected 106)")
        print(f"[PASS] Backgrounds V2 .nc files in zip:   {len(nasa_bg_nc)} (expected 106)")
        print(f"[PASS] Backgrounds V2 .hdf files in zip:  {len(nasa_bg_hdf)} (expected 106)")
        print(f"[PASS] Original downloads files in zip:   {len(nasa_orig)} (expected >= 428)")
        assert len(nasa_science_nc) == 106
        assert len(nasa_science_hdf) == 106
        assert len(nasa_bg_nc) == 106
        assert len(nasa_bg_hdf) == 106
        assert len(nasa_orig) >= 428

        # 5. Verify processed JSON & GeoJSON
        prod_json = [n for n in namelist if n.startswith("06_PROCESSED_DATA/json/")]
        prod_geojson = [n for n in namelist if n.startswith("06_PROCESSED_DATA/geojson/")]
        print(f"[PASS] Processed JSON files in zip:       {len(prod_json)} (expected 7)")
        print(f"[PASS] Processed GeoJSON files in zip:    {len(prod_geojson)} (expected 3)")
        assert len(prod_json) >= 7
        assert len(prod_geojson) >= 3

        # 6. Verify README, Windows launch scripts, and Final Verification Report
        for req in [
            "README.md",
            "README_WINDOWS.md",
            "start_server_windows.bat",
            "start_server_windows.ps1",
            "08_WEBSITE/backend/server.py",
            "07_PROJECT_REPORTS/validation/FINAL_CROSS_PLATFORM_VERIFICATION.md",
        ]:
            assert req in namelist, f"Missing required file: {req}"
            print(f"[PASS] Verified presence of {req}")

    print("=" * 70)
    print("ALL VERIFICATIONS COMPLETED SUCCESSFULLY (100% PASS)!")
    print("=" * 70)

if __name__ == "__main__":
    main()

