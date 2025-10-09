import crypto from 'node:crypto'

export function etagFor(data: unknown) {
  const json = typeof data === 'string' ? data : JSON.stringify(data)
  const hash = crypto.createHash('sha1').update(json).digest('hex')
  return `W/"${hash}"`
}

