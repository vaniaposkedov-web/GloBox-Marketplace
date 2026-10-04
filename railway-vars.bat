@echo off
title GloBox - Set Variables on API Service
cd /d "%~dp0"

echo Linking to miraculous-grace service...
call railway service
echo.
echo If you see a prompt, choose "miraculous-grace" (your API)
echo.
pause

echo Setting all variables via shell (no quotes)...
call railway variables --set DATABASE_URL=${{Postgres.DATABASE_URL}} --set NODE_ENV=production --set API_PORT=4000 --set API_HOST=0.0.0.0 --set JWT_SECRET=globox_prod_jwt_secret_2024_xK9mP2 --set JWT_ACCESS_TTL=30d --set DEV_EXPOSE_CODES=true --set SMS_PROVIDER=stub --set WEB_ORIGIN=https://web-kappa-taupe-63.vercel.app,https://seller-blush-ten.vercel.app,https://admin-iota-eosin-32.vercel.app --set VK_CLIENT_ID=54575428 --set VK_CLIENT_SECRET=%VK_CLIENT_SECRET%

echo.
echo Done! Railway should auto-redeploy.
pause
