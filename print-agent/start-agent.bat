@echo off
title QRPrint.id - Windows Print Agent
set /p AGENT_KEY=Masukkan Agent Key dari Dashboard Toko Anda: 
if "%AGENT_KEY%"=="" (
  echo Agent Key tidak boleh kosong.
  pause
  exit /b 1
)
echo.
echo Menjalankan QRPrint.id Windows Print Agent (Mode Simulasi)...
echo Untuk mencetak ke printer fisik, ganti --dry-run menjadi --live
echo.
node "%~dp0agent.mjs" --url=http://localhost:3000 --key=%AGENT_KEY% --dry-run
pause
