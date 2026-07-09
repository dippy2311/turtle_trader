import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TurtleTrader AI',
  description: 'Indian equity trading — Turtle Trading strategy',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'TurtleTrader' },
}

export const viewport: Viewport = {
  width: 'device-width', initialScale: 1,
  maximumScale: 1, userScalable: false,
  themeColor: '#0A0A0F',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
