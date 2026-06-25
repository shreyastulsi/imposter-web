import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Imposter',
  description: 'Who is the imposter?',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
