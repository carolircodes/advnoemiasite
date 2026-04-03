import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Portal Jurídico | Noêmia Paixão Advocacia",
    template: "%s | Portal Jurídico"
  },
  description:
    "Base técnica real do portal jurídico com autenticação, cadastro interno e estrutura pronta para notificações por e-mail.",
  robots: {
    index: false,
    follow: false
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

