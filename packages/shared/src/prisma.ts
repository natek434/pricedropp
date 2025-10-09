export function decimalToNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (value == null) throw new TypeError('Cannot convert null or undefined to number')
  if (typeof (value as any).toNumber === 'function') {
    return (value as any).toNumber()
  }
  const str = typeof (value as any).toString === 'function' ? (value as any).toString() : `${value}`
  const num = Number(str)
  if (Number.isNaN(num)) {
    throw new TypeError('Value cannot be converted to number')
  }
  return num
}
