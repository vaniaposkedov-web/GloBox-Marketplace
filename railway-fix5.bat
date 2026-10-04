@echo off
title GloBox - Railway Deploy (no migration)
cd /d "%~dp0"

echo Deploying API (no DB migration at startup)...
call railway up

echo.
echo After successful deploy, run:
echo   railway domain
echo to create a public URL
echo ============================================
pause
