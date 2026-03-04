"use client"

import { useMemo } from "react"
import {
  LineChart,
  Line,
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

const KPI_REVENUE = "TOTAL NET REVENUE"
const KPI_EXPENSE_LINES = new Set(["TOTAL EXPENSES", "TOTAL OVERHEAD ALLOCATIONS"])

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

type ForecastChartProps = {
  forecasts: ForecastResult[]
  currentMonth: number
}

export function ForecastChart({ forecasts, currentMonth }: ForecastChartProps) {
  const monthlyData = useMemo(() => {
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

  return (
    <div className="w-full" style={{ minHeight: 320 }}>
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
          <Line
            type="monotone"
            dataKey="revenueForecast"
            name="Revenue · Forecast"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: "hsl(var(--primary))", r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="revenueBudget"
            name="Revenue · Budget"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={{ fill: "hsl(var(--primary))", r: 2 }}
          />
          <Line
            type="monotone"
            dataKey="expenseForecast"
            name="Expenses · Forecast"
            stroke="hsl(var(--accent))"
            strokeWidth={2}
            dot={{ fill: "hsl(var(--accent))", r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="expenseBudget"
            name="Expenses · Budget"
            stroke="hsl(var(--accent))"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={{ fill: "hsl(var(--accent))", r: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
