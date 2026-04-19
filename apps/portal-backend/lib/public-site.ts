export const PUBLIC_SITE_BASE_URL =
  process.env.NEXT_PUBLIC_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://127.0.0.1:3000";

export const LEGAL_CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL || "contato@advnoemia.com.br";

export const PUBLIC_SITE_LEGAL_LINKS = [
  {
    href: "/politica-de-privacidade",
    label: "Politica de Privacidade"
  },
  {
    href: "/exclusao-de-dados",
    label: "Exclusao de Dados"
  },
  {
    href: "/termos-de-uso",
    label: "Termos de Uso"
  }
] as const;
