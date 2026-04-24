import type { Metadata } from "next";

import { PUBLIC_SITE_BASE_URL } from "../public-site.ts";

const SITE_NAME = "Noemia Paixao Advocacia";

type BuildPublicMetadataInput = {
  title: string;
  description: string;
  path: string;
  index?: boolean;
  openGraphType?: "website" | "article";
};

export function buildPublicCanonicalUrl(path: string) {
  return new URL(path, PUBLIC_SITE_BASE_URL).toString();
}

export function buildPublicMetadata({
  title,
  description,
  path,
  index = true,
  openGraphType = "website"
}: BuildPublicMetadataInput): Metadata {
  const canonical = buildPublicCanonicalUrl(path);
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    robots: {
      index,
      follow: index
    },
    alternates: {
      canonical: path
    },
    openGraph: {
      type: openGraphType,
      locale: "pt_BR",
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      url: canonical
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description
    }
  };
}
