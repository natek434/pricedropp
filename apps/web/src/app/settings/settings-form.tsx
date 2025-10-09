"use client"
import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const initialForm = {
  timezone: 'Pacific/Auckland',
  defaultCurrency: 'NZD',
  maxAlertsPerDay: 3,
  nearTargetPercent: 5,
  quietHoursStart: null as number | null,
  quietHoursEnd: null as number | null,
  digestHour: null as number | null,
  telegramChatId: '',
}

export function SettingsForm() {
  const { data, isLoading } = trpc.userSettings.get.useQuery(undefined, { staleTime: 1000 * 60 })
  const utils = trpc.useUtils()
  const mutation = trpc.userSettings.update.useMutation({
    onSuccess: async () => {
      await utils.userSettings.get.invalidate()
      setStatus({ type: 'success', message: 'Settings updated.' })
    },
    onError: () => setStatus({ type: 'error', message: 'Failed to save preferences. Try again.' }),
  })
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message?: string }>({ type: 'idle' })

  useEffect(() => {
    if (data) {
      setForm({
        timezone: data.timezone ?? 'Pacific/Auckland',
        defaultCurrency: data.defaultCurrency ?? 'NZD',
        maxAlertsPerDay: data.maxAlertsPerDay ?? 3,
        nearTargetPercent: data.nearTargetPercent ?? 5,
        quietHoursStart: data.quietHoursStart ?? null,
        quietHoursEnd: data.quietHoursEnd ?? null,
        digestHour: data.digestHour ?? null,
        telegramChatId: data.telegramChatId ?? '',
      })
    }
  }, [data])

  if (isLoading && !data) {
    return <div className="text-sm text-gray-600">Loading your notification preferences…</div>
  }

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setStatus({ type: 'idle' })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus({ type: 'idle' })
    await mutation.mutateAsync({
      timezone: form.timezone,
      defaultCurrency: form.defaultCurrency,
      maxAlertsPerDay: Number(form.maxAlertsPerDay),
      nearTargetPercent: Number(form.nearTargetPercent),
      quietHoursStart: form.quietHoursStart !== null ? Number(form.quietHoursStart) : null,
      quietHoursEnd: form.quietHoursEnd !== null ? Number(form.quietHoursEnd) : null,
      digestHour: form.digestHour !== null ? Number(form.digestHour) : null,
      telegramChatId: form.telegramChatId || undefined,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <div className="col-span-2 grid gap-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="timezone">
              Time zone
            </label>
            <Input
              id="timezone"
              value={form.timezone}
              onChange={(event) => updateField('timezone', event.target.value)}
              placeholder="Pacific/Auckland"
              required
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="currency">
              Default currency
            </label>
            <Input
              id="currency"
              value={form.defaultCurrency}
              maxLength={3}
              onChange={(event) => updateField('defaultCurrency', event.target.value.toUpperCase())}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="maxAlerts">
              Max alerts per day
            </label>
            <Input
              id="maxAlerts"
              type="number"
              min={1}
              max={20}
              value={form.maxAlertsPerDay}
              onChange={(event) => updateField('maxAlertsPerDay', Number(event.target.value))}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="nearPct">
              Near-target percentage
            </label>
            <Input
              id="nearPct"
              type="number"
              min={0}
              max={50}
              value={form.nearTargetPercent}
              onChange={(event) => updateField('nearTargetPercent', Number(event.target.value))}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="quietStart">
              Quiet hours start (0-23)
            </label>
            <Input
              id="quietStart"
              type="number"
              min={0}
              max={23}
              value={form.quietHoursStart ?? ''}
              onChange={(event) => updateField('quietHoursStart', event.target.value === '' ? null : Number(event.target.value))}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="quietEnd">
              Quiet hours end (0-23)
            </label>
            <Input
              id="quietEnd"
              type="number"
              min={0}
              max={23}
              value={form.quietHoursEnd ?? ''}
              onChange={(event) => updateField('quietHoursEnd', event.target.value === '' ? null : Number(event.target.value))}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="digestHour">
              Daily digest hour (local)
            </label>
            <Input
              id="digestHour"
              type="number"
              min={0}
              max={23}
              value={form.digestHour ?? ''}
              onChange={(event) => updateField('digestHour', event.target.value === '' ? null : Number(event.target.value))}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="telegram">
              Telegram chat ID
            </label>
            <Input
              id="telegram"
              placeholder="123456789"
              value={form.telegramChatId}
              onChange={(event) => updateField('telegramChatId', event.target.value)}
            />
          </div>
          <div className="col-span-2 flex items-center justify-between pt-2">
            {status.message && (
              <span className={`text-sm ${status.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{status.message}</span>
            )}
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
