@echo off
title GloBox - Final Deploy
cd /d "%~dp0"

echo Switching DATABASE_URL to internal Postgres reference...
call railway variables set "DATABASE_URL=${{Postgres.DATABASE_URL}}"
echo.

echo Deploying...
call railway up
echo.

echo Generating public domain...
call railway domain
echo.

echo ============================================
echo Done. Copy URL above.
echo ============================================
pause
