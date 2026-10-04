@echo off
chcp 65001 >nul
title GloBox: deploy API to Railway
setlocal EnableDelayedExpansion
cd /d "%~dp0\.."

echo ============================================
echo  GloBox API Deploy to Railway
echo ============================================
echo.

echo [1/4] Checking Railway login...
call railway whoami
if errorlevel 1 (
    echo ОШИБКА: не залогинен в Railway. Запусти: railway login
    pause
    exit /b 1
)
echo.

echo [2/4] Current project/service status:
call railway status
echo.

echo [3/4] Проверь/задай переменные окружения:
echo   - DATABASE_URL  (должен быть ${{Postgres.DATABASE_URL}})
echo   - JWT_SECRET    (случайная строка 32+ символов)
echo   - WEB_ORIGIN    (https://glo-box.ru,https://seller-globox.ru,...)
echo.
set /p SETVARS="Выставить WEB_ORIGIN сейчас? (y/n): "
if /i "!SETVARS!"=="y" (
    set /p WEB_ORIGIN="Введи WEB_ORIGIN (через запятую, без пробелов): "
    call railway variables --set "WEB_ORIGIN=!WEB_ORIGIN!"
)
echo.

echo [4/4] Деплой (railway up)...
echo Это займёт 3-5 минут. Логи появятся ниже.
echo.
call railway up
echo.

echo Получаю публичный домен:
call railway domain
echo.

echo ============================================
echo  ✓ Готово. Скопируй URL выше.
echo  Дальше: запусти deploy\2-vercel-all.bat
echo ============================================
pause
