import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export async function rateLimitKey(key: string, limit: number, windowSeconds: number) {
  const now = Math.floor(Date.now() / 1000)
  const bucket = `${key}:${Math.floor(now / windowSeconds)}`
  const count = await redis.incr(bucket)
  if (count === 1) await redis.expire(bucket, windowSeconds)
  return { allowed: count <= limit, count, ttl: await redis.ttl(bucket) }
}

export function userDayKey(userId: string) {
  const d = new Date()
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${userId}:${yyyy}${mm}${dd}`
}

