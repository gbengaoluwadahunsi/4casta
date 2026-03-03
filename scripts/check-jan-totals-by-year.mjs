/**
 * Sum Jan TOTAL NET REVENUE by year (one per branch) to verify no double-count.
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

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const n = (v) => Number(v || 0)
const norm = (s) => String(s || "").toUpperCase().replace(/\s+/g, " ").trim()

async function fetchAll(year, month) {
  const pageSize = 1000
  let from = 0
  const all = []
  while (true) {
    const { data, error } = await supabase
      .from("forecasts")
      .select("branch_id, description, forecast_value, budget_value")
      .eq("year", year)
      .eq("month", month)
      .range(from, from + pageSize - 1)
    if (error) throw error
    all.push(...(data || []))
    if ((data || []).length < pageSize) break
    from += pageSize
  }
  return all
}

async function main() {
  for (const year of [2023, 2024, 2025, 2026]) {
    const rows = await fetchAll(year, 1)
    const revRows = rows.filter((r) => norm(r.description) === "TOTAL NET REVENUE")
    const sumAll = revRows.reduce((s, r) => s + n(r.forecast_value), 0)
    const budgetSum = revRows.reduce((s, r) => s + n(r.budget_value), 0)
    const dedup = new Map()
    for (const r of revRows) {
      const k = r.branch_id
      if (!dedup.has(k)) dedup.set(k, { f: n(r.forecast_value), b: n(r.budget_value) })
    }
    const dedupF = [...dedup.values()].reduce((s, x) => s + x.f, 0)
    const dedupB = [...dedup.values()].reduce((s, x) => s + x.b, 0)
    console.log(`Jan ${year}: rows=${revRows.length} sum_forecast=${sumAll.toFixed(0)} dedup_forecast=${dedupF.toFixed(0)} budget=${year===2026?dedupB:budgetSum}`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
