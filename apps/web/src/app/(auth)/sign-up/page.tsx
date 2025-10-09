"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Status = { type: 'idle' | 'pending' | 'error' | 'success'; message?: string }

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<Status>({ type: 'idle' })
  const googleEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (password !== confirm) {
      setStatus({ type: 'error', message: 'Passwords do not match.' })
      return
    }
    setStatus({ type: 'pending' })
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      setStatus({ type: 'error', message: payload.error ?? 'Could not create account.' })
      return
    }

    setStatus({ type: 'success', message: 'Account created. Signing you in...' })
    await signIn('credentials', { email, password, callbackUrl: '/dashboard' })
    router.refresh()
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your PriceDropp account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="name">
                Display name
              </label>
              <Input
                id="name"
                placeholder="Alex Smith"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
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
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="confirm">
                Confirm password
              </label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={status.type === 'pending'}>
              {status.type === 'pending' ? 'Creating account...' : 'Create account'}
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

          {status.type !== 'idle' && status.message && (
            <p className={`text-sm ${status.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
              {status.message}
            </p>
          )}

          <div className="text-sm text-gray-600">
            Already have an account?{' '}
            <a className="underline" href="/sign-in">
              Sign in
            </a>
            .
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

