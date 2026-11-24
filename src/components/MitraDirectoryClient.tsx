"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Printer,
  RotateCcw,
  Search,
  Share2,
  Store,
  X,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsSearchUrl,
  formatDistanceId,
  haversineDistanceKm,
  isValidLatLng,
} from "@/lib/geo";
import { PartnerDirectoryMap } from "./PartnerDirectoryMap";

interface PublicPartnerItem {
  shopCode: string;
  name: string;
  address: string;
  city: string;
  tagline: string;
  mapsUrl: string;
  latitude?: number | null;
  longitude?: number | null;
  instagramHandle: string;
  logoDataUrl: string | null;
  plan: string;
  isTestShop?: boolean;
  isFeaturedPartner?: boolean;
  bwPrice: number;
  colorPrice: number;
  isAgentOnline: boolean;
  isShopOpen: boolean;
  scheduleLabel: string | null;
}

type SortMode = "recommended" | "cheapest" | "ready";

export function MitraDirectoryClient() {
  const [partners, setPartners] = useState<PublicPartnerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("ALL");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortMode>("recommended");
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [focusedShopCode, setFocusedShopCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/public/partners?limit=100", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { partners: [] }))
      .then((data) => {
        if (!active || !Array.isArray(data.partners)) return;
        setPartners(data.partners);
        if (
          data.partners.some((p: PublicPartnerItem) =>
            isValidLatLng(p.latitude, p.longitude)
          )
        ) {
          setShowMap(true);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function handleFindNearest() {
    if (userLoc) {
      setUserLoc(null);
      setLocError(null);
      return;
    }
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setLocError("Browser Anda tidak mendukung pencarian lokasi GPS.");
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
        setSortBy("recommended");
        setShowMap(true);
        setLocating(false);
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Izin lokasi ditolak di browser. Aktifkan izin lokasi untuk mengurutkan toko terdekat, atau gunakan tombol Rute di kartu toko."
            : err.code === err.TIMEOUT
            ? "Waktu pencarian lokasi GPS habis. Silakan coba lagi."
            : "Lokasi GPS belum berhasil dideteksi dari perangkat Anda.";
        setLocError(msg);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  async function handleCopyShareLink() {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/mitra`
        : "https://ngeprint.gellona.web.id/mitra";
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      setCopiedLink(false);
    }
  }

  function resetAllFilters() {
    setQuery("");
    setSelectedCity("ALL");
    setOnlyOpen(false);
    setSortBy("recommended");
    setFocusedShopCode(null);
  }

  const cityList = useMemo(() => {
    const buckets = new Map<string, { label: string; count: number }>();
    for (const p of partners) {
      const clean = (p.city || "").trim();
      if (!clean) continue;
      const key = clean.toLowerCase();
      const existing = buckets.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        buckets.set(key, { label: clean, count: 1 });
      }
    }
    return Array.from(buckets.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "id")
    );
  }, [partners]);

  const readyCount = useMemo(
    () => partners.filter((p) => p.isShopOpen && p.isAgentOnline).length,
    [partners]
  );

  const enrichedPartners = useMemo(
    () =>
      partners.map((p) => {
        const hasCoords = isValidLatLng(p.latitude, p.longitude);
        const distanceKm =
          userLoc && hasCoords
            ? haversineDistanceKm(
                userLoc.lat,
                userLoc.lng,
                Number(p.latitude),
                Number(p.longitude)
              )
            : null;
        return {
          ...p,
          _hasCoords: hasCoords,
          distanceKm,
        };
      }),
    [partners, userLoc]
  );

  const filteredPartners = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enrichedPartners
      .filter((p) => {
        if (onlyOpen && !p.isShopOpen) return false;
        if (
          selectedCity !== "ALL" &&
          (p.city || "").trim().toLowerCase() !== selectedCity.toLowerCase()
        ) {
          return false;
        }
        if (!q) return true;
        return `${p.name} ${p.city} ${p.address} ${p.tagline}`
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        if (sortBy === "cheapest") {
          if (a.bwPrice !== b.bwPrice) return a.bwPrice - b.bwPrice;
          if (a.colorPrice !== b.colorPrice) return a.colorPrice - b.colorPrice;
        } else if (sortBy === "ready") {
          const aScore = a.isShopOpen ? (a.isAgentOnline ? 2 : 1) : 0;
          const bScore = b.isShopOpen ? (b.isAgentOnline ? 2 : 1) : 0;
          if (bScore !== aScore) return bScore - aScore;
        }

        if (userLoc) {
          if (a.distanceKm != null && b.distanceKm != null) {
            return a.distanceKm - b.distanceKm;
          }
          if (a.distanceKm != null) return -1;
          if (b.distanceKm != null) return 1;
        }
        return 0;
      });
  }, [enrichedPartners, onlyOpen, query, selectedCity, sortBy, userLoc]);

  const nearestShopCode = userLoc
    ? filteredPartners.find((p) => p.distanceKm != null)?.shopCode || null
    : null;

  const hasActiveFilter =
    query.trim() !== "" || selectedCity !== "ALL" || onlyOpen;

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#1f1b16]">
      {/* Sticky Minimal Header */}
      <header className="sticky top-0 z-40 border-b border-[#1f1b16]/8 bg-[#f7f4ee]/95 backdrop-blur-xs">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="flex min-w-0 items-center gap-2 transition-opacity hover:opacity-85"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#1f1b16] text-[#fdfbf7]">
                <Printer className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <div className="flex min-w-0 items-baseline gap-1.5">
                <span className="truncate text-base font-semibold tracking-tight text-[#1f1b16]">
                  Ngeprint
                </span>
                <span className="font-mono-num hidden text-xs text-[#7b7266] sm:inline">
                  Direktori Mitra
                </span>
              </div>
            </Link>
          </div>

          <nav className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[#5e554a] hover:bg-[#efe9df] hover:text-[#1f1b16]"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.6} />
              <span>Beranda</span>
            </Link>
            <Link
              href="/panduan"
              className="hidden h-9 items-center rounded-lg px-2.5 text-xs font-medium text-[#5e554a] hover:bg-[#efe9df] hover:text-[#1f1b16] sm:inline-flex"
            >
              Panduan
            </Link>
            <Link
              href="/register"
              className="btn-action inline-flex h-9 items-center justify-center rounded-lg bg-[#1f1b16] px-3.5 text-xs font-medium text-[#fdfbf7] hover:bg-[#1f1b16]/90"
            >
              Daftarkan Toko
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Band */}
      <section className="bg-paper-grid border-b border-[#1f1b16]/8">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-[#d9381e]">
                <Store className="h-4 w-4" strokeWidth={1.6} />
                <span>Direktori Mitra Resmi · Cetak Mandiri QRIS</span>
              </div>
              <h1 className="mt-2 text-2xl leading-tight font-semibold tracking-[-0.02em] text-[#1f1b16] sm:text-4xl">
                Cari fotokopi terdekat yang siap cetak sekarang
              </h1>
              <p className="mt-2.5 text-sm leading-relaxed text-[#5e554a]">
                Tanpa perlu kirim file lewat WhatsApp atau colok flashdisk.
                Pilih mitra yang sedang buka, bandingkan tarif per lembar,
                unggah PDF/Word/Foto dari HP, dan bayar langsung lewat QRIS.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:items-end">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono-num rounded-full border border-[#1f1b16]/12 bg-[#fdfbf7] px-3 py-1 text-xs font-medium text-[#1f1b16]">
                  {partners.length} Toko Mitra
                </span>
                <span className="font-mono-num inline-flex items-center gap-1.5 rounded-full border border-[#16a34a]/25 bg-[#f0fdf4] px-3 py-1 text-xs font-medium text-[#15803d]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" />
                  <span>{readyCount} Siap Cetak</span>
                </span>
                <span className="font-mono-num rounded-full border border-[#1f1b16]/12 bg-[#fdfbf7] px-3 py-1 text-xs font-medium text-[#5e554a]">
                  {cityList.length} Kota
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyShareLink}
                className="btn-action inline-flex h-9 w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-[#1f1b16]/15 bg-[#fdfbf7] px-3.5 text-xs font-medium text-[#1f1b16] hover:bg-[#efe9df]"
              >
                {copiedLink ? (
                  <>
                    <Check
                      className="h-3.5 w-3.5 text-[#15803d]"
                      strokeWidth={2}
                    />
                    <span className="text-[#15803d]">Link Direktori Disalin</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5" strokeWidth={1.6} />
                    <span>Salin Link Direktori</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Filter, Map, & Results */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-sm">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#7b7266]"
              strokeWidth={1.6}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama toko, kampus, jalan, atau kota..."
              className="h-10 w-full rounded-lg border border-[#1f1b16]/14 bg-[#fdfbf7] pr-9 pl-9 text-xs text-[#1f1b16] outline-none focus:border-[#1f1b16] sm:text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Hapus pencarian"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded p-0.5 text-[#7b7266] hover:text-[#1f1b16]"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={locating}
              onClick={handleFindNearest}
              className={`btn-action inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg px-3.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                userLoc
                  ? "border border-[#2563eb]/30 bg-[#eff6ff] text-[#1d4ed8]"
                  : "border border-[#1f1b16]/15 bg-[#fdfbf7] text-[#1f1b16] hover:bg-[#efe9df]"
              }`}
            >
              <LocateFixed className="h-3.5 w-3.5" strokeWidth={1.6} />
              <span>
                {locating
                  ? "Mencari GPS..."
                  : userLoc
                  ? "Terdekat Aktif · Reset"
                  : "Terdekat dari Saya"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setOnlyOpen((prev) => !prev)}
              className={`btn-action inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg px-3.5 text-xs font-medium transition-colors ${
                onlyOpen
                  ? "border border-[#16a34a]/35 bg-[#f0fdf4] text-[#15803d]"
                  : "border border-[#1f1b16]/15 bg-[#fdfbf7] text-[#1f1b16] hover:bg-[#efe9df]"
              }`}
            >
              <Clock className="h-3.5 w-3.5" strokeWidth={1.6} />
              <span>{onlyOpen ? "Hanya Buka ✓" : "Hanya Buka"}</span>
            </button>

            <select
              aria-label="Urutkan daftar mitra"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortMode)}
              className="h-10 cursor-pointer rounded-lg border border-[#1f1b16]/15 bg-[#fdfbf7] px-3 text-xs font-medium text-[#1f1b16] outline-none focus:border-[#1f1b16]"
            >
              <option value="recommended">
                {userLoc ? "Urutkan: Jarak Terdekat" : "Urutkan: Rekomendasi"}
              </option>
              <option value="ready">Urutkan: Siap Cetak Online</option>
              <option value="cheapest">Urutkan: Tarif HP Termurah</option>
            </select>

            <button
              type="button"
              onClick={() => setShowMap((prev) => !prev)}
              className={`btn-action inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg px-3.5 text-xs font-medium transition-colors ${
                showMap
                  ? "bg-[#1f1b16] text-[#fdfbf7]"
                  : "border border-[#1f1b16]/15 bg-[#fdfbf7] text-[#1f1b16] hover:bg-[#efe9df]"
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" strokeWidth={1.6} />
              <span>{showMap ? "Tutup Peta" : "Lihat Peta"}</span>
            </button>
          </div>
        </div>

        {/* City Pills */}
        {cityList.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCity("ALL")}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedCity === "ALL"
                  ? "bg-[#1f1b16] text-[#fdfbf7]"
                  : "border border-[#1f1b16]/12 bg-[#fdfbf7] text-[#5e554a] hover:bg-[#efe9df]"
              }`}
            >
              Semua Kota ({partners.length})
            </button>
            {cityList.map((c) => {
              const active =
                selectedCity.toLowerCase() === c.label.toLowerCase();
              return (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setSelectedCity(c.label)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "bg-[#1f1b16] text-[#fdfbf7]"
                      : "border border-[#1f1b16]/12 bg-[#fdfbf7] text-[#5e554a] hover:bg-[#efe9df]"
                  }`}
                >
                  {c.label} ({c.count})
                </button>
              );
            })}
          </div>
        )}

        {locError && (
          <div className="mt-4 rounded-xl border border-[#d9381e]/25 bg-[#d9381e]/10 px-4 py-2.5 text-xs text-[#991b1b]">
            {locError}
          </div>
        )}

        {userLoc && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#2563eb]/20 bg-[#eff6ff] px-4 py-2.5 text-xs text-[#1e40af]">
            <span>
              Lokasi GPS aktif — jarak lurus dihitung dari posisi Anda saat ini
              {!filteredPartners.some((p) => p.distanceKm != null)
                ? " (mitra terpilih belum menyetel titik koordinat; gunakan tombol Rute Maps)."
                : "."}
            </span>
            <button
              type="button"
              onClick={() => setUserLoc(null)}
              className="cursor-pointer font-medium underline hover:opacity-80"
            >
              Reset GPS
            </button>
          </div>
        )}

        {/* Map */}
        {showMap && !loading && partners.length > 0 && (
          <div className="mt-6">
            <PartnerDirectoryMap
              partners={filteredPartners}
              userLocation={userLoc}
              focusedShopCode={focusedShopCode}
              onSelectShop={(code) => setFocusedShopCode(code)}
            />
          </div>
        )}

        {/* Results Meta */}
        {!loading && partners.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-[#7b7266]">
            <span>
              Menampilkan{" "}
              <strong className="font-mono-num text-[#1f1b16]">
                {filteredPartners.length}
              </strong>{" "}
              dari {partners.length} mitra
            </span>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex cursor-pointer items-center gap-1 font-medium text-[#d9381e] hover:underline"
              >
                <RotateCcw className="h-3 w-3" strokeWidth={1.8} />
                <span>Reset filter</span>
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="h-52 animate-pulse rounded-2xl border border-[#1f1b16]/8 bg-[#fdfbf7]/80"
              />
            ))}
          </div>
        ) : filteredPartners.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPartners.map((p) => {
              const isDemoShowcase = Boolean(p.isTestShop || p.plan === "DEMO");
              const isNearest = p.shopCode === nearestShopCode;
              const mapsHref =
                p.mapsUrl ||
                (p._hasCoords
                  ? buildGoogleMapsDirectionsUrl(
                      Number(p.latitude),
                      Number(p.longitude)
                    )
                  : buildGoogleMapsSearchUrl(p.name, p.address, p.city));
              const planBadge = p.isTestShop
                ? "Toko Demo & Simulasi"
                : p.plan === "DEMO"
                ? "Mitra Showcase"
                : p.plan === "PREMIUM"
                ? "Mitra Premium"
                : p.plan === "PRO"
                ? "Mitra Pro"
                : "Mitra Resmi";
              const initials = p.name
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase() || "")
                .join("");

              return (
                <div
                  key={p.shopCode}
                  className={`flex flex-col justify-between rounded-2xl border bg-[#fdfbf7] p-5 transition-colors hover:border-[#1f1b16]/25 ${
                    isNearest
                      ? "border-[#2563eb]/40 ring-1 ring-[#2563eb]/15"
                      : "border-[#1f1b16]/10"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {p.logoDataUrl ? (
                          <img
                            src={p.logoDataUrl}
                            alt={p.name}
                            className="h-12 w-12 shrink-0 rounded-xl border border-[#1f1b16]/10 bg-white object-cover"
                          />
                        ) : (
                          <div className="font-mono-num flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1f1b16] text-sm font-semibold text-[#fdfbf7]">
                            {initials || "NP"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 font-mono-num text-[10px] font-semibold ${
                              p.isTestShop
                                ? "bg-purple-500/12 text-purple-800"
                                : "bg-[#d9381e]/10 text-[#d9381e]"
                            }`}
                          >
                            {planBadge}
                          </span>
                          <h2 className="mt-1 truncate text-base font-medium text-[#1f1b16]">
                            {p.name}
                          </h2>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            !p.isShopOpen
                              ? "bg-[#1f1b16]/8 text-[#7b7266]"
                              : p.isAgentOnline
                              ? "bg-[#16a34a]/12 text-[#15803d]"
                              : "bg-[#b45309]/12 text-[#b45309]"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              !p.isShopOpen
                                ? "bg-[#7b7266]"
                                : p.isAgentOnline
                                ? "bg-[#16a34a]"
                                : "bg-[#b45309]"
                            }`}
                          />
                          <span>
                            {!p.isShopOpen
                              ? "Tutup"
                              : p.isAgentOnline
                              ? "Siap Cetak"
                              : "Buka"}
                          </span>
                        </span>
                        {p.scheduleLabel && (
                          <span className="font-mono-num text-[10px] text-[#7b7266]">
                            {p.scheduleLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {p.distanceKm != null && (
                      <div className="mt-2.5 flex items-center gap-1.5">
                        <span
                          className={`font-mono-num inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                            isNearest
                              ? "bg-[#16a34a]/12 text-[#15803d]"
                              : "bg-[#2563eb]/10 text-[#1d4ed8]"
                          }`}
                        >
                          <LocateFixed className="h-3 w-3" strokeWidth={1.8} />
                          <span>
                            {isNearest
                              ? `Terdekat · ${formatDistanceId(p.distanceKm)}`
                              : `${formatDistanceId(p.distanceKm)} dari Anda`}
                          </span>
                        </span>
                      </div>
                    )}

                    {p.tagline && (
                      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-[#5e554a]">
                        {p.tagline}
                      </p>
                    )}

                    <p className="mt-2.5 text-xs text-[#7b7266]">
                      {p.city ? `${p.city} · ` : ""}
                      {p.address}
                    </p>
                  </div>

                  <div className="mt-4 border-t border-[#1f1b16]/8 pt-3.5">
                    <div className="flex items-center justify-between gap-2 font-mono-num text-[11px] text-[#5e554a]">
                      <span>HP {formatRupiah(p.bwPrice)}/lbr</span>
                      <span>Warna {formatRupiah(p.colorPrice)}/lbr</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Link
                        href={`/s/${p.shopCode}`}
                        className="btn-action inline-flex h-9 min-w-[140px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#1f1b16] px-3 text-xs font-medium text-[#fdfbf7] hover:bg-[#1f1b16]/90"
                      >
                        <span>
                          {isDemoShowcase
                            ? "Coba Simulasi Cetak"
                            : "Cetak di Toko Ini"}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </Link>
                      {p._hasCoords && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowMap(true);
                            setFocusedShopCode(p.shopCode);
                            document
                              .getElementById("mitra-map")
                              ?.scrollIntoView({
                                behavior: "smooth",
                                block: "center",
                              });
                          }}
                          title="Lihat titik lokasi toko di peta"
                          className="inline-flex h-9 cursor-pointer items-center justify-center gap-1 rounded-lg border border-[#1f1b16]/15 bg-white px-2.5 text-xs font-medium text-[#1f1b16] hover:bg-[#efe9df]"
                        >
                          <MapIcon
                            className="h-3.5 w-3.5 text-[#1f1b16]"
                            strokeWidth={1.6}
                          />
                          <span>Peta</span>
                        </button>
                      )}
                      <a
                        href={mapsHref}
                        target="_blank"
                        rel="noreferrer"
                        title="Buka rute di Google Maps"
                        className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-[#1f1b16]/15 bg-white px-2.5 text-xs font-medium text-[#1f1b16] hover:bg-[#efe9df]"
                      >
                        <MapPin
                          className="h-3.5 w-3.5 text-[#d9381e]"
                          strokeWidth={1.6}
                        />
                        <span>Rute</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-[#1f1b16]/15 bg-[#fdfbf7] px-6 py-12 text-center">
            <p className="text-sm font-medium text-[#1f1b16]">
              {partners.length === 0
                ? "Belum ada toko mitra yang dipublikasikan."
                : "Tidak ada mitra yang cocok dengan filter Anda."}
            </p>
            <p className="mt-1.5 text-xs text-[#7b7266]">
              {partners.length === 0
                ? "Daftarkan toko fotokopi Anda agar tampil di direktori resmi Ngeprint."
                : "Coba ubah kata kunci pencarian, nonaktifkan filter Hanya Buka, atau pilih Semua Kota."}
            </p>
            {hasActiveFilter ? (
              <button
                type="button"
                onClick={resetAllFilters}
                className="btn-action mt-4 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-[#1f1b16] px-4 text-xs font-medium text-[#fdfbf7] hover:bg-[#1f1b16]/90"
              >
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.6} />
                <span>Reset semua filter</span>
              </button>
            ) : (
              <Link
                href="/register"
                className="btn-action mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#d9381e] px-4 text-xs font-medium text-white hover:bg-[#be2e17]"
              >
                <span>Daftarkan toko Anda</span>
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.6} />
              </Link>
            )}
          </div>
        )}

        {/* Bottom Shop-Owner Banner */}
        <section className="mt-12 flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#1f1b16]/10 bg-[#efe9df] p-6 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <p className="font-mono-num text-[11px] font-semibold tracking-wider text-[#d9381e] uppercase">
              Untuk Pemilik Fotokopi &amp; Koperasi
            </p>
            <h2 className="text-base font-semibold text-[#1f1b16] sm:text-lg">
              Ingin toko Anda tampil di direktori dan terima cetak QRIS 0%
              potongan?
            </h2>
            <p className="text-xs text-[#5e554a]">
              Cukup pakai PC Windows (7–11) &amp; printer USB yang sudah ada.
              Tersedia Demo Gratis 24 jam.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <Link
              href="/brosur"
              className="btn-action inline-flex h-10 items-center justify-center rounded-lg border border-[#1f1b16]/15 bg-[#fdfbf7] px-4 text-xs font-medium text-[#1f1b16] hover:bg-white"
            >
              Lihat Brosur A4
            </Link>
            <Link
              href="/register"
              className="btn-action inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#d9381e] px-4 text-xs font-medium text-white hover:bg-[#be2e17]"
            >
              <span>Buat QR toko sekarang</span>
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.6} />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
