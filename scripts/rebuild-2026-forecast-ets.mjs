/**
 * Rebuild 2026 forecast_value using ETS (Holt-Winters additive).
 * Model chosen by 2025 backtest as best. No bias; forecast from 2023-2025 history only.
 * Python runs ETS; Node handles Supabase fetch/upsert.
 *
 * Usage: node scripts/rebuild-2026-forecast-ets.mjs
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { spawn } from "child_process"
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
const HIST_YEARS = [2023, 2024, 2025]
const TARGET_YEAR = 2026
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

const MAX_DECIMAL = 9999999999999.99
const n = (v) => Number(v || 0)
const r2 = (v) => {
  const x = Math.round((Number(v) || 0) * 100) / 100
  if (!Number.isFinite(x)) return 0
  return Math.min(MAX_DECIMAL, Math.max(0, x))
}

function normDesc(s) {
  return String(s || "")
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function findHistoryRows(historyByDesc, budgetDesc) {
  if (historyByDesc.has(budgetDesc)) return historyByDesc.get(budgetDesc)
  const nd = normDesc(budgetDesc)
  const out = []
  for (const [desc, rows] of historyByDesc.entries()) {
    if (normDesc(desc) === nd) out.push(...rows)
  }
  return out
}

function aggregatePoints(rows) {
  const by = new Map()
  for (const r of rows) {
    const k = `${r.year}|${r.month}`
    const v = n(r.forecast_value)
    by.set(k, Math.max(by.get(k) || 0, v))
  }
  const pts = []
  for (const y of HIST_YEARS) {
    for (const m of MONTHS) {
      pts.push([y, m, by.get(`${y}|${m}`) || 0])
    }
  }
  return pts
}

function runEts(tasks) {
  return new Promise((resolve, reject) => {
    const py = spawn("python", [path.join(__dirname, "ets-runner.py")], {
      stdio: ["pipe", "pipe", "pipe"],
    })
    let out = ""
    let err = ""
    py.stdout.on("data", (d) => { out += d.toString() })
    py.stderr.on("data", (d) => { err += d.toString() })
    py.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ets-runner exited ${code}: ${err}`))
        return
      }
      try {
        resolve(JSON.parse(out.trim()))
      } catch (e) {
        reject(new Error(`ets-runner invalid JSON: ${out.slice(0, 200)}`))
      }
    })
    py.stdin.write(JSON.stringify(tasks))
    py.stdin.end()
  })
}

async function fetchAllForecasts(branchId) {
  const pageSize = 1000
  let from = 0
  const all = []
  while (true) {
    const { data, error } = await supabase
      .from("forecasts")
      .select("branch_id, description, year, month, forecast_value, budget_value")
      .eq("branch_id", branchId)
      .in("year", [...HIST_YEARS, TARGET_YEAR])
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
  const { data: branches, error: bErr } = await supabase
    .from("branches")
    .select("id, code, name")
    .order("code")
  if (bErr) {
    console.error("❌ branches:", bErr.message)
    process.exit(1)
  }
  if (!branches?.length) {
    console.error("❌ No branches found")
    process.exit(1)
  }

  let totalUpserted = 0
  let touched = 0

  for (const branch of branches) {
    let rows = []
    try {
      rows = await fetchAllForecasts(branch.id)
    } catch (e) {
      console.error(`❌ fetch ${branch.code} ${branch.name}:`, e.message)
      process.exit(1)
    }

    const historyByDesc = new Map()
    const budgetByDesc = new Map()
    for (const r of rows) {
      const d = String(r.description || "").trim()
      if (!d) continue
      if (r.year === TARGET_YEAR) {
        if (!budgetByDesc.has(d)) budgetByDesc.set(d, [])
        budgetByDesc.get(d).push(r)
      } else {
        if (!historyByDesc.has(d)) historyByDesc.set(d, [])
        historyByDesc.get(d).push(r)
      }
    }

    const tasks = []
    const meta = []

    for (const [desc, budgetRows] of budgetByDesc.entries()) {
      const budgetYearTotal = MONTHS.reduce(
        (s, m) => s + n(budgetRows.find((r) => r.month === m)?.budget_value),
        0
      )
      if (budgetYearTotal === 0) continue

      const histRows = findHistoryRows(historyByDesc, desc)
      const points = aggregatePoints(histRows)
      tasks.push({ points })
      meta.push({ desc, budgetRows, histRows })
    }

    if (tasks.length === 0) continue

    let results
    try {
      results = await runEts(tasks)
    } catch (e) {
      console.error(`❌ ETS ${branch.code} ${branch.name}:`, e.message)
      process.exit(1)
    }

    const upserts = []
    for (let i = 0; i < meta.length; i++) {
      const { desc, budgetRows, histRows } = meta[i]
      const preds = results[i]?.predictions ?? []
      const map2025 = {}
      for (const r of histRows) {
        map2025[`${r.year}|${r.month}`] = n(r.forecast_value)
      }
      for (let j = 0; j < MONTHS.length; j++) {
        const month = MONTHS[j]
        const budget = n(budgetRows.find((r) => r.month === month)?.budget_value)
        const lastYear = map2025["2025|" + month] ?? 0
        const lastMonth = month === 1 ? (map2025["2025|12"] ?? 0) : (map2025["2025|" + (month - 1)] ?? 0)
        upserts.push({
          branch_id: branch.id,
          description: desc,
          year: TARGET_YEAR,
          month,
          forecast_value: r2(preds[j] ?? 0),
          budget_value: r2(budget),
          last_month_value: r2(lastMonth),
          last_year_value: r2(lastYear),
        })
      }
    }

    // Zero-budget lines: force forecast 0
    for (const [desc, budgetRows] of budgetByDesc.entries()) {
      const budgetYearTotal = MONTHS.reduce(
        (s, m) => s + n(budgetRows.find((r) => r.month === m)?.budget_value),
        0
      )
      if (budgetYearTotal !== 0) continue
      for (const month of MONTHS) {
        const budget = n(budgetRows.find((r) => r.month === month)?.budget_value)
        upserts.push({
          branch_id: branch.id,
          description: desc,
          year: TARGET_YEAR,
          month,
          forecast_value: 0,
          budget_value: r2(budget),
          last_month_value: 0,
          last_year_value: 0,
        })
      }
    }

    if (upserts.length > 0) {
      touched += 1
      for (let i = 0; i < upserts.length; i += 500) {
        const batch = upserts.slice(i, i + 500)
        const { error: uErr } = await supabase
          .from("forecasts")
          .upsert(batch, { onConflict: "branch_id,description,year,month", ignoreDuplicates: false })
        if (uErr) {
          console.error(`❌ upsert ${branch.code} ${branch.name}:`, uErr.message)
          process.exit(1)
        }
      }
      totalUpserted += upserts.length
      console.log(`✓ ${branch.code} ${branch.name}: updated ${upserts.length} rows`)
    }
  }

  console.log("")
  console.log(`Done. Branches touched: ${touched}`)
  console.log(`Rows upserted: ${totalUpserted}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
