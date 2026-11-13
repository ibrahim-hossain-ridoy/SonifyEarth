#!/usr/bin/env python3
"""
SonifyEarth Read-Only Local Web & Media Server (08_WEBSITE/backend/server.py)

Serves:
- 08_WEBSITE/frontend/ at root '/' (index.html, css/, js/)
- /06_PROCESSED_DATA/json/ and /06_PROCESSED_DATA/geojson/ directly from workspace
- /05_SCIENTIFIC_VALIDATION/REAL_STATE_EXAMPLES.json
- /09_SOUND_ENGINE/ ES modules
- /08_WEBSITE/public/ static assets
- /iss_lightning_sphere_07312023.mp4 & /Screenshot 2026-11-09 at 08.26.06.png with HTTP 206 Range support

Strictly read-only: never modifies any NASA source or Task 4 processed files.
Compatible with Python 3.8+ on Windows 10/11 and macOS.
"""

import argparse
import errno
import io
import json
import mimetypes
import os
import re
import socket
import sys
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn
from urllib.parse import unquote

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FRONTEND_DIR = os.path.join(WORKSPACE_ROOT, "08_WEBSITE", "frontend")

# Register explicit MIME types so Windows Registry differences never misclassify web/scientific assets
EXPLICIT_MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".geojson": "application/geo+json; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".csv": "text/csv; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".mp4": "video/mp4",
    ".pdf": "application/pdf",
}

for ext, mime in EXPLICIT_MIME_TYPES.items():
    mimetypes.add_type(mime.split(";")[0], ext)


def _is_within_directory(candidate: str, base_dir: str) -> bool:
    """Cross-platform path containment check safe on Windows and macOS."""
    try:
        cand_norm = os.path.normcase(os.path.abspath(candidate))
        base_norm = os.path.normcase(os.path.abspath(base_dir))
        return os.path.commonpath([cand_norm, base_norm]) == base_norm
    except ValueError:
        return False


class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


class SonifyEarthRequestHandler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def guess_type(self, path: str) -> str:
        _, ext = os.path.splitext(path)
        ext_lower = ext.lower()
        if ext_lower in EXPLICIT_MIME_TYPES:
            return EXPLICIT_MIME_TYPES[ext_lower]
        return super().guess_type(path)

    def translate_path(self, path: str) -> str:
        clean_path = unquote(path.split("?", 1)[0].split("#", 1)[0])
        rel = clean_path.lstrip("/\\")
        rel_parts = [p for p in rel.replace("\\", "/").split("/") if p]

        if not rel_parts or rel == "index.html":
            return os.path.join(FRONTEND_DIR, "index.html")

        if rel in ("favicon.ico", "favicon.svg") or rel.endswith("favicon.svg"):
            return os.path.join(WORKSPACE_ROOT, "08_WEBSITE", "public", "favicon.svg")

        # Check frontend directory first for /css/*, /js/*, etc.
        frontend_candidate = os.path.normpath(os.path.join(FRONTEND_DIR, *rel_parts))
        if _is_within_directory(frontend_candidate, FRONTEND_DIR) and os.path.exists(frontend_candidate):
            return frontend_candidate

        # Otherwise resolve safely within WORKSPACE_ROOT
        workspace_candidate = os.path.normpath(os.path.join(WORKSPACE_ROOT, *rel_parts))
        if _is_within_directory(workspace_candidate, WORKSPACE_ROOT) and os.path.exists(workspace_candidate):
            return workspace_candidate

        return frontend_candidate

    def _serve_request(self, send_body: bool = True):
        clean_path = unquote(self.path.split("?", 1)[0])
        if clean_path == "/api/health":
            payload = json.dumps(
                {
                    "status": "ok",
                    "project": "SonifyEarth — Silence Isn't Zero",
                    "workspace_root_served": True,
                    "listening_modes": ["EVENT-ONLY", "OBSERVATION-AWARE"],
                }
            ).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            if send_body:
                self.wfile.write(payload)
            return

        file_path = self.translate_path(self.path)
        if os.path.isdir(file_path):
            index_candidate = os.path.join(file_path, "index.html")
            if os.path.isfile(index_candidate):
                file_path = index_candidate
            else:
                self.send_error(404, "Directory listing not enabled")
                return

        if not os.path.isfile(file_path):
            self.send_error(404, f"File not found: {clean_path}")
            return

        file_size = os.path.getsize(file_path)
        ctype = self.guess_type(file_path)
        range_header = self.headers.get("Range")

        if range_header:
            m = re.match(r"bytes=(\d*)-(\d*)", range_header)
            if m:
                start_str, end_str = m.groups()
                if start_str == "" and end_str != "":
                    # Suffix byte range: bytes=-N
                    suffix_len = int(end_str)
                    start = max(0, file_size - suffix_len)
                    end = file_size - 1
                else:
                    start = int(start_str) if start_str else 0
                    end = int(end_str) if end_str else file_size - 1
                end = min(end, file_size - 1)
                if start >= file_size or start > end or file_size == 0:
                    self.send_response(416)
                    self.send_header("Content-Range", f"bytes */{file_size}")
                    self.end_headers()
                    return

                length = end - start + 1
                self.send_response(206)
                self.send_header("Content-Type", ctype)
                self.send_header("Accept-Ranges", "bytes")
                self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
                self.send_header("Content-Length", str(length))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()

                if send_body:
                    with open(file_path, "rb") as f:
                        f.seek(start)
                        remaining = length
                        while remaining > 0:
                            chunk = f.read(min(65536, remaining))
                            if not chunk:
                                break
                            try:
                                self.wfile.write(chunk)
                            except (BrokenPipeError, ConnectionResetError):
                                break
                            remaining -= len(chunk)
                return

        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(file_size))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "public, max-age=30")
        self.end_headers()

        if send_body:
            with open(file_path, "rb") as f:
                while True:
                    chunk = f.read(65536)
                    if not chunk:
                        break
                    try:
                        self.wfile.write(chunk)
                    except (BrokenPipeError, ConnectionResetError):
                        break

    def do_GET(self):
        self._serve_request(send_body=True)

    def do_HEAD(self):
        self._serve_request(send_body=False)

    def log_message(self, format_str, *args):
        sys.stderr.write(f"[SonifyEarth-Server] {self.address_string()} - {format_str % args}\n")


