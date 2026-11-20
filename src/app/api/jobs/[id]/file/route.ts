import fs from "fs/promises";
import { NextResponse } from "next/server";
import { getCurrentShop } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUploadFullPath } from "@/lib/storage";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const agentKey = req.headers.get("x-agent-key");

  let shopId: string | null = null;

  if (agentKey) {
    const shop = await prisma.shop.findUnique({ where: { agentKey } });
    if (shop) shopId = shop.id;
  } else {
    const shop = await getCurrentShop();
    if (shop) shopId = shop.id;
  }

  if (!shopId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = await prisma.printJob.findFirst({
    where: { id, shopId },
  });

  if (!job || !job.storedFilePath) {
    return NextResponse.json(
      { error: "File sudah dihapus dari server (Privacy by Design)." },
      { status: 404 }
    );
  }

  try {
    const fullPath = getUploadFullPath(job.storedFilePath);
    const fileBuffer = await fs.readFile(fullPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": job.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          job.fileName
        )}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "File tidak ditemukan di disk." },
      { status: 404 }
    );
  }
}
