@echo off
title GloBox - Final Fix
cd /d "%~dp0"

echo Deploying API (root Dockerfile fixed)...
call railway up

echo.
echo If deploy succeeds, run:
echo   railway domain
echo to create public URL
echo ============================================
pause
