import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { setShopSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateNewExpiryDate,
  generateInvoiceCode,
  getPlanDef,
} from "@/lib/plans";
import { generateAgentKey } from "@/lib/utils";

export async function PATCH(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      action,
      shopId,
      plan,
      invoiceId,
      demoId,
      demoStatus,
      extraDays,
      newPassword,
    } = body;

    // 1. Approve pending SubscriptionInvoice
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
      const baseExpiry =
        inv.shop.plan === "DEMO" ? null : inv.shop.planExpiresAt;
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

    // 2. Cancel pending SubscriptionInvoice
    if (action === "CANCEL_INVOICE" && invoiceId) {
      await prisma.subscriptionInvoice.update({
        where: { id: invoiceId },
        data: { status: "CANCELLED" },
      });
      return NextResponse.json({
        ok: true,
        message: "Tagihan langganan telah dibatalkan.",
      });
    }

    // 3. Manual Plan Activation / Upgrade
    if (action === "ACTIVATE_PLAN" && shopId && plan) {
      const shop = await prisma.shop.findUnique({ where: { id: shopId } });
      if (!shop) {
        return NextResponse.json(
          { error: "Toko tidak ditemukan." },
          { status: 404 }
        );
      }

      const planDef = getPlanDef(plan);
      const baseExpiry = shop.plan === "DEMO" ? null : shop.planExpiresAt;
      const newExpiresAt = calculateNewExpiryDate(
        baseExpiry,
        planDef.durationDays
      );

      if (planDef.price > 0) {
        await prisma.$transaction([
          prisma.shop.update({
            where: { id: shop.id },
            data: {
              plan: planDef.id,
              planStatus: "ACTIVE",
              planExpiresAt: newExpiresAt,
            },
          }),
          prisma.subscriptionInvoice.create({
            data: {
              invoiceCode: generateInvoiceCode(),
              shopId: shop.id,
              plan: planDef.id,
              amount: planDef.price,
              durationDays: planDef.durationDays,
              paymentProvider: "MANUAL_ADMIN",
              status: "PAID",
              paidAt: new Date(),
            },
          }),
        ]);
      } else {
        await prisma.shop.update({
          where: { id: shop.id },
          data: {
            plan: planDef.id,
            planStatus: "ACTIVE",
            planExpiresAt: newExpiresAt,
          },
        });
      }

      return NextResponse.json({
        ok: true,
        message: `Paket ${planDef.name} berhasil diaktifkan untuk ${shop.name}.`,
      });
    }

    // 4. Extend shop expiry by custom days (+7, +30, +365) without charging
    if (action === "EXTEND_DAYS" && shopId && Number(extraDays) > 0) {
      const shop = await prisma.shop.findUnique({ where: { id: shopId } });
      if (!shop) {
        return NextResponse.json(
          { error: "Toko tidak ditemukan." },
          { status: 404 }
        );
      }
      const days = Math.min(1825, Math.max(1, Number(extraDays)));
      const newExpiresAt = calculateNewExpiryDate(shop.planExpiresAt, days);
      await prisma.shop.update({
        where: { id: shop.id },
        data: {
          planStatus: "ACTIVE",
          planExpiresAt: newExpiresAt,
        },
      });
      return NextResponse.json({
        ok: true,
        message: `Masa aktif ${shop.name} diperpanjang +${days} hari.`,
      });
    }

    // 5. Reset shop owner password
    if (action === "RESET_PASSWORD" && shopId) {
      const cleanPass = String(newPassword || "").trim();
      if (cleanPass.length < 4) {
        return NextResponse.json(
          { error: "Kata sandi baru minimal 4 karakter." },
          { status: 400 }
        );
      }
      const hash = await bcrypt.hash(cleanPass, 10);
      const shop = await prisma.shop.update({
        where: { id: shopId },
        data: { passwordHash: hash },
      });
      return NextResponse.json({
        ok: true,
        message: `Kata sandi untuk ${shop.name} (${shop.email}) berhasil diatur ulang.`,
      });
    }

    // 6. Regenerate shop Windows Agent Key
    if (action === "REGENERATE_AGENT_KEY" && shopId) {
      const newKey = generateAgentKey();
      const shop = await prisma.shop.update({
        where: { id: shopId },
        data: { agentKey: newKey },
      });
      return NextResponse.json({
        ok: true,
        agentKey: newKey,
        message: `Agent Key untuk ${shop.name} telah diperbarui.`,
      });
    }

    // 7. Impersonate Shop (Login directly as Shop Owner for support troubleshooting)
    if (action === "IMPERSONATE_SHOP" && shopId) {
      const shop = await prisma.shop.findUnique({ where: { id: shopId } });
      if (!shop) {
        return NextResponse.json(
          { error: "Toko tidak ditemukan." },
          { status: 404 }
        );
      }
      await setShopSession(shop.id);
      return NextResponse.json({
        ok: true,
        redirectUrl: "/dashboard",
        message: `Berhasil masuk ke sesi dashboard ${shop.name}.`,
      });
    }

    // 8. Suspend / Expire a Shop
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

    // 9. Delete a Shop permanently (spam / test cleanup)
    if (action === "DELETE_SHOP" && shopId) {
      const shop = await prisma.shop.delete({ where: { id: shopId } });
      return NextResponse.json({
        ok: true,
        message: `Akun toko ${shop.name} (${shop.shopCode}) telah dihapus permanen.`,
      });
    }

    // 10. Update or Delete Demo Request
    if (action === "UPDATE_DEMO_STATUS" && demoId && demoStatus) {
      await prisma.demoRequest.update({
        where: { id: demoId },
        data: { status: String(demoStatus) },
      });
      return NextResponse.json({
        ok: true,
        message: "Status prospek demo diperbarui.",
      });
    }

    if (action === "DELETE_DEMO" && demoId) {
      await prisma.demoRequest.delete({ where: { id: demoId } });
      return NextResponse.json({
        ok: true,
        message: "Data permintaan demo dihapus.",
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
