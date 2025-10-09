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
  const jsonResults = extractFromAfInitScripts(html)
  for (const result of jsonResults) {
    results.push(result)
    if (results.length === 12) break
  }
  if (results.length === 12) {
    return results
  }
  const seen = new Set<string>(results.map((item) => item.id))
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
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed)
      if (url.hostname === 'www.google.com') {
        if (url.pathname === '/url') {
          const target = url.searchParams.get('url') || url.searchParams.get('q')
          if (target) return target
        }
        if (url.pathname.startsWith('/shopping/redirect')) {
          const target = url.searchParams.get('url')
          if (target) return target
        }
      }
    } catch (error) {
      // ignore parse errors and fall back to original href
    }
    return trimmed
  }
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

function extractFromAfInitScripts(html: string) {
  const scriptRegex = /<script[^>]*>\s*AF_initDataCallback\((\{[\s\S]*?\})\)\s*;<\/script>/g
  const results: GoogleShoppingResult[] = []
  const seen = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = scriptRegex.exec(html)) && results.length < 12) {
    const payload = parseAfInitPayload(match[1])
    if (!payload || !payload.data) continue
    collectFromNode(payload.data, results, seen)
  }
  return results
}

function parseAfInitPayload(serialized: string): { key?: string; data?: unknown } | null {
  try {
    const cleanSerialized = serialized.replace(/,\s*sideChannel:\s*\{[\s\S]*?\}\s*$/, '')
    // eslint-disable-next-line no-new-func
    const value = new Function(`"use strict"; return (${cleanSerialized});`)()
    if (value && typeof value === 'object') {
      return value as { key?: string; data?: unknown }
    }
  } catch (error) {
    // ignore parsing issues and fall back to markup scraping
  }
  return null
}

function collectFromNode(data: unknown, results: GoogleShoppingResult[], seen: Set<string>) {
  if (!data || results.length >= 12) return
  if (Array.isArray(data)) {
    const candidate = buildResultFromNode(data)
    if (candidate) {
      if (!seen.has(candidate.id)) {
        results.push(candidate)
        seen.add(candidate.id)
      }
      if (results.length >= 12) return
    }
    for (const item of data) {
      collectFromNode(item, results, seen)
      if (results.length >= 12) return
    }
    return
  }
  if (typeof data === 'object') {
    for (const value of Object.values(data as Record<string, unknown>)) {
      collectFromNode(value, results, seen)
      if (results.length >= 12) return
    }
  }
}

function buildResultFromNode(node: unknown[]): GoogleShoppingResult | null {
  const strings = collectStrings(node)
  if (!strings.length) return null
  const link = strings.find((value) => isPlausibleLink(value))
  if (!link) return null
  const title = strings.find((value) => isPlausibleTitle(value))
  if (!title) return null
  const priceText = strings.find((value) => PRICE_HINT_REGEX.test(value))
  const merchant = strings.find((value) => isPlausibleMerchant(value, title))
  const imageUrl = strings.find((value) => isPlausibleImage(value))
  const normalizedLink = normalizeGoogleLink(link)
  if (!normalizedLink) return null
  return {
    id: createResultId(normalizedLink, title),
    title,
    link: normalizedLink,
    priceText: priceText || undefined,
    merchant: merchant || undefined,
    imageUrl: imageUrl ? normalizeGoogleLink(imageUrl) : undefined,
  }
}

function collectStrings(root: unknown, limit = 60) {
  const strings: string[] = []
  const stack: unknown[] = [root]
  while (stack.length && strings.length < limit) {
    const current = stack.pop()
    if (typeof current === 'string') {
      const clean = cleanText(current)
      if (clean) strings.push(clean)
      continue
    }
    if (Array.isArray(current)) {
      for (const item of current) {
        stack.push(item)
      }
      continue
    }
    if (current && typeof current === 'object') {
      for (const value of Object.values(current as Record<string, unknown>)) {
        stack.push(value)
      }
    }
  }
  return strings
}

function isPlausibleLink(value: string) {
  if (!/^https?:\/\//i.test(value)) return false
  if (/googleusercontent/i.test(value)) return false
  if (/^https?:\/\/[^\s]+\.(?:jpg|jpeg|png|webp|gif)(?:$|\?)/i.test(value)) return false
  return (
    value.includes('/shopping/') ||
    value.includes('tbm=shop') ||
    value.includes('/aclk') ||
    value.includes('/url?')
  )
}

function isPlausibleTitle(value: string) {
  if (!value) return false
  if (/^https?:\/\//i.test(value)) return false
  if (PRICE_HINT_REGEX.test(value)) return false
  if (value.length < 4 || value.length > 150) return false
  if (!/[a-z]/i.test(value)) return false
  const wordCount = value.split(/\s+/).length
  return wordCount <= 25
}

function isPlausibleMerchant(value: string, title: string) {
  if (!value) return false
  if (/^https?:\/\//i.test(value)) return false
  if (PRICE_HINT_REGEX.test(value)) return false
  if (value.length > 60) return false
  if (!/[a-z]/i.test(value)) return false
  if (value === title) return false
  if (/\breview/i.test(value)) return false
  if (/\bresults?/i.test(value)) return false
  return true
}

function isPlausibleImage(value: string) {
  if (!/^https?:\/\//i.test(value)) return false
  return /(?:jpg|jpeg|png|webp|tbn)/i.test(value)
}