def run_self_test() -> int:
    """
    Executes an automated self-test of SonifyEarthRequestHandler across all critical endpoints:
    1. GET /api/health -> HTTP 200 JSON health check
    2. GET / -> HTTP 200 08_WEBSITE/frontend/index.html
    3. GET /css/styles.css & /js/app.js -> HTTP 200 with explicit MIME types
    4. GET /06_PROCESSED_DATA/json/source_manifest.json -> HTTP 200 valid JSON
    5. GET /06_PROCESSED_DATA/geojson/lightning_events.geojson -> HTTP 200 application/geo+json
    6. GET /iss_lightning_sphere_07312023.mp4 with Range: bytes=0-1023 -> HTTP 206 Partial Content
    """
    print("=" * 70)
    print("SONIFYEARTH SERVER & HEALTH ENDPOINT SELF-TEST")
    print("=" * 70)

    class DummyServer:
        server_name = "127.0.0.1"
        server_port = 8080

    def dispatch_raw_http(raw_req: bytes) -> bytes:
        s_client, s_server = socket.socketpair()
        try:
            def _handle():
                try:
                    SonifyEarthRequestHandler(s_server, ("127.0.0.1", 55000), DummyServer())
                finally:
                    try:
                        s_server.close()
                    except OSError:
                        pass

            t = threading.Thread(target=_handle, daemon=True)
            t.start()
            s_client.sendall(raw_req)
            s_client.shutdown(socket.SHUT_WR)
            chunks = []
            while True:
                data = s_client.recv(65536)
                if not data:
                    break
                chunks.append(data)
            t.join(timeout=5.0)
            return b"".join(chunks)
        finally:
            try:
                s_client.close()
            except OSError:
                pass

    # 1. /api/health
    resp = dispatch_raw_http(b"GET /api/health HTTP/1.1\r\nHost: 127.0.0.1:8080\r\nConnection: close\r\n\r\n")
    header_bytes, body_bytes = resp.split(b"\r\n\r\n", 1)
    header_text = header_bytes.decode("iso-8859-1")
    assert "HTTP/1.1 200 OK" in header_text, f"Expected 200 OK on /api/health, got: {header_text}"
    health_json = json.loads(body_bytes.decode("utf-8"))
    assert health_json["status"] == "ok"
    assert health_json["listening_modes"] == ["EVENT-ONLY", "OBSERVATION-AWARE"]
    print(f"[PASS] GET /api/health -> HTTP 200 OK: {body_bytes.decode('utf-8')}")

    # 2. / (index.html)
    resp_idx = dispatch_raw_http(b"GET / HTTP/1.1\r\nHost: 127.0.0.1:8080\r\nConnection: close\r\n\r\n")
    h_idx, b_idx = resp_idx.split(b"\r\n\r\n", 1)
    assert "HTTP/1.1 200 OK" in h_idx.decode("iso-8859-1")
    assert b"<!DOCTYPE html>" in b_idx and b"Silence Isn't Zero" in b_idx
    print(f"[PASS] GET / -> HTTP 200 OK (index.html, {len(b_idx):,} bytes)")

    # 3. /06_PROCESSED_DATA/json/source_manifest.json
    resp_man = dispatch_raw_http(
        b"GET /06_PROCESSED_DATA/json/source_manifest.json HTTP/1.1\r\nHost: 127.0.0.1:8080\r\nConnection: close\r\n\r\n"
    )
    h_man, b_man = resp_man.split(b"\r\n\r\n", 1)
    assert "HTTP/1.1 200 OK" in h_man.decode("iso-8859-1")
    man_obj = json.loads(b_man.decode("utf-8"))
    assert len(man_obj["granule_pairs"]) == 106
    print("[PASS] GET /06_PROCESSED_DATA/json/source_manifest.json -> HTTP 200 OK (106 granule pairs)")

    # 4. Byte-range request on /iss_lightning_sphere_07312023.mp4
    resp_mp4 = dispatch_raw_http(
        b"GET /iss_lightning_sphere_07312023.mp4 HTTP/1.1\r\nHost: 127.0.0.1:8080\r\nRange: bytes=0-1023\r\nConnection: close\r\n\r\n"
    )
    h_mp4, b_mp4 = resp_mp4.split(b"\r\n\r\n", 1)
    h_mp4_txt = h_mp4.decode("iso-8859-1")
    assert "HTTP/1.1 206 Partial Content" in h_mp4_txt
    assert "Content-Range: bytes 0-1023/" in h_mp4_txt
    assert len(b_mp4) == 1024
    print("[PASS] GET /iss_lightning_sphere_07312023.mp4 (Range: bytes=0-1023) -> HTTP 206 Partial Content (1,024 bytes)")

    # 5. HEAD request support (/api/health & video)
    resp_head = dispatch_raw_http(
        b"HEAD /iss_lightning_sphere_07312023.mp4 HTTP/1.1\r\nHost: 127.0.0.1:8080\r\nConnection: close\r\n\r\n"
    )
    h_head, b_head = resp_head.split(b"\r\n\r\n", 1)
    assert "HTTP/1.1 200 OK" in h_head.decode("iso-8859-1")
    assert "Accept-Ranges: bytes" in h_head.decode("iso-8859-1")
    assert len(b_head) == 0
    print("[PASS] HEAD /iss_lightning_sphere_07312023.mp4 -> HTTP 200 OK (Accept-Ranges: bytes, 0 body bytes)")

    # 6. Verify all static & scientific endpoints return 200 OK with expected MIME types
    endpoint_checks = [
        ("/css/styles.css", "text/css"),
        ("/js/app.js", "application/javascript"),
        ("/js/data_adapter.js", "application/javascript"),
        ("/js/map_view.js", "application/javascript"),
        ("/js/timeline_view.js", "application/javascript"),
        ("/js/inspector_view.js", "application/javascript"),
        ("/09_SOUND_ENGINE/playback/sound_engine.js", "application/javascript"),
        ("/09_SOUND_ENGINE/audio_mapping/sound_cue_spec.js", "application/javascript"),
        ("/05_SCIENTIFIC_VALIDATION/REAL_STATE_EXAMPLES.json", "application/json"),
        ("/06_PROCESSED_DATA/json/flash_events.json", "application/json"),
        ("/06_PROCESSED_DATA/json/observation_windows.json", "application/json"),
        ("/06_PROCESSED_DATA/json/three_state_data.json", "application/json"),
        ("/06_PROCESSED_DATA/json/sonifyearth_windows.json", "application/json"),
        ("/06_PROCESSED_DATA/json/excluded_records_audit.json", "application/json"),
        ("/06_PROCESSED_DATA/json/schema.json", "application/json"),
        ("/06_PROCESSED_DATA/geojson/lightning_events.geojson", "application/geo+json"),
        ("/06_PROCESSED_DATA/geojson/observation_grid.geojson", "application/geo+json"),
        ("/06_PROCESSED_DATA/geojson/unknown_coverage.geojson", "application/geo+json"),
        ("/favicon.svg", "image/svg+xml"),
    ]
    for ep_path, expected_mime in endpoint_checks:
        raw_r = dispatch_raw_http(
            f"HEAD {ep_path} HTTP/1.1\r\nHost: 127.0.0.1:8080\r\nConnection: close\r\n\r\n".encode("ascii")
        )
        hdr = raw_r.split(b"\r\n\r\n", 1)[0].decode("iso-8859-1")
        assert "HTTP/1.1 200 OK" in hdr, f"Endpoint {ep_path} failed: {hdr}"
        assert expected_mime in hdr, f"Endpoint {ep_path} wrong MIME: {hdr}"
    print(f"[PASS] Verified all {len(endpoint_checks)} frontend, sound engine, JSON, and GeoJSON endpoints & MIME headers.")

    print("=" * 70)
    print("ALL SERVER SELF-TEST CHECKS PASSED (6 / 6)")
    print("=" * 70)
    return 0


def main():
    parser = argparse.ArgumentParser(description="SonifyEarth Read-Only Web Server")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8080, help="Bind port (default: 8080)")
    parser.add_argument(
        "--self-test",
        action="store_true",
        help="Run built-in endpoint and HTTP 206 byte-range verification and exit",
    )
    args = parser.parse_args()

    if args.self_test:
        sys.exit(run_self_test())

    try:
        server = ThreadingHTTPServer((args.host, args.port), SonifyEarthRequestHandler)
    except OSError as exc:
        if exc.errno in (errno.EADDRINUSE, 10048):
            sys.stderr.write(
                f"[SonifyEarth-Server] ERROR: Port {args.port} is already in use on {args.host}.\n"
                f"Try specifying another port: python 08_WEBSITE/backend/server.py --port {args.port + 1}\n"
            )
            sys.exit(1)
        raise

    print(f"SonifyEarth server listening at http://{args.host}:{args.port}/", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
