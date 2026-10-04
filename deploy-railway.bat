@echo off
title GloBox - Deploy API to Railway
cd /d "%~dp0"

echo ============================================
echo   GloBox - Deploy API backend to Railway
echo ============================================
echo.

echo [1/4] Logging into Railway...
call railway login
if errorlevel 1 (
    echo [ERROR] Login failed
    pause
    exit /b 1
)
echo.

echo [2/4] Creating project...
call railway init
echo.

echo [3/4] Adding PostgreSQL...
echo   NOTE: Add Postgres manually in Railway dashboard if this fails
call railway add --plugin postgresql 2>nul
echo.

echo [4/4] Deploying API...
call railway up
echo.

echo ============================================
echo   Deploy complete!
echo   Run 'railway open' to see your dashboard
echo   Copy the deployment URL and update Vercel
echo   env vars: NEXT_PUBLIC_API_URL
echo ============================================
pause
