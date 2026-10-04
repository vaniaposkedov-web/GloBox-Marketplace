@echo off
title GloBox - Railway Fix DB (Public URL)
cd /d "%~dp0"

echo Setting PUBLIC DATABASE_URL...
call railway variables set "DATABASE_URL=postgresql://postgres:%RAILWAY_DB_PASSWORD%@tramway.proxy.rlwy.net:15996/railway"

echo.
echo Re-deploying...
call railway up

echo.
echo Creating public domain...
call railway domain

echo.
echo ============================================
echo   Done! Copy the domain URL above.
echo ============================================
pause
