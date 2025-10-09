import { prisma } from '@pricedropp/db'

export default async function ProductPage({ params }: { params: { id: string } }) {
  const p = await prisma.product.findUnique({ where: { id: params.id }, include: { priceHistory: { orderBy: { seenAt: 'desc' }, take: 30 } } })
  if (!p) return <div>Not found</div>
  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">{p.title}</h1>
      <div className="text-sm text-gray-600 mb-4">{p.currency} {p.lastPrice.toString()}</div>
      <div className="bg-white border rounded p-3 text-sm">
        <div className="font-medium mb-2">Recent Prices</div>
        <ul className="list-disc ml-5">
          {p.priceHistory.map(h => (
            <li key={h.id}>{new Date(h.seenAt).toLocaleString()} — {h.currency} {h.price.toString()}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

