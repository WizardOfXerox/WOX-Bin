@echo off
title WOX-Bin Optimized Launcher

REM Go to script directory
cd /d "%~dp0"

echo =====================================
echo   WOX-Bin Next.js Optimized Startup
echo =====================================

REM -------------------------------
REM Environment optimizations
REM -------------------------------
echo Applying performance optimizations...

REM Limit Node.js RAM usage (2GB cap, adjust if needed)
set NODE_OPTIONS=--max-old-space-size=2048

REM Reduce file watcher stress
set WATCHPACK_POLLING=false
set CHOKIDAR_USEPOLLING=1
set CHOKIDAR_INTERVAL=1000

REM Disable Next.js telemetry
set NEXT_TELEMETRY_DISABLED=1
set NEXT_DISABLE_TURBOPACK=1

REM -------------------------------
REM Ensure .env.local exists
REM -------------------------------
if not exist ".env.local" (
  if exist ".env.example" (
    copy /y ".env.example" ".env.local" >nul
    echo Created .env.local from .env.example
  )
)

REM -------------------------------
REM Check dependencies
REM -------------------------------
set "DOINSTALL=0"
if not exist "node_modules\next" set "DOINSTALL=1"
if not exist "node_modules\react" set "DOINSTALL=1"
if not exist "node_modules\drizzle-orm" set "DOINSTALL=1"

if "%DOINSTALL%"=="1" (
  echo Installing dependencies...
  npm install
  pause
)

REM -------------------------------
REM Validate install
REM -------------------------------
if not exist "node_modules\next" (
  echo.
  echo ERROR: Dependencies failed to install.
  echo Try running: npm install manually
  pause
  exit /b 1
)

REM -------------------------------
REM Start dev server (NO TURBO)
REM -------------------------------
echo.
echo Starting Next.js (optimized mode)...
echo.

start "WOX-Bin Dev Server" cmd /k ^
"cd /d ""%~dp0"" && npm run dev -- --no-turbo"
pause

REM Small delay before opening browser
timeout /t 3 /nobreak >nul
pause

REM Open browser
start "" "http://localhost:3000"
pause

echo.
echo Server running at: http://localhost:3000
echo.
echo Tips:
echo - Keep project in a small folder (e.g. D:\Projects\wox-bin)
echo - Add project folder to Windows Defender exclusions
echo - Close unused apps if RAM is limited
echo.

pause