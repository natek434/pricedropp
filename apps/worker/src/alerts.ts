import Decimal from 'decimal.js'
import { prisma } from '@pricedropp/db'
import { decideAlert } from '@pricedropp/shared'
import { sendTelegram, nearTargetTemplate, onTargetTemplate } from '@pricedropp/shared'
import { userDayKey, isQuietHours, nextQuietEnd, currentHourInTz } from '@pricedropp/shared'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export async function evaluateAlerts(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return
  const watches = await prisma.watch.findMany({ where: { productId }, include: { user: { include: { settings: true } } } })
  for (const w of watches) {
    const s = w.user.settings
    const nearPct = w.nearTargetPercent ?? s?.nearTargetPercent ?? 5
    const cooldownNear = w.nearTargetCooldownH ?? s?.nearTargetCooldownH ?? 24
    const hardCd = w.hardCooldownH ?? 12
    const settingsMax = s?.maxAlertsPerDay ?? 3
    const dayKey = userDayKey(w.userId)
    const sentToday = Number((await redis.get(dayKey)) || 0)
    const decision = decideAlert({
      currentPrice: new Decimal(product.lastPrice as any),
      targetPrice: new Decimal(w.targetPrice as any),
      nearTargetPercent: nearPct,
      lastNearTargetAt: w.lastNearTargetAt,
      lastOnTargetAt: w.lastOnTargetAt,
      hardCooldownH: hardCd,
      nearTargetCooldownH: cooldownNear,
      maxAlertsPerDay: settingsMax,
      alertsSentToday: sentToday,
      mutedUntil: w.mutedUntil,
    })
    if (decision.type === 'none') continue
    if (sentToday >= settingsMax) continue
    const tz = s?.timezone || 'Pacific/Auckland'
    const hour = currentHourInTz(tz)
    const quiet = isQuietHours(hour, s?.quietHoursStart ?? null, s?.quietHoursEnd ?? null)
    if (quiet) {
      const fireAt = nextQuietEnd(new Date(), s?.quietHoursEnd ?? 7)
      await alertsEvalQueue.add(
        'evaluate',
        { productId },
        { delay: Math.max(0, fireAt.getTime() - Date.now()), removeOnComplete: 1000, removeOnFail: 1000 }
      )
      continue
    }

    const text =
      decision.type === 'on-target'
        ? onTargetTemplate({ title: product.title, price: `${product.currency} ${product.lastPrice}`, target: `${product.currency} ${w.targetPrice}`, url: product.url })
        : nearTargetTemplate({ within: decision.withinPercent, title: product.title, price: `${product.currency} ${product.lastPrice}`, target: `${product.currency} ${w.targetPrice}`, url: product.url })

    if (s?.telegramChatId && process.env.TELEGRAM_BOT_TOKEN) {
      try { await sendTelegram(process.env.TELEGRAM_BOT_TOKEN, s.telegramChatId, text) } catch {}
    }

    await prisma.notification.create({ data: { userId: w.userId, watchId: w.id, type: decision.type, payload: { productId } } })
    await redis.incr(dayKey)
    await redis.expire(dayKey, 24 * 3600)

    if (decision.type === 'on-target') {
      const mute = new Date(Date.now() + (w.hardCooldownH ?? 12) * 3600_000)
      await prisma.watch.update({ where: { id: w.id }, data: { lastOnTargetAt: new Date(), mutedUntil: mute } })
    } else {
      await prisma.watch.update({ where: { id: w.id }, data: { lastNearTargetAt: new Date() } })
    }
  }
}
