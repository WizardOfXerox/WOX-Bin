@echo off
REM Stops Next dev (or anything) listening on port 3000. Run from project root.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\kill-dev-server.ps1" %*
pause
