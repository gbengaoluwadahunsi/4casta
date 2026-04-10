'use client'

import { useAuth } from "@/app/providers"
import { db } from "@/lib/local-db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { History } from "lucide-react"
import { useLiveQuery } from "dexie-react-hooks"

export default function ActivityPage() {
  const { user } = useAuth()
  
  const profiles = useLiveQuery(() => db.profiles.toArray(), [])
  const branches = useLiveQuery(() => db.branches.toArray(), [])

  const getUserName = (id: string) => profiles?.find(p => p.id === id)?.full_name || 'Unknown'
  const getBranchName = (id: number) => branches?.find(b => b.id === id)?.name || 'Unknown'

  const canViewAll = user?.role === 'hq_admin' || user?.role === 'region_admin'

  const mockActivity = [
    { id: 1, user_id: 'test-account-001', branch_id: 1, action: 'Viewed Dashboard', timestamp: new Date().toISOString() },
    { id: 2, user_id: 'test-account-001', branch_id: 1, action: 'Generated Forecast', timestamp: new Date(Date.now() - 86400000).toISOString() },
    { id: 3, user_id: 'test-account-001', branch_id: 2, action: 'Exported Data', timestamp: new Date(Date.now() - 172800000).toISOString() },
  ]

  const filteredActivity = canViewAll 
    ? mockActivity 
    : mockActivity.filter(a => a.branch_id === user?.branch_id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
          <History className="h-8 w-8 text-primary" />
          Activity
        </h1>
        <p className="text-white/60 mt-1">
          Recent activity log for the forecasting platform
        </p>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-white/60">User</th>
                  <th className="text-left py-3 px-4 text-white/60">Branch</th>
                  <th className="text-left py-3 px-4 text-white/60">Action</th>
                  <th className="text-left py-3 px-4 text-white/60">Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivity.map((activity) => (
                  <tr key={activity.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4 text-white">{getUserName(activity.user_id)}</td>
                    <td className="py-3 px-4 text-white/60">{getBranchName(activity.branch_id)}</td>
                    <td className="py-3 px-4">
                      <Badge className="bg-primary/20 text-primary">{activity.action}</Badge>
                    </td>
                    <td className="py-3 px-4 text-white/40 text-xs">
                      {new Date(activity.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {filteredActivity.length === 0 && (
        <div className="text-center py-12">
          <History className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">No activity recorded yet</p>
        </div>
      )}
    </div>
  )
}