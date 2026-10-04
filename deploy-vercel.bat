@echo off
title GloBox - Deploy to Vercel
cd /d "%~dp0"

echo ============================================
echo   GloBox - Deploy all frontends to Vercel
echo ============================================
echo.

echo [1/3] Deploying Web (buyer)...
cd /d "%~dp0apps\web"
call npx vercel --yes --prod
echo.

echo [2/3] Deploying Seller portal...
cd /d "%~dp0apps\seller"
call npx vercel --yes --prod
echo.

echo [3/3] Deploying Admin panel...
cd /d "%~dp0apps\admin"
call npx vercel --yes --prod
echo.

echo ============================================
echo   Deploy complete!
echo ============================================
echo.
pause
