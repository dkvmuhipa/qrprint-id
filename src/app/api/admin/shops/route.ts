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
import { recordAdminAudit } from "@/lib/admin-audit";
import { isValidLatLng } from "@/lib/geo";
import { resolveMapsUrlCoordinates } from "@/lib/maps-url-resolver";

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
    const rawPlanUpper = String(body.plan || "DEMO").trim().toUpperCase();
    const isPerintisTrial = !isTestShop && rawPlanUpper === "PERINTIS_7D";
    const requestedPlan = getPlanDef(
      isTestShop ? "PREMIUM" : isPerintisTrial ? "BULANAN" : rawPlanUpper
    );
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
    const expiresAt = isPerintisTrial
      ? calculateNewExpiryDate(null, 7)
      : calculateNewExpiryDate(null, requestedPlan.durationDays);

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
        hasListenerAddon: isTestShop || isPerintisTrial ? true : false,
        hasPasFotoAddon: isTestShop ? true : false,
        bwPrice: Math.max(100, Number(body.bwPrice) || 500),
        colorPrice: Math.max(100, Number(body.colorPrice) || 1500),
        agentKey,
        qrisName: `QRIS ${cleanName.toUpperCase()}`,
      },
    });

    if (requestedPlan.price > 0 && !isTestShop && !isPerintisTrial) {
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

    await recordAdminAudit({
      adminEmail: admin.email,
      action: "CREATE_SHOP",
      target: `${shop.name} (/s/${shop.shopCode})`,
      details: isPerintisTrial
        ? "Paket Perintis Lapangan (Trial 7 Hari Full Fitur · Rp 0)"
        : `Paket ${requestedPlan.name}${isTestShop ? " · Testing" : ""}`,
    });

    return NextResponse.json(
      {
        ok: true,
        shop,
        message: isPerintisTrial
          ? `Toko ${shop.name} (/s/${shop.shopCode}) berhasil dibuat dengan Paket Perintis Lapangan (Trial 7 Hari Full Fitur).`
          : `Toko ${shop.name} (/s/${shop.shopCode}) berhasil dibuat dengan paket ${requestedPlan.name}.`,
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

      await recordAdminAudit({
        adminEmail: admin.email,
        action: "APPROVE_INVOICE",
        target: `${inv.shop.name} (${inv.invoiceCode})`,
        details: `${fulfillment.label} · Rp ${inv.amount.toLocaleString("id-ID")}`,
      });

      return NextResponse.json({
        ok: true,
        message: `Invoice ${inv.invoiceCode} disetujui. ${fulfillment.label} aktif untuk ${inv.shop.name}.`,
      });
    }

    // 2. Cancel pending SubscriptionInvoice
    if (action === "CANCEL_INVOICE" && invoiceId) {
      const inv = await prisma.subscriptionInvoice.update({
        where: { id: invoiceId },
        data: { status: "CANCELLED" },
        include: { shop: { select: { name: true } } },
      });
      await recordAdminAudit({
        adminEmail: admin.email,
        action: "CANCEL_INVOICE",
        target: `${inv.shop?.name || inv.shopNameSnapshot || "Toko"} (${inv.invoiceCode})`,
        details: `Paket ${inv.plan} · Rp ${inv.amount.toLocaleString("id-ID")}`,
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

      if (String(plan).toUpperCase() === "PERINTIS_7D") {
        const trialExpiry = calculateNewExpiryDate(null, 7);
        await prisma.shop.update({
          where: { id: shop.id },
          data: {
            plan: "BULANAN",
            planStatus: "ACTIVE",
            planExpiresAt: trialExpiry,
            hasListenerAddon: true,
          },
        });
        await recordAdminAudit({
          adminEmail: admin.email,
          action: "ACTIVATE_PLAN",
          target: `${shop.name} (/s/${shop.shopCode})`,
          details: "Aktifkan Paket Perintis Lapangan (7 Hari Full Fitur · Rp 0)",
        });
        return NextResponse.json({
          ok: true,
          message: `Paket Perintis Lapangan (7 Hari Full Fitur) berhasil diaktifkan untuk ${shop.name}.`,
        });
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
        message: await (async () => {
          await recordAdminAudit({
            adminEmail: admin.email,
            action: "ACTIVATE_PLAN",
            target: `${shop.name} (/s/${shop.shopCode})`,
            details: `Aktifkan paket ${planDef.name} (Rp ${planDef.price.toLocaleString("id-ID")})`,
          });
          return `Paket ${planDef.name} berhasil diaktifkan untuk ${shop.name}.`;
        })(),
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
      await recordAdminAudit({
        adminEmail: admin.email,
        action: "EXTEND_DAYS",
        target: `${shop.name} (/s/${shop.shopCode})`,
        details: `Perpanjang masa aktif +${days} hari`,
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
      await recordAdminAudit({
        adminEmail: admin.email,
        action: "RESET_PASSWORD",
        target: `${shop.name} (/s/${shop.shopCode})`,
        details: `Reset kata sandi akun ${shop.email}`,
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
      await recordAdminAudit({
        adminEmail: admin.email,
        action: "REGENERATE_AGENT_KEY",
        target: `${shop.name} (/s/${shop.shopCode})`,
        details: "Generate ulang Agent Key",
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
      await recordAdminAudit({
        adminEmail: admin.email,
        action: "IMPERSONATE_SHOP",
        target: `${shop.name} (/s/${shop.shopCode})`,
        details: "Buka sesi dashboard toko untuk bantuan teknis",
      });
      return NextResponse.json({
        ok: true,
        redirectUrl: "/dashboard",
        message: `Berhasil masuk ke sesi dashboard ${shop.name}.`,
      });
    }

    // 8. Suspend / Expire a Shop
    if (action === "SUSPEND_SHOP" && shopId) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const shop = await prisma.shop.update({
        where: { id: shopId },
        data: {
          planStatus: "EXPIRED",
          planExpiresAt: yesterday,
        },
      });
      await recordAdminAudit({
        adminEmail: admin.email,
        action: "SUSPEND_SHOP",
        target: `${shop.name} (/s/${shop.shopCode})`,
        details: "Nonaktifkan langganan toko",
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

      await recordAdminAudit({
        adminEmail: admin.email,
        action: "DELETE_SHOP",
        target: `${targetShop.name} (${targetShop.shopCode})`,
        details: `${paidInvCount.count} invoice & ${paidJobCount.count} job lunas dipertahankan`,
      });

      return NextResponse.json({
        ok: true,
        message: `Akun toko ${targetShop.name} (${targetShop.shopCode}) dihapus. ${paidInvCount.count} invoice lunas & ${paidJobCount.count} transaksi cetak lunas tetap disimpan di pembukuan.`,
      });
    }

    // 10. Update or Delete Demo Request
    if (action === "UPDATE_DEMO_STATUS" && demoId && demoStatus) {
      const d = await prisma.demoRequest.update({
        where: { id: demoId },
        data: { status: String(demoStatus) },
      });
      await recordAdminAudit({
        adminEmail: admin.email,
        action: "UPDATE_DEMO_STATUS",
        target: d.shopName,
        details: `Status diubah ke ${demoStatus}`,
      });
      return NextResponse.json({
        ok: true,
        message: "Status prospek demo diperbarui.",
      });
    }

    if (action === "DELETE_DEMO" && demoId) {
      const d = await prisma.demoRequest.delete({ where: { id: demoId } });
      await recordAdminAudit({
        adminEmail: admin.email,
        action: "DELETE_DEMO",
        target: d.shopName,
        details: `Hapus prospek ${d.name} (${d.whatsapp})`,
      });
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
      await recordAdminAudit({
        adminEmail: admin.email,
        action: "UPDATE_SHOP_PROFILE",
        target: `${updated.name} (/s/${updated.shopCode})`,
        details: `Slug /s/${updated.shopCode} · WA ${updated.phone}`,
      });
      return NextResponse.json({
        ok: true,
        message: `Profil ${updated.name} (/s/${updated.shopCode}) diperbarui.`,
      });
    }

    // 12. Global cleanup of abandoned pending print jobs (> 30 min)
    if (action === "CLEANUP_STALE_JOBS") {
      const cleaned = await expireStalePendingJobs();
      await recordAdminAudit({
        adminEmail: admin.email,
        action: "CLEANUP_STALE_JOBS",
        target: "global",
        details: `${cleaned} antrean >30m dibatalkan & file dihapus`,
      });
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
      await recordAdminAudit({
        adminEmail: admin.email,
        action: "TOGGLE_LISTENER_ADDON",
        target: `${shop.name} (/s/${shop.shopCode})`,
        details: nextVal ? "Aktifkan APK Listener" : "Nonaktifkan APK Listener",
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
      await recordAdminAudit({
        adminEmail: admin.email,
        action: "SET_EXTRA_PRINTER_SLOTS",
        target: `${shop.name} (/s/${shop.shopCode})`,
        details: `Slot tambahan diatur menjadi +${nextSlots}`,
      });
      return NextResponse.json({
        ok: true,
        extraPrinterSlots: nextSlots,
        message: `Add-On Slot Printer ${shop.name} diatur menjadi +${nextSlots} slot.`,
      });
    }

    // 15. Toggle visibility in Public Partner Directory (#mitra)
    if (action === "TOGGLE_DIRECTORY_VISIBILITY" && shopId) {
      const shop = await prisma.shop.findUnique({ where: { id: shopId } });
      if (!shop) {
        return NextResponse.json(
          { error: "Toko tidak ditemukan." },
          { status: 404 }
        );
      }
      const nextVal = !shop.showInDirectory;
      await prisma.shop.update({
        where: { id: shop.id },
        data: { showInDirectory: nextVal },
      });
      await recordAdminAudit({
        adminEmail: admin.email,
        action: "TOGGLE_DIRECTORY_VISIBILITY",
        target: `${shop.name} (/s/${shop.shopCode})`,
        details: nextVal ? "Tampilkan di Direktori" : "Sembunyikan dari Direktori",
      });
      return NextResponse.json({
        ok: true,
        showInDirectory: nextVal,
        message: nextVal
          ? `${shop.name} diizinkan tampil di direktori mitra beranda.`
          : `${shop.name} disembunyikan dari direktori mitra beranda.`,
      });
    }

    // 16. Pin / Feature a shop on Public Homepage (also allows approved DEMO showcase shops)
    if (action === "TOGGLE_FEATURED_PARTNER" && shopId) {
      const shop = await prisma.shop.findUnique({ where: { id: shopId } });
      if (!shop) {
        return NextResponse.json(
          { error: "Toko tidak ditemukan." },
          { status: 404 }
        );
      }
      const nextVal = !shop.isFeaturedPartner;
      await prisma.shop.update({
        where: { id: shop.id },
        data: {
          isFeaturedPartner: nextVal,
          ...(nextVal ? { showInDirectory: true } : {}),
        },
      });
      await recordAdminAudit({
        adminEmail: admin.email,
        action: "TOGGLE_FEATURED_PARTNER",
        target: `${shop.name} (/s/${shop.shopCode})`,
        details: nextVal ? "Pin Unggulan Beranda" : "Lepas Pin Unggulan",
      });
      return NextResponse.json({
        ok: true,
        isFeaturedPartner: nextVal,
        message: nextVal
          ? `${shop.name} dipin sebagai Unggulan Beranda (#mitra).`
          : `Pin Unggulan Beranda untuk ${shop.name} dilepas.`,
      });
    }

    // 17. Toggle Test/Simulation mode on an existing shop
    if (action === "TOGGLE_TEST_SHOP" && shopId) {
      const shop = await prisma.shop.findUnique({ where: { id: shopId } });
      if (!shop) {
        return NextResponse.json(
          { error: "Toko tidak ditemukan." },
          { status: 404 }
        );
      }
      const nextVal = !shop.isTestShop;
      await prisma.shop.update({
        where: { id: shop.id },
        data: { isTestShop: nextVal },
      });
      await recordAdminAudit({
        adminEmail: admin.email,
        action: "TOGGLE_TEST_SHOP",
        target: `${shop.name} (/s/${shop.shopCode})`,
        details: nextVal ? "Aktifkan Mode Testing" : "Nonaktifkan Mode Testing",
      });
      return NextResponse.json({
        ok: true,
        isTestShop: nextVal,
        message: nextVal
          ? `Mode Toko Testing / Simulasi diaktifkan untuk ${shop.name}.`
          : `Mode Toko Testing dinonaktifkan untuk ${shop.name}.`,
      });
    }

    // 18. Update Shop City, Google Maps Link & Coordinates from Admin Drawer
    if (action === "UPDATE_SHOP_LOCATION" && shopId) {
      const shop = await prisma.shop.findUnique({ where: { id: shopId } });
      if (!shop) {
        return NextResponse.json(
          { error: "Toko tidak ditemukan." },
          { status: 404 }
        );
      }

      const nextCity =
        body.city !== undefined
          ? String(body.city || "").trim().slice(0, 80)
          : shop.city;

      let nextMapsUrl = shop.mapsUrl || "";
      if (body.mapsUrl !== undefined) {
        const rawMaps = String(body.mapsUrl || "").trim().slice(0, 300);
        if (rawMaps !== "" && !/^https?:\/\//i.test(rawMaps)) {
          return NextResponse.json(
            { error: "Link Google Maps harus diawali https://" },
            { status: 400 }
          );
        }
        nextMapsUrl = rawMaps;
      }

      let nextLat: number | null | undefined = undefined;
      let nextLng: number | null | undefined = undefined;
      const clearCoords =
        body.latitude === null ||
        body.longitude === null ||
        body.latitude === "" ||
        body.longitude === "";

      if (clearCoords) {
        nextLat = null;
        nextLng = null;
      } else if (body.latitude !== undefined && body.longitude !== undefined) {
        const latNum = Number(body.latitude);
        const lngNum = Number(body.longitude);
        if (!isValidLatLng(latNum, lngNum)) {
          return NextResponse.json(
            { error: "Koordinat latitude/longitude tidak valid." },
            { status: 400 }
          );
        }
        nextLat = Number(latNum.toFixed(6));
        nextLng = Number(lngNum.toFixed(6));
      }

      const effLat = nextLat !== undefined ? nextLat : shop.latitude;
      const effLng = nextLng !== undefined ? nextLng : shop.longitude;
      if (nextMapsUrl && effLat == null && effLng == null && !clearCoords) {
        const resolved = await resolveMapsUrlCoordinates(nextMapsUrl).catch(
          () => null
        );
        if (resolved) {
          nextLat = resolved.latitude;
          nextLng = resolved.longitude;
        }
      }

      const updated = await prisma.shop.update({
        where: { id: shop.id },
        data: {
          city: nextCity,
          mapsUrl: nextMapsUrl,
          ...(nextLat !== undefined ? { latitude: nextLat } : {}),
          ...(nextLng !== undefined ? { longitude: nextLng } : {}),
        },
      });

      const hasCoords =
        updated.latitude != null && updated.longitude != null;

      await recordAdminAudit({
        adminEmail: admin.email,
        action: "UPDATE_SHOP_LOCATION",
        target: `${updated.name} (/s/${updated.shopCode})`,
        details: hasCoords
          ? `${updated.city || "-"} (${updated.latitude?.toFixed(4)}, ${updated.longitude?.toFixed(4)})`
          : `Kota: ${updated.city || "-"}`,
      });

      return NextResponse.json({
        ok: true,
        latitude: updated.latitude,
        longitude: updated.longitude,
        message: hasCoords
          ? `Lokasi & koordinat peta ${updated.name} diperbarui (${updated.latitude?.toFixed(5)}, ${updated.longitude?.toFixed(5)}).`
          : `Info lokasi ${updated.name} diperbarui.`,
      });
    }

    // 19. Create Manual SaaS Invoice (optionally mark PAID & activate plan immediately)
    if (action === "CREATE_MANUAL_INVOICE") {
      if (!shopId) {
        return NextResponse.json(
          { error: "Pilih toko mitra terlebih dahulu." },
          { status: 400 }
        );
      }
      const shop = await prisma.shop.findUnique({ where: { id: shopId } });
      if (!shop) {
        return NextResponse.json(
          { error: "Toko tidak ditemukan." },
          { status: 404 }
        );
      }

      const planCode = String(plan || "PRO").trim().toUpperCase();
      const planDef = getPlanDef(planCode);
      const rawAmount =
        body.amount !== undefined && body.amount !== ""
          ? Number(body.amount)
          : planDef.price;
      const finalAmount = Math.round(rawAmount);

      if (!Number.isFinite(finalAmount) || finalAmount <= 0 || finalAmount > 50_000_000) {
        return NextResponse.json(
          { error: "Nominal tagihan harus lebih besar dari Rp 0." },
          { status: 400 }
        );
      }

      const markPaid = Boolean(body.markPaid);
      const invoiceCode = generateInvoiceCode();

      if (markPaid) {
        const fulfillment = buildShopUpdateForPaidInvoice(planDef.id, shop);
        await prisma.$transaction([
          prisma.subscriptionInvoice.create({
            data: {
              invoiceCode,
              shopId: shop.id,
              plan: planDef.id,
              amount: finalAmount,
              durationDays: planDef.durationDays,
              paymentProvider: "MANUAL_ADMIN",
              status: "PAID",
              paidAt: new Date(),
            },
          }),
          prisma.shop.update({
            where: { id: shop.id },
            data: fulfillment.data,
          }),
        ]);
        await rewardReferrerIfEligible(shop.id, planDef.id).catch(() => null);
      } else {
        await prisma.subscriptionInvoice.create({
          data: {
            invoiceCode,
            shopId: shop.id,
            plan: planDef.id,
            amount: finalAmount,
            durationDays: planDef.durationDays,
            paymentProvider: "MANUAL_ADMIN",
            status: "PENDING",
          },
        });
      }

      await recordAdminAudit({
        adminEmail: admin.email,
        action: "CREATE_MANUAL_INVOICE",
        target: `${shop.name} (${invoiceCode})`,
        details: `Paket ${planDef.id} · Rp ${finalAmount.toLocaleString("id-ID")} · ${
          markPaid ? "Lunas & Aktif" : "Menunggu Bayar"
        }`,
      });

      return NextResponse.json({
        ok: true,
        message: markPaid
          ? `Tagihan ${invoiceCode} dicatat LUNAS dan Paket ${planDef.name} aktif untuk ${shop.name}.`
          : `Tagihan manual ${invoiceCode} dibuat (Menunggu bayar) untuk ${shop.name}.`,
      });
    }

    // 20. Save Global Broadcast Banner to all Shop Dashboards
    if (action === "SAVE_BROADCAST") {
      const active = Boolean(body.active);
      const rawLevel = String(body.level || "INFO").trim().toUpperCase();
      const level = ["INFO", "WARNING", "PROMO"].includes(rawLevel)
        ? rawLevel
        : "INFO";
      const title = String(body.title || "").trim().slice(0, 120);
      const message = String(body.message || "").trim().slice(0, 500);
      const linkUrl = String(body.linkUrl || "").trim().slice(0, 240);
      const linkLabel = String(body.linkLabel || "").trim().slice(0, 40);

      if (
        linkUrl &&
        !(
          (linkUrl.startsWith("/") && !linkUrl.startsWith("//")) ||
          linkUrl.startsWith("https://")
        )
      ) {
        return NextResponse.json(
          { error: "URL tautan broadcast harus diawali / atau https://" },
          { status: 400 }
        );
      }

      if (active && !title && !message) {
        return NextResponse.json(
          { error: "Isi judul atau isi pengumuman sebelum mengaktifkan broadcast." },
          { status: 400 }
        );
      }

      await prisma.platformBroadcast.upsert({
        where: { id: "global" },
        create: {
          id: "global",
          active,
          level,
          title,
          message,
          linkUrl,
          linkLabel,
          updatedBy: admin.email,
        },
        update: {
          active,
          level,
          title,
          message,
          linkUrl,
          linkLabel,
          updatedBy: admin.email,
        },
      });

      await recordAdminAudit({
        adminEmail: admin.email,
        action: "UPDATE_BROADCAST",
        target: "global",
        details: `${active ? "AKTIF" : "NONAKTIF"} [${level}] ${title || message.slice(0, 60)}`,
      });

      return NextResponse.json({
        ok: true,
        message: active
          ? "Pengumuman global diaktifkan dan langsung tampil di Dashboard seluruh mitra."
          : "Pengumuman global dimatikan.",
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
