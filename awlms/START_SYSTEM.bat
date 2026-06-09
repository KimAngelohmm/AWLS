@echo off
REM ============================================================
REM SUNNIES STUDIOS AWLMS - SYSTEM STARTUP SCRIPT
REM ============================================================
REM This script starts all required services for the system
REM Run this file to launch: MySQL → Backend → Frontend
REM ============================================================

setlocal enabledelayedexpansion

echo.
echo ============================================================
echo  SUNNIES STUDIOS AWLMS - SYSTEM STARTUP
echo ============================================================
echo.

REM Check if MySQL is running
echo [1/4] Checking MySQL server...
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ✓ MySQL is already running on port 3306
) else (
    echo Starting MySQL service...
    net start MySQL80 >NUL 2>&1
    if %ERRORLEVEL% equ 0 (
        echo ✓ MySQL started successfully
    ) else (
        echo ✗ MySQL failed to start. Try running as Administrator.
        echo   Or manually run: net start MySQL80
        pause
        exit /b 1
    )
)

REM Wait for MySQL to be ready
timeout /t 2 /nobreak >NUL

REM Navigate to backend
echo.
echo [2/4] Setting up backend...
cd /d "c:\Users\kiman\OneDrive\Documents\Figma\awlms\backend"

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing backend dependencies...
    call npm install
)

REM Run database seed
echo Seeding database...
call npm run seed >NUL 2>&1

REM Seed Sunnies positions
echo Seeding Sunnies Studios positions...
call node scripts/seed-sunnies-positions.js >NUL 2>&1

echo ✓ Backend ready

REM Navigate to frontend
echo.
echo [3/4] Setting up frontend...
cd /d "c:\Users\kiman\OneDrive\Documents\Figma\awlms\frontend"

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)

echo ✓ Frontend ready

REM Start services
echo.
echo [4/4] Starting services...
echo.
echo ============================================================
echo  OPENING TERMINAL WINDOWS...
echo ============================================================
echo.

REM Start backend in new window
cd /d "c:\Users\kiman\OneDrive\Documents\Figma\awlms\backend"
start "Sunnies Studios AWLMS - Backend (Port 5000)" cmd /k "npm run dev"

REM Wait for backend to start
timeout /t 3 /nobreak >NUL

REM Start frontend in new window
cd /d "c:\Users\kiman\OneDrive\Documents\Figma\awlms\frontend"
start "Sunnies Studios AWLMS - Frontend (Port 5173)" cmd /k "npm run dev"

REM Wait for frontend to start
timeout /t 3 /nobreak >NUL

echo.
echo ============================================================
echo  ✅ SYSTEM STARTUP IN PROGRESS
echo ============================================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Opening browser...
echo.

REM Open browser
start "" http://localhost:5173

echo ============================================================
echo  SYSTEM DETAILS
echo ============================================================
echo.
echo Company: Sunnies Studios
echo Positions: 25 realistic job roles
echo Database: awlms (MySQL)
echo.
echo Demo Credentials:
echo  - HR:       hr@sunniesstudios.com / Demo123!
echo  - Manager:  manager@sunniesstudios.com / Demo123!
echo  - Employee: employee@sunniesstudios.com / Demo123!
echo.
echo ============================================================
echo.
echo NOTE: Two terminal windows should have opened:
echo  1. Backend terminal (Port 5000)
echo  2. Frontend terminal (Port 5173)
echo.
echo If terminals don't appear:
echo  1. Manually start backend:
echo     cd backend && npm run dev
echo  2. Manually start frontend:
echo     cd frontend && npm run dev
echo.
echo To stop the system:
echo  1. Close both terminal windows
echo  2. Or run: taskkill /IM node.exe /F
echo.
echo ============================================================
echo.
pause
