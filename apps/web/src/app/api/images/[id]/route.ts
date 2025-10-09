import { NextResponse } from 'next/server'
import { prisma } from '@pricedropp/db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const asset = await prisma.cachedAsset.findUnique({ where: { id: params.id } })
  if (!asset) {
    return new NextResponse('Not found', { status: 404 })
  }
  return new NextResponse(asset.data, {
    status: 200,
    headers: {
      'content-type': asset.contentType,
      'cache-control': 'public, max-age=604800, immutable',
    },
  })
}
