"use client"
import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { inferRouterOutputs } from '@trpc/server'
import { trpc } from '@/lib/trpc/client'
import type { AppRouter } from '@/server/trpc/router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type WatchListItem = inferRouterOutputs<AppRouter>['watch']['list'][number]

export function WatchList() {
  const { data, isLoading } = trpc.watch.list.useQuery(undefined, { staleTime: 1000 * 30 })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (isLoading) {
    return <div className="text-sm text-gray-600">Loading your watches…</div>
  }

  if (!data?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No watches yet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <p>You haven’t added any products to PriceDropp yet.</p>
          <Button asChild>
            <Link href="/add">Start tracking a product</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-3">
      {data.map((watch) => {
        const formattedTarget = watch.targetPrice.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 3,
        })
        const formattedLast = watch.product.lastPrice.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 3,
        })
        const displayTitle = watch.product.title || watch.product.url
        const imageSrc = watch.product.imageCacheId
          ? `/api/images/${watch.product.imageCacheId}`
          : watch.product.image || undefined
        const isExpanded = expandedId === watch.id
        return (
          <Card key={watch.id}>
            <CardContent className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                {imageSrc ? (
                  <div className="shrink-0 overflow-hidden rounded-md border border-gray-200 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageSrc}
                    alt={displayTitle}
                    className="h-24 w-24 object-cover"
                    loading="lazy"
                  />
                </div>
              ) : null}
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <div>
                    <div className="font-medium text-gray-900">{displayTitle}</div>
                    <div className="text-xs text-gray-500">{watch.product.host}</div>
                  </div>
                  <div className="text-right text-sm text-gray-600 sm:text-base">
                    Target{' '}
                    <span className="font-medium">
                      {watch.product.currency} {formattedTarget}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col justify-between gap-2 text-xs text-gray-500 sm:flex-row sm:items-center">
                  <div>
                    Last price: {watch.product.currency} {formattedLast}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedId(isExpanded ? null : watch.id)}
                    >
                      {isExpanded ? 'Hide details' : 'View details'}
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/product/${watch.productId}`}>View history</Link>
                    </Button>
                  </div>
                </div>
              </div>
              {isExpanded ? <WatchDetails watch={watch} onClose={() => setExpandedId(null)} /> : null}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function WatchDetails({ watch, onClose }: { watch: WatchListItem; onClose: () => void }) {
  const utils = trpc.useUtils()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const deleteMutation = trpc.watch.delete.useMutation()

  const formattedTarget = useMemo(
    () =>
      watch.targetPrice.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 3,
      }),
    [watch.targetPrice]
  )
  const formattedLast = useMemo(
    () =>
      watch.product.lastPrice.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 3,
      }),
    [watch.product.lastPrice]
  )

  const previewImageSrc = useMemo(() => {
    if (watch.product.imageCacheId) return `/api/images/${watch.product.imageCacheId}`
    return watch.product.image || undefined
  }, [watch.product.imageCacheId, watch.product.image])

  const googleQueryText = useMemo(() => {
    const parts: string[] = []
    if (watch.product.title) parts.push(watch.product.title)
    if (Number.isFinite(watch.product.lastPrice)) {
      parts.push(watch.product.lastPrice.toFixed(2))
    }
    return parts.join(' ').trim()
  }, [watch.product.title, watch.product.lastPrice])

  const googleQuery = trpc.product.googleShopping.useQuery(
    { query: googleQueryText },
    {
      enabled: Boolean(googleQueryText),
      staleTime: 1000 * 60 * 5,
      retry: false,
    }
  )

  function handleDelete() {
    setDeleteError(null)
    deleteMutation.mutate(
      { id: watch.id },
      {
        onSuccess: () => {
          utils.watch.list.invalidate()
          onClose()
        },
        onError: (error) => {
          setDeleteError(error.message || 'Failed to delete watch.')
        },
      }
    )
  }

  return (
    <div className="space-y-4 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm">
      <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
        <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
          {previewImageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewImageSrc} alt={watch.product.title || watch.product.url} className="h-40 w-full object-cover" />
          ) : (
            <div className="flex h-40 items-center justify-center text-xs text-gray-400">No image available</div>
          )}
        </div>
        <div className="space-y-2">
          <div className="font-medium text-gray-900">{watch.product.title || watch.product.url}</div>
          <div className="break-all text-xs text-gray-500">{watch.product.url}</div>
          <div className="text-xs text-gray-500">
            Current price: {watch.product.currency} {formattedLast}
          </div>
          <div className="text-xs text-gray-500">
            Target price: {watch.product.currency} {formattedTarget}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-900">Similar items on Google Shopping</h4>
        {googleQuery.isFetching && <p className="text-xs text-gray-500">Searching Google…</p>}
        {!googleQuery.isFetching && googleQuery.data?.length ? (
          <div className="overflow-x-auto">
            <div className="flex gap-3 pb-2">
              {googleQuery.data.map((item) => (
                <a
                  key={item.id}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-48 shrink-0 flex-col gap-2 rounded-md border border-gray-200 bg-white p-3 hover:border-gray-300"
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
                    {item.priceText ? <div className="text-sm font-semibold text-gray-800">{item.priceText}</div> : null}
                    {item.merchant ? <div className="text-xs text-gray-500">{item.merchant}</div> : null}
                  </div>
                </a>
              ))}
            </div>
          </div>
        ) : null}
        {!googleQuery.isFetching && googleQueryText && !googleQuery.data?.length && (
          <p className="text-xs text-gray-500">No Google Shopping results yet.</p>
        )}
        {!googleQueryText && (
          <p className="text-xs text-gray-500">Add a title and price to this watch to search Google Shopping.</p>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {deleteError ? <p className="text-xs text-red-600">{deleteError}</p> : <span className="text-xs text-gray-500">Manage this watch below.</span>}
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-red-500 text-red-600 hover:bg-red-50"
            disabled={deleteMutation.isPending}
            onClick={handleDelete}
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete watch'}
          </Button>
        </div>
      </div>
    </div>
  )
}

