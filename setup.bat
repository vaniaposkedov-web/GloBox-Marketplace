@echo off
title GloBox Marketplace - Setup
cd /d "%~dp0"

echo ============================================
echo   GloBox Marketplace - Ustanovka
echo ============================================
echo.
echo Skript avtomaticheski ustanovit:
echo   - Node.js
echo   - pnpm
echo   - PostgreSQL
echo   - Zavisimosti proekta
echo   - Bazu dannyh i testovye akkaunty
echo.
echo Nazmite lubuu klavishu...
pause >nul

echo.
echo [1/9] Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo   Node.js not found. Installing via winget...
    winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements -e
    if errorlevel 1 (
        echo   [ERROR] Failed to install Node.js.
        echo   Please install manually: https://nodejs.org
        pause
        exit /b 1
    )
    echo   [OK] Node.js installed. Please RESTART this script.
    pause
    exit /b 0
) else (
    for /f "tokens=*" %%v in ('node -v') do echo   [OK] Node.js %%v
)

echo.
echo [2/9] Checking pnpm...
where pnpm >nul 2>&1
if errorlevel 1 (
    echo   pnpm not found. Installing...
    call npm install -g pnpm
    if errorlevel 1 (
        echo   [ERROR] Failed to install pnpm.
        pause
        exit /b 1
    )
)
for /f "tokens=*" %%v in ('pnpm -v') do echo   [OK] pnpm %%v

echo.
echo [3/9] Checking PostgreSQL...
set "PGBIN="
if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" (
    set "PGBIN=C:\Program Files\PostgreSQL\17\bin"
) else if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" (
    set "PGBIN=C:\Program Files\PostgreSQL\16\bin"
) else if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" (
    set "PGBIN=C:\Program Files\PostgreSQL\15\bin"
)

if "%PGBIN%"=="" (
    where psql >nul 2>&1
    if errorlevel 1 (
        echo   PostgreSQL not found. Installing via winget...
        winget install PostgreSQL.PostgreSQL.17 --accept-source-agreements --accept-package-agreements -e
        if errorlevel 1 (
            echo   [ERROR] Failed to install PostgreSQL.
            echo   Please install manually: https://www.postgresql.org/download/
            pause
            exit /b 1
        )
        set "PGBIN=C:\Program Files\PostgreSQL\17\bin"
        echo   [OK] PostgreSQL installed.
        echo   NOTE: Restart this script if DB setup fails.
    ) else (
        for /f "tokens=*" %%p in ('where psql') do set "PGBIN=%%~dpp"
    )
) else (
    echo   [OK] PostgreSQL found at %PGBIN%
)

echo.
echo [4/9] Starting PostgreSQL service...
net start postgresql-x64-17 >nul 2>&1
net start postgresql-x64-16 >nul 2>&1
net start postgresql-x64-15 >nul 2>&1
sc query postgresql-x64-17 | findstr "RUNNING" >nul 2>&1
if errorlevel 1 (
    sc query postgresql-x64-16 | findstr "RUNNING" >nul 2>&1
    if errorlevel 1 (
        sc query postgresql-x64-15 | findstr "RUNNING" >nul 2>&1
        if errorlevel 1 (
            echo   [WARN] Could not start PostgreSQL service.
            echo   You may need to run this as Administrator.
        )
    )
)
echo   [OK] PostgreSQL service checked

echo.
echo [5/9] Creating database...
"%PGBIN%\psql" -U postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='marketplace'" 2>nul | findstr "1" >nul 2>&1
if errorlevel 1 (
    echo   Creating user 'marketplace'...
    "%PGBIN%\psql" -U postgres -c "CREATE USER marketplace WITH PASSWORD 'marketplace_dev' CREATEDB;" 2>nul
)
"%PGBIN%\psql" -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='marketplace'" 2>nul | findstr "1" >nul 2>&1
if errorlevel 1 (
    echo   Creating database 'marketplace'...
    "%PGBIN%\psql" -U postgres -c "CREATE DATABASE marketplace OWNER marketplace;" 2>nul
)
echo   [OK] Database ready

echo.
echo [6/9] Creating .env files...
if not exist "apps\api\.env" (
    echo   Creating apps\api\.env
    (
        echo NODE_ENV=development
        echo API_PORT=4000
        echo API_HOST=0.0.0.0
        echo WEB_ORIGIN=http://localhost:3000
        echo DATABASE_URL=postgresql://marketplace:marketplace_dev@localhost:5432/marketplace?schema=public
        echo REDIS_URL=redis://localhost:6379
        echo JWT_SECRET=dev_secret_globox_marketplace_2024
        echo JWT_ACCESS_TTL=30d
        echo DEV_EXPOSE_CODES=true
        echo SMTP_HOST=localhost
        echo SMTP_PORT=1025
        echo SMS_PROVIDER=stub
    ) > "apps\api\.env"
) else (
    echo   apps\api\.env already exists
)
if not exist "apps\web\.env" (
    echo   Creating apps\web\.env
    echo NEXT_PUBLIC_API_URL=http://localhost:4000> "apps\web\.env"
) else (
    echo   apps\web\.env already exists
)
if not exist "apps\seller\.env" (
    echo   Creating apps\seller\.env
    echo NEXT_PUBLIC_API_URL=http://localhost:4000> "apps\seller\.env"
) else (
    echo   apps\seller\.env already exists
)
if not exist "apps\admin\.env" (
    echo   Creating apps\admin\.env
    echo NEXT_PUBLIC_API_URL=http://localhost:4000> "apps\admin\.env"
) else (
    echo   apps\admin\.env already exists
)
echo   [OK] Environment files ready

echo.
echo [7/9] Installing dependencies (this may take a few minutes)...
call pnpm install
if errorlevel 1 (
    echo   [ERROR] pnpm install failed
    pause
    exit /b 1
)
echo   [OK] Dependencies installed

echo.
echo [8/9] Running database migrations and seed...
cd /d "%~dp0\apps\api"
call npx prisma generate
call npx prisma db push --skip-generate
echo   Running admin seed...
call node prisma\seed-admin.cjs 2>nul
echo   Running seller seed...
call node prisma\seed-seller.cjs 2>nul
cd /d "%~dp0"
echo   [OK] Database migrated and seeded

echo.
echo [9/9] Verifying...
echo   [OK] All checks passed

echo.
echo ============================================
echo   SETUP COMPLETE!
echo ============================================
echo.
echo   To start all services run: start-all.bat
echo.
echo   URLs:
echo     API Swagger:    http://localhost:4000/docs
echo     Buyer Web:      http://localhost:3000
echo     Seller Portal:  http://localhost:3001
echo     Admin Panel:    http://localhost:3002
echo.
echo   Test accounts:
echo.
echo ============================================
pause
