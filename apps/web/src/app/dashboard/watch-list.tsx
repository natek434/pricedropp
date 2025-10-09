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
      {data.map((watch) => (
        <Card key={watch.id}>
          <CardContent className="flex flex-col gap-2 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">{watch.product.title}</div>
                <div className="text-xs text-gray-500">{watch.product.host}</div>
              </div>
              <div className="text-right text-sm text-gray-600">
                Target <span className="font-medium">{watch.product.currency} {watch.targetPrice.toString()}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div>Last price: {watch.product.currency} {watch.product.lastPrice.toString()}</div>
              <Link href={`/product/${watch.productId}`} className="underline">
                View history
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

