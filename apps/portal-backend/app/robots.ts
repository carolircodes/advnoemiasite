import type { MetadataRoute } from "next";

import { PUBLIC_SITE_BASE_URL } from "@/lib/public-site";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = new URL(PUBLIC_SITE_BASE_URL);

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/artigos", "/artigos/"],
        disallow: ["/api/", "/internal/", "/cliente", "/documentos", "/agenda"]
      }
    ],
    sitemap: new URL("/sitemap.xml", baseUrl).toString(),
    host: baseUrl.toString()
  };
}
