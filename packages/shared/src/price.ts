import Decimal from 'decimal.js'

export function parsePrice(text: string): { price: Decimal; currency: string } | null {
  const t = text.replace(/\s+/g, ' ').trim()
  const currencyMatch = t.match(/[€£$]|NZ\$|US\$|AU\$/)
  const numMatch = t.replace(/[^0-9.,]/g, '')
  if (!numMatch) return null
  let normalized = numMatch
  if (normalized.indexOf(',') > -1 && normalized.indexOf('.') > -1) {
    if (normalized.lastIndexOf('.') > normalized.lastIndexOf(',')) {
      normalized = normalized.replace(/,/g, '')
    } else {
      normalized = normalized.replace(/\./g, '').replace(/,/g, '.')
    }
  } else {
    normalized = normalized.replace(/,/g, '')
  }
  const price = new Decimal(normalized)
  const symbol = currencyMatch?.[0] || 'NZ$'
  const currency = symbol === '$' || symbol === 'NZ$' ? 'NZD' : symbol === 'US$' ? 'USD' : symbol === 'AU$' ? 'AUD' : symbol === '€' ? 'EUR' : symbol === '£' ? 'GBP' : 'NZD'
  return { price, currency }
}

