"use client";

import { useEffect, useRef, useState } from "react";
import type LType from "leaflet";
import { isValidLatLng } from "@/lib/geo";
import { ensureLeafletStyles } from "@/lib/leaflet-styles";

interface PartnerLocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
}

export function PartnerLocationPicker({
  latitude,
  longitude,
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
        html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
          <div style="background:#d9381e;color:#ffffff;padding:4px 9px;border-radius:9999px;font-size:11px;font-weight:600;white-space:nowrap;border:2px solid #ffffff;box-shadow:0 4px 12px rgba(31,27,22,0.28);">
            Lokasi Toko
          </div>
          <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #d9381e;margin-top:-1px;"></div>
        </div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
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
  }, [mapReady, latitude, longitude]);

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
