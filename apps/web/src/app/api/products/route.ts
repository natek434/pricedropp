import { prisma } from '@pricedropp/db'
import { FeedQuerySchema, etagFor } from '@pricedropp/shared'

export const revalidate = 60

export async function GET(req: Request) {
  const url = new URL(req.url)
  const parsed = FeedQuerySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return new Response('Bad Request', { status: 400 })
  const { sort, page, category, tag } = parsed.data
  const take = 24
  const skip = (page - 1) * take
  const where: any = {}
  if (category) where.categories = { some: { category: { slug: category } } }
  if (tag) where.tags = { some: { tag: { slug: tag } } }
  if (sort === 'popular') {
    const items = await prisma.product.findMany({ where, include: { _count: { select: { watches: true } } }, skip, take: 100 })
    const ranked = items
      .map((i) => ({ ...i, score: (i._count as any).watches * 2 + i.views }))
      .sort((a, b) => b.score - a.score)
      .slice(0, take)
    const etag = etagFor(ranked.map(i => i.id + i.updatedAt.toISOString() + (i._count as any).watches))
    const headers = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 's-maxage=60, stale-while-revalidate=300', ETag: etag })
    if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers })
    return new Response(JSON.stringify({ items: ranked, page }), { status: 200, headers })
  }
  const orderBy = [{ createdAt: 'desc' as const }]
  const items = await prisma.product.findMany({ where, orderBy, skip, take })
  const etag = etagFor(items.map(i => i.id + i.updatedAt.toISOString()))
  const headers = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 's-maxage=60, stale-while-revalidate=300', ETag: etag })
  if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers })
  return new Response(JSON.stringify({ items, page }), { status: 200, headers })
}
