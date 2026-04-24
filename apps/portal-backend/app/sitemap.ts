import type { MetadataRoute } from "next";

import { PUBLIC_SITE_BASE_URL } from "@/lib/public-site";
import { getAllArticles, getTopicHubs } from "@/lib/site/article-content";
import { getEditorialServicePages } from "@/lib/site/editorial-taxonomy";

const publicRoutes = [
  "",
  "/atuacao",
  "/artigos",
  "/politica-de-privacidade",
  "/exclusao-de-dados",
  "/termos-de-uso"
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = new URL(PUBLIC_SITE_BASE_URL);
  const now = new Date();
  const serviceEntries: MetadataRoute.Sitemap = getEditorialServicePages().map((page) => ({
    url: new URL(page.href, baseUrl).toString(),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.88
  }));
  const articleEntries: MetadataRoute.Sitemap = getAllArticles().map((article) => ({
    url: new URL(`/artigos/${article.slug}`, baseUrl).toString(),
    lastModified: new Date(article.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.82
  }));
  const hubEntries: MetadataRoute.Sitemap = getTopicHubs().map((hub) => ({
    url: new URL(`/artigos/tema/${hub.slug}`, baseUrl).toString(),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.78
  }));

  const staticEntries: MetadataRoute.Sitemap = publicRoutes.map((route) => ({
      url: new URL(route || "/", baseUrl).toString(),
      lastModified: now,
      changeFrequency: route === "" ? "weekly" : route === "/artigos" ? "weekly" : "monthly",
      priority: route === "" ? 1 : route === "/artigos" ? 0.9 : 0.6
    }));

  return [
    ...staticEntries,
    ...serviceEntries,
    ...hubEntries,
    ...articleEntries
  ];
}
