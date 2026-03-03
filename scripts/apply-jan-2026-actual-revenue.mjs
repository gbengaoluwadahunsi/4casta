/**
 * Apply known company actual revenue for Jan 2026 to forecast rows.
 *
 * We set forecast_value for description = TOTAL NET REVENUE, year=2026, month=1
 * so that HQ total equals the provided actual. Branch values are distributed
 * proportionally by current branch forecast (fallback to branch budget weights).
 *
 * Usage:
 *   node scripts/apply-jan-2026-actual-revenue.mjs --value 17373080
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, "..")
const envPath = path.join(rootDir, ".env")

if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, "utf8")
  env.split("\n").forEach((line) => {
    const t = line.trim()
    if (!t || t.startsWith("#")) return
    const i = t.indexOf("=")
    if (i > 0) {
      const k = t.slice(0, i).trim()
      let v = t.slice(i + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      process.env[k] = v
    }
  })
}

const args = process.argv.slice(2)
const valueArg = args.includes("--value") ? args[args.indexOf("--value") + 1] : null
const targetValue = Number(valueArg || 0)
if (!Number.isFinite(targetValue) || targetValue <= 0) {
  console.error("Usage: node scripts/apply-jan-2026-actual-revenue.mjs --value <number>")
  process.exit(1)
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const n = (v) => Number(v || 0)
const r2 = (v) => Math.round(v * 100) / 100

async function fetchAllRows() {
  const pageSize = 1000
  let from = 0
  const all = []
  while (true) {
    const { data, error } = await supabase
      .from("forecasts")
      .select("branch_id, description, year, month, forecast_value, budget_value")
      .eq("year", 2026)
      .eq("month", 1)
      .range(from, from + pageSize - 1)
    if (error) throw error
    const rows = data || []
    all.push(...rows)
    if (rows.length < pageSize) break
    from += pageSize
  }
  return all
}

async function main() {
  const rows = await fetchAllRows()
  const rawTargetRows = rows.filter((r) => String(r.description || "").toUpperCase().trim() === "TOTAL NET REVENUE")
  if (rawTargetRows.length === 0) {
    console.error("No TOTAL NET REVENUE rows found for Jan 2026.")
    process.exit(1)
  }

  // De-duplicate by branch_id to avoid ON CONFLICT re-touching same key
  const byBranch = new Map()
  for (const r of rawTargetRows) {
    const cur = byBranch.get(r.branch_id) || {
      branch_id: r.branch_id,
      forecast_value: 0,
      budget_value: 0,
    }
    cur.forecast_value += n(r.forecast_value)
    cur.budget_value += n(r.budget_value)
    byBranch.set(r.branch_id, cur)
  }
  const targetRows = [...byBranch.values()]

  let weightSum = targetRows.reduce((s, r) => s + Math.max(0, n(r.forecast_value)), 0)
  let useBudgetWeights = false
  if (weightSum <= 0) {
    weightSum = targetRows.reduce((s, r) => s + Math.max(0, n(r.budget_value)), 0)
    useBudgetWeights = true
  }
  if (weightSum <= 0) {
    console.error("Unable to compute weights from forecast or budget.")
    process.exit(1)
  }

  const updated = []
  let running = 0
  for (let i = 0; i < targetRows.length; i++) {
    const row = targetRows[i]
    const w = useBudgetWeights ? Math.max(0, n(row.budget_value)) : Math.max(0, n(row.forecast_value))
    let value = (w / weightSum) * targetValue
    if (i === targetRows.length - 1) {
      // Force exact HQ total at the end
      value = targetValue - running
    } else {
      value = r2(value)
      running += value
    }
    updated.push({
      branch_id: row.branch_id,
      description: "TOTAL NET REVENUE",
      year: 2026,
      month: 1,
      forecast_value: r2(value),
      budget_value: n(row.budget_value),
      last_month_value: 0,
      last_year_value: 0,
    })
  }

  for (let i = 0; i < updated.length; i += 200) {
    const batch = updated.slice(i, i + 200)
    const { error } = await supabase
      .from("forecasts")
      .upsert(batch, { onConflict: "branch_id,description,year,month", ignoreDuplicates: false })
    if (error) throw error
  }

  const verifyRows = await fetchAllRows()
  const verifyTotal = verifyRows
    .filter((r) => String(r.description || "").toUpperCase().trim() === "TOTAL NET REVENUE")
    .reduce((s, r) => s + n(r.forecast_value), 0)

  console.log(`Applied Jan 2026 actual revenue target: ${targetValue.toFixed(2)}`)
  console.log(`Rows updated: ${updated.length}`)
  console.log(`Verified Jan 2026 TOTAL NET REVENUE forecast: ${verifyTotal.toFixed(2)}`)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})

