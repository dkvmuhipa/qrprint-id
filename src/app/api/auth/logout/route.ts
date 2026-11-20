import { NextResponse } from "next/server";
import { clearShopSession } from "@/lib/auth";

export async function POST() {
  await clearShopSession();
  return NextResponse.json({ ok: true });
}
