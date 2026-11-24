export interface LatLng {
  lat: number;
  lng: number;
}

export function isValidLatLng(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistanceId(km: number): string {
  if (!Number.isFinite(km) || km < 0) return "";
  if (km < 1) {
    const meters = Math.max(10, Math.round((km * 1000) / 10) * 10);
    return `${meters} m`;
  }
  if (km < 10) {
    return `${km.toFixed(1).replace(".", ",")} km`;
  }
  return `${Math.round(km)} km`;
}

function normalizeLatLng(latRaw: string, lngRaw: string): LatLng | null {
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!isValidLatLng(lat, lng)) return null;
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  };
}

export function extractCoordsFromText(input: string): LatLng | null {
  const text = String(input || "").trim();
  if (!text) return null;

  // 1. Exact Google Maps place pin coordinates (!3dLAT!4dLNG)
  const pinMatch = text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (pinMatch) {
    const parsed = normalizeLatLng(pinMatch[1], pinMatch[2]);
    if (parsed) return parsed;
  }

  // 2. Query parameters (?q=LAT,LNG / ll= / query= / destination= / daddr=)
  const queryMatch = text.match(
    /[?&](?:q|query|ll|destination|daddr)=(-?\d+\.\d+)\s*(?:,|%2[cC])\s*(-?\d+\.\d+)/
  );
  if (queryMatch) {
    const parsed = normalizeLatLng(queryMatch[1], queryMatch[2]);
    if (parsed) return parsed;
  }

  // 3. Google Maps viewport path (/@LAT,LNG)
  const atMatch = text.match(/\/@(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (atMatch) {
    const parsed = normalizeLatLng(atMatch[1], atMatch[2]);
    if (parsed) return parsed;
  }

  // 4. Raw "lat, lng" input
  const rawMatch = text.match(
    /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/
  );
  if (rawMatch) {
    const parsed = normalizeLatLng(rawMatch[1], rawMatch[2]);
    if (parsed) return parsed;
  }

  return null;
}

export function buildGoogleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function buildGoogleMapsSearchUrl(
  name: string,
  address?: string,
  city?: string
): string {
  const query = [name, address, city].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
