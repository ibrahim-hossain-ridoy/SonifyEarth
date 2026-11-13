@echo off
setlocal
title SonifyEarth - Local Scientific Web Server
echo ======================================================================
echo SonifyEarth - Observation-Aware Lightning Jukebox
echo NASA Space Apps Challenge 2026
echo ======================================================================
echo.

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Found Python in PATH. Starting server on http://127.0.0.1:8080/ ...
    python 08_WEBSITE\backend\server.py --port 8080
    goto done
)

where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Found Python Launcher (py). Starting server on http://127.0.0.1:8080/ ...
    py 08_WEBSITE\backend\server.py --port 8080
    goto done
)

echo [ERROR] Python 3 was not detected in your Windows PATH.
echo.
echo Please install Python 3.8+ from https://www.python.org/downloads/
echo Important: During installation, check "Add python.exe to PATH".
echo.
pause

:done
endlocal

