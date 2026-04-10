'use client'

import { useState, useEffect } from 'react'
import { useAuth } from "@/app/providers"
import { db } from "@/lib/local-db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Download, TrendingUp, TrendingDown } from "lucide-react"
import { useLiveQuery } from "dexie-react-hooks"

export default function ForecastPage() {
  const { user } = useAuth()
  const [selectedBranchId, setSelectedBranchId] = useState<number | 'all'>('all')
  const [selectedYear, setSelectedYear] = useState(2026)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)

  const branches = useLiveQuery(() => db.branches.toArray(), [])
  const forecasts = useLiveQuery(
    () => {
      let query = db.forecasts.where('year').equals(selectedYear)
      if (selectedBranchId !== 'all') {
        query = query.filter(f => f.branch_id === selectedBranchId)
      }
      return query.toArray()
    },
    [selectedYear, selectedBranchId]
  )

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]

  const currentMonthForecasts = forecasts?.filter(f => f.month === selectedMonth) || []

  const totalForecast = currentMonthForecasts.reduce((sum, f) => sum + (f.forecast_value || 0), 0)
  const totalBudget = currentMonthForecasts.reduce((sum, f) => sum + (f.budget || 0), 0)
  const totalVariance = totalForecast - totalBudget
  const variancePercent = totalBudget > 0 ? (totalVariance / totalBudget) * 100 : 0

  const annualForecasts = forecasts || []
  const annualForecast = annualForecasts.reduce((sum, f) => sum + (f.forecast_value || 0), 0)
  const annualBudget = annualForecasts.reduce((sum, f) => sum + (f.budget || 0), 0)

  const exportToCSV = () => {
    if (!forecasts || forecasts.length === 0) return

    const headers = ['Branch', 'Month', 'Year', 'Forecast', 'Budget', 'Variance', 'Method']
    const rows = forecasts.map(f => {
      const branch = branches?.find(b => b.id === f.branch_id)
      return [
        branch?.name || 'Unknown',
        months[f.month - 1],
        f.year,
        f.forecast_value?.toFixed(2) || 0,
        f.budget?.toFixed(2) || 0,
        ((f.forecast_value || 0) - (f.budget || 0)).toFixed(2),
        f.method || ''
      ]
    })

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `forecast_${selectedYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const canEdit = user?.role !== 'branch_user'

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Forecasts</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View and manage branch forecasts for {selectedYear}
            </p>
          </div>
          <Button variant="outline" onClick={exportToCSV} disabled={!forecasts?.length} className="shadow-sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[100px] shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
            <SelectTrigger className="w-[110px] shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {user?.role !== 'branch_user' && branches && (
            <Select value={String(selectedBranchId)} onValueChange={(v) => setSelectedBranchId(v === 'all' ? 'all' : Number(v))}>
              <SelectTrigger className="w-[200px] shadow-sm">
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

      <Card className="glass shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">2026 Forecast Methodology</CardTitle>
          <CardDescription>
            Seasonal naive + growth with working day adjustments from 2023-2025 historical data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Forecasts are generated using historical actuals from 2023-2025. The model applies seasonal patterns
            with year-over-year growth rates. No manual adjustments - fully automated ML-based forecasting.
          </p>
        </CardContent>
      </Card>

      {!forecasts?.length ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="glass shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-medium">
                  {months[selectedMonth - 1]} {selectedYear} Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalForecast.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Budget: ${totalBudget.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card className="glass shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-medium">
                  {months[selectedMonth - 1]} Variance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold flex items-center gap-2 ${totalVariance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {totalVariance >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  ${Math.abs(totalVariance).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{variancePercent >= 0 ? '+' : ''}{variancePercent.toFixed(1)}% vs budget</p>
              </CardContent>
            </Card>

            <Card className="glass shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-medium">
                  {selectedYear} Full Year
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${annualForecast.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Budget: ${annualBudget.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="glass shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle>Monthly Forecast Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Branch</th>
                      <th className="text-right py-3 px-4 font-semibold text-foreground">Forecast</th>
                      <th className="text-right py-3 px-4 font-semibold text-foreground">Budget</th>
                      <th className="text-right py-3 px-4 font-semibold text-foreground">Variance</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {currentMonthForecasts.map((f, i) => {
                      const branch = branches?.find(b => b.id === f.branch_id)
                      const variance = (f.forecast_value || 0) - (f.budget || 0)
                      return (
                        <tr key={i} className="hover:bg-muted/50 transition-colors group">
                          <td className="py-3 px-4 font-medium">{branch?.name || 'Unknown'}</td>
                          <td className="py-3 px-4 text-right font-semibold">${(f.forecast_value || 0).toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-muted-foreground">${(f.budget || 0).toLocaleString()}</td>
                          <td className={`py-3 px-4 text-right font-medium ${variance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {variance >= 0 ? '+' : ''}${variance.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">{f.method || '-'}</td>
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