'use client'

import { useState } from 'react'
import { useAuth } from "@/app/providers"
import { db } from "@/lib/local-db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Building2, MapPin, TrendingUp, Loader2 } from "lucide-react"
import { useLiveQuery } from "dexie-react-hooks"

export default function BranchesPage() {
  const { user } = useAuth()
  const [selectedRegionId, setSelectedRegionId] = useState<string>('all')

  const branches = useLiveQuery(() => db.branches.toArray(), [])
  const regions = useLiveQuery(() => db.regions.toArray(), [])
  const forecasts = useLiveQuery(() => db.forecasts.where('year').equals(2026).toArray(), [])

  if (user?.role === 'branch_user') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Branches</h1>
        <p className="text-muted-foreground">You can only view your own branch data from the dashboard.</p>
      </div>
    )
  }

  const filteredBranches = selectedRegionId === 'all'
    ? branches
    : branches?.filter(b => b.region_id === Number(selectedRegionId))

  const getRegionName = (regionId: number) => regions?.find(r => r.id === regionId)?.name || 'Unknown'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            Branches
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and view all branches across regions
          </p>
        </div>

        {regions && regions.length > 0 && (
          <Select value={selectedRegionId} onValueChange={setSelectedRegionId}>
            <SelectTrigger className="w-[200px] glass">
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {regions.map(r => (
                <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!branches ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBranches?.map(branch => {
            const branchForecasts = forecasts?.filter(f => f.branch_id === branch.id) || []
            const totalForecast = branchForecasts.reduce((sum, f) => sum + (f.forecast_value || 0), 0)
            const totalBudget = branchForecasts.reduce((sum, f) => sum + (f.budget || 0), 0)

            return (
              <Card key={branch.id} className="glass hover:bg-muted/50 transition-all duration-200 shadow-sm overflow-hidden group">
                <CardHeader className="pb-3 bg-muted/20">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">{branch.name}</CardTitle>
                      <p className="text-xs font-mono text-muted-foreground">#{branch.code}</p>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-none">{getRegionName(branch.region_id)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 text-primary/60" />
                    <span>{getRegionName(branch.region_id)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 py-3 border-t border-border">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">2026 Forecast</p>
                      <p className="text-lg font-bold">${Math.round(totalForecast).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">2026 Budget</p>
                      <p className="text-lg font-bold text-muted-foreground/80">${Math.round(totalBudget).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {filteredBranches?.length === 0 && (
        <div className="text-center py-12 glass rounded-2xl">
          <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No branches found matching the criteria</p>
        </div>
      )}
    </div>
  )
}