import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

const metadataBase = new URL(
  process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000"
);

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "Noemia Paixao Advocacia | Atendimento e Portal do Cliente",
    template: "%s | Noemia Paixao Advocacia"
  },
  description:
    "Atendimento juridico com triagem organizada, portal do cliente, documentos, agenda e acompanhamento claro do caso.",
  applicationName: "Portal Juridico Noemia Paixao Advocacia",
  robots: {
    index: false,
    follow: false
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Noemia Paixao Advocacia",
    title: "Noemia Paixao Advocacia | Atendimento e Portal do Cliente",
    description:
      "Triagem inicial organizada, onboarding claro e acompanhamento juridico em um portal seguro."
  },
  twitter: {
    card: "summary_large_image",
    title: "Noemia Paixao Advocacia | Atendimento e Portal do Cliente",
    description:
      "Triagem inicial organizada, onboarding claro e acompanhamento juridico em um portal seguro."
  },
  other: {
    "format-detection": "telephone=no"
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
