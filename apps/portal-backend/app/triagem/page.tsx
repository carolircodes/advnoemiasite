import { permanentRedirect } from "next/navigation";

function buildRedirectPath(
  searchParams: Record<string, string | string[] | undefined>,
  hash: string
) {
  const url = new URL("/", "https://app.local");

  for (const [key, rawValue] of Object.entries(searchParams)) {
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  url.hash = hash;
  return `${url.pathname}${url.search}${url.hash}`;
}

export default async function TriagePage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  permanentRedirect(buildRedirectPath(await searchParams, "triagem-inicial"));
}
