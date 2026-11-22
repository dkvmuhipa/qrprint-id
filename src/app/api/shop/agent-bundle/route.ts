import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getCurrentShop } from "@/lib/auth";
import { createZipBuffer, ZipEntry } from "@/lib/zip";

export async function GET(req: Request) {
  const shop = await getCurrentShop();
  if (!shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reqUrl = new URL(req.url);
    const osMode = String(reqUrl.searchParams.get("os") || "win10").toLowerCase();
    const isWin7 = osMode === "win7";
    const forwardedProto = req.headers.get("x-forwarded-proto");
    const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      (forwardedHost
        ? `${forwardedProto || reqUrl.protocol.replace(":", "")}://${forwardedHost}`
        : reqUrl.origin);

    const envContent = [
      "# Konfigurasi Otomatis Ngeprint Windows Print Agent",
      `# Toko: ${shop.name} (/s/${shop.shopCode})`,
      `SERVER_URL=${origin}`,
      `AGENT_KEY=${shop.agentKey}`,
      "POLL_INTERVAL_MS=3000",
      "DRY_RUN=false",
      "# Opsional: Printer Thermal 58mm (Bluetooth / USB) — bisa juga diatur langsung dari Dashboard",
      `THERMAL_PRINTER_NAME=${shop.thermalPrinter || ""}`,
      `AUTO_PRINT_RECEIPT=${shop.autoPrintReceipt ? "true" : "false"}`,
      "",
    ].join("\r\n");

    const entries: ZipEntry[] = [];
    const folderName = isWin7
      ? `ngeprint-agent-win7-${shop.shopCode}`
      : `ngeprint-agent-${shop.shopCode}`;

    if (isWin7) {
      const win7Dir = path.join(process.cwd(), "print-agent-win7");
      for (const fileName of ["NgeprintAgent-Win7.exe", "JALANKAN-WIN7.bat"]) {
        const content = await fs.readFile(path.join(win7Dir, fileName));
        entries.push({
          name: `${folderName}/${fileName}`,
          content,
        });
      }

      const win7Guide = [
        "============================================================",
        `  NGEPRINT PRINT AGENT (WINDOWS 7 / 8 / 10 / 11) — ${shop.name.toUpperCase()}`,
        "============================================================",
        "",
        "Versi ini adalah file .exe ringan (~22 KB) yang jalan langsung",
        "di Windows 7 SP1, Windows 8/8.1, 10, dan 11 (32-bit & 64-bit)",
        "TANPA perlu install Node.js atau Python!",
        "",
        "CARA PASANG (CUMA 2 LANGKAH):",
        "1. Ekstrak seluruh isi file ZIP ini ke folder permanen",
        "   (misalnya di C:\\NgeprintAgent atau Desktop).",
        "2. Klik ganda:  JALANKAN-WIN7.bat  (atau NgeprintAgent-Win7.exe)",
        "",
        "TIPS TAMBAHAN UNTUK WINDOWS 7:",
        "- Pastikan .NET Framework 4.0+ sudah terpasang (umumnya sudah ada).",
        "- Agar cetak warna/hitam-putih & duplex lebih presisi, Anda dapat",
        "  menaruh file SumatraPDF.exe (v3.4.6) di folder yang sama.",
        "- Biarkan jendela hitam tetap terbuka (boleh di-minimize).",
        "",
        "Butuh bantuan? Hubungi WA 085961194621 atau email gellonaindonesia@gmail.com",
        "",
      ].join("\r\n");

      entries.push({ name: `${folderName}/.env`, content: envContent });
      entries.push({ name: `${folderName}/CARA-PASANG-WIN7.txt`, content: win7Guide });

      const zipBuffer = createZipBuffer(entries);
      return new NextResponse(new Uint8Array(zipBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${folderName}.zip"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const agentDir = path.join(process.cwd(), "print-agent");

    const filesToInclude = [
      "agent.mjs",
      "PASANG-DAN-JALANKAN.bat",
      "start-agent.bat",
      "install-sumatra.bat",
      "README.md",
    ];

    for (const fileName of filesToInclude) {
      try {
        const content = await fs.readFile(path.join(agentDir, fileName));
        entries.push({
          name: `${folderName}/${fileName}`,
          content,
        });
      } catch {
        // Skip optional file if not present
      }
    }

    const guideContent = [
      "============================================================",
      `  PANDUAN CEPAT NGEPRINT PRINT AGENT — ${shop.name.toUpperCase()}`,
      "============================================================",
      "",
      "File .env di dalam folder ini SUDAH terisi otomatis dengan",
      `URL server (${origin}) dan Agent Key toko Anda.`,
      "",
      "CARA PASANG (CUMA 2 LANGKAH):",
      "1. Ekstrak seluruh isi file ZIP ini ke folder permanen",
      "   (misalnya di C:\\NgeprintAgent atau Desktop).",
      "2. Klik ganda file:  PASANG-DAN-JALANKAN.bat",
      "",
      "Program akan otomatis:",
      "- Mengecek & memasang Node.js (jika belum ada),",
      "- Mengunduh SumatraPDF agar cetak halaman/warna/duplex presisi,",
      "- Mengaktifkan Auto-Start agar langsung jalan tiap PC dinyalakan,",
      "- Menghubungkan printer USB Anda ke Dashboard Ngeprint.",
      "",
      "Biarkan jendela hitam tetap terbuka (boleh di-minimize).",
      "Cek status 'Online' di Dashboard -> menu Print Agent.",
      "",
      "Butuh bantuan? Hubungi WA 085961194621 atau email gellonaindonesia@gmail.com",
      "",
    ].join("\r\n");

    entries.push({
      name: `${folderName}/.env`,
      content: envContent,
    });
    entries.push({
      name: `${folderName}/CARA-PASANG.txt`,
      content: guideContent,
    });

    const zipBuffer = createZipBuffer(entries);

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${folderName}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Agent bundle generation error:", err);
    return NextResponse.json(
      { error: "Gagal menyiapkan paket Print Agent." },
      { status: 500 }
    );
  }
}
