"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LineChart, Download, TrendingUp, TrendingDown, Loader2, AlertCircle, Pencil, Search } from "lucide-react"
import { 
  formatCurrency, 
  formatPercent, 
  getShortMonthName,
  type ForecastResult 
} from "@/lib/forecasting"
import { Skeleton } from "@/components/ui/skeleton"
import { ForecastChart } from "@/components/dashboard/forecast-chart"
import { ForecastTable } from "@/components/dashboard/forecast-table"

type Branch = {
  id: string
  name: string
  region_id: string
  regions?: { name: string } | null
}

type Profile = {
  role: string
  branch_id: string | null
  region_id: string | null
}

const ALL_BRANCHES_ID = "__all__" // HQ/region summary view (sum of forecasts from all branches)
const ALL_REGIONS_ID = "__all_regions__" // HQ view: all regions (HQ total); Select cannot use ""

const KPI_REVENUE = "TOTAL NET REVENUE"
const KPI_EXPENSE_LINES = new Set(["TOTAL EXPENSES", "TOTAL OVERHEAD ALLOCATIONS"])

function normDesc(s: string) {
  return String(s ?? "").toUpperCase().replace(/\s+/g, " ").trim()
}

export default function ForecastPage() {
  const searchParams = useSearchParams()
  const branchFromUrl = searchParams.get("branch")
  const [branches, setBranches] = useState<Branch[]>([])
  // Default to summary (all branches) so HQ/Region Admin see rollup immediately, not "Select a Branch"
  const [selectedBranch, setSelectedBranch] = useState<string>(branchFromUrl || ALL_BRANCHES_ID)
  // HQ only: when viewing summary, filter by region ("" = all regions, else region_id)
  const [selectedRegionId, setSelectedRegionId] = useState<string>(ALL_REGIONS_ID)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [forecasts, setForecasts] = useState<ForecastResult[]>([])
  const [rawForecastRows, setRawForecastRows] = useState<{ branch_id: string; description: string; month: number; forecast_value: number; budget_value: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [needsBranchAssignment, setNeedsBranchAssignment] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDescription, setSelectedDescription] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [showMethodology, setShowMethodology] = useState<boolean>(false)
  const [currentYear, setCurrentYear] = useState(2026)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const m = new Date().getMonth() + 1
    return m >= 1 && m <= 12 ? m : 1
  })
  const supabase = createClient()
  const lastFetchedKeyRef = useRef<string | null>(null)

  const regionsList = useMemo(() => {
    const m = new Map<string, { id: string; name: string }>()
    branches.forEach((b: Branch) => {
      if (b.region_id && b.regions?.name && !m.has(b.region_id)) {
        m.set(b.region_id, { id: b.region_id, name: b.regions.name })
      }
    })
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [branches])

  // Per-branch breakdown for region/HQ summary view (revenue + expenses for current month)
  const branchBreakdown = useMemo(() => {
    if (selectedBranch !== ALL_BRANCHES_ID || rawForecastRows.length === 0) return []
    const monthRows = rawForecastRows.filter((r) => r.month === currentMonth)
    const byBranch = new Map<
      string,
      { revenueForecast: number; revenueBudget: number; expenseForecast: number; expenseBudget: number }
    >()
    monthRows.forEach((r) => {
      const desc = String(r.description ?? "").toUpperCase().trim()
      const cur = byBranch.get(r.branch_id) || {
        revenueForecast: 0,
        revenueBudget: 0,
        expenseForecast: 0,
        expenseBudget: 0,
      }
      if (desc === KPI_REVENUE) {
        cur.revenueForecast += Number(r.forecast_value ?? 0)
        cur.revenueBudget += Number(r.budget_value ?? 0)
      } else if (KPI_EXPENSE_LINES.has(desc)) {
        cur.expenseForecast += Number(r.forecast_value ?? 0)
        cur.expenseBudget += Number(r.budget_value ?? 0)
      }
      byBranch.set(r.branch_id, cur)
    })
    return branches
      .filter((b) => byBranch.has(b.id))
      .map((b) => {
        const data = byBranch.get(b.id)!
        return {
          branch: b,
          ...data,
        }
      })
      .sort((a, b) => a.branch.name.localeCompare(b.branch.name))
  }, [selectedBranch, rawForecastRows, currentMonth, branches])

  const years = [2024, 2025, 2026, 2027, 2028]
  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: getShortMonthName(i + 1) }))

  const fetchForecastRowsPaginated = useCallback(
    async (buildQuery: () => any) => {
      const pageSize = 1000
      let from = 0
      const allRows: any[] = []

      while (true) {
        const { data, error } = await buildQuery().range(from, from + pageSize - 1)
        if (error) throw error
        const rows = data ?? []
        allRows.push(...rows)
        if (rows.length < pageSize) break
        from += pageSize
      }

      return allRows
    },
    []
  )

  // When profile loads, branch users get their branch auto-selected; others get branch list
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from("profiles")
        .select("role, branch_id, region_id")
        .eq("id", user.id)
        .single()

      if (profileData) {
        setProfile(profileData)

        if (profileData.role === "branch_user") {
          // Branch users always see their assigned branch — no selector
          if (profileData.branch_id) {
            setSelectedBranch(profileData.branch_id)
          } else {
            setNeedsBranchAssignment(true)
          }
          setLoading(false)
          return
        }

        // HQ and Region Admin keep summary view; branch_user already handled above
        if (profileData.role === "hq_admin" || profileData.role === "region_admin") {
          setSelectedBranch(ALL_BRANCHES_ID)
        }

        // Use API for branches to avoid RLS issues (region admin may not get branches via client)
        const res = await fetch("/api/branches")
        const { branches: branchData } = res.ok ? await res.json().catch(() => ({})) : { branches: null }
        if (branchData && Array.isArray(branchData)) {
          setBranches(branchData)
          if (branchFromUrl && branchData.some((b: Branch) => b.id === branchFromUrl)) {
            setSelectedBranch(branchFromUrl)
          }
        } else if (profileData.role === "hq_admin") {
          // Fallback for HQ: direct query (RLS allows all)
          const { data } = await supabase
            .from("branches")
            .select("*, regions(name)")
            .order("name")
          if (data) {
            setBranches(data)
            if (branchFromUrl && data.some((b: Branch) => b.id === branchFromUrl)) {
              setSelectedBranch(branchFromUrl)
            }
          }
        }
      }
      setLoading(false)
    }
    fetchData()
  }, [supabase, branchFromUrl])

  const loadForecasts = useCallback(async () => {
    if (!selectedBranch) return

    setLoading(true)
    setError(null)

    try {
      if (selectedBranch === ALL_BRANCHES_ID) {
        const branchIds = selectedRegionId && selectedRegionId !== ALL_REGIONS_ID
          ? branches.filter((b: Branch) => b.region_id === selectedRegionId).map((b: Branch) => b.id)
          : branches.map((b: Branch) => b.id)
        if (branchIds.length === 0) {
          setForecasts([])
          setRawForecastRows([])
          setLoading(false)
          return
        }
        const aggregate = (rows: any[]): ForecastResult[] => {
          if (!rows.length) return []
          const byKey = new Map<string, { forecast: number; budget: number; lastMonth: number; lastYear: number }>()
          rows.forEach(f => {
            const key = `${f.description}\t${f.month}`
            const cur = byKey.get(key)
            const forecast = Number(f.forecast_value)
            const budget = Number(f.budget_value)
            const lastMonth = Number(f.last_month_value)
            const lastYear = Number(f.last_year_value)
            if (!cur) {
              byKey.set(key, { forecast, budget, lastMonth, lastYear })
            } else {
              byKey.set(key, {
                forecast: cur.forecast + forecast,
                budget: cur.budget + budget,
                lastMonth: cur.lastMonth + lastMonth,
                lastYear: cur.lastYear + lastYear,
              })
            }
          })
          const result: ForecastResult[] = Array.from(byKey.entries()).map(([key, v]) => {
            const [description, monthStr] = key.split("\t")
            const month = Number(monthStr)
            const variance = v.forecast - v.budget
            const variancePercent = v.budget !== 0 ? (variance / v.budget) * 100 : 0
            return {
              description,
              month,
              forecastValue: v.forecast,
              budgetValue: v.budget,
              lastMonthValue: v.lastMonth,
              lastYearValue: v.lastYear,
              variance,
              variancePercent,
            }
          })
          result.sort((a, b) => (a.description.localeCompare(b.description) || a.month - b.month))
          return result
        }
        // Fetch all 12 months once; month dropdown only filters the display (no refetch)
        const CHUNK = 15
        const chunks: string[][] = []
        for (let i = 0; i < branchIds.length; i += CHUNK) {
          chunks.push(branchIds.slice(i, i + CHUNK))
        }
        const results = await Promise.all(
          chunks.map((ids) =>
            fetchForecastRowsPaginated(() =>
              supabase
                .from("forecasts")
                .select("*")
                .in("branch_id", ids)
                .eq("year", currentYear)
                .order("branch_id")
                .order("month")
                .order("description")
            )
          )
        )
        const allRows = results.flat()
        if (allRows.length > 0) {
          setForecasts(aggregate(allRows))
          setRawForecastRows(allRows)
        } else {
          setForecasts([])
          setRawForecastRows([])
        }
      } else {
        const existingForecasts = await fetchForecastRowsPaginated(() =>
          supabase
            .from("forecasts")
            .select("*")
            .eq("branch_id", selectedBranch)
            .eq("year", currentYear)
            .order("month")
            .order("description")
        )

        if (existingForecasts && existingForecasts.length > 0) {
          const formattedForecasts: ForecastResult[] = existingForecasts.map(f => ({
            description: f.description,
            month: f.month,
            forecastValue: f.forecast_value,
            budgetValue: f.budget_value,
            lastMonthValue: f.last_month_value,
            lastYearValue: f.last_year_value,
            variance: f.forecast_value - f.budget_value,
            variancePercent: f.budget_value !== 0 ? ((f.forecast_value - f.budget_value) / f.budget_value) * 100 : 0,
          }))
          setForecasts(formattedForecasts)
        } else {
          setForecasts([])
        }
        setRawForecastRows([])
      }
    } catch (err) {
      console.error("Error loading forecasts:", err)
      setError("Failed to load forecasts")
    } finally {
      setLoading(false)
    }
  }, [selectedBranch, selectedRegionId, supabase, currentYear, branches, fetchForecastRowsPaginated])

  useEffect(() => {
    if (!selectedBranch) return
    const branchCount = selectedBranch === ALL_BRANCHES_ID ? branches.length : 0
    const key = `${selectedBranch}-${selectedRegionId}-${currentYear}-${branchCount}`
    if (lastFetchedKeyRef.current === key) return
    lastFetchedKeyRef.current = key
    loadForecasts()
  }, [selectedBranch, selectedRegionId, currentYear, branches.length, loadForecasts])

  const handleUpdateForecast = async (description: string, month: number, newValue: number) => {
    if (!selectedBranch || selectedBranch === ALL_BRANCHES_ID) return

    // Update in database
    const { error: updateError } = await supabase
      .from("forecasts")
      .update({ 
        forecast_value: newValue,
        updated_at: new Date().toISOString()
      })
      .eq("branch_id", selectedBranch)
      .eq("description", description)
      .eq("year", currentYear)
      .eq("month", month)

    if (updateError) {
      console.error("Error updating forecast:", updateError)
      setError("Failed to update forecast")
      return
    }

    // Update local state
    setForecasts(prev => prev.map(f => {
      if (f.description === description && f.month === month) {
        const newVariance = newValue - f.budgetValue
        const newVariancePercent = f.budgetValue !== 0 
          ? ((newValue - f.budgetValue) / f.budgetValue) * 100 
          : 0
        return {
          ...f,
          forecastValue: newValue,
          variance: newVariance,
          variancePercent: newVariancePercent
        }
      }
      return f
    }))
  }

  const descriptions = [...new Set(forecasts.map(f => f.description))]
  const filteredByCategory =
    selectedDescription === "all"
      ? forecasts
      : forecasts.filter((f) => f.description === selectedDescription)
  const searchLower = searchQuery.trim().toLowerCase()
  const filteredForecasts =
    searchLower === ""
      ? filteredByCategory
      : filteredByCategory.filter((f) =>
          f.description.toLowerCase().includes(searchLower)
        )

  // Chart: when "All Categories" show KPI-only totals (same as summary cards); otherwise show selected category
  const chartForecasts =
    selectedDescription === "all"
      ? forecasts.filter((f) => {
          const d = normDesc(f.description)
          return d === KPI_REVENUE || KPI_EXPENSE_LINES.has(d)
        })
      : filteredForecasts

  // Summary stats: use KPIs only (revenue + expenses), not sum of all lines (which inflates to 193M+)
  const monthRows = filteredForecasts.filter(f => f.month === currentMonth)
  let revenueForecast = 0
  let revenueBudget = 0
  let expenseForecast = 0
  let expenseBudget = 0
  monthRows.forEach(f => {
    const d = normDesc(f.description)
    if (d === KPI_REVENUE) {
      revenueForecast += f.forecastValue
      revenueBudget += f.budgetValue
    } else if (KPI_EXPENSE_LINES.has(d)) {
      expenseForecast += f.forecastValue
      expenseBudget += f.budgetValue
    }
  })
  const revenueVariance = revenueForecast - revenueBudget
  const revenueVariancePct = revenueBudget !== 0 ? (revenueVariance / revenueBudget) * 100 : 0
  const expenseVariance = expenseForecast - expenseBudget
  const expenseVariancePct = expenseBudget !== 0 ? (expenseVariance / expenseBudget) * 100 : 0

  // Full-year totals (all 12 months) — only valid when we have data for every month
  const monthsPresent = new Set(forecasts.map((f) => f.month))
  const hasFullYearData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].every((m) => monthsPresent.has(m))
  const allMonthRows = forecasts.filter((f) => {
    const d = normDesc(f.description)
    return d === KPI_REVENUE || KPI_EXPENSE_LINES.has(d)
  })
  let annualRevenueForecast = 0
  let annualRevenueBudget = 0
  let annualExpenseForecast = 0
  let annualExpenseBudget = 0
  allMonthRows.forEach((f) => {
    const d = normDesc(f.description)
    if (d === KPI_REVENUE) {
      annualRevenueForecast += f.forecastValue
      annualRevenueBudget += f.budgetValue
    } else if (KPI_EXPENSE_LINES.has(d)) {
      annualExpenseForecast += f.forecastValue
      annualExpenseBudget += f.budgetValue
    }
  })

  const exportToCSV = () => {
    const headers = ["Description", "Month", "Forecast", "Budget", "Variance", "Variance %"]
    const rows = filteredForecasts.map(f => [
      f.description,
      getShortMonthName(f.month),
      f.forecastValue.toFixed(2),
      f.budgetValue.toFixed(2),
      f.variance.toFixed(2),
      f.variancePercent.toFixed(2) + "%"
    ])

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `forecast_${currentYear}_${selectedBranch === ALL_BRANCHES_ID ? "all" : selectedBranch}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadMethodologyPdf = () => {
    if (typeof window === "undefined") return
    window.print()
  }

  const viewLevelLabel =
    selectedBranch === ALL_BRANCHES_ID
      ? profile?.role === "region_admin"
        ? "Region level"
        : selectedRegionId && selectedRegionId !== ALL_REGIONS_ID
          ? "Region: " + (regionsList.find((r) => r.id === selectedRegionId)?.name ?? "Region")
          : "HQ level"
      : (() => {
          const b = branches.find((x: Branch) => x.id === selectedBranch)
          return b ? `Branch: ${b.name}` : "Branch level"
        })()

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (needsBranchAssignment) {
    return (
      <div className="space-y-6 min-w-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Budget vs Forecast</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            View and generate forecasts for your branch.
          </p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your branch has not been assigned yet. You need a branch assignment to view and generate forecasts.
            Please contact your administrator to assign your branch, or if you signed up recently, ensure you selected
            your region and branch during registration.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Budget vs Forecast</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            View budget and forecast at HQ, region, or branch for {currentYear} (as of {getShortMonthName(currentMonth)}). Variance = Forecast − Budget.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(currentYear)} onValueChange={(v) => setCurrentYear(Number(v))}>
            <SelectTrigger className="w-full sm:w-[100px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(currentMonth)} onValueChange={(v) => setCurrentMonth(Number(v))}>
            <SelectTrigger className="w-full sm:w-[110px]">
              <SelectValue placeholder="As of month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {profile?.role === "hq_admin" && selectedBranch === ALL_BRANCHES_ID && regionsList.length > 0 && (
            <Select value={selectedRegionId} onValueChange={setSelectedRegionId}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_REGIONS_ID}>All regions (HQ total)</SelectItem>
                {regionsList.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {profile?.role !== "branch_user" && branches.length > 0 && (
            <Select value={selectedBranch || ALL_BRANCHES_ID} onValueChange={(v) => { setSelectedBranch(v); if (v !== ALL_BRANCHES_ID) setSelectedRegionId(ALL_REGIONS_ID) }}>
              <SelectTrigger className="w-full sm:w-[260px]">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_BRANCHES_ID}>
                  {profile?.role === "region_admin" ? "All branches in region (summary)" : "All branches (summary)"}
                </SelectItem>
                {(() => {
                  const byRegion = new Map<string, Branch[]>()
                  branches.forEach((b) => {
                    const regionName = b.regions?.name ?? "Other"
                    if (!byRegion.has(regionName)) byRegion.set(regionName, [])
                    byRegion.get(regionName)!.push(b)
                  })
                  const sortedRegions = [...byRegion.keys()].sort()
                  return sortedRegions.map((regionName) => (
                    <SelectGroup key={regionName}>
                      <SelectLabel>{regionName}</SelectLabel>
                      {byRegion.get(regionName)!.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))
                })()}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            onClick={exportToCSV}
            disabled={forecasts.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">How the 2026 forecasts are generated</CardTitle>
          <CardDescription>
            This app uses a single, unbiased time-series model (ETS – Holt–Winters additive) selected by backtesting on 2025 to generate all 2026 forecasts from 2023–2025 history.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMethodology((v) => !v)}
            >
              {showMethodology ? "Hide full explanation" : "Read full explanation"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadMethodologyPdf}
            >
              <Download className="mr-2 h-4 w-4" />
              Download as PDF
            </Button>
          </div>

          {showMethodology && (
            <div className="prose prose-sm max-w-none text-muted-foreground space-y-2 mt-3">
              <p>
                The 2026 forecasts are generated entirely from historical data stored in Supabase – no 2026 actuals are used and there is no manual tuning to force the numbers toward any target.
                The input data consists of:
              </p>
              <ul className="list-disc pl-5">
                <li>
                  <strong>Actuals:</strong> 2023–2025 branch-level monthly actuals imported from the three-year workbook using the import scripts.
                </li>
                <li>
                  <strong>Budgets:</strong> 2026 branch-level monthly budgets imported from the per-branch 2026 budget files, one file per branch.
                </li>
              </ul>
              <p>
                For each branch and each line item (for example <strong>TOTAL NET REVENUE</strong> or a specific expense line), we extract a 36-point monthly history from January 2023 to December 2025. That
                series is cleaned by mapping description names consistently across years and deduplicating any duplicated (year, month, description) rows per branch.
              </p>
              <p>
                Several forecasting models were evaluated offline using a dedicated benchmark script: simple seasonal regression, SARIMA, ETS (Holt–Winters), and tree-based lag models. Each model was trained on
                2023–2024 and then asked to forecast all months of 2025; we compared those forecasts to the true 2025 values using standard error metrics (MAE, RMSE, and MAPE). The ETS additive model
                consistently had the best or near-best performance on 2025, so it was chosen as the single production model for 2026.
              </p>
              <p>
                In production, the <strong>ETS (Holt–Winters additive)</strong> model is applied per branch and line item as follows:
              </p>
              <ol className="list-decimal pl-5">
                <li>For a given branch and description, build the monthly series of 2023–2025 forecast history (or actuals where appropriate).</li>
                <li>Fit an ETS model with additive trend and additive seasonality (12-month period) on that 36-point series.</li>
                <li>Forecast 12 steps ahead to obtain unbiased monthly forecasts for January–December 2026.</li>
                <li>Write those forecasts into the <code>forecasts</code> table as <code>forecast_value</code>, keeping the 2026 <code>budget_value</code> untouched for comparison.</li>
              </ol>
              <p>
                The key point is that the model choice (ETS) and all its parameters were decided using only 2023–2025 data – primarily by how well each candidate predicted 2025 – and then frozen. When we
                generate 2026 forecasts, we do not look at 2026 actuals or adjust forecasts to match any known 2026 figures. This makes the 2026 numbers true model forecasts, suitable for honest
                forecast-versus-budget comparison at branch, region, and HQ level.
              </p>
              <p>
                The dashboard you are viewing simply reads these precomputed 2026 forecasts from Supabase, aggregates them by branch, region, or HQ, and displays the variance between <strong>forecast</strong> and
                <strong> budget</strong> for the selected month, category, and level.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {selectedBranch === ALL_BRANCHES_ID && (
        <Alert className="bg-muted/50">
          <AlertDescription>
            {profile?.role === "region_admin"
              ? "Region level: summation of forecast and budget for all branches in your region. Compare variance below; select a branch to see branch-level detail."
              : selectedRegionId && selectedRegionId !== ALL_REGIONS_ID
                ? "Region level: budget and forecast totals for this region. Compare variance below; select a branch to drill down or choose another region above."
                : "HQ level: budget and forecast totals for all branches. Use the Region dropdown to view a single region, or select a branch for branch detail."}
          </AlertDescription>
        </Alert>
      )}
      {selectedBranch && selectedBranch !== ALL_BRANCHES_ID && (
        <Alert className="bg-muted/50">
          <AlertDescription>
            {profile?.role === "branch_user"
              ? "Branch level: view-only. Budget and forecast for your branch; variance shows forecast vs budget."
              : "Branch level: budget and forecast for this branch. Variance = Forecast − Budget. You can edit forecast values in the table."}
          </AlertDescription>
        </Alert>
      )}

      {(selectedBranch === ALL_BRANCHES_ID || (selectedBranch && selectedBranch !== ALL_BRANCHES_ID)) && (loading || forecasts.length > 0) && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{viewLevelLabel}</Badge>
            <span className="min-w-0">
              {loading ? "Loading…" : "— comparing budget to forecast for selected month"}
            </span>
          </div>
          {!loading && forecasts.length > 0 && hasFullYearData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {currentYear} full year · Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">Forecast {formatCurrency(annualRevenueForecast)}</div>
                  <p className="text-xs text-muted-foreground">Budget {formatCurrency(annualRevenueBudget)}</p>
                </CardContent>
              </Card>
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {currentYear} full year · Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">Forecast {formatCurrency(annualExpenseForecast)}</div>
                  <p className="text-xs text-muted-foreground">Budget {formatCurrency(annualExpenseBudget)}</p>
                </CardContent>
              </Card>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-28 mb-2" />
                      <Skeleton className="h-3 w-20" />
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total revenue · Forecast
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(revenueForecast)}</div>
                    <p className="text-xs text-muted-foreground">
                      {getShortMonthName(currentMonth)} {currentYear}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total revenue · Budget
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(revenueBudget)}</div>
                    <p className="text-xs text-muted-foreground">
                      Variance {revenueVariance >= 0 ? "+" : ""}{formatCurrency(revenueVariance)} ({formatPercent(revenueVariancePct)})
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total expenses · Forecast
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(expenseForecast)}</div>
                    <p className="text-xs text-muted-foreground">
                      {getShortMonthName(currentMonth)} {currentYear}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total expenses · Budget
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(expenseBudget)}</div>
                    <p className="text-xs text-muted-foreground">
                      Variance {expenseVariance >= 0 ? "+" : ""}{formatCurrency(expenseVariance)} ({formatPercent(expenseVariancePct)})
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {selectedBranch === ALL_BRANCHES_ID && branchBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Branch contribution · {getShortMonthName(currentMonth)} {currentYear}</CardTitle>
                <CardDescription>
                  Each branch&apos;s contribution to revenue and expenses. Compare side by side.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-medium">Branch</th>
                        <th className="text-right py-3 px-2 font-medium">Revenue Forecast</th>
                        <th className="text-right py-3 px-2 font-medium">Revenue Budget</th>
                        <th className="text-right py-3 px-2 font-medium">Expense Forecast</th>
                        <th className="text-right py-3 px-2 font-medium">Expense Budget</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branchBreakdown.map((row) => (
                        <tr key={row.branch.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2 px-2 font-medium">
                            <button
                              type="button"
                              onClick={() => setSelectedBranch(row.branch.id)}
                              className="text-primary hover:underline text-left"
                            >
                              {row.branch.name}
                            </button>
                          </td>
                          <td className="text-right py-2 px-2">{formatCurrency(row.revenueForecast)}</td>
                          <td className="text-right py-2 px-2 text-muted-foreground">{formatCurrency(row.revenueBudget)}</td>
                          <td className="text-right py-2 px-2">{formatCurrency(row.expenseForecast)}</td>
                          <td className="text-right py-2 px-2 text-muted-foreground">{formatCurrency(row.expenseBudget)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div>
                  <CardTitle>Budget vs Forecast by Category</CardTitle>
                  <CardDescription>Monthly breakdown: budget and forecast by line item. Variance = Forecast − Budget. Use search and filter to narrow results.</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="relative flex-1 w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search categories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={selectedDescription} onValueChange={setSelectedDescription}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {descriptions.map((desc) => (
                        <SelectItem key={desc} value={desc}>
                          {desc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(searchQuery.trim() || selectedDescription !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("")
                        setSelectedDescription("all")
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selectedBranch !== ALL_BRANCHES_ID && (
                <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                  <Pencil className="h-4 w-4" />
                  <span>Click on any cell in the table view to adjust forecast values by description and month.</span>
                </div>
              )}
              <Tabs defaultValue="chart">
                <TabsList>
                  <TabsTrigger value="chart">Chart</TabsTrigger>
                  <TabsTrigger value="table">Table</TabsTrigger>
                </TabsList>
                <TabsContent value="chart" className="mt-4">
                  <ForecastChart 
                    forecasts={chartForecasts} 
                    currentMonth={currentMonth}
                  />
                </TabsContent>
                <TabsContent value="table" className="mt-4">
                  <ForecastTable 
                    forecasts={filteredForecasts}
                    currentMonth={currentMonth}
                    onUpdateForecast={handleUpdateForecast}
                    editable={profile?.role !== "branch_user" && selectedBranch !== ALL_BRANCHES_ID}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}

      {(selectedBranch === ALL_BRANCHES_ID || selectedBranch) && loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">
              {selectedBranch === ALL_BRANCHES_ID ? "Loading summary…" : "Loading your branch data…"}
            </p>
          </CardContent>
        </Card>
      )}

      {selectedBranch === ALL_BRANCHES_ID && forecasts.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LineChart className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold">
              {profile?.role === "region_admin" && branches.length === 0
                ? "No branches in your region"
                : "No Summary Data Yet"}
            </h2>
            <p className="text-muted-foreground mt-2 text-center max-w-md">
              {profile?.role === "region_admin" && branches.length === 0 ? (
                <>Your region has no branches assigned. Contact your administrator to assign branches to your region.</>
              ) : profile?.role === "region_admin" ? (
                <>No forecast data has been generated for the branches in your region yet. Forecasts are derived from imported Excel data. Contact your administrator to import data, or select a branch below to check if it has forecasts.</>
              ) : (
                <>Forecasts are derived from each branch&apos;s three-year data. Select a branch to view its forecasts; the summary here will show totals once branch forecasts are available.</>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {selectedBranch && selectedBranch !== ALL_BRANCHES_ID && forecasts.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LineChart className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold">No Forecasts Yet</h2>
            <p className="text-muted-foreground mt-2 text-center max-w-md">
              Forecasts are derived from this branch&apos;s pre-loaded three-year data. They will appear here when available.
            </p>
          </CardContent>
        </Card>
      )}

      {!selectedBranch && profile?.role === "branch_user" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LineChart className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold">Branch not assigned</h2>
            <p className="text-muted-foreground mt-2 text-center max-w-md">
              Your account is not assigned to a branch. Contact your administrator to get access.
            </p>
          </CardContent>
        </Card>
      )}

      {!selectedBranch && profile?.role !== "branch_user" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LineChart className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold">Select a Branch</h2>
            <p className="text-muted-foreground mt-2">
              Choose a branch to view forecasts.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
