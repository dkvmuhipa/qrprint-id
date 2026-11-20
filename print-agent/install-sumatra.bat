@echo off
title Ngeprint - Installer SumatraPDF Precision Engine
echo ============================================================
echo   Ngeprint (by Gellona Teknologi)
echo   Mengunduh SumatraPDF Portable untuk Cetak PDF Presisi
echo ============================================================
echo.
echo SumatraPDF dibutuhkan agar pilihan pelanggan seperti:
echo   - Rentang halaman (misal: 1-3, 5)
echo   - Mode Hitam Putih (Monochrome) vs Warna (Color)
echo   - Cetak Bolak-Balik (Duplex)
echo   - Ukuran Kertas A4 / F4 / Foto 4x6
echo dapat dieksekusi 100%% akurat ke mesin printer Windows Anda.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$url = 'https://www.sumatrapdfreader.org/dl/rel/3.5.2/SumatraPDF-3.5.2-64.zip';" ^
  "$zip = Join-Path '%~dp0' 'sumatra.zip';" ^
  "$out = '%~dp0';" ^
  "Write-Host 'Mengunduh SumatraPDF 3.5.2 (64-bit Portable)...';" ^
  "Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing;" ^
  "Write-Host 'Mengekstrak SumatraPDF.exe...';" ^
  "Expand-Archive -Path $zip -DestinationPath $out -Force;" ^
  "if (Test-Path (Join-Path $out 'SumatraPDF-3.5.2-64.exe')) { Move-Item -Force (Join-Path $out 'SumatraPDF-3.5.2-64.exe') (Join-Path $out 'SumatraPDF.exe') };" ^
  "Remove-Item $zip -Force -ErrorAction SilentlyContinue;" ^
  "if (Test-Path (Join-Path $out 'SumatraPDF.exe')) { Write-Host 'BERHASIL! SumatraPDF.exe siap digunakan oleh Ngeprint Agent.' -ForegroundColor Green } else { Write-Host 'Gagal menemukan SumatraPDF.exe setelah ekstrak.' -ForegroundColor Red }"

echo.
pause
