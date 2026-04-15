import type { MetadataRoute } from "next";

import { PUBLIC_SITE_BASE_URL } from "@/lib/public-site";

const publicRoutes = [
  "",
  "/politica-de-privacidade",
  "/exclusao-de-dados",
  "/termos-de-uso"
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = new URL(PUBLIC_SITE_BASE_URL);
  const now = new Date();

  return publicRoutes.map((route) => ({
    url: new URL(route || "/", baseUrl).toString(),
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.6
  }));
}
