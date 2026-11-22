import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { detectVerifiedFileType } from "@/lib/storage";
import { analyzePdfColorPages } from "@/lib/pdf-color-detect";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(req: Request) {
  try {
    const rl = checkRateLimit("public_analyze_color", req, 25, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Terlalu banyak permintaan analisis warna. Coba lagi dalam ${rl.retryAfterSec} detik.`,
        },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "File PDF wajib disertakan." },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 20 MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const verified = detectVerifiedFileType(buffer);
    if (!verified || verified.mimeType !== "application/pdf") {
      // Images are treated as 1 color page
      if (verified && verified.mimeType.startsWith("image/")) {
        return NextResponse.json({
          totalPages: 1,
          colorPageNumbers: [1],
          bwPageNumbers: [],
          colorCount: 1,
          bwCount: 0,
          detectedBy: "image",
        });
      }
      return NextResponse.json(
        { error: "File harus berupa PDF atau gambar valid." },
        { status: 400 }
      );
    }

    const result = await analyzePdfColorPages(buffer);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("Analyze color error:", err);
    return NextResponse.json(
      { error: "Gagal menganalisis warna dokumen." },
      { status: 500 }
    );
  }
}
