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
    const forwardedProto = req.headers.get("x-forwarded-proto");
    const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      (forwardedHost
        ? `${forwardedProto || reqUrl.protocol.replace(":", "")}://${forwardedHost}`
        : reqUrl.origin);

    const agentDir = path.join(process.cwd(), "print-agent");
    const folderName = `ngeprint-agent-${shop.shopCode}`;

    const filesToInclude = [
      "agent.mjs",
      "PASANG-DAN-JALANKAN.bat",
      "start-agent.bat",
      "install-sumatra.bat",
      "README.md",
    ];

    const entries: ZipEntry[] = [];
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
      "Butuh bantuan? Hubungi admin@gellona.id",
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
