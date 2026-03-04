"use client"

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

// Y-axis: show millions when values are large, otherwise thousands
function axisLabel(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`
  return `$${value.toFixed(0)}`
}

// Custom tooltip so each value is clearly labeled (Forecast, Budget, Last Year)
function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length || !label) return null
  return (
    <div
      className="rounded-md border bg-card px-3 py-2 text-sm shadow-md"
      style={{
        borderColor: "hsl(var(--border))",
      }}
    >
      <p className="font-medium text-foreground mb-1.5">{label}</p>
      <ul className="space-y-0.5">
        {payload.map((entry) => (
          <li key={entry.dataKey} className="flex items-center gap-2">
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">{formatCurrency(Number(entry.value))}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground mt-1.5 pt-1 border-t border-border">
        Total revenue + expenses for this month
      </p>
    </div>
  )
}

type ForecastChartProps = {
  forecasts: ForecastResult[]
  currentMonth: number
}

export function ForecastChart({ forecasts, currentMonth }: ForecastChartProps) {
  // Aggregate data by month
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const monthForecasts = forecasts.filter(f => f.month === month)
    
    return {
      month: getShortMonthName(month),
      forecast: monthForecasts.reduce((sum, f) => sum + f.forecastValue, 0),
      budget: monthForecasts.reduce((sum, f) => sum + f.budgetValue, 0),
      lastYear: monthForecasts.reduce((sum, f) => sum + f.lastYearValue, 0),
    }
  })

  return (
    <div className="w-full min-w-0 overflow-x-auto">
      <div className="h-[280px] sm:h-[320px] md:h-[400px] min-w-[280px]" style={{ width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={monthlyData}
            margin={{ top: 8, right: 8, left: 4, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="month"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              tickFormatter={axisLabel}
              tickLine={false}
              width={42}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <ReferenceLine
              x={getShortMonthName(currentMonth)}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="5 5"
              label={{ value: "Current", position: "top", fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              name="Forecast"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="budget"
              name="Budget"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: "hsl(var(--accent))", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="lastYear"
              name="Last Year"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
