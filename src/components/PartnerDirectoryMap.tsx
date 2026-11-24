"use client";

import { useEffect, useRef, useState } from "react";
import type LType from "leaflet";
import { MapPin } from "lucide-react";
import {
  buildGoogleMapsDirectionsUrl,
  escapeHtml,
  formatDistanceId,
  isValidLatLng,
} from "@/lib/geo";
import { ensureLeafletStyles } from "@/lib/leaflet-styles";
import {
  buildPartnerMapPinHtml,
  buildPrinterBadgeSvg,
  buildUserGpsPinHtml,
  getPartnerPinColor,
  sanitizeDataImageUrl,
} from "@/lib/map-pin-icons";
import { formatRupiah } from "@/lib/utils";

export interface DirectoryMapPartner {
  shopCode: string;
  name: string;
  address: string;
  city: string;
  logoDataUrl?: string | null;
  bwPrice: number;
  colorPrice: number;
  isShopOpen: boolean;
  isAgentOnline: boolean;
  isTestShop?: boolean;
  mapsUrl: string;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number | null;
}

interface PartnerDirectoryMapProps {
  partners: DirectoryMapPartner[];
  userLocation: { lat: number; lng: number } | null;
  focusedShopCode: string | null;
  onSelectShop?: (shopCode: string) => void;
}

