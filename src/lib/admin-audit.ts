import { prisma } from "@/lib/prisma";

export async function recordAdminAudit(params: {
  adminEmail: string;
  action: string;
  target?: string;
  details?: string;
}): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminEmail: String(params.adminEmail || "admin").slice(0, 120),
        action: String(params.action || "UNKNOWN").slice(0, 64),
        target: String(params.target || "").slice(0, 160),
        details: String(params.details || "").slice(0, 500),
      },
    });
  } catch (err) {
    console.error("Failed to record admin audit log:", err);
  }
}
