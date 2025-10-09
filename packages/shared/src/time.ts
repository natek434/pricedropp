export function isQuietHours(localHour: number, start?: number | null, end?: number | null) {
  if (start == null || end == null) return false
  if (start === end) return false
  if (start < end) return localHour >= start && localHour < end
  return localHour >= start || localHour < end
}

export function nextQuietEnd(now: Date, tzHourEnd: number) {
  const n = new Date(now)
  n.setHours(tzHourEnd, 0, 0, 0)
  if (n <= now) n.setDate(n.getDate() + 1)
  return n
}

export function currentHourInTz(tz: string) {
  const fmt = new Intl.DateTimeFormat('en-US', { hour: '2-digit', hour12: false, timeZone: tz })
  const parts = fmt.formatToParts(new Date())
  const hour = Number(parts.find(p => p.type === 'hour')?.value || '0')
  return hour
}