export function PartnerDirectoryMap({
  partners,
  userLocation,
  focusedShopCode,
  onSelectShop,
}: PartnerDirectoryMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const leafletRef = useRef<typeof LType | null>(null);
  const layerGroupRef = useRef<LType.LayerGroup | null>(null);
  const markersByCodeRef = useRef<Map<string, LType.Marker>>(new Map());
  const partnerByCodeRef = useRef<Map<string, DirectoryMapPartner>>(new Map());
  const focusedCodeRef = useRef<string | null>(focusedShopCode);
  focusedCodeRef.current = focusedShopCode;
  const onSelectShopRef = useRef(onSelectShop);
  onSelectShopRef.current = onSelectShop;

  const [mapReady, setMapReady] = useState(false);

  const mappedPartners = partners.filter(
    (p) =>
      typeof p.latitude === "number" &&
      typeof p.longitude === "number" &&
      isValidLatLng(p.latitude, p.longitude)
  );

  // Initialize Leaflet map once on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;
      ensureLeafletStyles();
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      const el = containerRef.current as HTMLDivElement & {
        _leaflet_id?: number;
      };
      if (el._leaflet_id) {
        delete el._leaflet_id;
      }

      const map = L.map(el, {
        center: [-2.5, 118.0],
        zoom: 5,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const group = L.layerGroup().addTo(map);
      leafletRef.current = L;
      mapRef.current = map;
      layerGroupRef.current = group;
      setMapReady(true);
    }

    init();

    return () => {
      cancelled = true;
      setMapReady(false);
      markersByCodeRef.current.clear();
      partnerByCodeRef.current.clear();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      layerGroupRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  // Re-render markers and fit bounds when partners or user location change
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    const group = layerGroupRef.current;
    if (!mapReady || !map || !L || !group) return;

    group.clearLayers();
    markersByCodeRef.current.clear();
    partnerByCodeRef.current.clear();

    const boundsPoints: [number, number][] = [];

    if (userLocation && isValidLatLng(userLocation.lat, userLocation.lng)) {
      boundsPoints.push([userLocation.lat, userLocation.lng]);
      const userIcon = L.divIcon({
        className: "ngeprint-pin-icon",
        html: buildUserGpsPinHtml(),
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
      });
      L.marker([userLocation.lat, userLocation.lng], {
        icon: userIcon,
        zIndexOffset: 500,
      })
        .bindPopup(
          `<div style="font-size:12px;font-weight:600;color:#1f1b16;">Lokasi Anda saat ini</div>`
        )
        .addTo(group);
    }

    for (const p of mappedPartners) {
      const lat = Number(p.latitude);
      const lng = Number(p.longitude);
      boundsPoints.push([lat, lng]);
      partnerByCodeRef.current.set(p.shopCode, p);

      const pinColor = getPartnerPinColor(p);
      const safeLogo = sanitizeDataImageUrl(p.logoDataUrl);

      const icon = L.divIcon({
        className: "ngeprint-pin-icon",
        html: buildPartnerMapPinHtml({
          label: p.name,
          logoDataUrl: p.logoDataUrl,
          isShopOpen: p.isShopOpen,
          isAgentOnline: p.isAgentOnline,
          isTestShop: p.isTestShop,
          isFocused: focusedCodeRef.current === p.shopCode,
        }),
        iconSize: [44, 54],
        iconAnchor: [22, 52],
        popupAnchor: [0, -50],
      });

      const statusText = !p.isShopOpen
        ? "Sedang Tutup"
        : p.isAgentOnline
        ? "Siap Cetak (Online)"
        : "Toko Buka";
      const statusColor = !p.isShopOpen
        ? "#7b7266"
        : p.isAgentOnline
        ? "#15803d"
        : "#b45309";
      const gmapsHref = escapeHtml(
        p.mapsUrl || buildGoogleMapsDirectionsUrl(lat, lng)
      );
      const shopHref = escapeHtml(`/s/${encodeURIComponent(p.shopCode)}`);
      const avatarHtml = safeLogo
        ? `<img src="${safeLogo}" alt="" style="width:34px;height:34px;border-radius:9px;object-fit:cover;border:1px solid rgba(31,27,22,0.12);background:#ffffff;flex-shrink:0;" />`
        : `<div style="width:34px;height:34px;border-radius:9px;background:#f7f4ee;border:1px solid rgba(31,27,22,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;">${buildPrinterBadgeSvg(
            pinColor
          )}</div>`;
      const distanceHtml =
        typeof p.distanceKm === "number"
          ? `<div style="margin-top:5px;font-size:11px;font-weight:600;color:#2563eb;">📍 ${escapeHtml(
              formatDistanceId(p.distanceKm)
            )} dari Anda</div>`
          : "";

      const popupHtml = `
        <div style="font-family:inherit;">
          <div style="display:flex;align-items:center;gap:9px;">
            ${avatarHtml}
            <div style="min-width:0;">
              <div style="font-size:10px;font-weight:600;color:${statusColor};margin-bottom:1px;">${escapeHtml(
        statusText
      )}</div>
              <div style="font-size:13px;font-weight:600;color:#1f1b16;line-height:1.25;">${escapeHtml(
            p.name
          )}</div>
            </div>
          </div>
          <div style="margin-top:6px;font-size:11px;color:#5e554a;line-height:1.35;">${escapeHtml(
            p.city ? `${p.city} · ${p.address}` : p.address
          )}</div>
          ${distanceHtml}
          <div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(31,27,22,0.1);font-size:11px;color:#5e554a;display:flex;justify-content:space-between;gap:8px;">
            <span>HP ${escapeHtml(formatRupiah(p.bwPrice))}</span>
            <span>Warna ${escapeHtml(formatRupiah(p.colorPrice))}</span>
          </div>
          <div style="margin-top:8px;display:flex;gap:6px;">
            <a href="${shopHref}" style="flex:1;text-align:center;background:#1f1b16;color:#fdfbf7;padding:6px 8px;border-radius:7px;font-size:11px;font-weight:600;text-decoration:none;">Cetak di Sini</a>
            <a href="${gmapsHref}" target="_blank" rel="noreferrer" style="background:#ffffff;color:#1f1b16;border:1px solid rgba(31,27,22,0.18);padding:6px 8px;border-radius:7px;font-size:11px;font-weight:600;text-decoration:none;">Rute Maps</a>
          </div>
        </div>
      `;

      const marker = L.marker([lat, lng], { icon })
        .bindPopup(popupHtml, { maxWidth: 270 })
        .addTo(group);

      marker.on("click", () => {
        onSelectShopRef.current?.(p.shopCode);
      });

      markersByCodeRef.current.set(p.shopCode, marker);
    }

    if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 15);
    } else if (boundsPoints.length > 1) {
      map.fitBounds(boundsPoints, { padding: [44, 44], maxZoom: 15 });
    } else {
      map.setView([-2.5, 118.0], 5);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, partners, userLocation]);

  // Smoothly focus marker and update highlight pin styling when focusedShopCode changes
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!mapReady || !map || !L) return;

    markersByCodeRef.current.forEach((m, code) => {
      const partner = partnerByCodeRef.current.get(code);
      if (!partner) return;
      m.setIcon(
        L.divIcon({
          className: "ngeprint-pin-icon",
          html: buildPartnerMapPinHtml({
            label: partner.name,
            logoDataUrl: partner.logoDataUrl,
            isShopOpen: partner.isShopOpen,
            isAgentOnline: partner.isAgentOnline,
            isTestShop: partner.isTestShop,
            isFocused: focusedShopCode === code,
          }),
          iconSize: [44, 54],
          iconAnchor: [22, 52],
          popupAnchor: [0, -50],
        })
      );
    });

    if (!focusedShopCode) return;
    const marker = markersByCodeRef.current.get(focusedShopCode);
    if (!marker) return;
    const pos = marker.getLatLng();
    map.flyTo([pos.lat, pos.lng], 16, { duration: 0.65 });
    marker.openPopup();
  }, [mapReady, focusedShopCode]);

  return (
    <div
      id="mitra-map"
      className="relative overflow-hidden rounded-2xl border border-[#1f1b16]/12 bg-[#fdfbf7]"
    >
      <div
        ref={containerRef}
        className="h-[340px] w-full sm:h-[400px]"
        aria-label="Peta lokasi mitra Ngeprint"
      />

      {mappedPartners.length === 0 && (
        <div className="pointer-events-none absolute inset-x-4 bottom-10 z-[900] mx-auto max-w-md rounded-xl border border-[#1f1b16]/12 bg-[#fdfbf7]/95 px-4 py-2.5 text-center text-xs text-[#5e554a] shadow-sm backdrop-blur-xs">
          <MapPin
            className="mr-1 inline-block h-3.5 w-3.5 text-[#d9381e]"
            strokeWidth={1.6}
          />
          Mitra di daftar ini belum menyetel titik koordinat GPS pada peta. Gunakan
          tombol <strong>Rute Maps</strong> di kartu toko.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#1f1b16]/8 bg-[#fdfbf7] px-4 py-2 text-[11px] text-[#5e554a]">
        <div className="flex flex-wrap items-center gap-3">
          {[
            { color: "#16a34a", label: "Siap Cetak (Online)" },
            { color: "#d9381e", label: "Toko Buka" },
            { color: "#7c3aed", label: "Toko Demo" },
          ].map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5">
              <svg
                width="13"
                height="16"
                viewBox="0 0 44 52"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M22 2C11.507 2 3 10.507 3 21c0 12.6 14.3 25.4 17.85 28.45a1.8 1.8 0 0 0 2.3 0C26.7 46.4 41 33.6 41 21 41 10.507 32.493 2 22 2Z"
                  fill={item.color}
                  stroke="#ffffff"
                  strokeWidth="3"
                />
                <circle cx="22" cy="21" r="10.5" fill="#fdfbf7" />
                <rect x="16" y="18" width="12" height="7" rx="1.5" fill="#1f1b16" />
                <rect x="18" y="14.5" width="8" height="4" rx="0.8" fill={item.color} />
              </svg>
              <span>{item.label}</span>
            </span>
          ))}
          {userLocation && (
            <span className="inline-flex items-center gap-1.5 font-medium text-[#2563eb]">
              <span className="h-3 w-3 rounded-full border border-white bg-[#2563eb] shadow-xs" />
              <span>Lokasi Anda</span>
            </span>
          )}
        </div>
        <span className="font-mono-num text-[#7b7266]">
          {mappedPartners.length} titik di peta
        </span>
      </div>
    </div>
  );
}
