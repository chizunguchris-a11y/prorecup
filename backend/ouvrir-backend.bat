@echo off

set NODE_SKIP_PLATFORM_CHECK=1

set "NODE_HOME=C:\Users\CHRIS CHIZ\Documents\node-v14.21.3-win-x64\node-v14.21.3-win-x64"
set "PATH=%NODE_HOME%;%PATH%"

cd /d C:\ProRecup\backend

echo.
echo ==========================================
echo   Environnement Pro Recup charge
echo ==========================================
echo.

echo Version Node :
node -v

echo.

echo Version npm :
npm -v

echo.

cmd /k