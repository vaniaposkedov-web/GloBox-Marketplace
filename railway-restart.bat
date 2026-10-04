@echo off
title GloBox - Restart Deploy
cd /d "%~dp0"

echo Deploying with pre-installed pnpm...
call railway up

echo.
call railway domain
echo ============================================
pause
