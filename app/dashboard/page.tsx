'use client'

import { useState, useEffect } from 'react'
import { useAuth } from "@/app/providers"
import { db } from "@/lib/local-db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LineChart, Building2, MapPin, TrendingUp, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    branchesCount: 0,
    regionsCount: 0,
    forecastsCount: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadStats()
    }
  }, [user])

  async function loadStats() {
    const [branches, regions, forecasts] = await Promise.all([
      db.branches.toArray(),
      db.regions.toArray(),
      db.forecasts.toArray(),
    ])

    let branchesCount = branches.length
    if (user?.role === 'branch_user' && user?.branch_id) {
      branchesCount = 1
    } else if (user?.role === 'region_admin' && user?.region_id) {
      branchesCount = branches.filter(b => b.region_id === user.region_id).length
    }

    setStats({
      branchesCount,
      regionsCount: regions.length,
      forecastsCount: branchesCount * 12,
    })
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  const isBranchUser = user?.role === 'branch_user'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {user?.full_name || "User"}.
          {user?.role === 'branch_user' ? (
            " You're viewing data for your branch only."
          ) : user?.role === 'region_admin' ? (
            " You're viewing data for your region."
          ) : (
            " Here's an overview of your forecasting data."
          )}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Forecasts Generated
            </CardTitle>
            <LineChart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.forecastsCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {isBranchUser
                ? "1 branch × 12 months"
                : `${stats.branchesCount} branches × 12 months`}
            </p>
          </CardContent>
        </Card>

        <Card className="glass shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Branches
            </CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.branchesCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {user?.role === 'branch_user'
                ? "Your branch"
                : user?.role === 'region_admin'
                  ? "In your region"
                  : "Under management"}
            </p>
          </CardContent>
        </Card>

        <Card className="glass shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Regions
            </CardTitle>
            <MapPin className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.regionsCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {user?.role === 'branch_user'
                ? "Your region"
                : user?.role === 'region_admin'
                  ? "Your region"
                  : "Total regions"}
            </p>
          </CardContent>
        </Card>

        <Card className="glass shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Forecast Year
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2026</div>
            <p className="text-xs text-muted-foreground mt-1">
              Current forecast period
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass shadow-sm">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks you can perform</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/forecast"
              className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-accent/50 transition-all duration-200"
            >
              <div className="rounded-full bg-primary/10 p-2.5">
                <LineChart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">View & Generate Forecasts</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Your branch data is pre-loaded. Generate and review monthly forecasts for 2026.
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}