import Link from 'next/link'
import { prisma } from '@pricedropp/db'

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { products: true } } } })
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Browse Categories</h1>
        <p className="text-sm text-gray-600">Grouping all tracked products so public feeds can target specific niches.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link key={category.id} href={`/category/${category.slug}`} className="rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-400">
            <div className="text-sm font-medium text-gray-700">{category.name}</div>
            <div className="text-xs text-gray-500">{category._count.products} product{category._count.products === 1 ? '' : 's'}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}

