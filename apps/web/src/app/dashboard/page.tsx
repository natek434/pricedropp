import { auth } from '@/lib/auth'
import { WatchList } from './watch-list'
import { Button } from '@/components/ui/button'

export default async function Dashboard() {
  const session = await auth()
  if (!session?.user) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-700 shadow-sm">
        You need to sign in to manage watches. <a className="underline" href="/sign-in">Sign in</a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your Watches</h1>
          <p className="text-sm text-gray-600">Add products to monitor and we’ll alert you when prices drop.</p>
        </div>
        <Button asChild>
          <a href="/add">Add watch</a>
        </Button>
      </div>
      <WatchList />
    </div>
  )
}
