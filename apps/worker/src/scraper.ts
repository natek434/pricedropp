import { chromium, BrowserContext } from 'playwright'
import { parsePrice } from '@pricedropp/shared'
import { prisma } from '@pricedropp/db'

export async function scrapeProduct(url: string, host: string) {
  const rule = await prisma.siteRule.findUnique({ where: { host } })
  const selectors = rule?.selectors ?? ['[itemprop="price"]', '.price', '.a-offscreen']
  const waitMs = rule?.waitMs ?? 1500
  const browser = await chromium.launch({ headless: true })
  let context: BrowserContext | null = null
  try {
    context = await browser.newContext({ userAgent: randomUA() })
    const page = await context.newPage()
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(waitMs + jitter(200))
    let text: string | null = null
    for (const sel of selectors) {
      const el = await page.$(sel)
      if (el) {
        text = (await el.textContent())?.trim() || null
        if (text) break
      }
    }
    if (!text) throw new Error('No price text found')
    const parsed = parsePrice(text)
    if (!parsed) throw new Error('Failed to parse price')
    return parsed
  } finally {
    await context?.close()
    await browser.close()
  }
}

function randomUA() {
  const uas = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/15.5 Safari/605.1.15',
  ]
  return uas[Math.floor(Math.random() * uas.length)]
}
function jitter(n: number) { return Math.floor(Math.random() * n) }

