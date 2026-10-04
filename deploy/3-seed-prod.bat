@echo off
chcp 65001 >nul
title GloBox: seed production DB
cd /d "%~dp0\.."

echo ============================================
echo  GloBox — заполнение прод-БД тест-юзерами
echo ============================================
echo.
echo Создаст: admin, buyer, seller (APPROVED), mediator (APPROVED)
echo через Railway, используя прод DATABASE_URL.
echo.
set /p CONFIRM="Продолжить? (y/n): "
if /i not "%CONFIRM%"=="y" exit /b 0

call railway run node apps/api/prisma/seed-all.cjs
echo.
echo ============================================
echo  Готово. Логины:
echo ============================================
pause
