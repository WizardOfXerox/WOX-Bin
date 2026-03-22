@echo off
cd /d "%~dp0"

set "DOINSTALL=0"
if not exist "node_modules\next" set "DOINSTALL=1"
if not exist "node_modules\react" set "DOINSTALL=1"
if not exist "node_modules\drizzle-orm" set "DOINSTALL=1"

if not exist ".env.local" (
  if exist ".env.example" (
    copy /y ".env.example" ".env.local" >nul
    echo Created .env.local from .env.example
    echo Edit .env.local if your DATABASE_URL or AUTH settings differ.
  )
)

if "%DOINSTALL%"=="1" (
  echo Installing app dependencies...
  npm install
)

if not exist "node_modules\next" (
  echo Install failed. Try: npm install
  pause
  exit /b 1
)

REM Optional: cap Node heap so a bad compile is less likely to exhaust all RAM (remove line if you need more)
if not defined NODE_OPTIONS set NODE_OPTIONS=--max-old-space-size=4096

echo Starting WOX-Bin Next.js app...
echo If this is your first database run, execute: npm run db:push
echo.
echo NOTE: Each time you run this file, a NEW dev server starts ^(more Node processes^).
echo If Task Manager shows many Node entries, close old "WOX-Bin Next" windows or run: kill-dev-server.bat
echo.
start "WOX-Bin Next" cmd /k "cd /d ""%~dp0"" && npm run dev"
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000"
echo Browser opened at http://localhost:3000
echo Use localhost on this computer. For another device, use the Network URL shown in the dev window.
