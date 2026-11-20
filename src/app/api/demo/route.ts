import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, whatsapp, shopName, address, email } = body;

    if (!name || !whatsapp || !shopName) {
      return NextResponse.json(
        { error: "Nama, nomor WhatsApp, dan nama toko wajib diisi." },
        { status: 400 }
      );
    }

    const demo = await prisma.demoRequest.create({
      data: {
        name: String(name).trim(),
        whatsapp: String(whatsapp).trim(),
        shopName: String(shopName).trim(),
        address: String(address || "").trim(),
        email: String(email || "").trim(),
      },
    });

    return NextResponse.json(
      {
        ok: true,
        id: demo.id,
        message:
          "Permintaan demo berhasil dicatat! Silakan daftarkan toko Anda untuk langsung memulai.",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Demo request error:", err);
    return NextResponse.json(
      { error: "Gagal mengirim permintaan demo." },
      { status: 500 }
    );
  }
}
