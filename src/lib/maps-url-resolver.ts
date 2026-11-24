import { extractCoordsFromText, isValidLatLng } from "./geo";

const ALLOWED_MAPS_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "www.google.com",
  "google.com",
  "maps.google.com",
  "www.google.co.id",
  "maps.google.co.id",
]);

export interface ResolvedMapsCoordinates {
  latitude: number;
  longitude: number;
  resolvedUrl: string;
}

export async function resolveMapsUrlCoordinates(
  rawUrl: string
): Promise<ResolvedMapsCoordinates | null> {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) return null;

  // Fast path: coordinates already present directly in URL or raw "lat, lng" string
  const direct = extractCoordsFromText(trimmed);
  if (direct) {
    return {
      latitude: direct.lat,
      longitude: direct.lng,
      resolvedUrl: trimmed,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return null;
  }
  if (!ALLOWED_MAPS_HOSTS.has(parsed.hostname.toLowerCase())) {
    return null;
  }

  try {
    const res = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NgeprintBot/1.0)",
      },
    });

    const finalUrl = res.url || trimmed;
    const fromFinalUrl = extractCoordsFromText(finalUrl);
    if (fromFinalUrl) {
      return {
        latitude: fromFinalUrl.lat,
        longitude: fromFinalUrl.lng,
        resolvedUrl: finalUrl,
      };
    }

    const html = (await res.text()).slice(0, 40000);
    const fromHtml = extractCoordsFromText(html);
    if (fromHtml) {
      return {
        latitude: fromHtml.lat,
        longitude: fromHtml.lng,
        resolvedUrl: finalUrl,
      };
    }

    // Fallback: OpenGraph staticmap preview URL embedded in Google Maps short link HTML
    const centerMatch = html.match(
      /[?&]center=(-?\d+\.\d+)\s*(?:,|%2[cC])\s*(-?\d+\.\d+)/
    );
    if (centerMatch) {
      const lat = Number(centerMatch[1]);
      const lng = Number(centerMatch[2]);
      if (isValidLatLng(lat, lng)) {
        return {
          latitude: Number(lat.toFixed(6)),
          longitude: Number(lng.toFixed(6)),
          resolvedUrl: finalUrl,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}
