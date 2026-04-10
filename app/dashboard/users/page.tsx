'use client'

import { useState } from 'react'
import { useAuth } from "@/app/providers"
import { db } from "@/lib/local-db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Shield, UserPlus, Loader2, Mail } from "lucide-react"
import { useLiveQuery } from "dexie-react-hooks"

export default function UsersPage() {
  const { user } = useAuth()
  const profiles = useLiveQuery(() => db.profiles.toArray(), [])
  const branches = useLiveQuery(() => db.branches.toArray(), [])
  const regions = useLiveQuery(() => db.regions.toArray(), [])

  if (user?.role !== 'hq_admin') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-white/60">You don't have permission to view this page.</p>
      </div>
    )
  }

  const getBranchName = (branchId: number | null) => {
    if (!branchId) return '-'
    return branches?.find(b => b.id === branchId)?.name || 'Unknown'
  }

  const getRegionName = (regionId: number | null) => {
    if (!regionId) return '-'
    return regions?.find(r => r.id === regionId)?.name || 'Unknown'
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'hq_admin':
        return <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">HQ Admin</Badge>
      case 'region_admin':
        return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">Region Admin</Badge>
      default:
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">Branch User</Badge>
    }
  }

  const totalUsers = profiles?.length || 0
  const hqAdmins = profiles?.filter(p => p.role === 'hq_admin').length || 0
  const regionAdmins = profiles?.filter(p => p.role === 'region_admin').length || 0
  const branchUsers = profiles?.filter(p => p.role === 'branch_user').length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage all users in the system
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>
        <Card className="glass shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">HQ Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{hqAdmins}</div>
          </CardContent>
        </Card>
        <Card className="glass shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Region Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{regionAdmins}</div>
          </CardContent>
        </Card>
        <Card className="glass shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Branch Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{branchUsers}</div>
          </CardContent>
        </Card>
      </div>

      {!profiles ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="glass shadow-sm border-border/50 overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/50">
            <CardTitle className="text-lg">All Registered Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/10">
                    <th className="text-left py-4 px-6 font-semibold text-muted-foreground">User</th>
                    <th className="text-left py-4 px-6 font-semibold text-muted-foreground">Role</th>
                    <th className="text-left py-4 px-6 font-semibold text-muted-foreground">Branch</th>
                    <th className="text-left py-4 px-6 font-semibold text-muted-foreground">Region</th>
                    <th className="text-left py-4 px-6 font-semibold text-muted-foreground">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map(p => (
                    <tr key={p.id} className="border-b border-border transition-colors hover:bg-muted/20">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                            <span className="text-xs text-primary font-bold">
                              {p.full_name?.[0] || p.email[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold">{p.full_name || 'User'}</p>
                            <p className="text-xs text-muted-foreground">{p.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">{getRoleBadge(p.role)}</td>
                      <td className="py-4 px-6 text-muted-foreground font-medium">{getBranchName(p.branch_id)}</td>
                      <td className="py-4 px-6 text-muted-foreground font-medium">{getRegionName(p.region_id)}</td>
                      <td className="py-4 px-6 text-muted-foreground text-xs font-mono">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {profiles?.length === 0 && (
        <div className="text-center py-12 glass rounded-2xl">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No users found in the system</p>
        </div>
      )}
    </div>
  )
}