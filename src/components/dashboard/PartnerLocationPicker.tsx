"use client";

import { useEffect, useRef, useState } from "react";
import type LType from "leaflet";
import { isValidLatLng } from "@/lib/geo";
import { ensureLeafletStyles } from "@/lib/leaflet-styles";
import { buildPartnerMapPinHtml } from "@/lib/map-pin-icons";

interface PartnerLocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  shopName?: string;
  logoDataUrl?: string | null;
  onChange: (lat: number, lng: number) => void;
}

export function PartnerLocationPicker({
  latitude,
  longitude,
  shopName,
  logoDataUrl,
  onChange,
}: PartnerLocationPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const leafletRef = useRef<typeof LType | null>(null);
  const markerRef = useRef<LType.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [mapReady, setMapReady] = useState(false);

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

      const hasInitial =
        typeof latitude === "number" &&
        typeof longitude === "number" &&
        isValidLatLng(latitude, longitude);

      const map = L.map(el, {
        center: hasInitial ? [latitude, longitude] : [-2.5, 118.0],
        zoom: hasInitial ? 16 : 5,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      map.on("click", (ev: LType.LeafletMouseEvent) => {
        const nextLat = Number(ev.latlng.lat.toFixed(6));
        const nextLng = Number(ev.latlng.lng.toFixed(6));
        onChangeRef.current(nextLat, nextLng);
      });

      leafletRef.current = L;
      mapRef.current = map;
      setMapReady(true);
    }

    init();

    return () => {
      cancelled = true;
      setMapReady(false);
      markerRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      leafletRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync pin position & viewport when latitude/longitude props change
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!mapReady || !map || !L) return;

    const hasCoords =
      typeof latitude === "number" &&
      typeof longitude === "number" &&
      isValidLatLng(latitude, longitude);

    if (!hasCoords) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    if (!markerRef.current) {
      const icon = L.divIcon({
        className: "ngeprint-pin-icon",
        html: buildPartnerMapPinHtml({
          label: shopName || "Lokasi Toko",
          logoDataUrl,
          isShopOpen: true,
          isAgentOnline: false,
        }),
        iconSize: [44, 54],
        iconAnchor: [22, 52],
      });

      const marker = L.marker([latitude, longitude], {
        icon,
        draggable: true,
      }).addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onChangeRef.current(
          Number(pos.lat.toFixed(6)),
          Number(pos.lng.toFixed(6))
        );
      });

      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng([latitude, longitude]);
    }

    const currentZoom = map.getZoom();
    map.setView([latitude, longitude], currentZoom < 12 ? 16 : currentZoom, {
      animate: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, latitude, longitude]);

  // Live-update custom pin logo or label without re-centering the picker map
  useEffect(() => {
    const marker = markerRef.current;
    const L = leafletRef.current;
    if (!mapReady || !marker || !L) return;
    marker.setIcon(
      L.divIcon({
        className: "ngeprint-pin-icon",
        html: buildPartnerMapPinHtml({
          label: shopName || "Lokasi Toko",
          logoDataUrl,
          isShopOpen: true,
          isAgentOnline: false,
        }),
        iconSize: [44, 54],
        iconAnchor: [22, 52],
      })
    );
  }, [mapReady, shopName, logoDataUrl]);

  return (
    <div className="overflow-hidden rounded-xl border border-[#171717]/12 bg-[#ede8df]">
      <div
        ref={containerRef}
        className="h-56 w-full"
        aria-label="Pemilih titik lokasi toko di peta"
      />
    </div>
  );
}
