@echo off
chcp 65001 >nul
title GloBox: deploy 4 Vercel frontends
setlocal EnableDelayedExpansion
cd /d "%~dp0\.."

echo ============================================
echo  GloBox Vercel Deploy (4 frontends)
echo ============================================
echo.

call vercel whoami
if errorlevel 1 (
    echo ОШИБКА: не залогинен в Vercel. Запусти: vercel login
    pause
    exit /b 1
)
echo.

set /p API_URL="Введи публичный URL API (https://xxx.up.railway.app): "
if "!API_URL!"=="" (
    echo ОШИБКА: URL пустой.
    pause
    exit /b 1
)
echo.
echo API URL: !API_URL!
echo.

call :DEPLOY web "marketplizzzz"
call :DEPLOY seller "@marketplace/seller"
call :DEPLOY admin "@marketplace/admin"
call :DEPLOY mediator "@marketplace/mediator"

echo ============================================
echo  ✓ Все 4 фронтенда задеплоены.
echo ============================================
pause
exit /b 0

:DEPLOY
set APP=%~1
set PKGNAME=%~2
echo.
echo --- Deploying apps\%APP% (%PKGNAME%) ---
pushd apps\%APP%

echo [link] Привязка проекта к Vercel (если первый раз — выбери scope+имя):
call vercel link

echo [env] Обновляю NEXT_PUBLIC_API_URL в production:
call vercel env rm NEXT_PUBLIC_API_URL production --yes >nul 2>nul
echo !API_URL! | call vercel env add NEXT_PUBLIC_API_URL production

echo [build+deploy] Прод-билд:
call vercel --prod --yes

popd
echo --- ✓ %APP% готов ---
exit /b 0
