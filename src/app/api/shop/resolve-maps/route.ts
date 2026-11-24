import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { getCurrentShop } from "@/lib/auth";
import { resolveMapsUrlCoordinates } from "@/lib/maps-url-resolver";

export async function POST(req: Request) {
  const [shop, admin] = await Promise.all([getCurrentShop(), getCurrentAdmin()]);
  if (!shop && !admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const rawUrl = String(body?.url || "").trim();
    if (!rawUrl) {
      return NextResponse.json(
        { error: "Masukkan link Google Maps terlebih dahulu." },
        { status: 400 }
      );
    }

    const resolved = await resolveMapsUrlCoordinates(rawUrl);
    if (!resolved) {
      return NextResponse.json(
        {
          error:
            "Titik koordinat tidak ditemukan dari link tersebut. Gunakan link Google Maps resmi atau pilih titik langsung di peta.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ok: true,
      latitude: resolved.latitude,
      longitude: resolved.longitude,
      resolvedUrl: resolved.resolvedUrl,
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal membaca link Google Maps." },
      { status: 500 }
    );
  }
}
