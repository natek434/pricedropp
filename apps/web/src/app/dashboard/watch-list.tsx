"use client"
import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function WatchList() {
  const { data, isLoading } = trpc.watch.list.useQuery(undefined, { staleTime: 1000 * 30 })

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
        return (
          <Card key={watch.id}>
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
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
              <div className="flex-1 space-y-2">
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
                  <Link href={`/product/${watch.productId}`} className="underline">
                    View history
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

