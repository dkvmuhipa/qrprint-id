import { escapeHtml } from "./geo";

const SAFE_DATA_IMG_RE =
  /^data:image\/(webp|png|jpeg|jpg);base64,[A-Za-z0-9+/=]+$/i;

export function sanitizeDataImageUrl(url?: string | null): string | null {
  const trimmed = String(url || "").trim();
  if (!trimmed) return null;
  return SAFE_DATA_IMG_RE.test(trimmed) ? trimmed : null;
}

export function getPartnerPinColor(opts: {
  isShopOpen: boolean;
  isAgentOnline: boolean;
  isTestShop?: boolean;
}): string {
  if (opts.isTestShop) return "#7c3aed";
  if (opts.isShopOpen && opts.isAgentOnline) return "#16a34a";
  if (opts.isShopOpen) return "#d9381e";
  return "#64748b";
}

export function buildMiniPinLegendSvg(color: string): string {
  return `<svg width="14" height="17" viewBox="0 0 44 52" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M22 2C11.507 2 3 10.507 3 21c0 12.6 14.3 25.4 17.85 28.45a1.8 1.8 0 0 0 2.3 0C26.7 46.4 41 33.6 41 21 41 10.507 32.493 2 22 2Z" fill="${color}" stroke="#ffffff" stroke-width="3"/>
    <circle cx="22" cy="21" r="10.5" fill="#fdfbf7"/>
    <rect x="16" y="18" width="12" height="7" rx="1.5" fill="#1f1b16"/>
    <rect x="18" y="14.5" width="8" height="4" rx="0.8" fill="${color}"/>
  </svg>`;
}

export function buildPrinterBadgeSvg(accentColor = "#d9381e"): string {
  return `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="6.5" y="3" width="11" height="5.5" rx="1.2" fill="${accentColor}" opacity="0.22" stroke="#1f1b16" stroke-width="1.7"/>
    <path d="M6 17.5H4.5A2.5 2.5 0 0 1 2 15v-4.5A2.5 2.5 0 0 1 4.5 8h15A2.5 2.5 0 0 1 22 10.5V15a2.5 2.5 0 0 1-2.5 2.5H18" fill="#1f1b16"/>
    <rect x="6.5" y="13.5" width="11" height="7.5" rx="1.2" fill="#fdfbf7" stroke="#1f1b16" stroke-width="1.7"/>
    <line x1="9" y1="16.5" x2="15" y2="16.5" stroke="#1f1b16" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="9" y1="18.7" x2="13.5" y2="18.7" stroke="${accentColor}" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="17.8" cy="11" r="1.1" fill="#ffffff"/>
  </svg>`;
}

export function buildPartnerMapPinHtml(opts: {
  label: string;
  logoDataUrl?: string | null;
  isShopOpen: boolean;
  isAgentOnline: boolean;
  isTestShop?: boolean;
  isFocused?: boolean;
}): string {
  const isReady = opts.isShopOpen && opts.isAgentOnline;
  const pinColor = getPartnerPinColor(opts);
  const safeLogo = sanitizeDataImageUrl(opts.logoDataUrl);
  const rawLabel = String(opts.label || "Toko").trim();
  const shortLabel = escapeHtml(
    rawLabel.length > 18 ? `${rawLabel.slice(0, 17)}…` : rawLabel
  );

  const chipBg = opts.isFocused ? "#1f1b16" : "#fdfbf7";
  const chipFg = opts.isFocused ? "#fdfbf7" : "#1f1b16";
  const chipBorder = opts.isFocused
    ? "rgba(253,251,247,0.9)"
    : "rgba(31,27,22,0.16)";

  const medallionHtml = safeLogo
    ? `<img src="${safeLogo}" alt="" style="width:28px;height:28px;border-radius:9999px;object-fit:cover;background:#ffffff;border:1.5px solid #ffffff;display:block;box-shadow:0 1px 2px rgba(0,0,0,0.12);" />`
    : `<div style="width:28px;height:28px;border-radius:9999px;background:#fdfbf7;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1px rgba(31,27,22,0.08);">
        ${buildPrinterBadgeSvg(pinColor)}
      </div>`;

  const miniPrinterCornerBadge = safeLogo
    ? `<div style="position:absolute;top:23px;right:4px;width:15px;height:15px;border-radius:9999px;background:#1f1b16;border:1.5px solid #ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.3);">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"/>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
      </div>`
    : "";

  const readyHaloHtml = isReady
    ? `<span class="ngeprint-ready-ring" style="position:absolute;top:2px;left:3px;width:38px;height:38px;border-radius:9999px;background:rgba(22,163,74,0.32);pointer-events:none;"></span>`
    : "";

  return `<div style="position:relative;width:44px;height:54px;">
    <div style="pointer-events:none;position:absolute;bottom:55px;left:50%;transform:translateX(-50%);background:${chipBg};color:${chipFg};border:1px solid ${chipBorder};border-radius:9999px;padding:2px 8px;font-size:10.5px;font-weight:600;white-space:nowrap;box-shadow:0 3px 10px rgba(31,27,22,0.16);display:flex;align-items:center;gap:4px;">
      <span style="width:6px;height:6px;border-radius:9999px;background:${pinColor};flex-shrink:0;"></span>
      <span>${shortLabel}</span>
    </div>
    <span style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:18px;height:5px;border-radius:9999px;background:rgba(31,27,22,0.28);filter:blur(1.5px);pointer-events:none;"></span>
    <div class="ngeprint-pin-body" style="position:relative;width:44px;height:52px;">
      ${readyHaloHtml}
      <svg width="44" height="52" viewBox="0 0 44 52" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;filter:drop-shadow(0 3px 5px rgba(31,27,22,0.26));">
        <path d="M22 2C11.507 2 3 10.507 3 21c0 12.6 14.3 25.4 17.85 28.45a1.8 1.8 0 0 0 2.3 0C26.7 46.4 41 33.6 41 21 41 10.507 32.493 2 22 2Z" fill="${pinColor}" stroke="#ffffff" stroke-width="2.5"/>
      </svg>
      <div style="position:absolute;top:7px;left:8px;width:28px;height:28px;border-radius:9999px;overflow:hidden;">
        ${medallionHtml}
      </div>
      ${miniPrinterCornerBadge}
    </div>
  </div>`;
}

export function buildUserGpsPinHtml(): string {
  return `<div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
    <span class="ngeprint-gps-ring" style="position:absolute;width:32px;height:32px;border-radius:9999px;background:rgba(37,99,235,0.28);pointer-events:none;"></span>
    <div style="position:relative;width:24px;height:24px;border-radius:9999px;background:#2563eb;border:2.5px solid #ffffff;box-shadow:0 3px 8px rgba(37,99,235,0.45);display:flex;align-items:center;justify-content:center;">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="#ffffff" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <polygon points="3 11 22 2 13 21 11 13 3 11"/>
      </svg>
    </div>
    <span style="pointer-events:none;position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);background:#1e40af;color:#ffffff;border:1.5px solid #ffffff;border-radius:9999px;padding:1px 6px;font-size:9.5px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2);">
      Anda
    </span>
  </div>`;
}
