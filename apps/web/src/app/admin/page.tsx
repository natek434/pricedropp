import { prisma } from '@pricedropp/db'
import { getServerSession } from 'next-auth'

export default async function Admin() {
  const session = await getServerSession()
  if (!session?.user) return <div className="text-sm">Please sign in</div>
  const [users, rules, queues] = await Promise.all([
    prisma.user.count(),
    prisma.siteRule.findMany({ orderBy: { host: 'asc' } }),
    Promise.resolve({})
  ])
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Admin</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded p-3"><div className="text-sm">Users</div><div className="text-2xl font-semibold">{users}</div></div>
        <div className="bg-white border rounded p-3"><div className="text-sm">Site Rules</div><div className="text-2xl font-semibold">{rules.length}</div></div>
        <div className="bg-white border rounded p-3"><div className="text-sm">Queues</div><div className="text-2xl font-semibold">3</div></div>
      </div>
      <div>
        <h2 className="font-medium mb-2">Site Rules</h2>
        <table className="w-full text-sm bg-white border rounded">
          <thead><tr><th className="text-left p-2">Host</th><th className="text-left p-2">Selectors</th><th className="text-left p-2">Wait</th></tr></thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id} className="border-t"><td className="p-2">{r.host}</td><td className="p-2">{r.selectors.join(', ')}</td><td className="p-2">{r.waitMs}ms</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

