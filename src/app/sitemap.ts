import type { MetadataRoute } from "next";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://ngeprint.gellona.web.id";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = "2026-11-24T00:00:00.000Z";
  return [
    {
      url: `${appUrl}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${appUrl}/mitra`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${appUrl}/tools`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${appUrl}/panduan`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${appUrl}/brosur`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${appUrl}/register`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${appUrl}/login`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${appUrl}/privasi`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${appUrl}/ketentuan`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
