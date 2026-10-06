import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Lycée Midongy Sud — La vie scolaire, simplement',
  description: 'Informations, inscriptions et services numériques du Lycée Midongy Sud.',
  icons: {
    icon: '/drapeau.jpeg?v=20261007',
    shortcut: '/drapeau.jpeg?v=20261007',
    apple: '/drapeau.jpeg?v=20261007',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#ffffff',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
