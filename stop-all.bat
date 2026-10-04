@echo off
echo Stopping all GloBox services...
taskkill /FI "WINDOWTITLE eq GloBox-API*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq GloBox-Web*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq GloBox-Seller*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq GloBox-Admin*" /T /F >nul 2>&1
echo Done.
timeout /t 2
