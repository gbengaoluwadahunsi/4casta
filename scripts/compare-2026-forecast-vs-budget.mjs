/**
 * Compare 2026 forecast vs budget by month (Jan–Dec).
 * Uses same KPI definitions as dashboard: TOTAL NET REVENUE, TOTAL EXPENSES, TOTAL OVERHEAD ALLOCATIONS.
 * Paginates at 1000 rows (Supabase default max) to fetch all data.
 *
 * Usage: node scripts/compare-2026-forecast-vs-budget.mjs
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, "..")
const envPath = path.join(rootDir, ".env")

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8")
  envContent.split("\n").forEach((line) => {
    const t = line.trim()
    if (t && !t.startsWith("#") && t.includes("=")) {
      const eq = t.indexOf("=")
      const key = t.slice(0, eq).trim()
      let value = t.slice(eq + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
    }
  })
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("❌ Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
  process.exit(1)
}

const supabase = createClient(url, key)
const TARGET_YEAR = 2026
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const KPI_REVENUE = "TOTAL NET REVENUE"
const KPI_EXPENSE_LINES = new Set(["TOTAL EXPENSES", "TOTAL OVERHEAD ALLOCATIONS"])

function normDesc(s) {
  return String(s || "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim()
}

function formatNum(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B"
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M"
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K"
  return n.toFixed(2)
}

async function fetch2026Forecasts() {
  const pageSize = 1000 // Supabase default max rows per request
  let from = 0
  const all = []
  while (true) {
    const { data, error } = await supabase
      .from("forecasts")
      .select("branch_id, description, month, forecast_value, budget_value")
      .eq("year", TARGET_YEAR)
      .range(from, from + pageSize - 1)
    if (error) throw error
    const rows = data ?? []
    all.push(...rows)
    if (rows.length < pageSize) break
    from += pageSize
  }
  return all
}

async function main() {
  console.log("Fetching 2026 forecasts and budgets...\n")
  const rows = await fetch2026Forecasts()

  // Aggregate by KPI (same as dashboard): TOTAL NET REVENUE, TOTAL EXPENSES, TOTAL OVERHEAD ALLOCATIONS
  const byMonth = {}
  for (let m = 1; m <= 12; m++) {
    byMonth[m] = { revenue: { forecast: 0, budget: 0 }, expense: { forecast: 0, budget: 0 } }
  }

  for (const r of rows) {
    const month = r.month
    const d = normDesc(r.description)
    const f = Number(r.forecast_value || 0)
    const b = Number(r.budget_value || 0)
    if (d === KPI_REVENUE) {
      byMonth[month].revenue.forecast += f
      byMonth[month].revenue.budget += b
    } else if (KPI_EXPENSE_LINES.has(d)) {
      byMonth[month].expense.forecast += f
      byMonth[month].expense.budget += b
    }
  }

  console.log("=".repeat(90))
  console.log("2026 FORECAST vs BUDGET (HQ total – same KPIs as dashboard)")
  console.log("TOTAL NET REVENUE | TOTAL EXPENSES | TOTAL OVERHEAD ALLOCATIONS")
  console.log("=".repeat(90))

  console.log("\n--- REVENUE ---\n")
  console.log("Month       Forecast      Budget    Variance     Var %")
  console.log("-".repeat(54))

  let revForecastTotal = 0
  let revBudgetTotal = 0
  for (let m = 1; m <= 12; m++) {
    const { forecast, budget } = byMonth[m].revenue
    revForecastTotal += forecast
    revBudgetTotal += budget
    const variance = forecast - budget
    const varPct = budget !== 0 ? ((variance / budget) * 100).toFixed(1) : "—"
    console.log(
      MONTH_NAMES[m - 1].padEnd(8) +
        formatNum(forecast).padStart(12) +
        formatNum(budget).padStart(12) +
        formatNum(variance).padStart(12) +
        (typeof varPct === "string" ? varPct : varPct + "%").padStart(10)
    )
  }
  console.log("-".repeat(54))
  const revVarTotal = revForecastTotal - revBudgetTotal
  const revVarPct = revBudgetTotal !== 0 ? ((revVarTotal / revBudgetTotal) * 100).toFixed(1) : "—"
  console.log(
    "TOTAL".padEnd(8) +
      formatNum(revForecastTotal).padStart(12) +
      formatNum(revBudgetTotal).padStart(12) +
      formatNum(revVarTotal).padStart(12) +
      (typeof revVarPct === "string" ? revVarPct : revVarPct + "%").padStart(10)
  )

  console.log("\n--- EXPENSES ---\n")
  console.log("Month       Forecast      Budget    Variance     Var %")
  console.log("-".repeat(54))

  let expForecastTotal = 0
  let expBudgetTotal = 0
  for (let m = 1; m <= 12; m++) {
    const { forecast, budget } = byMonth[m].expense
    expForecastTotal += forecast
    expBudgetTotal += budget
    const variance = forecast - budget
    const varPct = budget !== 0 ? ((variance / budget) * 100).toFixed(1) : "—"
    console.log(
      MONTH_NAMES[m - 1].padEnd(8) +
        formatNum(forecast).padStart(12) +
        formatNum(budget).padStart(12) +
        formatNum(variance).padStart(12) +
        (typeof varPct === "string" ? varPct : varPct + "%").padStart(10)
    )
  }
  console.log("-".repeat(54))
  const expVarTotal = expForecastTotal - expBudgetTotal
  const expVarPct = expBudgetTotal !== 0 ? ((expVarTotal / expBudgetTotal) * 100).toFixed(1) : "—"
  console.log(
    "TOTAL".padEnd(8) +
      formatNum(expForecastTotal).padStart(12) +
      formatNum(expBudgetTotal).padStart(12) +
      formatNum(expVarTotal).padStart(12) +
      (typeof expVarPct === "string" ? expVarPct : expVarPct + "%").padStart(10)
  )

  console.log("\n--- SUMMARY (matches dashboard) ---\n")
  console.log(
    `Revenue:  Forecast ${formatNum(revForecastTotal)}  |  Budget ${formatNum(revBudgetTotal)}  |  Variance ${formatNum(revVarTotal)} (${revVarPct}%)`
  )
  console.log(
    `Expenses: Forecast ${formatNum(expForecastTotal)}  |  Budget ${formatNum(expBudgetTotal)}  |  Variance ${formatNum(expVarTotal)} (${expVarPct}%)`
  )
  console.log("")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
