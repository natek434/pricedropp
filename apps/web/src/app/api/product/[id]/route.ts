import { prisma } from '@pricedropp/db'
import { etagFor } from '@pricedropp/shared'

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const p = await prisma.product.findUnique({ where: { id: ctx.params.id }, include: { priceHistory: { orderBy: { seenAt: 'desc' }, take: 60 } } })
  if (!p) return new Response('Not Found', { status: 404 })
  const etag = etagFor(p.updatedAt.toISOString() + p.priceHistory.length)
  const headers = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 's-maxage=60, stale-while-revalidate=300', ETag: etag })
  return new Response(JSON.stringify(p), { headers })
}

