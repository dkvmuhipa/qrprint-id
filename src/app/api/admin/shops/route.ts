import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  calculateNewExpiryDate,
  generateInvoiceCode,
  getPlanDef,
} from "@/lib/plans";

export async function PATCH(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, shopId, plan, invoiceId, durationDays } = body;

    // 1. Approve a pending SubscriptionInvoice manually (e.g. customer paid via direct bank transfer / WhatsApp)
    if (action === "APPROVE_INVOICE" && invoiceId) {
      const inv = await prisma.subscriptionInvoice.findUnique({
        where: { id: invoiceId },
        include: { shop: true },
      });
      if (!inv) {
        return NextResponse.json(
          { error: "Invoice tidak ditemukan." },
          { status: 404 }
        );
      }

      const planDef = getPlanDef(inv.plan);
      const baseExpiry = inv.shop.plan === "DEMO" ? null : inv.shop.planExpiresAt;
      const newExpiresAt = calculateNewExpiryDate(
        baseExpiry,
        planDef.durationDays
      );

      await prisma.$transaction([
        prisma.subscriptionInvoice.update({
          where: { id: inv.id },
          data: { status: "PAID", paidAt: new Date() },
        }),
        prisma.shop.update({
          where: { id: inv.shopId },
          data: {
            plan: planDef.id,
            planStatus: "ACTIVE",
            planExpiresAt: newExpiresAt,
          },
        }),
      ]);

      return NextResponse.json({
        ok: true,
        message: `Invoice ${inv.invoiceCode} disetujui. Paket ${planDef.name} aktif untuk ${inv.shop.name}.`,
      });
    }

    // 2. Manual Plan Activation / Upgrade / Renewal for a Shop by Super Admin
    if (action === "ACTIVATE_PLAN" && shopId && plan) {
      const shop = await prisma.shop.findUnique({ where: { id: shopId } });
      if (!shop) {
        return NextResponse.json(
          { error: "Toko tidak ditemukan." },
          { status: 404 }
        );
      }

      const planDef = getPlanDef(plan);
      const customDays =
        durationDays !== undefined ? Number(durationDays) : planDef.durationDays;
      const baseExpiry = shop.plan === "DEMO" ? null : shop.planExpiresAt;
      const newExpiresAt = calculateNewExpiryDate(
        baseExpiry,
        customDays && customDays > 0 ? customDays : planDef.durationDays
      );

      const txOps = [
        prisma.shop.update({
          where: { id: shop.id },
          data: {
            plan: planDef.id,
            planStatus: "ACTIVE",
            planExpiresAt: newExpiresAt,
          },
        }),
      ];

      // Record a PAID manual invoice if it's a paid plan
      if (planDef.price > 0) {
        await prisma.$transaction([
          ...txOps,
          prisma.subscriptionInvoice.create({
            data: {
              invoiceCode: generateInvoiceCode(),
              shopId: shop.id,
              plan: planDef.id,
              amount: planDef.price,
              durationDays: customDays || planDef.durationDays,
              paymentProvider: "MANUAL_ADMIN",
              status: "PAID",
              paidAt: new Date(),
            },
          }),
        ]);
      } else {
        await prisma.$transaction(txOps);
      }

      return NextResponse.json({
        ok: true,
        message: `Paket ${planDef.name} berhasil diaktifkan untuk ${shop.name}.`,
      });
    }

    // 3. Suspend / Expire a Shop's subscription
    if (action === "SUSPEND_SHOP" && shopId) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await prisma.shop.update({
        where: { id: shopId },
        data: {
          planStatus: "EXPIRED",
          planExpiresAt: yesterday,
        },
      });
      return NextResponse.json({
        ok: true,
        message: "Langganan toko telah dinonaktifkan.",
      });
    }

    return NextResponse.json(
      { error: "Aksi admin tidak valid." },
      { status: 400 }
    );
  } catch (err) {
    console.error("Admin shop action error:", err);
    return NextResponse.json(
      { error: "Gagal memproses aksi Super Admin." },
      { status: 500 }
    );
  }
}
