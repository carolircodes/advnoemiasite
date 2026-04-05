import type { CaseArea } from "./domain/portal";

const ENTRY_CONTEXT_QUERY_KEYS = ["origem", "tema", "campanha", "video"] as const;

export type EntryContext = Record<(typeof ENTRY_CONTEXT_QUERY_KEYS)[number], string>;

type SearchParamsInput =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | null
  | undefined;

const ENTRY_THEME_TO_CASE_AREA: Record<string, CaseArea> = {
  aposentadoria: "previdenciario",
  previdenciario: "previdenciario",
  banco: "consumidor_bancario",
  bancario: "consumidor_bancario",
  consumidor: "consumidor_bancario",
  "consumidor-bancario": "consumidor_bancario",
  familia: "familia",
  civil: "civil"
};

function getFirstQueryValue(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
}

export function normalizeEntryContextValue(value: string | null | undefined) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function getQueryValue(searchParams: SearchParamsInput, keys: readonly string[]) {
  if (!searchParams) {
    return "";
  }

  if (searchParams instanceof URLSearchParams) {
    for (const key of keys) {
      const value = searchParams.get(key);

      if (value) {
        return value;
      }
    }

    return "";
  }

  for (const key of keys) {
    const value = getFirstQueryValue(searchParams[key]);

    if (value) {
      return value;
    }
  }

  return "";
}

export function readEntryContext(
  searchParams: SearchParamsInput,
  defaults: Partial<EntryContext> = {}
): EntryContext {
  return {
    origem: normalizeEntryContextValue(
      getQueryValue(searchParams, ["origem", "source"]) || defaults.origem
    ),
    tema: normalizeEntryContextValue(
      getQueryValue(searchParams, ["tema", "theme"]) || defaults.tema
    ),
    campanha: normalizeEntryContextValue(
      getQueryValue(searchParams, ["campanha", "campaign"]) || defaults.campanha
    ),
    video: normalizeEntryContextValue(
      getQueryValue(searchParams, ["video"]) || defaults.video
    )
  };
}

export function hasEntryContext(context: Partial<EntryContext> | null | undefined) {
  if (!context) {
    return false;
  }

  return ENTRY_CONTEXT_QUERY_KEYS.some((key) => Boolean(context[key]));
}

export function getEntryContextPayload(context: Partial<EntryContext> | null | undefined) {
  const payload: Record<string, string> = {};

  if (!context) {
    return payload;
  }

  for (const key of ENTRY_CONTEXT_QUERY_KEYS) {
    const value = normalizeEntryContextValue(context[key]);

    if (value) {
      payload[key] = value;
    }
  }

  return payload;
}

export function appendEntryContextToPath(path: string, context: Partial<EntryContext> | null | undefined) {
  if (!hasEntryContext(context)) {
    return path;
  }

  const isAbsoluteUrl = /^https?:\/\//i.test(path);
  const url = new URL(path, isAbsoluteUrl ? undefined : "https://app.local");

  for (const key of ENTRY_CONTEXT_QUERY_KEYS) {
    const value = normalizeEntryContextValue(context?.[key]);

    if (value && !url.searchParams.get(key)) {
      url.searchParams.set(key, value);
    }
  }

  if (isAbsoluteUrl) {
    return url.toString();
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export function resolveEntryCaseArea(context: Partial<EntryContext> | null | undefined) {
  const theme = normalizeEntryContextValue(context?.tema);

  if (!theme) {
    return null;
  }

  return ENTRY_THEME_TO_CASE_AREA[theme] || null;
}
