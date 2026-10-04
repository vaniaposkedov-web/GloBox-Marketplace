@echo off
title GloBox - Railway Fix DB Connection
cd /d "%~dp0"

echo ============================================
echo   Railway - Fix DATABASE_URL
echo ============================================
echo.
echo Go to: https://railway.com/project/d238449d-2d89-4de2-bd86-8e0ad7e0eeb7
echo.
echo 1. Click on PostgreSQL service
echo 2. Go to "Data" or "Connect" tab  
echo 3. Copy the PUBLIC connection string (starts with postgresql://...)
echo.

set /p DB_URL="Paste DATABASE_URL here: "

echo.
echo Setting DATABASE_URL...
call railway variables set "DATABASE_URL=%DB_URL%"
echo.

echo Re-deploying...
call railway up
echo.

echo After deploy finishes, run:
echo   railway domain
echo to get public API URL
echo ============================================
pause
