@echo off
title GloBox - Railway Redeploy with retry
cd /d "%~dp0"

echo Deploying with retry start script...
call railway up

echo.
echo After deploy, run: railway domain
echo ============================================
pause
