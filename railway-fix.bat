@echo off
title GloBox - Railway Fix and Redeploy
cd /d "%~dp0"

echo ============================================
echo   Railway - Fix missing vars + Redeploy
echo ============================================
echo.

echo [1/2] Setting JWT_SECRET...
call railway variables set JWT_SECRET=globox_prod_jwt_secret_2024_xK9mP2
echo.

echo [2/2] Re-deploying with fixed Dockerfile...
call railway up
echo.

echo ============================================
echo   Done! Wait for deploy to finish, then
echo   run: railway domain
echo   to get your public URL
echo ============================================
pause
