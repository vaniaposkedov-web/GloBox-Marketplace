@echo off
title GloBox - Update Vercel API URL
setlocal

set API_URL=https://miraculous-grace-production-cbea.up.railway.app

echo ============================================
echo Updating NEXT_PUBLIC_API_URL on Vercel
echo Target: %API_URL%
echo ============================================
echo.

REM Login if not already
call vercel whoami >nul 2>&1
if errorlevel 1 (
  echo Please login to Vercel:
  call vercel login
)

echo.
echo --- WEB (apps/web) ---
cd /d "%~dp0apps\web"
call vercel link --yes
echo Removing old env...
echo y | call vercel env rm NEXT_PUBLIC_API_URL production 2>nul
echo y | call vercel env rm NEXT_PUBLIC_API_URL preview 2>nul
echo y | call vercel env rm NEXT_PUBLIC_API_URL development 2>nul
echo Adding new env...
echo %API_URL%| call vercel env add NEXT_PUBLIC_API_URL production
echo %API_URL%| call vercel env add NEXT_PUBLIC_API_URL preview
echo %API_URL%| call vercel env add NEXT_PUBLIC_API_URL development
echo Triggering redeploy...
call vercel --prod --yes

echo.
echo --- SELLER (apps/seller) ---
cd /d "%~dp0apps\seller"
call vercel link --yes
echo Removing old env...
echo y | call vercel env rm NEXT_PUBLIC_API_URL production 2>nul
echo y | call vercel env rm NEXT_PUBLIC_API_URL preview 2>nul
echo y | call vercel env rm NEXT_PUBLIC_API_URL development 2>nul
echo Adding new env (with /api suffix)...
echo %API_URL%/api| call vercel env add NEXT_PUBLIC_API_URL production
echo %API_URL%/api| call vercel env add NEXT_PUBLIC_API_URL preview
echo %API_URL%/api| call vercel env add NEXT_PUBLIC_API_URL development
echo Triggering redeploy...
call vercel --prod --yes

echo.
echo --- ADMIN (apps/admin) ---
cd /d "%~dp0apps\admin"
call vercel link --yes
echo Removing old env...
echo y | call vercel env rm NEXT_PUBLIC_API_URL production 2>nul
echo y | call vercel env rm NEXT_PUBLIC_API_URL preview 2>nul
echo y | call vercel env rm NEXT_PUBLIC_API_URL development 2>nul
echo Adding new env (with /api suffix)...
echo %API_URL%/api| call vercel env add NEXT_PUBLIC_API_URL production
echo %API_URL%/api| call vercel env add NEXT_PUBLIC_API_URL preview
echo %API_URL%/api| call vercel env add NEXT_PUBLIC_API_URL development
echo Triggering redeploy...
call vercel --prod --yes

echo.
echo ============================================
echo  All 3 projects redeployed!
echo ============================================
pause
