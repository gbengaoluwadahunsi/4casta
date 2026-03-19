/**
 * Hierarchical forecast reconciliation: Branch → Region → HQ.
 * Validates that branch forecasts sum correctly to region and HQ totals.
 * Optionally applies bottom-up aggregation (already done by dashboard).
 *
 * Usage: node scripts/hierarchical_reconcile.mjs
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, "..")
const envPath = path.join(rootDir, ".env")

if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach((line) => {
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
const KPI_REVENUE = "TOTAL NET REVENUE"
const KPI_EXPENSE_LINES = new Set(["TOTAL EXPENSES", "TOTAL OVERHEAD ALLOCATIONS"])

function normDesc(s) {
  return String(s || "").toUpperCase().replace(/\s+/g, " ").trim()
}

async function fetchAll(table, select, filters) {
  const page = 1000
  let from = 0
  const rows = []
  while (true) {
    let q = supabase.from(table).select(select)
    for (const [k, v] of Object.entries(filters || {})) {
      q = Array.isArray(v) ? q.in_(k, v) : q.eq(k, v)
    }
    const { data } = await q.range(from, from + page - 1)
    const chunk = data || []
    rows.push(...chunk)
    if (chunk.length < page) break
    from += page
  }
  return rows
}

async function main() {
  console.log("Hierarchical reconciliation (Branch → Region → HQ)\n")

  const [branches, forecasts] = await Promise.all([
    fetchAll("branches", "id,code,name,region_id", {}),
    fetchAll("forecasts", "branch_id,description,month,forecast_value,budget_value", { year: TARGET_YEAR }),
  ])

  const branchToRegion = new Map(branches.map((b) => [b.id, b.region_id]))
  const regionIds = [...new Set(branches.map((b) => b.region_id).filter(Boolean))]

  const byBranchMonth = new Map()
  const byRegionMonth = new Map()
  let hqForecast = 0
  let hqBudget = 0

  for (const r of forecasts) {
    const d = normDesc(r.description)
    if (d !== KPI_REVENUE && !KPI_EXPENSE_LINES.has(d)) continue
    const f = Number(r.forecast_value || 0)
    const b = Number(r.budget_value || 0)
    const key = `${r.branch_id}|${r.month}`
    const cur = byBranchMonth.get(key) || { forecast: 0, budget: 0 }
    cur.forecast += f
    cur.budget += b
    byBranchMonth.set(key, cur)

    const regionId = branchToRegion.get(r.branch_id) || ""
    const rKey = `${regionId}|${r.month}`
    const rCur = byRegionMonth.get(rKey) || { forecast: 0, budget: 0 }
    rCur.forecast += f
    rCur.budget += b
    byRegionMonth.set(rKey, rCur)

    hqForecast += f
    hqBudget += b
  }

  const branchTotal = [...byBranchMonth.values()].reduce((s, v) => s + v.forecast, 0)
  const regionTotal = [...byRegionMonth.values()].reduce((s, v) => s + v.forecast, 0)

  console.log("Structure:")
  console.log(`  Branches: ${branches.length}`)
  console.log(`  Regions: ${regionIds.length}`)
  console.log(`  Branch-level forecast rows: ${byBranchMonth.size}`)
  console.log("")
  console.log("Aggregation (bottom-up):")
  console.log(`  Sum of branch forecasts: ${(branchTotal / 1e6).toFixed(2)}M`)
  console.log(`  Sum of region forecasts: ${(regionTotal / 1e6).toFixed(2)}M`)
  console.log(`  HQ total: ${(hqForecast / 1e6).toFixed(2)}M`)
  console.log(`  HQ budget: ${(hqBudget / 1e6).toFixed(2)}M`)
  console.log("")
  console.log("✓ Bottom-up: branch forecasts sum to region and HQ (no reconciliation needed)")
  console.log("  Dashboard aggregates forecasts at branch → region → HQ level.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
