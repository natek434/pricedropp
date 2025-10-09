"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export default function AddWatch() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [price, setPrice] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [nameTouched, setNameTouched] = useState(false)
  const [imageTouched, setImageTouched] = useState(false)
  const [manualImageMode, setManualImageMode] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [imageCacheId, setImageCacheId] = useState<string | null>(null)

  const parsedPrice = useMemo(() => {
    const value = Number.parseFloat(price)
    return Number.isFinite(value) ? value : NaN
  }, [price])

  const previewQuery = trpc.product.preview.useQuery(
    { url },
    {
      enabled: isValidUrl(url),
      staleTime: 1000 * 60,
      retry: false,
    }
  )
  const googleQuery = trpc.product.googleShopping.useQuery(
    { query: searchQuery },
    {
      enabled: Boolean(searchQuery),
      staleTime: 1000 * 60 * 5,
      retry: false,
    }
  )
  const categoriesQuery = trpc.meta.categories.useQuery(undefined, { staleTime: 1000 * 60 * 10 })

  const mutation = trpc.watch.create.useMutation({
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Watch added. We will start tracking prices shortly.' })
      setUrl('')
      setPrice('')
      setName('')
      setCategory('')
      setNameTouched(false)
      setImageTouched(false)
      setManualImageMode(false)
      setImageUrl('')
      setImageCacheId(null)
      router.refresh()
    },
    onError: (error) => {
      setMessage({ type: 'error', text: error.message || 'Failed to add the watch.' })
    },
  })

  useEffect(() => {
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0 || name.trim().length < 2) {
      setSearchQuery('')
      return
    }
    const handle = setTimeout(() => {
      const query = `${name.trim()} ${parsedPrice.toFixed(2)}`.trim()
      setSearchQuery((prev) => (prev === query ? prev : query))
    }, 400)
    return () => clearTimeout(handle)
  }, [name, parsedPrice])

  useEffect(() => {
    if (!previewQuery.data) return
    if (!nameTouched && previewQuery.data.title) {
      setName(previewQuery.data.title)
    }
    if (!imageTouched && !manualImageMode && previewQuery.data.image) {
      setImageCacheId(previewQuery.data.image.id)
      setImageUrl(previewQuery.data.image.sourceUrl)
    }
  }, [previewQuery.data, nameTouched, imageTouched, manualImageMode])

  const previewImageSrc = useMemo(() => {
    if (imageCacheId) return `/api/images/${imageCacheId}`
    return imageUrl || undefined
  }, [imageCacheId, imageUrl])

  function resetForNewUrl(newUrl: string) {
    setUrl(newUrl)
    setMessage(null)
    setName('')
    setNameTouched(false)
    setImageTouched(false)
    setManualImageMode(false)
    setImageUrl('')
    setImageCacheId(null)
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage(null)
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setMessage({ type: 'error', text: 'Enter a valid target price.' })
      return
    }
    const payload = {
      url,
      targetPrice: parsedPrice,
      title: name.trim() || undefined,
      categorySlug: category || undefined,
      imageUrl: imageUrl.trim() || undefined,
      imageCacheId: manualImageMode ? undefined : imageCacheId || undefined,
    }
    mutation.mutate(payload)
  }

  return (
    <div className="flex min-h-[60vh] items-start justify-center">
      <Card className="w-full max-w-5xl">
        <CardHeader>
          <CardTitle>Add a product to watch</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="url">
                Product URL
              </label>
              <Input
                id="url"
                value={url}
                onChange={(e) => resetForNewUrl(e.target.value)}
                placeholder="https://www.example.com/product"
                required
                inputMode="url"
              />
              {previewQuery.isFetching && url && (
                <p className="text-xs text-gray-500">Fetching details…</p>
              )}
              {previewQuery.error && (
                <p className="text-xs text-red-600">Unable to fetch product details automatically.</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="name">
                Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setNameTouched(true)
                }}
                placeholder="Mainland Butter Salted"
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
                inputMode="decimal"
                required
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
              {categoriesQuery.isLoading && <p className="text-xs text-gray-500">Loading categories…</p>}
            </div>
            <Button type="submit" disabled={mutation.isPending || !isValidUrl(url)} className="w-full">
              {mutation.isPending ? 'Adding…' : 'Add watch'}
            </Button>
            {message && (
              <p className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                {message.text}
              </p>
            )}
          </form>

          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">Product preview</h3>
              <p className="text-xs text-gray-500">
                We try to capture the product title and image automatically from the page. You can override the image if needed.
              </p>
              <div className="space-y-3 rounded-md border border-gray-200 p-3">
                <div className="flex items-center gap-3">
                  <div className="h-20 w-20 overflow-hidden rounded-md border border-gray-100 bg-white">
                    {previewImageSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewImageSrc} alt={name || url || 'Product image'} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image yet</div>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="font-medium text-gray-900">{name || 'Name will appear here'}</div>
                    <div className="text-xs text-gray-500 break-all">{url || 'Enter a URL to preview'}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {manualImageMode ? (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-600" htmlFor="image-url">
                        Image URL override
                      </label>
                      <Input
                        id="image-url"
                        value={imageUrl}
                        onChange={(e) => {
                          setImageUrl(e.target.value)
                          setImageTouched(true)
                          setImageCacheId(null)
                        }}
                        placeholder="https://cdn.example.com/product.jpg"
                        type="url"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-2 text-xs"
                        onClick={() => {
                          setManualImageMode(false)
                          setImageTouched(false)
                          if (previewQuery.data?.image) {
                            setImageCacheId(previewQuery.data.image.id)
                            setImageUrl(previewQuery.data.image.sourceUrl)
                          }
                        }}
                      >
                        Use detected image instead
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      className="px-2 text-xs"
                      onClick={() => {
                        setManualImageMode(true)
                        setImageTouched(true)
                        setImageCacheId(null)
                      }}
                    >
                      Override image URL
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">Similar items on Google Shopping</h3>
              <p className="text-xs text-gray-500">
                We search Google Shopping using your product name and price so you can compare offers quickly.
              </p>
              <div className="space-y-2">
                {googleQuery.isFetching && <p className="text-sm text-gray-500">Searching Google…</p>}
                {!googleQuery.isFetching && googleQuery.data?.length ? (
                  <div className="overflow-x-auto">
                    <div className="flex gap-3 pb-2">
                      {googleQuery.data.map((item) => (
                        <a
                          key={item.id}
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-48 shrink-0 flex-col gap-2 rounded-md border border-gray-200 p-3 hover:border-gray-300"
                        >
                          <div className="h-32 w-full overflow-hidden rounded bg-white">
                            {item.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image</div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="line-clamp-3 text-xs font-medium text-gray-900">{item.title}</div>
                            {item.priceText ? (
                              <div className="text-sm font-semibold text-gray-800">{item.priceText}</div>
                            ) : null}
                            {item.merchant ? (
                              <div className="text-xs text-gray-500">{item.merchant}</div>
                            ) : null}
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
                {!googleQuery.isFetching && searchQuery && !googleQuery.data?.length && (
                  <p className="text-sm text-gray-500">No Google Shopping results yet.</p>
                )}
                {!searchQuery && (
                  <p className="text-xs text-gray-500">Enter a product name and target price to search Google.</p>
                )}
              </div>
            </div>

            <div className="space-y-2 text-xs text-gray-500">
              <p>
                Need to grab a product URL? Browse your favourite store, copy the address, and we will handle the rest—including image
                caching so reloads stay fast.
              </p>
              <Link href="/dashboard" className="font-medium text-gray-700 underline">
                View your existing watches
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
