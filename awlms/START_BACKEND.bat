@echo off
REM ============================================================
REM START BACKEND SERVER
REM ============================================================

echo.
echo ============================================================
echo  SUNNIES STUDIOS - BACKEND SERVER (Port 5000)
echo ============================================================
echo.

cd /d "c:\Users\kiman\OneDrive\Documents\Figma\awlms\backend"

echo Checking MySQL connection...
timeout /t 1 /nobreak >NUL

echo Starting Node.js backend server...
echo.

npm run dev

echo.
echo Backend server stopped.
pause
