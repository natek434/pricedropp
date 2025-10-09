import Link from 'next/link'
import { prisma } from '@pricedropp/db'
import { etagFor } from '@pricedropp/shared'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const recent = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    take: 12,
  })
  const etag = etagFor(recent.map(p => p.id + p.updatedAt.toISOString()))
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Recent</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {recent.map(p => (
          <Link key={p.id} href={`/product/${p.id}`} className="border rounded p-3 bg-white">
            <div className="text-sm line-clamp-2">{p.title}</div>
            <div className="text-xs text-gray-500">{p.currency} {p.lastPrice.toString()}</div>
          </Link>
        ))}
      </div>
      <div className="sr-only">{etag}</div>
    </div>
  )
}

