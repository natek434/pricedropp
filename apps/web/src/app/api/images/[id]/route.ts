import { NextResponse } from 'next/server'
import { prisma } from '@pricedropp/db'

type CachedAssetDelegate = {
  findUnique: (args: any) => Promise<any>
}

let warnedMissingCachedAsset = false

function getCachedAssetDelegate(): CachedAssetDelegate | undefined {
  const delegate = (prisma as any)?.cachedAsset as CachedAssetDelegate | undefined
  if (!delegate && !warnedMissingCachedAsset) {
    warnedMissingCachedAsset = true
    console.warn(
      'CachedAsset model missing from Prisma client; run `pnpm prisma:generate` and apply the latest migrations to serve cached images.'
    )
  }
  return delegate
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const cachedAsset = getCachedAssetDelegate()
  if (!cachedAsset) {
    return new NextResponse('Image cache unavailable', { status: 503 })
  }
  const asset = await cachedAsset.findUnique({ where: { id: params.id } })
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
