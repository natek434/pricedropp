"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AddWatch() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [price, setPrice] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const mutation = trpc.watch.create.useMutation({
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Watch added. We will start tracking prices shortly.' })
      setUrl('')
      setPrice('')
      router.refresh()
    },
    onError: (error) => {
      setMessage({ type: 'error', text: error.message || 'Failed to add the watch.' })
    },
  })

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage(null)
    const parsedPrice = Number(price)
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setMessage({ type: 'error', text: 'Enter a valid target price.' })
      return
    }
    mutation.mutate({ url, targetPrice: parsedPrice })
  }

  return (
    <div className="flex min-h-[60vh] items-start justify-center">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Add a product to watch</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="url">
                Product URL
              </label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.example.com/product"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="price">
                Target Price
              </label>
              <Input
                id="price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="399"
                type="number"
                min="0"
                step="0.01"
                required
              />
            </div>
            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? 'Adding…' : 'Add watch'}
            </Button>
            {message && (
              <p className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                {message.text}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
