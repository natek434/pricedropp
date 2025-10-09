import Link from 'next/link'
import { prisma } from '@pricedropp/db'

export const dynamic = 'force-dynamic'

export default async function TagsPage() {
  const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { products: true } } } })
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Browse Tags</h1>
        <p className="text-sm text-gray-600">Tags help curate themed feeds like headphones, consoles, or laptops.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tags.map((tag) => (
          <Link key={tag.id} href={`/tag/${tag.slug}`} className="rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-400">
            <div className="text-sm font-medium text-gray-700">{tag.name}</div>
            <div className="text-xs text-gray-500">{tag._count.products} product{tag._count.products === 1 ? '' : 's'}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}

