import './globals.css'
import { ReactNode } from 'react'
import { auth } from '@/lib/auth'
import { Providers } from './providers'
import { SiteHeader } from '@/components/site-header'

export const metadata = { title: 'PriceDropp', description: 'Track prices & get alerts' }

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await auth()

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <Providers>
          <div className="mx-auto max-w-6xl p-4">
            <SiteHeader session={session} />
            <main className="pb-12">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
