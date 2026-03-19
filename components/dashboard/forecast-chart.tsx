"use client"

import { useMemo, useState } from "react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import type { TooltipProps } from "recharts"
import { type ForecastResult, getShortMonthName, formatCurrency } from "@/lib/forecasting"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

const KPI_REVENUE = "TOTAL NET REVENUE"
const KPI_EXPENSE_LINES = new Set(["TOTAL EXPENSES", "TOTAL OVERHEAD ALLOCATIONS"])

const SERIES = [
  { key: "revenueForecast", name: "Revenue · Forecast", color: "#2563eb" },
  { key: "revenueBudget", name: "Revenue · Budget", color: "#7c3aed" },
  { key: "expenseForecast", name: "Expenses · Forecast", color: "#dc2626" },
  { key: "expenseBudget", name: "Expenses · Budget", color: "#059669" },
] as const

type SeriesVisibility = Record<(typeof SERIES)[number]["key"], boolean>

function normDesc(s: string): string {
  return String(s ?? "").toUpperCase().replace(/\s+/g, " ").trim()
}

function axisLabel(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`
  return `$${Math.round(value)}`
}

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length || !label) return null
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-md border-border">
      <p className="font-medium text-foreground mb-1.5">{label}</p>
      <ul className="space-y-0.5">
        {payload.map((entry) => (
          <li key={entry.dataKey} className="flex items-center gap-2">
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">{formatCurrency(Number(entry.value))}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function useMonthlyData(forecasts: ForecastResult[]) {
  return useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const monthRows = forecasts.filter((f) => f.month === month)
      let revenueForecast = 0
      let revenueBudget = 0
      let expenseForecast = 0
      let expenseBudget = 0
      monthRows.forEach((f) => {
        const d = normDesc(f.description)
        if (d === KPI_REVENUE) {
          revenueForecast += f.forecastValue
          revenueBudget += f.budgetValue
        } else if (KPI_EXPENSE_LINES.has(d)) {
          expenseForecast += f.forecastValue
          expenseBudget += f.budgetValue
        }
      })
      const hasKpiSplit = revenueForecast > 0 || revenueBudget > 0 || expenseForecast > 0 || expenseBudget > 0
      if (!hasKpiSplit && monthRows.length > 0) {
        revenueForecast = monthRows.reduce((s, f) => s + f.forecastValue, 0)
        revenueBudget = monthRows.reduce((s, f) => s + f.budgetValue, 0)
        expenseForecast = 0
        expenseBudget = 0
      }
      return {
        month: getShortMonthName(month),
        revenueForecast,
        revenueBudget,
        expenseForecast,
        expenseBudget,
      }
    })
  }, [forecasts])
}

type ForecastChartProps = {
  forecasts: ForecastResult[]
  currentMonth: number
}

/** Bar chart: vertical bars per month for each series */
export function ForecastBarChart({ forecasts, currentMonth }: ForecastChartProps) {
  const monthlyData = useMonthlyData(forecasts)
  const [visible, setVisible] = useState<SeriesVisibility>({
    revenueForecast: true,
    revenueBudget: true,
    expenseForecast: true,
    expenseBudget: true,
  })
  const toggle = (key: keyof SeriesVisibility) => setVisible((v) => ({ ...v, [key]: !v[key] }))
  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <Label className="text-sm text-muted-foreground">Show lines:</Label>
        {SERIES.map((s) => (
          <label key={s.key} className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={visible[s.key]}
              onCheckedChange={() => toggle(s.key)}
            />
            <span className="text-sm" style={{ color: visible[s.key] ? s.color : undefined }}>
              {s.name}
            </span>
          </label>
        ))}
      </div>
      <div style={{ minHeight: 320 }}>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
          data={monthlyData}
          margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickFormatter={axisLabel}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine
            x={getShortMonthName(currentMonth)}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="5 5"
            label={{ value: "Selected", position: "top", fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          />
          {visible.revenueForecast && <Bar dataKey="revenueForecast" name="Revenue · Forecast" fill="#2563eb" radius={[2, 2, 0, 0]} />}
          {visible.revenueBudget && <Bar dataKey="revenueBudget" name="Revenue · Budget" fill="#7c3aed" radius={[2, 2, 0, 0]} />}
          {visible.expenseForecast && <Bar dataKey="expenseForecast" name="Expenses · Forecast" fill="#dc2626" radius={[2, 2, 0, 0]} />}
          {visible.expenseBudget && <Bar dataKey="expenseBudget" name="Expenses · Budget" fill="#059669" radius={[2, 2, 0, 0]} />}
        </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Line graph: lines connecting data points across months */
export function ForecastChart({ forecasts, currentMonth }: ForecastChartProps) {
  const monthlyData = useMonthlyData(forecasts)
  const [visible, setVisible] = useState<SeriesVisibility>({
    revenueForecast: true,
    revenueBudget: true,
    expenseForecast: true,
    expenseBudget: true,
  })
  const toggle = (key: keyof SeriesVisibility) => setVisible((v) => ({ ...v, [key]: !v[key] }))
  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <Label className="text-sm text-muted-foreground">Show lines:</Label>
        {SERIES.map((s) => (
          <label key={s.key} className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={visible[s.key]}
              onCheckedChange={() => toggle(s.key)}
            />
            <span className="text-sm" style={{ color: visible[s.key] ? s.color : undefined }}>
              {s.name}
            </span>
          </label>
        ))}
      </div>
      <div style={{ minHeight: 320 }}>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart
          data={monthlyData}
          margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="month"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickFormatter={axisLabel}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine
            x={getShortMonthName(currentMonth)}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="5 5"
            label={{ value: "Selected", position: "top", fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          />
          {visible.revenueForecast && (
            <Line
              type="monotone"
              dataKey="revenueForecast"
              name="Revenue · Forecast"
              stroke="#2563eb"
              strokeWidth={3}
              connectNulls
              isAnimationActive={false}
              dot={{ fill: "#2563eb", r: 4 }}
              activeDot={{ r: 6 }}
            />
          )}
          {visible.revenueBudget && (
            <Line
              type="monotone"
              dataKey="revenueBudget"
              name="Revenue · Budget"
              stroke="#7c3aed"
              strokeWidth={2.5}
              strokeDasharray="8 4"
              connectNulls
              isAnimationActive={false}
              dot={{ fill: "#7c3aed", r: 4 }}
              activeDot={{ r: 6 }}
            />
          )}
          {visible.expenseForecast && (
            <Line
              type="monotone"
              dataKey="expenseForecast"
              name="Expenses · Forecast"
              stroke="#dc2626"
              strokeWidth={3}
              connectNulls
              isAnimationActive={false}
              dot={{ fill: "#dc2626", r: 4 }}
              activeDot={{ r: 6 }}
            />
          )}
          {visible.expenseBudget && (
            <Line
              type="monotone"
              dataKey="expenseBudget"
              name="Expenses · Budget"
              stroke="#059669"
              strokeWidth={2.5}
              strokeDasharray="4 4"
              connectNulls
              isAnimationActive={false}
              dot={{ fill: "#059669", r: 4 }}
              activeDot={{ r: 6 }}
            />
          )}
        </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
