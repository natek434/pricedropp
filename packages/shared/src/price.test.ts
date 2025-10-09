import { describe, it, expect } from 'vitest'
import { parsePrice } from './price'

describe('parsePrice', () => {
  it('parses NZD with $', () => {
    const r = parsePrice('NZ$ 399.99')
    expect(r?.currency).toBe('NZD')
    expect(r?.price.toNumber()).toBeCloseTo(399.99)
  })
  it('parses EUR with comma', () => {
    const r = parsePrice('€1.234,56')
    expect(r?.currency).toBe('EUR')
    expect(r?.price.toNumber()).toBeCloseTo(1234.56)
  })
  it('parses decimal split by whitespace', () => {
    const r = parsePrice('$ 7 30 each')
    expect(r?.currency).toBe('NZD')
    expect(r?.price.toNumber()).toBeCloseTo(7.3)
  })
})

