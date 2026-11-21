import { NextResponse } from "next/server";
import { getCurrentShop } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBindingLabel } from "@/lib/utils";

function csvCell(val: unknown): string {
  const str = String(val ?? "");
  // Prevent CSV formula injection in Excel
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export async function GET(req: Request) {
  const shop = await getCurrentShop();
  if (!shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const monthParam = String(url.searchParams.get("month") || "").trim();
  const format = String(url.searchParams.get("format") || "csv").toLowerCase();

  let dateFilter: { gte?: Date; lt?: Date } | undefined;
  let periodLabel = "Semua-Riwayat";

  if (monthParam && monthParam !== "all" && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [yStr, mStr] = monthParam.split("-");
    const year = Number(yStr);
    const monthIdx = Number(mStr) - 1;
    if (year >= 2020 && year <= 2100 && monthIdx >= 0 && monthIdx <= 11) {
      const start = new Date(year, monthIdx, 1, 0, 0, 0, 0);
      const end = new Date(year, monthIdx + 1, 1, 0, 0, 0, 0);
      dateFilter = { gte: start, lt: end };
      periodLabel = monthParam;
    }
  } else if (!monthParam) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
    dateFilter = { gte: start, lt: end };
    periodLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  const jobs = await prisma.printJob.findMany({
    where: {
      shopId: shop.id,
      paymentStatus: "PAID",
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  let totalRevenue = 0;
  let qrisRevenue = 0;
  let cashRevenue = 0;
  let bindingRevenue = 0;
  let bwPages = 0;
  let colorPages = 0;
  let photoSheets = 0;
  let a4PhysicalSheets = 0;
  let f4PhysicalSheets = 0;

  for (const j of jobs) {
    totalRevenue += j.totalPrice;
    if (j.paymentMethod === "QRIS") qrisRevenue += j.totalPrice;
    else cashRevenue += j.totalPrice;
    bindingRevenue += j.bindingPrice || 0;

    const totalImpressions = j.pageCount * j.copies;
    const physicalSheets =
      j.duplex && j.paperSize !== "PHOTO_4X6"
        ? Math.ceil(j.pageCount / 2) * j.copies
        : totalImpressions;

    if (j.paperSize === "PHOTO_4X6") {
      photoSheets += totalImpressions;
    } else {
      if (j.colorMode === "COLOR") colorPages += totalImpressions;
      else bwPages += totalImpressions;

      if (j.paperSize === "F4") f4PhysicalSheets += physicalSheets;
      else a4PhysicalSheets += physicalSheets;
    }
  }

  const totalPaperSheets = a4PhysicalSheets + f4PhysicalSheets;
  const estimatedReams = Number((totalPaperSheets / 500).toFixed(2));
  const estimatedA4Reams = Number((a4PhysicalSheets / 500).toFixed(2));
  const estimatedF4Reams = Number((f4PhysicalSheets / 500).toFixed(2));

  const summary = {
    period: periodLabel,
    shopName: shop.name,
    shopCode: shop.shopCode,
    totalJobs: jobs.length,
    totalRevenue,
    qrisRevenue,
    cashRevenue,
    bindingRevenue,
    bwPages,
    colorPages,
    photoSheets,
    a4PhysicalSheets,
    f4PhysicalSheets,
    totalPaperSheets,
    estimatedReams,
    estimatedA4Reams,
    estimatedF4Reams,
  };

  if (format === "json") {
    return NextResponse.json(summary, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const headerRow = [
    "Tanggal & Waktu",
    "Kode Antrean",
    "Pelanggan",
    "Dokumen",
    "Halaman",
    "Rentang",
    "Rangkap",
    "Total Sisi Cetak",
    "Lembar Kertas Fisik",
    "Mode Warna",
    "Ukuran Kertas",
    "Bolak-Balik",
    "Add-on Jilid",
    "Biaya Jilid (Rp)",
    "Metode Bayar",
    "Total Bayar (Rp)",
    "Status Cetak",
  ];

  const lines: string[] = [headerRow.map(csvCell).join(",")];

  for (const j of jobs) {
    const totalImpressions = j.pageCount * j.copies;
    const physicalSheets =
      j.duplex && j.paperSize !== "PHOTO_4X6"
        ? Math.ceil(j.pageCount / 2) * j.copies
        : totalImpressions;
    const dt = new Date(j.createdAt).toLocaleString("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    lines.push(
      [
        dt,
        j.jobCode,
        j.customerName,
        j.fileName,
        j.pageCount,
        j.pageRange,
        j.copies,
        totalImpressions,
        physicalSheets,
        j.paperSize === "PHOTO_4X6"
          ? "Foto"
          : j.colorMode === "COLOR"
          ? "Warna"
          : "Hitam Putih",
        j.paperSize,
        j.duplex ? "Ya" : "Tidak",
        getBindingLabel(j.bindingType),
        j.bindingPrice || 0,
        j.paymentMethod,
        j.totalPrice,
        j.printStatus,
      ]
        .map(csvCell)
        .join(",")
    );
  }

  // Summary & Paper Ream Audit footer block
  lines.push("");
  lines.push(["RINGKASAN LAPORAN & AUDIT RIM KERTAS", periodLabel].map(csvCell).join(","));
  lines.push(["Nama Toko", shop.name].map(csvCell).join(","));
  lines.push(["Total Transaksi Lunas", jobs.length].map(csvCell).join(","));
  lines.push(["Omzet QRIS (Rp)", qrisRevenue].map(csvCell).join(","));
  lines.push(["Omzet Tunai (Rp)", cashRevenue].map(csvCell).join(","));
  lines.push(["Total Omzet (Rp)", totalRevenue].map(csvCell).join(","));
  lines.push(["Pendapatan Add-on Jilid (Rp)", bindingRevenue].map(csvCell).join(","));
  lines.push(["Total Sisi Cetak Hitam Putih", bwPages].map(csvCell).join(","));
  lines.push(["Total Sisi Cetak Warna", colorPages].map(csvCell).join(","));
  lines.push(["Total Lembar Foto 4x6", photoSheets].map(csvCell).join(","));
  lines.push(["Pemakaian Kertas A4 (Lembar)", a4PhysicalSheets].map(csvCell).join(","));
  lines.push(["Estimasi Rim A4 (1 rim = 500 lbr)", estimatedA4Reams].map(csvCell).join(","));
  lines.push(["Pemakaian Kertas F4 (Lembar)", f4PhysicalSheets].map(csvCell).join(","));
  lines.push(["Estimasi Rim F4 (1 rim = 500 lbr)", estimatedF4Reams].map(csvCell).join(","));
  lines.push(["Total Pemakaian Kertas A4+F4 (Lembar)", totalPaperSheets].map(csvCell).join(","));
  lines.push(["Total Estimasi Rim Kertas", estimatedReams].map(csvCell).join(","));

  const csvBody = "\uFEFF" + lines.join("\r\n");
  const safeCode = shop.shopCode.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `Laporan-Ngeprint-${safeCode}-${periodLabel}.csv`;

  return new NextResponse(csvBody, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
