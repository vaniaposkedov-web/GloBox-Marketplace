@echo off
title Railway Deploy with DB Migration
cd /d "%~dp0"

echo Deploying API with prisma db push at startup...
call railway up
echo.
echo After deploy, tables will be created automatically.
pause
