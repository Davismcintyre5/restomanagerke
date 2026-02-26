@echo off
TITLE RestoManagerKe Database Reset Tool
COLOR 0C

echo ========================================
echo    🔥 DATABASE RESET TOOL
echo ========================================
echo.
echo WARNING: This will DELETE ALL DATA!
echo Only the admin user will be kept.
echo.
set /p confirm="Type DELETE ALL to continue: "

if "%confirm%"=="DELETE ALL" (
    echo.
    echo ✅ Confirmation received. Proceeding...
    echo.
    
    echo Step 1: Stopping any running Node processes...
    taskkill /F /IM node.exe 2>nul
    
    echo Step 2: Running database reset...
    node reset-database.js
    
    if %errorlevel% equ 0 (
        echo.
        echo ✅ Database reset completed successfully!
        echo.
        echo Step 3: Starting server...
        start cmd /k "npm run dev"
        
        timeout /t 3
        start http://localhost:5000/dashboard
    ) else (
        echo.
        echo ❌ Reset failed. Check the error messages above.
    )
) else (
    echo.
    echo ❌ Operation cancelled.
)

echo.
pause