@echo off
REM ============================================================
REM SEED DATABASE WITH SUNNIES STUDIOS POSITIONS
REM ============================================================

echo.
echo ============================================================
echo  SUNNIES STUDIOS - DATABASE SEEDING
echo ============================================================
echo.

cd /d "c:\Users\kiman\OneDrive\Documents\Figma\awlms\backend"

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies first...
    call npm install
)

echo.
echo [1/3] Running initial database seed...
call npm run seed

echo.
echo [2/3] Seeding Sunnies Studios positions (25 jobs)...
call node scripts/seed-sunnies-positions.js

echo.
echo [3/3] Verifying database...
echo.
echo To verify the positions were created, run:
echo   mysql -u root -p -D awlms -e "SELECT COUNT(*) FROM JobPosition;"
echo.
echo Expected result: 25 (or 27 if demo positions already exist)
echo.

pause
