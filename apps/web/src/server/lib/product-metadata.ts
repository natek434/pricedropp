import { prisma, Prisma } from '@pricedropp/db'

type PreviewResult = {
  title?: string
  image?: {
    id?: string
    sourceUrl: string
    contentType?: string
  }
}

const DEFAULT_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9',
}

export async function fetchProductPreview(url: string): Promise<PreviewResult> {
  const response = await fetch(url, {
    headers: DEFAULT_HEADERS,
    signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch product page: ${response.status}`)
  }
  const finalUrl = response.url || url
  const html = await response.text()
  const title =
    findMetaContent(html, 'property', 'og:title') ||
    findMetaContent(html, 'name', 'twitter:title') ||
    extractTagContent(html, 'title') ||
    undefined

  const imageCandidates = collectImageCandidates(html, finalUrl)

  for (const candidate of imageCandidates) {
    const asset = await getOrCreateCachedAsset(candidate)
    if (asset) {
      return {
        title,
        image: {
          id: asset.id,
          sourceUrl: asset.sourceUrl,
          contentType: asset.contentType,
        },
      }
    }
    if (asset === undefined) {
      return {
        title,
        image: {
          sourceUrl: candidate,
        },
      }
    }
  }

  return { title }
}

export async function ensureCachedAsset(sourceUrl: string) {
  const asset = await getOrCreateCachedAsset(sourceUrl)
  return asset ?? null
}

async function getOrCreateCachedAsset(sourceUrl: string) {
  const cachedAsset = getCachedAssetDelegate()
  if (!cachedAsset) {
    return undefined
  }
  try {
    const existing = await cachedAsset.findUnique({ where: { sourceUrl } })
    if (existing) return existing
  } catch (error) {
    if (isCachedAssetUnavailable(error)) {
      console.warn('CachedAsset table missing; skipping cache lookup')
      return null
    }
    throw error
  }
  const res = await fetch(sourceUrl, {
    headers: DEFAULT_HEADERS,
    signal: AbortSignal.timeout(12_000),
  })
  if (!res.ok) {
    return null
  }
  const arrayBuffer = await res.arrayBuffer()
  if (!arrayBuffer.byteLength) {
    return null
  }
  const contentType = res.headers.get('content-type') || guessContentTypeFromUrl(sourceUrl) || 'application/octet-stream'
  const data = Buffer.from(arrayBuffer)
  try {
    return await cachedAsset.create({
      data: {
        sourceUrl,
        contentType,
        data,
      },
    })
  } catch (error) {
    if (isCachedAssetUnavailable(error)) {
      console.warn('CachedAsset table missing; skipping cache write')
      return null
    }
    throw error
  }
}

function isCachedAssetUnavailable(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ['P2021', 'P2010', 'P1010'].includes(error.code)
  }
  if (error instanceof Prisma.PrismaClientInitializationError) return true
  if (error instanceof Error && /cachedasset/i.test(error.message)) return true
  return false
}

type CachedAssetDelegate = {
  findUnique: (args: any) => Promise<any>
  create: (args: any) => Promise<any>
}

let warnedMissingCachedAsset = false

function getCachedAssetDelegate() {
  const delegate = (prisma as any)?.cachedAsset as CachedAssetDelegate | undefined
  if (!delegate && !warnedMissingCachedAsset) {
    warnedMissingCachedAsset = true
    console.warn(
      'CachedAsset model missing from Prisma client; run `pnpm prisma:generate` and apply the latest migrations to enable image caching.'
    )
  }
  return delegate
}

function collectImageCandidates(html: string, baseUrl: string) {
  const urls = new Set<string>()
  const base = new URL(baseUrl)
  const push = (value?: string | null) => {
    if (!value) return
    const trimmed = value.trim()
    if (!trimmed) return
    const decoded = decodeHtmlEntities(trimmed)
    const absolute = toAbsoluteUrl(decoded, base)
    if (absolute) urls.add(absolute)
  }
  const prioritizedImageSrcs: string[] = []
  const fallbackMetaSrcs: string[] = []
  const imgMatches = html.matchAll(/<img\b[^>]*>/gi)
  for (const match of imgMatches) {
    const tag = match[0]
    const ariaLabelledby = findAttribute(tag, 'aria-labelledby')
    const hasRelevantLabel = ariaLabelledby?.includes('product-title')
    const hasDeferload = tag.includes('deferload')
    const candidateAttrs = [findAttribute(tag, 'src'), findAttribute(tag, 'data-src'), findAttribute(tag, 'data-original')]
    const srcset = findAttribute(tag, 'srcset')
    if (srcset) {
      const first = srcset.split(',')[0]?.trim().split(' ')[0]
      candidateAttrs.push(first)
    }
    if (hasRelevantLabel || hasDeferload || candidateAttrs.some(Boolean)) {
      for (const value of candidateAttrs) {
        if (value) prioritizedImageSrcs.push(value)
      }
    }
  }
  fallbackMetaSrcs.push(findMetaContent(html, 'property', 'og:image') ?? '')
  fallbackMetaSrcs.push(findMetaContent(html, 'name', 'twitter:image') ?? '')
  fallbackMetaSrcs.push(findLinkHref(html, 'image_src') ?? '')

  for (const src of [...prioritizedImageSrcs, ...fallbackMetaSrcs]) {
    push(src)
  }

  return urls
}

function findMetaContent(html: string, attrName: string, attrValue: string) {
  const regex = new RegExp(`<meta[^>]*${attrName}=["']${escapeRegExp(attrValue)}["'][^>]*>`, 'i')
  const match = html.match(regex)
  if (!match) return undefined
  return findAttribute(match[0], 'content') || undefined
}

function findLinkHref(html: string, relValue: string) {
  const regex = new RegExp(`<link[^>]*rel=["']${escapeRegExp(relValue)}["'][^>]*>`, 'i')
  const match = html.match(regex)
  if (!match) return undefined
  return findAttribute(match[0], 'href') || undefined
}

function extractTagContent(html: string, tag: string) {
  const regex = new RegExp(`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`, 'i')
  const match = html.match(regex)
  if (!match) return undefined
  return match[1].trim()
}

function findAttribute(tag: string, attr: string) {
  const regex = new RegExp(`${attr}\\s*=\\s*(["'])(.*?)\\1`, 'i')
  const match = tag.match(regex)
  return match?.[2]
}

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function toAbsoluteUrl(input: string, base: URL) {
  try {
    if (input.startsWith('data:')) return null
    if (input.startsWith('//')) {
      return `${base.protocol}${input}`
    }
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return input
    }
    if (input.startsWith('/')) {
      return new URL(input, base.origin).toString()
    }
    return new URL(input, base.toString()).toString()
  } catch {
    return null
  }
}

function guessContentTypeFromUrl(url: string) {
  const lower = url.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  return lower.endsWith('.jpg') || lower.endsWith('.jpeg') ? 'image/jpeg' : null
}

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const lower = entity.toLowerCase()
    if (lower === 'amp') return '&'
    if (lower === 'lt') return '<'
    if (lower === 'gt') return '>'
    if (lower === 'quot') return '"'
    if (lower === 'apos') return "'"
    if (lower.startsWith('#x')) {
      const codePoint = Number.parseInt(lower.slice(2), 16)
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match
    }
    if (lower.startsWith('#')) {
      const codePoint = Number.parseInt(lower.slice(1), 10)
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match
    }
    return match
  })
}
