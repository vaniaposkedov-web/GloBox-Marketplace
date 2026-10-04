@echo off
title GloBox Marketplace
cd /d "%~dp0"

echo ============================================
echo   GloBox Marketplace - Starting services
echo ============================================
echo.

:: Find pnpm
set "PNPM="
where pnpm >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=*" %%p in ('where pnpm') do if "!PNPM!"=="" set "PNPM=%%p"
)
if "%PNPM%"=="" (
    if exist "%APPDATA%\npm\pnpm.cmd" set "PNPM=%APPDATA%\npm\pnpm.cmd"
)
if "%PNPM%"=="" (
    echo [ERROR] pnpm not found. Run setup.bat first.
    pause
    exit /b 1
)

:: Start PostgreSQL
net start postgresql-x64-17 >nul 2>&1
net start postgresql-x64-16 >nul 2>&1
echo [OK] PostgreSQL checked
echo.

echo [1/4] Starting API on port 4000...
start "GloBox-API-4000" cmd /k cd /d "%~dp0" ^&^& "%PNPM%" --filter @marketplace/api start:dev

timeout /t 5 /nobreak >nul

echo [2/4] Starting Buyer Web on port 3000...
start "GloBox-Web-3000" cmd /k cd /d "%~dp0" ^&^& "%PNPM%" --filter @marketplace/web dev

echo [3/4] Starting Seller Portal on port 3001...
start "GloBox-Seller-3001" cmd /k cd /d "%~dp0" ^&^& "%PNPM%" --filter @marketplace/seller dev

echo [4/4] Starting Admin Panel on port 3002...
start "GloBox-Admin-3002" cmd /k cd /d "%~dp0" ^&^& "%PNPM%" --filter @marketplace/admin dev

echo.
echo ============================================
echo   All 4 services starting in new windows
echo ============================================
echo.
echo   API Swagger:    http://localhost:4000/docs
echo   Buyer Web:      http://localhost:3000
echo   Seller Portal:  http://localhost:3001
echo   Admin Panel:    http://localhost:3002
echo.
echo.
echo   Run stop-all.bat to stop everything.
echo ============================================
pause
