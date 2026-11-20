import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setShopSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const rl = checkRateLimit("auth_login", req, 10, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Terlalu banyak percobaan login. Coba lagi dalam ${rl.retryAfterSec} detik.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const identifier = String(
      body.identifier || body.shopCode || body.email || ""
    ).trim();
    const password = String(body.password || "");

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Masukkan kode toko / email dan kata sandi." },
        { status: 400 }
      );
    }

    const shop = await prisma.shop.findFirst({
      where: {
        OR: [
          { shopCode: identifier },
          { shopCode: identifier.toLowerCase() },
          { shopCode: identifier.toUpperCase() },
          { email: identifier.toLowerCase() },
        ],
      },
    });

    if (!shop) {
      return NextResponse.json(
        { error: "Kode toko atau email tidak ditemukan." },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, shop.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Kata sandi salah. Silakan coba lagi." },
        { status: 401 }
      );
    }

    await setShopSession(shop.id);

    return NextResponse.json({
      shop: {
        id: shop.id,
        shopCode: shop.shopCode,
        name: shop.name,
        email: shop.email,
        plan: shop.plan,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat login." },
      { status: 500 }
    );
  }
}
