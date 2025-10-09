import Decimal from 'decimal.js'

export type AlertInputs = {
  currentPrice: Decimal
  targetPrice: Decimal
  nearTargetPercent: number
  lastNearTargetAt?: Date | null
  lastOnTargetAt?: Date | null
  hardCooldownH: number
  nearTargetCooldownH: number
  maxAlertsPerDay: number
  alertsSentToday: number
  mutedUntil?: Date | null
}

export type AlertDecision =
  | { type: 'none' }
  | { type: 'on-target' }
  | { type: 'near-target'; withinPercent: number }

export function decideAlert(input: AlertInputs): AlertDecision {
  const now = new Date()
  if (input.mutedUntil && input.mutedUntil > now) return { type: 'none' }
  if (input.alertsSentToday >= input.maxAlertsPerDay) return { type: 'none' }

  if (input.currentPrice.lte(input.targetPrice)) {
    if (input.lastOnTargetAt) {
      const next = new Date(input.lastOnTargetAt.getTime() + input.hardCooldownH * 3600_000)
      if (next > now) return { type: 'none' }
    }
    return { type: 'on-target' }
  }

  const threshold = input.targetPrice.mul(new Decimal(1).plus(input.nearTargetPercent / 100))
  if (input.currentPrice.lte(threshold)) {
    if (input.lastNearTargetAt) {
      const next = new Date(input.lastNearTargetAt.getTime() + input.nearTargetCooldownH * 3600_000)
      if (next > now) return { type: 'none' }
    }
    const diff = input.currentPrice.minus(input.targetPrice).abs()
    const pct = diff.div(input.targetPrice).times(100)
    const meetsMinChange = diff.gte(1) || pct.gte(1)
    if (!meetsMinChange) return { type: 'none' }
    const withinPercent = input.currentPrice
      .div(input.targetPrice)
      .minus(1)
      .times(100)
      .toNumber()
    return { type: 'near-target', withinPercent }
  }
  return { type: 'none' }
}

