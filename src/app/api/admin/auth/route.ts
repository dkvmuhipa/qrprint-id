import { NextResponse } from "next/server";
import {
  clearAdminSession,
  setAdminSession,
  verifyAdminCredentials,
} from "@/lib/admin-auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const rl = checkRateLimit("admin_login", req, 10, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: `Terlalu banyak percobaan login admin. Coba lagi dalam ${rl.retryAfterSec} detik.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const email = String(body.email || "");
    const password = String(body.password || "");

    if (!verifyAdminCredentials(email, password)) {
      return NextResponse.json(
        { error: "Email atau kata sandi Super Admin tidak sesuai." },
        { status: 401 }
      );
    }

    await setAdminSession(email);
    return NextResponse.json({ ok: true, email });
  } catch {
    return NextResponse.json(
      { error: "Gagal memproses login admin." },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  await clearAdminSession();
  return NextResponse.json({ ok: true });
}
