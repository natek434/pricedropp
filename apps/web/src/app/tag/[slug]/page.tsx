import { prisma } from '@pricedropp/db'

export default async function TagPage({ params }: { params: { slug: string } }) {
  const tag = await prisma.tag.findUnique({ where: { slug: params.slug }, include: { products: { include: { product: true } } } })
  if (!tag) return <div>Not found</div>
  const products = tag.products.map(p => p.product)
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Tag: {tag.name}</h1>
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

