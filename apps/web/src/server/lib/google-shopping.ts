const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9',
}

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
  const cardRegex = /<div class=\"(?:sh-dgr__content|i0X6df)[^\"]*\"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g
  let match: RegExpExecArray | null
  while ((match = cardRegex.exec(html)) && results.length < 12) {
    const fragment = match[1]
    const anchorMatch = fragment.match(/<a [^>]*href=\"([^\"]+)\"[^>]*>([\s\S]*?)<\/a>/i)
    const href = anchorMatch?.[1]
    const link = normalizeGoogleLink(href)
    if (!link) continue

    let titleHtml = anchorMatch?.[2] || ''
    if (!titleHtml) {
      const aria = fragment.match(/aria-label=\"([^\"]+)\"/i)
      if (aria) titleHtml = aria[1]
    }
    const title = cleanText(titleHtml)
    if (!title) continue

    const priceMatch = fragment.match(/<span[^>]*class=\"[^\"]*a8Pemb[^\"]*\"[^>]*>([^<]+)<\/span>/i)
    const priceText = cleanText(priceMatch?.[1]) || undefined
    const merchantMatch = fragment.match(/<div[^>]*class=\"[^\"]*aULzUe[^\"]*\"[^>]*>([^<]+)<\/div>/i)
    const merchant = cleanText(merchantMatch?.[1]) || undefined
    const imgMatch = fragment.match(/<img[^>]*src=\"([^\"]+)\"[^>]*>/i) || fragment.match(/<img[^>]*data-src=\"([^\"]+)\"[^>]*>/i)
    const imageUrl = normalizeGoogleLink(imgMatch?.[1])

    results.push({
      id: createResultId(link, title),
      title,
      priceText,
      link,
      merchant,
      imageUrl,
    })
  }

  return results
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
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}
