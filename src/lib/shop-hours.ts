export interface ShopOpenStatus {
  isOpen: boolean;
  reason: string | null;
  scheduleLabel: string | null;
}

function parseHHMM(raw?: string | null): number | null {
  const s = String(raw || "").trim();
  const m = s.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function getCurrentWibMinutes(): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const h = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
    const m = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
    return (h % 24) * 60 + m;
  } catch {
    const now = new Date();
    const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
    return (utcMin + 7 * 60) % (24 * 60);
  }
}

export function evaluateShopOpenStatus(params: {
  isOpenManual?: boolean | null;
  openHour?: string | null;
  closeHour?: string | null;
  closedMessage?: string | null;
}): ShopOpenStatus {
  const openStr = String(params.openHour || "").trim();
  const closeStr = String(params.closeHour || "").trim();
  const openMin = parseHHMM(openStr);
  const closeMin = parseHHMM(closeStr);
  const scheduleLabel =
    openMin !== null && closeMin !== null ? `${openStr} – ${closeStr} WIB` : null;
  const customMsg = String(params.closedMessage || "").trim();

  if (params.isOpenManual === false) {
    return {
      isOpen: false,
      reason:
        customMsg ||
        (scheduleLabel
          ? `Toko sedang tutup sementara (jam operasional ${scheduleLabel}).`
          : "Toko sedang tutup sementara. Silakan kembali beberapa saat lagi."),
      scheduleLabel,
    };
  }

  if (openMin !== null && closeMin !== null && openMin !== closeMin) {
    const nowMin = getCurrentWibMinutes();
    const isWithin =
      openMin < closeMin
        ? nowMin >= openMin && nowMin < closeMin
        : nowMin >= openMin || nowMin < closeMin; // overnight schedule

    if (!isWithin) {
      return {
        isOpen: false,
        reason:
          customMsg ||
          `Toko sedang tutup. Jam operasional cetak mandiri: ${scheduleLabel}.`,
        scheduleLabel,
      };
    }
  }

  return {
    isOpen: true,
    reason: null,
    scheduleLabel,
  };
}
