"use client"
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-700">
          {submitted ? (
            <p>
              We&apos;ll reach out shortly with manual reset instructions. If you don&apos;t hear from us, email{' '}
              <a className="underline" href="mailto:support@pricedropp.local">
                support@pricedropp.local
              </a>
              .
            </p>
          ) : (
            <>
              <p>
                Automated resets are coming soon. For now, share the email tied to your account and we&apos;ll help you regain access.
              </p>
              <form className="space-y-3" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700" htmlFor="email">
                    Account email
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
                <Button type="submit" className="w-full">
                  Request assistance
                </Button>
              </form>
            </>
          )}

          <div className="text-gray-600">
            Remembered it?{' '}
            <a className="underline" href="/sign-in">
              Back to sign-in
            </a>
            .
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

