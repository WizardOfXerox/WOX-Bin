@echo off
cd /d "%~dp0server"
set "DOINSTALL=0"
if not exist "node_modules\express" set "DOINSTALL=1"
if not exist "node_modules\sql.js" set "DOINSTALL=1"
if not exist "node_modules\es-object-atoms" set "DOINSTALL=1"
if "%DOINSTALL%"=="1" (
  echo Installing legacy server dependencies...
  if exist "node_modules" (
    echo Removing old node_modules for clean install...
    rmdir /s /q node_modules 2>nul
  )
  if exist "package-lock.json" del package-lock.json
  npm install
)
if not exist "node_modules\express" (
  echo Install failed. Try in legacy\server: rmdir /s /q node_modules ^& del package-lock.json ^& npm install
  pause
  exit /b 1
)
echo Starting WOX-Bin legacy server app (accounts + online)...
start "WOX-Bin Legacy Server" "%~dp0server\start.bat"
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"
echo Browser opened. This is the legacy hosted app. Keep the server window open.
