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
import { formatRupiah } from "@/lib/utils";

export interface DirectoryMapPartner {
  shopCode: string;
  name: string;
  address: string;
  city: string;
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

    const boundsPoints: [number, number][] = [];

    if (userLocation && isValidLatLng(userLocation.lat, userLocation.lng)) {
      boundsPoints.push([userLocation.lat, userLocation.lng]);
      const userIcon = L.divIcon({
        className: "ngeprint-pin-icon",
        html: `<div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
          <span class="ngeprint-gps-ring" style="position:absolute;width:22px;height:22px;border-radius:9999px;background:rgba(37,99,235,0.35);"></span>
          <span style="position:relative;width:13px;height:13px;border-radius:9999px;background:#2563eb;border:2.5px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></span>
        </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
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

      const isReady = p.isShopOpen && p.isAgentOnline;
      const pinBg = p.isTestShop
        ? "#7c3aed"
        : isReady
        ? "#16a34a"
        : p.isShopOpen
        ? "#d9381e"
        : "#6b7280";

      const shortLabel = escapeHtml(
        p.name.length > 18 ? `${p.name.slice(0, 17)}…` : p.name
      );

      const icon = L.divIcon({
        className: "ngeprint-pin-icon",
        html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
          <div style="background:${pinBg};color:#ffffff;padding:4px 9px;border-radius:9999px;font-size:11px;font-weight:600;white-space:nowrap;border:2px solid #ffffff;box-shadow:0 4px 12px rgba(31,27,22,0.28);display:flex;align-items:center;gap:5px;">
            <span style="width:6px;height:6px;border-radius:9999px;background:${
              isReady ? "#bbf7d0" : "#ffffff"
            };opacity:0.95;"></span>
            <span>${shortLabel}</span>
          </div>
          <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${pinBg};margin-top:-1px;"></div>
        </div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        popupAnchor: [0, -34],
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
      const distanceHtml =
        typeof p.distanceKm === "number"
          ? `<div style="margin-top:4px;font-size:11px;font-weight:600;color:#2563eb;">📍 ${escapeHtml(
              formatDistanceId(p.distanceKm)
            )} dari Anda</div>`
          : "";

      const popupHtml = `
        <div style="font-family:inherit;">
          <div style="font-size:10px;font-weight:600;color:${statusColor};margin-bottom:2px;">${escapeHtml(
        statusText
      )}</div>
          <div style="font-size:13px;font-weight:600;color:#1f1b16;line-height:1.3;">${escapeHtml(
            p.name
          )}</div>
          <div style="margin-top:3px;font-size:11px;color:#5e554a;line-height:1.35;">${escapeHtml(
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

  // Smoothly focus marker when user selects a shop card's "Pin Peta" button
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !focusedShopCode) return;
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
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
            <span>Siap Cetak (Online)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#d9381e]" />
            <span>Toko Buka</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#7c3aed]" />
            <span>Toko Demo</span>
          </span>
          {userLocation && (
            <span className="inline-flex items-center gap-1.5 font-medium text-[#2563eb]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" />
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
