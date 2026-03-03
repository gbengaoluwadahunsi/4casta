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
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith("#")) {
      const eq = trimmed.indexOf("=")
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim()
        let value = trimmed.slice(eq + 1).trim()
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        process.env[key] = value
      }
    }
  })
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
  process.exit(1)
}

const supabase = createClient(url, key)

const YEAR = 2026
const MONTH = 3 // March
const SAMPLE_BRANCH_CODE = "001"
const SAMPLE_REGION = "GTA REGION"

const n = (v) => Number(v || 0)
const r2 = (v) => Math.round(v * 100) / 100

async function fetchMonthRows() {
  const pageSize = 1000
  let from = 0
  const all = []
  while (true) {
    const { data, error } = await supabase
      .from("forecasts")
      .select("branch_id, forecast_value, budget_value")
      .eq("year", YEAR)
      .eq("month", MONTH)
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`forecasts read failed: ${error.message}`)
    const rows = data ?? []
    all.push(...rows)
    if (rows.length < pageSize) break
    from += pageSize
  }
  return all
}

async function main() {
  const [{ data: branches, error: bErr }, rows] = await Promise.all([
    supabase.from("branches").select("id, code, name, region_id, regions(name)"),
    fetchMonthRows(),
  ])

  if (bErr) throw new Error(`branches read failed: ${bErr.message}`)

  const branchById = new Map((branches || []).map((b) => [b.id, b]))
  const branchTotals = new Map()
  const regionTotals = new Map()

  for (const row of rows || []) {
    const b = branchById.get(row.branch_id)
    if (!b) continue

    const bf = n(row.forecast_value)
    const bb = n(row.budget_value)

    const curBranch = branchTotals.get(b.id) || { forecast: 0, budget: 0 }
    curBranch.forecast += bf
    curBranch.budget += bb
    branchTotals.set(b.id, curBranch)

    const regionName = b.regions?.name || "UNKNOWN"
    const curRegion = regionTotals.get(regionName) || { forecast: 0, budget: 0 }
    curRegion.forecast += bf
    curRegion.budget += bb
    regionTotals.set(regionName, curRegion)
  }

  const hq = { forecast: 0, budget: 0 }
  for (const t of regionTotals.values()) {
    hq.forecast += t.forecast
    hq.budget += t.budget
  }

  const sampleBranch = (branches || []).find((b) => b.code === SAMPLE_BRANCH_CODE)
  const sampleBranchTotals = sampleBranch ? branchTotals.get(sampleBranch.id) || { forecast: 0, budget: 0 } : null
  const sampleRegionTotals = regionTotals.get(SAMPLE_REGION) || { forecast: 0, budget: 0 }

  console.log(`Validation for ${YEAR}-${String(MONTH).padStart(2, "0")}`)
  if (sampleBranch && sampleBranchTotals) {
    console.log(
      `Branch ${sampleBranch.code} ${sampleBranch.name}: forecast=${r2(sampleBranchTotals.forecast)}, budget=${r2(sampleBranchTotals.budget)}, variance=${r2(sampleBranchTotals.forecast - sampleBranchTotals.budget)}`
    )
  }
  console.log(
    `Region ${SAMPLE_REGION}: forecast=${r2(sampleRegionTotals.forecast)}, budget=${r2(sampleRegionTotals.budget)}, variance=${r2(sampleRegionTotals.forecast - sampleRegionTotals.budget)}`
  )
  console.log(`HQ total: forecast=${r2(hq.forecast)}, budget=${r2(hq.budget)}, variance=${r2(hq.forecast - hq.budget)}`)

  // Rollup sanity checks:
  const regionSum = [...regionTotals.values()].reduce(
    (acc, t) => ({ forecast: acc.forecast + t.forecast, budget: acc.budget + t.budget }),
    { forecast: 0, budget: 0 }
  )
  console.log(
    `Check (sum of regions == HQ): ${
      r2(regionSum.forecast) === r2(hq.forecast) && r2(regionSum.budget) === r2(hq.budget) ? "PASS" : "FAIL"
    }`
  )
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})

