'use client'

import { useAuth } from "@/app/providers"
import { db } from "@/lib/local-db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Building2, Users, Loader2 } from "lucide-react"
import { useLiveQuery } from "dexie-react-hooks"

export default function RegionsPage() {
  const { user } = useAuth()
  const regions = useLiveQuery(() => db.regions.toArray(), [])
  const branches = useLiveQuery(() => db.branches.toArray(), [])
  const profiles = useLiveQuery(() => db.profiles.toArray(), [])

  if (user?.role !== 'hq_admin') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Regions</h1>
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    )
  }

  const getBranchCount = (regionId: number) => branches?.filter(b => b.region_id === regionId).length || 0
  const getUserCount = (regionId: number) => profiles?.filter(p => p.region_id === regionId).length || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
          <MapPin className="h-8 w-8 text-primary" />
          Regions
        </h1>
        <p className="text-muted-foreground mt-1">
          View all regions and their statistics
        </p>
      </div>

      {!regions ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {regions.map(region => {
            const branchCount = getBranchCount(region.id!)
            const userCount = getUserCount(region.id!)

            return (
              <Card key={region.id} className="glass hover:bg-muted/50 transition-all duration-200 shadow-sm overflow-hidden group">
                <CardHeader className="pb-3 bg-muted/20">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">{region.name}</CardTitle>
                      <p className="text-xs font-mono text-muted-foreground">#{region.code}</p>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-none">{region.code}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="w-4 h-4 text-primary/60" />
                      <span>Branches</span>
                    </div>
                    <span className="font-bold ml-auto">{branchCount}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4 text-primary/60" />
                      <span>Users</span>
                    </div>
                    <span className="font-bold ml-auto">{userCount}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {regions?.length === 0 && (
        <div className="text-center py-12 glass rounded-2xl">
          <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No regions found</p>
        </div>
      )}
    </div>
  )
}