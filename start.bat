@echo off
echo ========================================
echo   TEMUKAN.CO.ID — Menjalankan Server
echo ========================================
echo.

REM Cek apakah node_modules sudah ada
if not exist "node_modules" (
    echo [INFO] Menginstall dependencies...
    npm install
    echo.
)

REM Copy .env jika belum ada
if not exist ".env" (
    copy .env.example .env
    echo [INFO] File .env dibuat dari .env.example
)

echo [INFO] Server berjalan di http://localhost:3000
echo [INFO] Tekan Ctrl+C untuk menghentikan server
echo.
node server.js
pause
