import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      app: "Ngeprint by Gellona Teknologi",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Health check error:", err);
    return NextResponse.json(
      { ok: false, database: "error" },
      { status: 500 }
    );
  }
}
