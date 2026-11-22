import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { setShopSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildShopUpdateForPaidInvoice,
  calculateNewExpiryDate,
  generateInvoiceCode,
  getPlanDef,
} from "@/lib/plans";
import {
  generateAgentKey,
  generateShopSlugFromName,
  isValidShopSlug,
  sanitizeShopSlug,
} from "@/lib/utils";
import { expireStalePendingJobs } from "@/lib/jobs-cleanup";
import { rewardReferrerIfEligible } from "@/lib/referral";

export async function POST(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const cleanName = String(body.name || "").trim().slice(0, 80);
    const cleanOwner = String(body.ownerName || cleanName).trim().slice(0, 80);
    const cleanEmail = String(body.email || "").trim().toLowerCase().slice(0, 120);
    const cleanPhone = String(body.phone || "").replace(/\D/g, "").slice(0, 15);
    const cleanAddress = String(body.address || "").trim().slice(0, 200) || "Indonesia";
    const rawPassword = String(body.password || "").trim();
    const isTestShop = Boolean(body.isTestShop);
    const requestedPlan = getPlanDef(isTestShop ? "PREMIUM" : body.plan || "DEMO");
    const demoId = body.demoId ? String(body.demoId) : null;

    if (!cleanName || !cleanEmail || !cleanPhone || rawPassword.length < 6) {
      return NextResponse.json(
        { error: "Nama toko, email, WhatsApp, dan sandi (min. 6 karakter) wajib diisi." },
        { status: 400 }
      );
    }

    const existingEmail = await prisma.shop.findUnique({
      where: { email: cleanEmail },
      select: { id: true },
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: "Email ini sudah terdaftar di toko lain." },
        { status: 409 }
      );
    }

    let shopCode = body.shopCode
      ? sanitizeShopSlug(String(body.shopCode))
      : generateShopSlugFromName(cleanName);
    if (!isValidShopSlug(shopCode)) {
      shopCode = generateShopSlugFromName(cleanName);
    }

    const existingSlug = await prisma.shop.findFirst({
      where: {
        OR: [{ shopCode }, { shopCode: shopCode.toUpperCase() }],
      },
      select: { id: true },
    });
    if (existingSlug) {
      shopCode = `${shopCode.slice(0, 26)}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const agentKey = generateAgentKey();
    const expiresAt = calculateNewExpiryDate(null, requestedPlan.durationDays);

    const shop = await prisma.shop.create({
      data: {
        shopCode,
        name: cleanName,
        ownerName: cleanOwner,
        email: cleanEmail,
        phone: cleanPhone,
        address: cleanAddress,
        passwordHash,
        plan: requestedPlan.id,
        planStatus: "ACTIVE",
        planExpiresAt: expiresAt,
        isTestShop,
        hasListenerAddon: isTestShop ? true : false,
        bwPrice: Math.max(100, Number(body.bwPrice) || 500),
        colorPrice: Math.max(100, Number(body.colorPrice) || 1500),
        agentKey,
        qrisName: `QRIS ${cleanName.toUpperCase()}`,
      },
    });

    if (requestedPlan.price > 0 && !isTestShop) {
      await prisma.subscriptionInvoice.create({
        data: {
          invoiceCode: generateInvoiceCode(),
          shopId: shop.id,
          plan: requestedPlan.id,
          amount: requestedPlan.price,
          durationDays: requestedPlan.durationDays,
          paymentProvider: "MANUAL_ADMIN",
          status: "PAID",
          paidAt: new Date(),
        },
      });
    }

    if (demoId) {
      await prisma.demoRequest
        .update({
          where: { id: demoId },
          data: { status: "CONVERTED" },
        })
        .catch(() => null);
    }

    return NextResponse.json(
      {
        ok: true,
        shop,
        message: `Toko ${shop.name} (/s/${shop.shopCode}) berhasil dibuat dengan paket ${requestedPlan.name}.`,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Admin create shop error:", err);
    return NextResponse.json(
      { error: "Gagal membuat akun toko baru." },
      { status: 500 }
    );
  }
}

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
      if (!inv || !inv.shop || !inv.shopId) {
        return NextResponse.json(
          { error: "Invoice atau toko terkait tidak ditemukan." },
          { status: 404 }
        );
      }

      const fulfillment = buildShopUpdateForPaidInvoice(inv.plan, inv.shop);

      await prisma.$transaction([
        prisma.subscriptionInvoice.update({
          where: { id: inv.id },
          data: { status: "PAID", paidAt: new Date() },
        }),
        prisma.shop.update({
          where: { id: inv.shopId },
          data: fulfillment.data,
        }),
      ]);

      await rewardReferrerIfEligible(inv.shopId, inv.plan).catch(() => null);

      return NextResponse.json({
        ok: true,
        message: `Invoice ${inv.invoiceCode} disetujui. ${fulfillment.label} aktif untuk ${inv.shop.name}.`,
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

    // 9. Delete a Shop while PRESERVING all PAID transactions (invoices & print jobs) for accounting
    if (action === "DELETE_SHOP" && shopId) {
      const targetShop = await prisma.shop.findUnique({ where: { id: shopId } });
      if (!targetShop) {
        return NextResponse.json(
          { error: "Toko tidak ditemukan." },
          { status: 404 }
        );
      }

      // Snapshot shop identity on all PAID invoices & PAID print jobs so financial reports stay 100% intact
      const [paidInvCount, paidJobCount] = await Promise.all([
        prisma.subscriptionInvoice.updateMany({
          where: { shopId, status: "PAID" },
          data: {
            shopNameSnapshot: targetShop.name,
            shopCodeSnapshot: targetShop.shopCode,
          },
        }),
        prisma.printJob.updateMany({
          where: { shopId, paymentStatus: "PAID" },
          data: {
            shopNameSnapshot: targetShop.name,
            shopCodeSnapshot: targetShop.shopCode,
          },
        }),
      ]);

      // Clean up unpaid/cancelled invoices & jobs before deleting the shop
      await prisma.subscriptionInvoice.deleteMany({
        where: { shopId, status: { not: "PAID" } },
      });
      await prisma.printJob.deleteMany({
        where: { shopId, paymentStatus: { not: "PAID" } },
      });

      await prisma.shop.delete({ where: { id: shopId } });

      return NextResponse.json({
        ok: true,
        message: `Akun toko ${targetShop.name} (${targetShop.shopCode}) dihapus. ${paidInvCount.count} invoice lunas & ${paidJobCount.count} transaksi cetak lunas tetap disimpan di pembukuan.`,
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

    // 11. Update Shop URL Slug / Basic Profile from Admin Drawer
    if (action === "UPDATE_SHOP_PROFILE" && shopId) {
      const shop = await prisma.shop.findUnique({ where: { id: shopId } });
      if (!shop) {
        return NextResponse.json(
          { error: "Toko tidak ditemukan." },
          { status: 404 }
        );
      }

      let nextCode = shop.shopCode;
      if (body.shopCode !== undefined) {
        const cleaned = sanitizeShopSlug(String(body.shopCode));
        if (!isValidShopSlug(cleaned)) {
          return NextResponse.json(
            {
              error:
                "Kode URL toko tidak valid (3–32 karakter huruf kecil, angka, atau tanda hubung).",
            },
            { status: 400 }
          );
        }
        if (cleaned.toLowerCase() !== shop.shopCode.toLowerCase()) {
          const conflict = await prisma.shop.findFirst({
            where: {
              id: { not: shop.id },
              OR: [{ shopCode: cleaned }, { shopCode: cleaned.toUpperCase() }],
            },
            select: { id: true },
          });
          if (conflict) {
            return NextResponse.json(
              { error: `Kode URL "/s/${cleaned}" sudah dipakai toko lain.` },
              { status: 409 }
            );
          }
        }
        nextCode = cleaned;
      }

      const updated = await prisma.shop.update({
        where: { id: shop.id },
        data: {
          shopCode: nextCode,
          name: body.name ? String(body.name).trim().slice(0, 80) : shop.name,
          phone: body.phone ? String(body.phone).trim().slice(0, 20) : shop.phone,
        },
      });
      return NextResponse.json({
        ok: true,
        message: `Profil ${updated.name} (/s/${updated.shopCode}) diperbarui.`,
      });
    }

    // 12. Global cleanup of abandoned pending print jobs (> 30 min)
    if (action === "CLEANUP_STALE_JOBS") {
      const cleaned = await expireStalePendingJobs();
      return NextResponse.json({
        ok: true,
        cleaned,
        message:
          cleaned > 0
            ? `${cleaned} antrean terbengkalai (> 30 menit) dibatalkan & file fisiknya dihapus.`
            : "Tidak ada antrean terbengkalai yang perlu dibersihkan.",
      });
    }

    // 13. Toggle Ngeprint Listener Add-On (+Rp 25.000/bln for Bulanan / Demo shops)
    if (action === "TOGGLE_LISTENER_ADDON" && shopId) {
      const shop = await prisma.shop.findUnique({ where: { id: shopId } });
      if (!shop) {
        return NextResponse.json(
          { error: "Toko tidak ditemukan." },
          { status: 404 }
        );
      }
      const nextVal = !shop.hasListenerAddon;
      await prisma.shop.update({
        where: { id: shop.id },
        data: { hasListenerAddon: nextVal },
      });
      return NextResponse.json({
        ok: true,
        hasListenerAddon: nextVal,
        message: nextVal
          ? `Add-On Ngeprint Listener diaktifkan untuk ${shop.name}.`
          : `Add-On Ngeprint Listener dinonaktifkan untuk ${shop.name}.`,
      });
    }

    // 14. Adjust Extra Printer Slots Add-On (+Rp 20.000/bln per slot)
    if (action === "SET_EXTRA_PRINTER_SLOTS" && shopId) {
      const shop = await prisma.shop.findUnique({ where: { id: shopId } });
      if (!shop) {
        return NextResponse.json(
          { error: "Toko tidak ditemukan." },
          { status: 404 }
        );
      }
      const nextSlots = Math.min(
        20,
        Math.max(0, Math.floor(Number(body.extraPrinterSlots) || 0))
      );
      await prisma.shop.update({
        where: { id: shop.id },
        data: { extraPrinterSlots: nextSlots },
      });
      return NextResponse.json({
        ok: true,
        extraPrinterSlots: nextSlots,
        message: `Add-On Slot Printer ${shop.name} diatur menjadi +${nextSlots} slot.`,
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
