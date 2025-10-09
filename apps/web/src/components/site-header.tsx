import Link from 'next/link'
import { Session } from 'next-auth'
import { AuthMenu } from '@/components/auth-menu'
import { Button } from '@/components/ui/button'

type SiteHeaderProps = { session: Session | null }

export function SiteHeader({ session }: SiteHeaderProps) {
  const links = [
    { href: '/dashboard', label: 'Dashboard', authOnly: true },
    { href: '/add', label: 'Add Watch', authOnly: true },
    { href: '/settings', label: 'Settings', authOnly: true },
    { href: '/admin', label: 'Admin', authOnly: true },
    { href: '/categories', label: 'Categories', authOnly: false },
    { href: '/tags', label: 'Tags', authOnly: false },
  ]

  return (
    <header className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-xl font-semibold">
          PriceDropp
        </Link>
        <Link href="/add" className="md:hidden">
          <Button variant="outline" size="sm">
            Add watch
          </Button>
        </Link>
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
        <nav className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          {links
            .filter((item) => !item.authOnly || session?.user)
            .map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-gray-900">
                {item.label}
              </Link>
            ))}
        </nav>
        <AuthMenu session={session} />
      </div>
    </header>
  )
}

