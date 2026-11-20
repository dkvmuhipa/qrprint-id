@echo off
chcp 65001 >nul
title Ngeprint Print Agent — Pemasangan & Jalankan Otomatis
cd /d "%~dp0"

echo ============================================================
echo   NGEPRINT BY GELLONA TEKNOLOGI — WINDOWS PRINT AGENT
echo ============================================================
echo.

REM 1. Cek Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [1/3] Node.js belum terpasang di komputer ini.
    echo       Mencoba memasang Node.js otomatis via Windows winget...
    where winget >nul 2>&1
    if %errorlevel% equ 0 (
        winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        set "PATH=%PATH%;C:\Program Files\nodejs"
    )
    where node >nul 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo [!] Node.js belum terdeteksi.
        echo     Silakan unduh & pasang Node.js LTS gratis dari: https://nodejs.org
        echo     Setelah selesai install, tutup jendela ini lalu klik ganda PASANG-DAN-JALANKAN.bat lagi.
        echo.
        start https://nodejs.org
        pause
        exit /b 1
    )
) else (
    echo [1/3] Node.js sudah siap.
)

REM 2. Cek SumatraPDF untuk cetak presisi (halaman, warna/HP, duplex, F4/4x6)
if not exist "%~dp0SumatraPDF.exe" (
    echo [2/3] Mengunduh mesin cetak presisi SumatraPDF Portable...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "try { $ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri 'https://www.sumatrapdfreader.org/dl/rel/3.5.2/SumatraPDF-3.5.2-64.zip' -OutFile '%~dp0sumatra.zip'; Expand-Archive -Path '%~dp0sumatra.zip' -DestinationPath '%~dp0sumatra_tmp' -Force; $exe = Get-ChildItem -Path '%~dp0sumatra_tmp' -Filter 'SumatraPDF*.exe' -Recurse | Select-Object -First 1; if ($exe) { Copy-Item $exe.FullName '%~dp0SumatraPDF.exe' -Force }; Remove-Item '%~dp0sumatra.zip','%~dp0sumatra_tmp' -Recurse -Force -ErrorAction SilentlyContinue; Write-Host '      SumatraPDF siap dipakai.' } catch { Write-Host '      Lewati SumatraPDF (tetap bisa cetak lewat mode Windows standar).' }"
) else (
    echo [2/3] SumatraPDF sudah siap.
)

REM 3. Daftarkan Auto-Start di Windows Startup agar otomatis jalan tiap PC dinyalakan
echo [3/3] Mengaktifkan Auto-Start saat komputer kasir dinyalakan...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { $ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Startup') + '\Ngeprint Print Agent.lnk'); $s.TargetPath = '%~dp0PASANG-DAN-JALANKAN.bat'; $s.WorkingDirectory = '%~dp0'; $s.WindowStyle = 7; $s.Save(); Write-Host '      Auto-Start Windows aktif.' } catch { Write-Host '      Auto-Start dilewati.' }"

echo.
echo ============================================================
echo   Print Agent AKTIF! Biarkan jendela ini tetap terbuka
echo   (boleh di-minimize) agar dokumen pelanggan langsung tercetak.
echo ============================================================
echo.

:loop
node "%~dp0agent.mjs" --live
echo.
echo [!] Koneksi terputus atau agen berhenti. Mencoba sambung ulang dalam 5 detik...
timeout /t 5 /nobreak >nul
goto loop
