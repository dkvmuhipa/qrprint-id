import { NextResponse } from "next/server";
import { getCurrentShop } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_CATEGORIES = new Set([
  "LAMINATING",
  "A3_PRINT",
  "STICKER",
  "BANNER",
  "SCAN",
  "OTHER",
]);

const PRESET_SERVICES = [
  {
    name: "Laminating A4",
    category: "LAMINATING",
    description: "Laminating plastik bening ukuran A4/F4",
    price: 3000,
    unitLabel: "lembar",
    requiresFile: false,
  },
  {
    name: "Cetak A3+ Art Paper 260gsm",
    category: "A3_PRINT",
    description: "Cetak poster / brosur warna tajam ukuran A3+",
    price: 6000,
    unitLabel: "lembar",
    requiresFile: true,
  },
  {
    name: "Cetak Stiker Vinyl A3+",
    category: "STICKER",
    description: "Stiker vinyl tahan air ukuran A3+ siap potong",
    price: 12000,
    unitLabel: "lembar",
    requiresFile: true,
  },
  {
    name: "Scan Dokumen ke PDF",
    category: "SCAN",
    description: "Scan dokumen fisik dikirim via WhatsApp/PDF",
    price: 2000,
    unitLabel: "halaman",
    requiresFile: false,
  },
];

export async function GET() {
  const shop = await getCurrentShop();
  if (!shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const services = await prisma.shopCustomService.findMany({
    where: { shopId: shop.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ services });
}

export async function POST(req: Request) {
  const shop = await getCurrentShop();
  if (!shop) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  if (body.action === "SEED_PRESETS") {
    const existing = await prisma.shopCustomService.findMany({
      where: { shopId: shop.id },
      select: { name: true },
    });
    const existingNames = new Set(
      existing.map((item) => item.name.trim().toLowerCase())
    );
    const toCreate = PRESET_SERVICES.filter(
      (preset) => !existingNames.has(preset.name.toLowerCase())
    );

    if (existing.length + toCreate.length > 30) {
      return NextResponse.json(
        { error: "Maksimal 30 layanan custom per toko." },
        { status: 400 }
      );
    }

    for (const preset of toCreate) {
      await prisma.shopCustomService.create({
        data: {
          shopId: shop.id,
          ...preset,
          isActive: true,
        },
      });
    }

    const services = await prisma.shopCustomService.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      ok: true,
      addedCount: toCreate.length,
      services,
    });
  }

  const currentCount = await prisma.shopCustomService.count({
    where: { shopId: shop.id },
  });
  if (currentCount >= 30) {
    return NextResponse.json(
      { error: "Maksimal 30 layanan custom per toko." },
      { status: 400 }
    );
  }

  const name = String(body.name || "").trim().slice(0, 80);
  if (name.length < 2) {
    return NextResponse.json(
      { error: "Nama layanan minimal 2 karakter." },
      { status: 400 }
    );
  }

  const price = Math.round(Number(body.price) || 0);
  if (price < 500 || price > 10_000_000) {
    return NextResponse.json(
      { error: "Harga layanan harus antara Rp 500 dan Rp 10.000.000." },
      { status: 400 }
    );
  }

  const rawCategory = String(body.category || "OTHER").toUpperCase();
  const category = VALID_CATEGORIES.has(rawCategory) ? rawCategory : "OTHER";
  const unitLabel =
    String(body.unitLabel || "pcs").trim().slice(0, 20) || "pcs";
  const description = String(body.description || "").trim().slice(0, 160);
  const requiresFile = Boolean(body.requiresFile);

  const service = await prisma.shopCustomService.create({
    data: {
      shopId: shop.id,
      name,
      category,
      description,
      price,
      unitLabel,
      requiresFile,
      isActive: true,
    },
  });

  return NextResponse.json({ ok: true, service }, { status: 201 });
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
      { error: "ID layanan wajib diisi." },
      { status: 400 }
    );
  }

  const existing = await prisma.shopCustomService.findFirst({
    where: { id, shopId: shop.id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Layanan tidak ditemukan." },
      { status: 404 }
    );
  }

  const updateData: {
    name?: string;
    category?: string;
    description?: string;
    price?: number;
    unitLabel?: string;
    requiresFile?: boolean;
    isActive?: boolean;
  } = {};

  if (body.name !== undefined) {
    const name = String(body.name || "").trim().slice(0, 80);
    if (name.length < 2) {
      return NextResponse.json(
        { error: "Nama layanan minimal 2 karakter." },
        { status: 400 }
      );
    }
    updateData.name = name;
  }

  if (body.price !== undefined) {
    const price = Math.round(Number(body.price) || 0);
    if (price < 500 || price > 10_000_000) {
      return NextResponse.json(
        { error: "Harga layanan harus antara Rp 500 dan Rp 10.000.000." },
        { status: 400 }
      );
    }
    updateData.price = price;
  }

  if (body.category !== undefined) {
    const rawCat = String(body.category || "OTHER").toUpperCase();
    updateData.category = VALID_CATEGORIES.has(rawCat) ? rawCat : "OTHER";
  }

  if (body.unitLabel !== undefined) {
    updateData.unitLabel =
      String(body.unitLabel || "pcs").trim().slice(0, 20) || "pcs";
  }

  if (body.description !== undefined) {
    updateData.description = String(body.description || "").trim().slice(0, 160);
  }

  if (body.requiresFile !== undefined) {
    updateData.requiresFile = Boolean(body.requiresFile);
  }

  if (body.isActive !== undefined) {
    updateData.isActive = Boolean(body.isActive);
  }

  const service = await prisma.shopCustomService.update({
    where: { id: existing.id },
    data: updateData,
  });

  return NextResponse.json({ ok: true, service });
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
      { error: "ID layanan wajib diisi." },
      { status: 400 }
    );
  }

  const existing = await prisma.shopCustomService.findFirst({
    where: { id, shopId: shop.id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Layanan tidak ditemukan." },
      { status: 404 }
    );
  }

  await prisma.shopCustomService.delete({
    where: { id: existing.id },
  });

  return NextResponse.json({ ok: true });
}
