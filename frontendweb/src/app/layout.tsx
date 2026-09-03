import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

/**
 * Pre-paint theme script — runs synchronously in <head> BEFORE first paint so
 * the document renders in the right theme on the first frame (no flash). Dark
 * mode is a single `.dark` class on <html>; the tokens in globals.css flip under
 * it. Persisted to localStorage, falls back to dark.
 */
const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||t===null||t==='system';document.documentElement.classList.toggle('dark',d);}catch(e){}})();`

export const metadata: Metadata = {
  title: 'Lycée Horizon — Administration',
  description: 'Pilotage administratif, inscriptions et vie scolaire du Lycée Horizon.',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* MUST be first: sets the theme class before paint (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
