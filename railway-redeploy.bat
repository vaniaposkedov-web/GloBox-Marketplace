@echo off
title Railway Redeploy with IPv6
cd /d "%~dp0"

echo Make sure you're linked to miraculous-grace API service:
call railway service
echo.
pause

echo Re-deploying API to apply IPv6 + new target port...
call railway up
echo ============================================
pause
