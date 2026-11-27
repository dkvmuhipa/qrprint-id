import { NextResponse } from "next/server";
import { getCurrentShop } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function randomSuffix(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function GET() {
  const shop = await getCurrentShop();
  if (!shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [pins, recentJobs] = await Promise.all([
    prisma.shopQuotaPin.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.printJob.findMany({
      where: {
        shopId: shop.id,
        paymentMethod: "QUOTA_PIN",
      },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        jobCode: true,
        customerName: true,
        fileName: true,
        pageCount: true,
        copies: true,
        colorMode: true,
        paperSize: true,
        quotaLabel: true,
        printStatus: true,
        createdAt: true,
      },
    }),
  ]);

  const summary = pins.reduce(
    (acc, pin) => {
      acc.totalPins += 1;
      if (pin.isActive) acc.activePins += 1;
      acc.totalMaxPages += pin.maxPages;
      acc.totalUsedPages += pin.usedPages;
      return acc;
    },
    { totalPins: 0, activePins: 0, totalMaxPages: 0, totalUsedPages: 0 }
  );

  return NextResponse.json({ pins, recentJobs, summary });
}

export async function POST(req: Request) {
  const shop = await getCurrentShop();
  if (!shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  if (body.action === "SEED_SCHOOL_PRESETS") {
    const existingCount = await prisma.shopQuotaPin.count({
      where: { shopId: shop.id },
    });
    if (existingCount + 3 > 50) {
      return NextResponse.json(
        { error: "Maksimal 50 PIN kuota per toko." },
        { status: 400 }
      );
    }

    const presets = [
      {
        label: "Kuota Kelas / Siswa (BW)",
        pinCode: `SISWA-${randomSuffix()}`,
        maxPages: 100,
        allowColor: false,
      },
      {
        label: "Kuota Guru / Dosen",
        pinCode: `GURU-${randomSuffix()}`,
        maxPages: 500,
        allowColor: true,
      },
      {
        label: "Kuota Lab Komputer",
        pinCode: `LAB-${randomSuffix()}`,
        maxPages: 300,
        allowColor: true,
      },
    ];

    let addedCount = 0;
    for (const preset of presets) {
      try {
        await prisma.shopQuotaPin.create({
          data: {
            shopId: shop.id,
            label: preset.label,
            pinCode: preset.pinCode,
            maxPages: preset.maxPages,
            allowColor: preset.allowColor,
            isActive: true,
          },
        });
        addedCount += 1;
      } catch {
        // skip rare collision
      }
    }

    const pins = await prisma.shopQuotaPin.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, addedCount, pins });
  }

  const currentCount = await prisma.shopQuotaPin.count({
    where: { shopId: shop.id },
  });
  if (currentCount >= 50) {
    return NextResponse.json(
      { error: "Maksimal 50 PIN kuota per toko." },
      { status: 400 }
    );
  }

  const label = String(body.label || "").trim().slice(0, 60);
  if (label.length < 2) {
    return NextResponse.json(
      { error: "Nama kelas/guru minimal 2 karakter." },
      { status: 400 }
    );
  }

  const pinCode = String(body.pinCode || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 16);
  if (pinCode.length < 4) {
    return NextResponse.json(
      { error: "Kode PIN minimal 4 karakter (huruf/angka/tanda hubung)." },
      { status: 400 }
    );
  }

  const maxPages = Math.round(Number(body.maxPages) || 0);
  if (maxPages < 1 || maxPages > 100000) {
    return NextResponse.json(
      { error: "Kuota lembar harus antara 1 dan 100.000 lembar." },
      { status: 400 }
    );
  }

  const duplicate = await prisma.shopQuotaPin.findFirst({
    where: { shopId: shop.id, pinCode },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json(
      { error: `Kode PIN "${pinCode}" sudah digunakan di toko Anda.` },
      { status: 409 }
    );
  }

  const allowColor = body.allowColor !== false;

  const pin = await prisma.shopQuotaPin.create({
    data: {
      shopId: shop.id,
      label,
      pinCode,
      maxPages,
      allowColor,
      isActive: true,
    },
  });

  return NextResponse.json({ ok: true, pin }, { status: 201 });
}

export async function PATCH(req: Request) {
  const shop = await getCurrentShop();
  if (!shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "").trim();
  if (!id) {
    return NextResponse.json(
      { error: "ID PIN kuota wajib diisi." },
      { status: 400 }
    );
  }

  const existing = await prisma.shopQuotaPin.findFirst({
    where: { id, shopId: shop.id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "PIN kuota tidak ditemukan." },
      { status: 404 }
    );
  }

  if (body.action === "RESET_USED") {
    const pin = await prisma.shopQuotaPin.update({
      where: { id: existing.id },
      data: { usedPages: 0 },
    });
    return NextResponse.json({ ok: true, pin });
  }

  if (body.action === "TOPUP") {
    const addPages = Math.max(
      1,
      Math.min(50000, Math.round(Number(body.addPages) || 100))
    );
    const pin = await prisma.shopQuotaPin.update({
      where: { id: existing.id },
      data: { maxPages: { increment: addPages } },
    });
    return NextResponse.json({ ok: true, pin });
  }

  const updateData: {
    label?: string;
    maxPages?: number;
    allowColor?: boolean;
    isActive?: boolean;
  } = {};

  if (body.label !== undefined) {
    const label = String(body.label || "").trim().slice(0, 60);
    if (label.length < 2) {
      return NextResponse.json(
        { error: "Nama kelas/guru minimal 2 karakter." },
        { status: 400 }
      );
    }
    updateData.label = label;
  }

  if (body.maxPages !== undefined) {
    const maxPages = Math.round(Number(body.maxPages) || 0);
    if (maxPages < 1 || maxPages > 100000) {
      return NextResponse.json(
        { error: "Kuota lembar harus antara 1 dan 100.000 lembar." },
        { status: 400 }
      );
    }
    updateData.maxPages = maxPages;
  }

  if (body.allowColor !== undefined) {
    updateData.allowColor = Boolean(body.allowColor);
  }

  if (body.isActive !== undefined) {
    updateData.isActive = Boolean(body.isActive);
  }

  const pin = await prisma.shopQuotaPin.update({
    where: { id: existing.id },
    data: updateData,
  });

  return NextResponse.json({ ok: true, pin });
}

export async function DELETE(req: Request) {
  const shop = await getCurrentShop();
  if (!shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  let id = String(url.searchParams.get("id") || "").trim();
  if (!id) {
    const body = await req.json().catch(() => ({}));
    id = String(body.id || "").trim();
  }

  if (!id) {
    return NextResponse.json(
      { error: "ID PIN kuota wajib diisi." },
      { status: 400 }
    );
  }

  const existing = await prisma.shopQuotaPin.findFirst({
    where: { id, shopId: shop.id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "PIN kuota tidak ditemukan." },
      { status: 404 }
    );
  }

  await prisma.shopQuotaPin.delete({
    where: { id: existing.id },
  });

  return NextResponse.json({ ok: true });
}
