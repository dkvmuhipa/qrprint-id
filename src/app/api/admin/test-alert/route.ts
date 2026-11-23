import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import {
  isTelegramAlertConfigured,
  sendFounderAlert,
} from "@/lib/founder-alert";

export async function POST() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isTelegramAlertConfigured()) {
    return NextResponse.json(
      {
        error:
          "TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID belum diisi di file .env server VPS.",
      },
      { status: 400 }
    );
  }

  const nowStr = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const result = await sendFounderAlert(
    [
      "<b>✅ Tes Notifikasi Founder — Ngeprint</b>",
      `Server: <code>ngeprint.gellona.web.id</code>`,
      `Waktu: ${nowStr} WITA`,
      "Status: Bot Telegram terhubung & siap mengirim alert toko baru, tagihan SaaS, serta kesehatan VPS.",
    ].join("\n")
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || "Gagal mengirim pesan tes ke Telegram." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Pesan tes berhasil dikirim ke Telegram Anda!",
  });
}
