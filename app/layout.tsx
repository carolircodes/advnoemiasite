export const metadata = {
  title: 'Advnoemia',
  description: 'Advocacia especializada',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
