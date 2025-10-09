"use client"
import Link from 'next/link'
import { Session } from 'next-auth'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'

type AuthMenuProps = { session: Session | null }

export function AuthMenu({ session }: AuthMenuProps) {
  if (!session?.user) {
    return (
      <div className="flex items-center gap-3">
        <Button variant="ghost" asChild>
          <Link href="/sign-in">Sign in</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/sign-up">Get started</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden sm:inline text-gray-600">{session.user.email}</span>
      <Button variant="ghost" onClick={() => signOut({ callbackUrl: '/' })}>
        Sign out
      </Button>
    </div>
  )
}
