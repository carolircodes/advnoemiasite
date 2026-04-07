import { ReactNode } from 'react';

export const metadata = {
  title: 'Advnoemia',
  description: 'Advocacia especializada',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
