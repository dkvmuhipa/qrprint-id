@echo off
title Ngeprint (by Gellona Teknologi) - Windows Print Agent v2.0
echo ============================================================
echo   Ngeprint (by Gellona Teknologi) - Windows Print Agent v2.0
echo ============================================================
echo.

if not exist "%~dp0SumatraPDF.exe" (
  echo [INFO] SumatraPDF.exe belum terpasang di folder ini.
  echo        Jalankan install-sumatra.bat terlebih dahulu untuk cetak presisi
  echo        (rentang halaman, grayscale/color, duplex).
  echo.
)

set /p AGENT_KEY=Masukkan Agent Key dari Dashboard Toko Anda: 
if "%AGENT_KEY%"=="" (
  echo Agent Key tidak boleh kosong.
  pause
  exit /b 1
)

set /p SERVER_URL=Masukkan URL Server (Kosongkan untuk http://localhost:3000): 
if "%SERVER_URL%"=="" set SERVER_URL=http://localhost:3000

echo.
echo Pilih Mode Print Agent:
echo   1. Mode LIVE (Cetak langsung ke Printer Fisik Windows)
echo   2. Mode SIMULASI / DRY-RUN (Uji coba aman tanpa kertas)
set /p MODE_CHOICE=Pilihan (1 atau 2, default 1): 

if "%MODE_CHOICE%"=="2" (
  echo.
  echo Menjalankan Ngeprint Windows Print Agent ^(Mode Simulasi^)...
  node "%~dp0agent.mjs" --url=%SERVER_URL% --key=%AGENT_KEY% --dry-run
) else (
  echo.
  echo Menjalankan Ngeprint Windows Print Agent ^(Mode LIVE^)...
  node "%~dp0agent.mjs" --url=%SERVER_URL% --key=%AGENT_KEY% --live
)
pause
