import { prisma } from '@pricedropp/db'

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const cat = await prisma.category.findUnique({ where: { slug: params.slug }, include: { products: { include: { product: true } } } })
  if (!cat) return <div>Not found</div>
  const products = cat.products.map(p => p.product)
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Category: {cat.name}</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {products.map(p => (
          <a key={p.id} href={`/product/${p.id}`} className="border rounded p-3 bg-white">
            <div className="text-sm line-clamp-2">{p.title}</div>
            <div className="text-xs text-gray-500">{p.currency} {p.lastPrice.toString()}</div>
          </a>
        ))}
      </div>
    </div>
  )
}

