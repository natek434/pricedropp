import { getServerSession } from 'next-auth'
import { prisma } from '@pricedropp/db'

export async function POST(req: Request) {
  const session = await getServerSession()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })
  const { host, selectors, waitMs } = await req.json()
  if (!host || !Array.isArray(selectors)) return new Response('Bad Request', { status: 400 })
  const rule = await prisma.siteRule.upsert({ where: { host }, update: { selectors, waitMs: waitMs ?? 1500 }, create: { host, selectors, waitMs: waitMs ?? 1500 } })
  return new Response(JSON.stringify(rule), { headers: { 'Content-Type': 'application/json' } })
}

