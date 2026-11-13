# SonifyEarth - Local Scientific Web Server (PowerShell Launcher)
# NASA Space Apps Challenge 2026

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "SonifyEarth - Observation-Aware Lightning Jukebox" -ForegroundColor Cyan
Write-Host "NASA Space Apps Challenge 2026" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

if (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "[INFO] Found Python. Starting server on http://127.0.0.1:8080/ ..." -ForegroundColor Green
    python 08_WEBSITE/backend/server.py --port 8080
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    Write-Host "[INFO] Found Python Launcher (py). Starting server on http://127.0.0.1:8080/ ..." -ForegroundColor Green
    py 08_WEBSITE/backend/server.py --port 8080
} else {
    Write-Host "[ERROR] Python 3 was not detected in your PATH." -ForegroundColor Red
    Write-Host "Please install Python 3.8+ from https://www.python.org/downloads/ and ensure 'Add python.exe to PATH' is checked." -ForegroundColor Yellow
    Write-Host ""
    Read-Host -Prompt "Press Enter to exit"
}

