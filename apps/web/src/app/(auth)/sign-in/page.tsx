"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Status = { type: 'idle' | 'pending' | 'error'; message?: string }

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<Status>({ type: 'idle' })
  const googleEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus({ type: 'pending' })
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
    if (res?.error || !res?.ok) {
      setStatus({ type: 'error', message: 'Invalid email or password. Try again.' })
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in to PriceDropp</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="email">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={status.type === 'pending'}>
              {status.type === 'pending' ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          {googleEnabled && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            >
              Continue with Google
            </Button>
          )}

          {status.type === 'error' && status.message && (
            <p className="text-sm text-red-600">{status.message}</p>
          )}

          <div className="text-sm text-gray-600">
            <a className="underline" href="/reset-password">
              Forgot password?
            </a>
          </div>
          <div className="text-sm text-gray-600">
            New here?{' '}
            <a className="underline" href="/sign-up">
              Create an account
            </a>
            .
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

