const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9',
}

const CARD_CLASS_MARKERS = [
  'sh-dgr__content',
  'i0X6df',
  'sh-dgr__grha',
  'KZmu8e',
  'sh-dlr__list-result',
  'sh-dgr__grid-result',
]

const PRICE_HINT_REGEX = /(?:[$£€]|USD|NZD|AUD|CAD|EUR|GBP)\s?\d/i

export type GoogleShoppingResult = {
  id: string
  title: string
  priceText?: string
  link: string
  merchant?: string
  imageUrl?: string
}

export async function searchGoogleShopping(query: string): Promise<GoogleShoppingResult[]> {
  const url = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`
  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(12_000) })
  if (!response.ok) {
    throw new Error(`Google Shopping request failed: ${response.status}`)
  }
  const html = await response.text()
  const results: GoogleShoppingResult[] = []
  const seen = new Set<string>()
  const cardRegex = createCardRegex()
  let match: RegExpExecArray | null
  while ((match = cardRegex.exec(html)) && results.length < 12) {
    const start = match.index
    const fragment = extractDivFragment(html, start)
    if (!fragment) continue
    const anchorMatch = fragment.match(/<a [^>]*href=\"([^\"]+)\"[^>]*>([\s\S]*?)<\/a>/i)
    const href = anchorMatch?.[1]
    const link = normalizeGoogleLink(href)
    if (!link) continue

    let titleHtml = anchorMatch?.[2] || ''
    if (!cleanText(titleHtml)) {
      const aria = fragment.match(/aria-label=\"([^\"]+)\"/i)
      if (aria) titleHtml = aria[1]
    }
    let title = cleanText(titleHtml)
    if (!title) {
      const headingMatch = fragment.match(/<[^>]*role=\"heading\"[^>]*>([\s\S]*?)<\/[^>]+>/i)
      if (headingMatch) title = cleanText(headingMatch[1])
    }
    if (!title) continue

    const key = createResultId(link, title)
    if (seen.has(key)) continue
    seen.add(key)

    const priceText = extractPrice(fragment)
    const merchant = extractMerchant(fragment)
    const imageUrl = extractImageUrl(fragment)

    results.push({
      id: key,
      title,
      priceText: priceText || undefined,
      link,
      merchant: merchant || undefined,
      imageUrl: imageUrl || undefined,
    })
  }

  return results
}

function createCardRegex() {
  const joined = CARD_CLASS_MARKERS.map((marker) => marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  return new RegExp(`<div[^>]+class=\\"[^\\"]*(?:${joined})[^\\"]*\\"[^>]*>`, 'gi')
}

function extractDivFragment(html: string, startIndex: number) {
  const openTagEnd = html.indexOf('>', startIndex)
  if (openTagEnd === -1) return null
  let depth = 1
  let cursor = openTagEnd + 1
  while (cursor < html.length) {
    const nextOpen = html.indexOf('<div', cursor)
    const nextClose = html.indexOf('</div', cursor)
    if (nextClose === -1) break
    if (nextOpen !== -1 && nextOpen < nextClose) {
      const nextOpenEnd = html.indexOf('>', nextOpen)
      if (nextOpenEnd === -1) break
      depth += 1
      cursor = nextOpenEnd + 1
      continue
    }
    const closeEnd = html.indexOf('>', nextClose)
    if (closeEnd === -1) break
    depth -= 1
    cursor = closeEnd + 1
    if (depth === 0) {
      return html.slice(startIndex, cursor)
    }
  }
  return null
}

function extractPrice(fragment: string) {
  const priceMatch =
    fragment.match(/<span[^>]*class=\"[^\"]*(?:a8Pemb|XrAfOe|NprOob|T14wmb)[^\"]*\"[^>]*>([^<]+)<\/span>/i) ||
    fragment.match(/<div[^>]*class=\"[^\"]*(?:a8Pemb|XrAfOe|NprOob|T14wmb)[^\"]*\"[^>]*>([^<]+)<\/div>/i)
  const price = cleanText(priceMatch?.[1])
  if (price) return price
  const textCandidates = Array.from(fragment.matchAll(/>([^<>]+)</g)).map((m) => cleanText(m[1]))
  return textCandidates.find((value) => value && PRICE_HINT_REGEX.test(value)) || ''
}

function extractMerchant(fragment: string) {
  const merchantMatch =
    fragment.match(/<div[^>]*class=\"[^\"]*(?:aULzUe|E5ocAb|mnIHsc|zXwqqf)[^\"]*\"[^>]*>([^<]+)<\/div>/i) ||
    fragment.match(/<span[^>]*class=\"[^\"]*(?:aULzUe|E5ocAb|mnIHsc|zXwqqf)[^\"]*\"[^>]*>([^<]+)<\/span>/i)
  const merchant = cleanText(merchantMatch?.[1])
  if (merchant) return merchant
  const textCandidates = Array.from(fragment.matchAll(/>([^<>]+)</g)).map((m) => cleanText(m[1]))
  return textCandidates.find((value) => value && value.length < 60 && !PRICE_HINT_REGEX.test(value)) || ''
}

function extractImageUrl(fragment: string) {
  const imgMatch =
    fragment.match(/<img[^>]*src=\"([^\"]+)\"[^>]*>/i) ||
    fragment.match(/<img[^>]*data-src=\"([^\"]+)\"[^>]*>/i) ||
    fragment.match(/<img[^>]*data-image-url=\"([^\"]+)\"[^>]*>/i)
  return normalizeGoogleLink(imgMatch?.[1])
}

function normalizeGoogleLink(href?: string | null) {
  if (!href) return undefined
  const trimmed = href.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  if (trimmed.startsWith('/')) return `https://www.google.com${trimmed}`
  return undefined
}

function createResultId(link: string, title: string) {
  const data = `${link}|${title}`
  return Buffer.from(data).toString('base64url')
}

function cleanText(input?: string | null) {
  if (!input) return ''
  const withoutTags = input.replace(/<[^>]*>/g, ' ')
  const decoded = decodeHtml(withoutTags)
  return decoded.replace(/\s+/g, ' ').trim()
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#160;/g, ' ')
}
