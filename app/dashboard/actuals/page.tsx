'use client'

import { useState } from 'react'
import { useAuth } from "@/app/providers"
import { db } from "@/lib/local-db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ClipboardList } from "lucide-react"
import { useLiveQuery } from "dexie-react-hooks"

export default function ActualsPage() {
  const { user } = useAuth()
  const [selectedBranchId, setSelectedBranchId] = useState<number | 'all'>('all')
  const [selectedYear, setSelectedYear] = useState(2025)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())

  const branches = useLiveQuery(() => db.branches.toArray(), [])
  const actuals = useLiveQuery(
    () => {
      let query = db.actuals.where('year').equals(selectedYear)
      if (selectedBranchId !== 'all') {
        query = query.filter(a => a.branch_id === selectedBranchId)
      }
      return query.toArray()
    },
    [selectedYear, selectedBranchId]
  )

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const currentMonthActuals = actuals?.filter(a => a.month === selectedMonth) || []

  const totalRevenue = currentMonthActuals.reduce((sum, a) => sum + (a.revenue || 0), 0)

  const annualActuals = actuals || []
  const annualRevenue = annualActuals.reduce((sum, a) => sum + (a.revenue || 0), 0)

  const exportToCSV = () => {
    if (!actuals || actuals.length === 0) return

    const headers = ['Branch', 'Month', 'Year', 'Revenue']
    const rows = actuals.map(a => {
      const branch = branches?.find(b => b.id === a.branch_id)
      return [
        branch?.name || 'Unknown',
        months[a.month - 1],
        a.year,
        a.revenue?.toFixed(2) || 0
      ]
    })

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `actuals_${selectedYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-primary" />
            Monthly Actuals
          </h1>
          <p className="text-muted-foreground mt-1">
            Historical actual revenue data from 2023-2025
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[110px] glass">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2023, 2024, 2025].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
            <SelectTrigger className="w-[130px] glass">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {user?.role !== 'branch_user' && branches && (
            <Select value={String(selectedBranchId)} onValueChange={(v) => setSelectedBranchId(v === 'all' ? 'all' : Number(v))}>
              <SelectTrigger className="w-[180px] glass">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map(b => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {!actuals ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="glass shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {months[selectedMonth - 1]} {selectedYear} Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {currentMonthActuals.length} branches reporting
                </p>
              </CardContent>
            </Card>

            <Card className="glass shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  YTD Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${annualRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedYear} year to date
                </p>
              </CardContent>
            </Card>

            <Card className="glass shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Monthly Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${actuals.length > 0 ? Math.round(annualRevenue / 12).toLocaleString() : 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Per month average</p>
              </CardContent>
            </Card>
          </div>

          <Card className="glass shadow-sm overflow-hidden border-border/50">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-xl">Actuals by Branch</CardTitle>
              <CardDescription>
                {months[selectedMonth - 1]} {selectedYear} revenue data
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/10">
                      <th className="text-left py-4 px-6 font-semibold text-muted-foreground">Branch</th>
                      <th className="text-right py-4 px-6 font-semibold text-muted-foreground">Revenue</th>
                      <th className="text-right py-4 px-6 font-semibold text-muted-foreground">YTD Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentMonthActuals.slice(0, 50).map((a, i) => {
                      const branch = branches?.find(b => b.id === a.branch_id)
                      const ytd = actuals?.filter(x => x.branch_id === a.branch_id).reduce((sum, x) => sum + (x.revenue || 0), 0) || 0
                      return (
                        <tr key={i} className="border-b border-border transition-colors hover:bg-muted/30">
                          <td className="py-4 px-6 font-medium">{branch?.name || 'Unknown'}</td>
                          <td className="py-4 px-6 text-right font-bold text-primary">${(a.revenue || 0).toLocaleString()}</td>
                          <td className="py-4 px-6 text-right text-muted-foreground font-medium">${ytd.toLocaleString()}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}