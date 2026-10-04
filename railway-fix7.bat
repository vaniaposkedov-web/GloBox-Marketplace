@echo off
title GloBox - Final Deploy
cd /d "%~dp0"

echo Deploying with non-blocking seed...
call railway up

echo.
echo Generating public domain...
call railway domain

echo.
echo ============================================
echo Copy the URL above and we'll update Vercel
echo ============================================
pause
