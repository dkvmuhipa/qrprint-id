@echo off
title Ngeprint Print Agent (Windows 7 / 8 / 10 / 11)
cd /d "%~dp0"

echo ============================================================
echo   NGEPRINT PRINT AGENT — KHUSUS WINDOWS 7 / 8 / 10 / 11
echo   by Gellona Teknologi (Tanpa Node.js)
echo ============================================================
echo.

if not exist "%~dp0.env" (
  echo [ERROR] File .env tidak ditemukan di folder ini!
  echo Pastikan Anda sudah mengekstrak seluruh isi file ZIP.
  pause
  exit /b 1
)

if not exist "%~dp0NgeprintAgent-Win7.exe" (
  echo [ERROR] File NgeprintAgent-Win7.exe tidak ditemukan!
  pause
  exit /b 1
)

echo Menjalankan NgeprintAgent-Win7.exe...
echo (Biarkan jendela ini tetap terbuka, boleh di-minimize)
echo.
"%~dp0NgeprintAgent-Win7.exe"
pause
