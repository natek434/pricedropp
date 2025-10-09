"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AddWatch() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [price, setPrice] = useState('')
  const [name, setName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [category, setCategory] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [searchInput, setSearchInput] = useState<{ name: string; price: number }>({ name: '', price: 0 })

  const mutation = trpc.watch.create.useMutation({
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Watch added. We will start tracking prices shortly.' })
      setUrl('')
      setPrice('')
      setName('')
      setImageUrl('')
      setCategory('')
      router.refresh()
    },
    onError: (error) => {
      setMessage({ type: 'error', text: error.message || 'Failed to add the watch.' })
    },
  })

  const categoriesQuery = trpc.meta.categories.useQuery(undefined, { staleTime: 1000 * 60 * 10 })
  const similarQuery = trpc.product.searchSimilar.useQuery(
    {
      name: searchInput.name,
      targetPrice: searchInput.price,
      rangePercent: 15,
    },
    {
      enabled: Boolean(searchInput.name),
      staleTime: 1000 * 30,
    }
  )

  const parsedPrice = Number(price)

  useEffect(() => {
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0 || name.trim().length < 2) {
      setSearchInput((prev) => (prev.name ? { name: '', price: 0 } : prev))
      return
    }
    const handle = setTimeout(() => {
      setSearchInput({ name: name.trim(), price: parsedPrice })
    }, 400)
    return () => clearTimeout(handle)
  }, [name, parsedPrice])

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage(null)
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setMessage({ type: 'error', text: 'Enter a valid target price.' })
      return
    }
    mutation.mutate({
      url,
      targetPrice: parsedPrice,
      title: name.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      categorySlug: category || undefined,
    })
  }

  return (
    <div className="flex min-h-[60vh] items-start justify-center">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Add a product to watch</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
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
              <label className="text-sm font-medium text-gray-700" htmlFor="name">
                Name (optional)
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mainland Butter Salted"
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
                placeholder="7.30"
                type="number"
                min="0"
                step="0.001"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="image">
                Image URL (optional)
              </label>
              <Input
                id="image"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://cdn.example.com/product.jpg"
                type="url"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="category">
                Category (optional)
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                <option value="">Select a category</option>
                {categoriesQuery.data?.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
              {categoriesQuery.isLoading && (
                <p className="text-xs text-gray-500">Loading categories…</p>
              )}
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
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Suggested similar items</h3>
              <p className="text-xs text-gray-500">
                Enter a name and target price to explore related products in PriceDropp.
              </p>
            </div>
            <div className="space-y-2">
              {similarQuery.isFetching && <p className="text-sm text-gray-500">Searching…</p>}
              {!similarQuery.isFetching && similarQuery.data?.length ? (
                <ul className="space-y-2 text-sm text-gray-700">
                  {similarQuery.data.map((item) => (
                    <li key={item.id} className="rounded-md border border-gray-200 p-2">
                      <div className="font-medium text-gray-900">{item.title}</div>
                      <div className="text-xs text-gray-500">{item.host}</div>
                      <div className="text-sm text-gray-700">
                        {item.currency}{' '}
                        {item.lastPrice.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 3,
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
              {!similarQuery.isFetching && searchInput.name && !similarQuery.data?.length && (
                <p className="text-sm text-gray-500">No similar items found yet.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
