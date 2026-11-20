import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setShopSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateAgentKey, generateShopCode } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const rl = checkRateLimit("auth_register", req, 5, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Terlalu banyak pendaftaran dari perangkat ini. Coba lagi dalam ${rl.retryAfterSec} detik.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      name,
      ownerName,
      email,
      phone,
      address,
      password,
      bwPrice,
      colorPrice,
      plan,
    } = body;

    if (!name || !email || !phone || !password || password.length < 4) {
      return NextResponse.json(
        { error: "Mohon lengkapi semua data wajib (password minimal 4 karakter)." },
        { status: 400 }
      );
    }

    const existing = await prisma.shop.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email ini sudah terdaftar. Silakan login." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const shopCode = generateShopCode();
    const agentKey = generateAgentKey();

    const shop = await prisma.shop.create({
      data: {
        shopCode,
        name: name.trim(),
        ownerName: (ownerName || name).trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: (address || "Indonesia").trim(),
        passwordHash,
        plan: plan || "PRO",
        bwPrice: Math.max(100, Number(bwPrice) || 500),
        colorPrice: Math.max(200, Number(colorPrice) || 1500),
        agentKey,
        qrisName: `QRIS ${name.trim().toUpperCase()}`,
      },
    });

    await setShopSession(shop.id);

    return NextResponse.json(
      {
        shop: {
          id: shop.id,
          shopCode: shop.shopCode,
          name: shop.name,
          email: shop.email,
          plan: shop.plan,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Gagal mendaftarkan toko. Coba lagi." },
      { status: 500 }
    );
  }
}
