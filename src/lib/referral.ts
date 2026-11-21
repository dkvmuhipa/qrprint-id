import { prisma } from "@/lib/prisma";

const REFERRAL_BONUS_DAYS = 10;

/**
 * Gives +10 bonus active days to the referring shop once a referred shop
 * completes its first PAID subscription plan invoice (BULANAN / PRO / PREMIUM).
 */
export async function rewardReferrerIfEligible(
  paidShopId: string | null | undefined,
  invoicePlanCode: string
): Promise<{ rewarded: boolean; referrerName?: string }> {
  if (!paidShopId) return { rewarded: false };

  // Only reward on actual subscription plan purchases (not standalone small add-ons)
  const parts = String(invoicePlanCode || "")
    .toUpperCase()
    .split("+");
  const hasPaidPlan = parts.some(
    (p) => p === "BULANAN" || p === "PRO" || p === "PREMIUM"
  );
  if (!hasPaidPlan) return { rewarded: false };

  const paidShop = await prisma.shop.findUnique({
    where: { id: paidShopId },
    select: { id: true, referredByShopId: true, referralRewarded: true },
  });

  if (!paidShop || !paidShop.referredByShopId || paidShop.referralRewarded) {
    return { rewarded: false };
  }

  const referrer = await prisma.shop.findUnique({
    where: { id: paidShop.referredByShopId },
    select: { id: true, name: true, planExpiresAt: true },
  });

  if (!referrer) return { rewarded: false };

  const now = new Date();
  const baseDate =
    referrer.planExpiresAt && referrer.planExpiresAt > now
      ? new Date(referrer.planExpiresAt)
      : now;
  const nextExpiry = new Date(
    baseDate.getTime() + REFERRAL_BONUS_DAYS * 24 * 60 * 60 * 1000
  );

  await prisma.$transaction([
    prisma.shop.update({
      where: { id: referrer.id },
      data: {
        planExpiresAt: nextExpiry,
        planStatus: "ACTIVE",
        referralCount: { increment: 1 },
      },
    }),
    prisma.shop.update({
      where: { id: paidShop.id },
      data: { referralRewarded: true },
    }),
  ]);

  return { rewarded: true, referrerName: referrer.name };
}
