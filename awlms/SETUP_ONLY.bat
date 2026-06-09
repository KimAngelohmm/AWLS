@echo off
REM Simple startup - No fancy features, just run the commands

setlocal enabledelayedexpansion

cls
echo.
echo ======================================================================
echo   SUNNIES STUDIOS AWLMS - SYSTEM STARTUP
echo ======================================================================
echo.
echo Starting MySQL service...
echo.

REM Start MySQL
net start MySQL80

echo.
echo Waiting 3 seconds for MySQL to initialize...
timeout /t 3 /nobreak >NUL

echo.
echo ======================================================================
echo   BACKEND SETUP
echo ======================================================================
echo.

REM Go to backend
cd /d "c:\Users\kiman\OneDrive\Documents\Figma\awlms\backend"

echo Installing backend dependencies...
call npm install

echo.
echo Running database seed...
call npm run seed

echo.
echo Seeding Sunnies Studios positions...
call node scripts/seed-sunnies-positions.js

echo.
echo ======================================================================
echo   FRONTEND SETUP
echo ======================================================================
echo.

REM Go to frontend
cd /d "c:\Users\kiman\OneDrive\Documents\Figma\awlms\frontend"

echo Installing frontend dependencies...
call npm install

echo.
echo ======================================================================
echo   STARTUP COMPLETE
echo ======================================================================
echo.
echo Your system is ready to start!
echo.
echo IMPORTANT: You now need to open 2 more Command Prompt windows:
echo.
echo Window 1 (Backend):
echo   cd c:\Users\kiman\OneDrive\Documents\Figma\awlms\backend
echo   npm run dev
echo.
echo Window 2 (Frontend):
echo   cd c:\Users\kiman\OneDrive\Documents\Figma\awlms\frontend
echo   npm run dev
echo.
echo Then open browser:
echo   http://localhost:5173
echo.
echo ======================================================================
echo.
pause
