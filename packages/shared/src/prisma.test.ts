import { describe, expect, it } from 'vitest'
import { decimalToNumber } from './prisma'

describe('decimalToNumber', () => {
  it('returns numbers untouched', () => {
    expect(decimalToNumber(12.34)).toBe(12.34)
  })

  it('uses toNumber when available', () => {
    const value = {
      toNumber: () => 7.3,
    }
    expect(decimalToNumber(value)).toBe(7.3)
  })

  it('falls back to toString', () => {
    const value = {
      toString: () => '9.99',
    }
    expect(decimalToNumber(value)).toBe(9.99)
  })

  it('throws when conversion fails', () => {
    expect(() => decimalToNumber({ toString: () => 'abc' })).toThrowError('Value cannot be converted to number')
  })
})
