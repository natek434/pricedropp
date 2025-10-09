import { auth } from '@/lib/auth'
import { SettingsForm } from './settings-form'

export default async function Settings() {
  const session = await auth()
  if (!session?.user) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-700 shadow-sm">
        You need to sign in to manage notification preferences. <a className="underline" href="/sign-in">Sign in</a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Notification settings</h1>
        <p className="text-sm text-gray-600">
          Control daily digests, quiet hours, and alert limits so PriceDropp respects your schedule.
        </p>
      </div>
      <SettingsForm />
    </div>
  )
}
