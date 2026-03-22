@echo off
cd /d "%~dp0"
echo.
echo This installs PostgreSQL 16 via winget (may require Administrator approval).
echo After install: set the postgres user password to match .env.local (default example: postgres)
echo   OR edit DATABASE_URL in .env.local.
echo Then create database woxbin if needed, and run: npm run db:push
echo.
pause
winget install PostgreSQL.PostgreSQL.16 --accept-package-agreements --accept-source-agreements
echo.
echo Done. See docs\LOCAL-DATABASE.md for next steps.
pause
