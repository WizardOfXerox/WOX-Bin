@echo off
cd /d "%~dp0"
echo Starting WOX-Bin legacy app (local only, no account)...
start "WOX-Bin Legacy" cmd /k "cd /d ""%~dp0"" && npx -y serve . -p 3000"
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"
echo Browser opened. This is the legacy local-only app.
