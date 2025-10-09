import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { decideAlert } from './alert-logic'

describe('decideAlert', () => {
  it('on-target fires and respects cooldown', () => {
    const first = decideAlert({ currentPrice: new Decimal(100), targetPrice: new Decimal(120), nearTargetPercent: 5, hardCooldownH: 12, nearTargetCooldownH: 24, maxAlertsPerDay: 3, alertsSentToday: 0 })
    expect(first.type).toBe('on-target')
    const last = new Date()
    const second = decideAlert({ currentPrice: new Decimal(100), targetPrice: new Decimal(120), nearTargetPercent: 5, hardCooldownH: 12, nearTargetCooldownH: 24, maxAlertsPerDay: 3, alertsSentToday: 0, lastOnTargetAt: last })
    expect(second.type).toBe('none')
  })
  it('near-target within percent', () => {
    const r = decideAlert({ currentPrice: new Decimal(104), targetPrice: new Decimal(100), nearTargetPercent: 5, hardCooldownH: 12, nearTargetCooldownH: 24, maxAlertsPerDay: 3, alertsSentToday: 0 })
    expect(r.type).toBe('near-target')
  })
})

