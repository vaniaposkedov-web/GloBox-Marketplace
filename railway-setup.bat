@echo off
title GloBox - Railway Setup
cd /d "%~dp0"

echo ============================================
echo   Railway - Add Postgres and env vars
echo ============================================
echo.

echo [1/3] Adding PostgreSQL to project...
call railway add -d postgres
echo.

echo [2/3] Setting environment variables...
call railway variables set NODE_ENV=production
call railway variables set API_PORT=4000
call railway variables set API_HOST=0.0.0.0
call railway variables set WEB_ORIGIN=https://web-kappa-taupe-63.vercel.app,https://seller-blush-ten.vercel.app,https://admin-iota-eosin-32.vercel.app
call railway variables set JWT_SECRET=globox_prod_jwt_secret_2024_xK9mP2
call railway variables set JWT_ACCESS_TTL=30d
call railway variables set DEV_EXPOSE_CODES=true
call railway variables set SMS_PROVIDER=stub
call railway variables set VK_CLIENT_ID=54575428
call railway variables set VK_CLIENT_SECRET=%VK_CLIENT_SECRET%
echo.

echo [3/3] Re-deploying...
call railway up
echo.

echo ============================================
echo   Done! Open Railway dashboard:
echo   railway open
echo ============================================
pause
