/**
 * Check budget integrity: compare budget_value in Supabase against the original
 * Excel files in branchData/2026Budget/.
 * 
 * Reports any branches where the June (month 6) expense budget doesn't match.
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"
import * as XLSX from "xlsx"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, "..")
const envPath = path.join(rootDir, ".env")

if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
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

const KPI_EXPENSE_LINES = new Set(["TOTAL EXPENSES", "TOTAL OVERHEAD ALLOCATIONS"])

function normDesc(s) {
  return String(s || "").toUpperCase().replace(/\s+/g, " ").trim()
}

async function fetchAllForecasts() {
  const pageSize = 1000
  let from = 0
  const all = []
  while (true) {
    const { data, error } = await supabase
      .from("forecasts")
      .select("branch_id, description, month, budget_value, forecast_value")
      .eq("year", 2026)
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
  console.log("Fetching branches...")
  const { data: branches, error: bErr } = await supabase
    .from("branches")
    .select("id, code, name")
    .order("code")
  if (bErr) throw bErr

  console.log("Fetching 2026 forecasts...\n")
  const rows = await fetchAllForecasts()

  // For each branch, compute June expense budget and total June budget
  const byBranch = new Map()
  for (const r of rows) {
    if (!byBranch.has(r.branch_id)) byBranch.set(r.branch_id, [])
    byBranch.get(r.branch_id).push(r)
  }

  console.log("=".repeat(100))
  console.log("JUNE (month 6) EXPENSE BUDGET BY BRANCH")
  console.log("=".repeat(100))
  console.log("")
  console.log("Branch".padEnd(30) + "Expense Budget".padStart(15) + "  Expense Forecast".padStart(18) + "  Total Budget".padStart(15))
  console.log("-".repeat(80))

  let totalExpBudget = 0
  let totalExpForecast = 0

  for (const branch of branches) {
    const branchRows = byBranch.get(branch.id) || []
    const juneRows = branchRows.filter(r => r.month === 6)
    
    let expBudget = 0
    let expForecast = 0
    let totalBudget = 0
    
    juneRows.forEach(r => {
      const d = normDesc(r.description)
      totalBudget += Number(r.budget_value || 0)
      if (KPI_EXPENSE_LINES.has(d)) {
        expBudget += Number(r.budget_value || 0)
        expForecast += Number(r.forecast_value || 0)
      }
    })

    totalExpBudget += expBudget
    totalExpForecast += expForecast

    const name = `${branch.code} ${branch.name}`.substring(0, 29)
    console.log(
      name.padEnd(30) +
      `$${expBudget.toFixed(0)}`.padStart(15) +
      `$${expForecast.toFixed(0)}`.padStart(18) +
      `$${totalBudget.toFixed(0)}`.padStart(15)
    )
  }

  console.log("-".repeat(80))
  console.log(
    "TOTAL".padEnd(30) +
    `$${totalExpBudget.toFixed(0)}`.padStart(15) +
    `$${totalExpForecast.toFixed(0)}`.padStart(18)
  )
  console.log("")

  // Also check: any branches where budget values look suspiciously low (like $61,317 mentioned in feedback)
  console.log("\n" + "=".repeat(100))
  console.log("BRANCHES WHERE JUNE EXPENSE BUDGET IS NEAR $61,317 or $259,912")
  console.log("=".repeat(100))
  
  for (const branch of branches) {
    const branchRows = byBranch.get(branch.id) || []
    const juneRows = branchRows.filter(r => r.month === 6)
    
    let expBudget = 0
    let expForecast = 0
    
    juneRows.forEach(r => {
      const d = normDesc(r.description)
      if (KPI_EXPENSE_LINES.has(d)) {
        expBudget += Number(r.budget_value || 0)
        expForecast += Number(r.forecast_value || 0)
      }
    })

    // Check if close to the figures mentioned
    if (Math.abs(expBudget - 61317) < 5000 || Math.abs(expBudget - 259912) < 5000 ||
        Math.abs(expForecast - 61317) < 5000 || Math.abs(expForecast - 259912) < 5000) {
      console.log(`  ${branch.code} ${branch.name}: budget=$${expBudget.toFixed(2)}, forecast=$${expForecast.toFixed(2)}`)
    }
  }

  // Now let's check what the Excel files say for each branch
  console.log("\n" + "=".repeat(100))
  console.log("CHECKING EXCEL SOURCE FILES (branchData/2026Budget)")
  console.log("=".repeat(100))

  const budgetDir = path.join(rootDir, "branchData", "2026Budget")
  if (!fs.existsSync(budgetDir)) {
    console.log("Budget directory not found:", budgetDir)
    return
  }

  const files = fs.readdirSync(budgetDir).filter(f => f.endsWith(".xlsx"))
  console.log(`Found ${files.length} Excel files\n`)
  
  const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  for (const file of files) {
    const filePath = path.join(budgetDir, file)
    const buf = fs.readFileSync(filePath)
    const workbook = XLSX.read(buf, { type: "buffer" })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })

    // Find header row with months
    let headerRow = -1
    let monthCols = []
    let descCol = -1
    for (let r = 0; r < Math.min(rows.length, 30); r++) {
      const row = rows[r] || []
      // Look for description column
      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] || "").trim().toLowerCase()
        if (cell === "description") {
          // Try to find month headers in this row
          const mc = []
          for (let m = 0; m < 12; m++) {
            const idx = row.findIndex(cl => {
              const s = String(cl || "").trim().toLowerCase()
              return s === FULL_MONTHS[m].toLowerCase() || s === SHORT_MONTHS[m].toLowerCase()
            })
            if (idx === -1) break
            mc.push(idx)
          }
          if (mc.length === 12) {
            headerRow = r
            descCol = c
            monthCols = mc
            break
          }
        }
      }
      if (headerRow >= 0) break
      // Also check "budget month N" pattern
      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] || "").trim().toLowerCase()
        if (cell === "budget month 1") {
          let ok = true
          const mc = [c]
          for (let m = 1; m < 12; m++) {
            if (String(row[c + m] || "").trim().toLowerCase() !== `budget month ${m + 1}`) { ok = false; break }
            mc.push(c + m)
          }
          if (ok) {
            headerRow = r
            descCol = c > 0 ? c - 1 : 0
            monthCols = mc
            break
          }
        }
      }
      if (headerRow >= 0) break
    }

    if (headerRow < 0) {
      console.log(`  ${file}: could not find header row`)
      continue
    }

    // Find "TOTAL EXPENSES" in June
    let juneExpTotal = 0
    let juneExpOH = 0
    for (let r = headerRow + 1; r < rows.length; r++) {
      const row = rows[r] || []
      const desc = normDesc(String(row[descCol] || ""))
      if (desc === "TOTAL EXPENSES") {
        const val = Number(row[monthCols[5]]) || 0  // June = index 5
        juneExpTotal = val
      }
      if (desc === "TOTAL OVERHEAD ALLOCATIONS") {
        const val = Number(row[monthCols[5]]) || 0
        juneExpOH = val
      }
    }

    const excelJuneBudget = juneExpTotal + juneExpOH
    
    // Find matching branch
    const branchCode = file.replace(".xlsx", "")
    const branch = branches.find(b => b.code === branchCode || b.code === branchCode.padStart(3, "0"))

    if (branch) {
      const branchRows = byBranch.get(branch.id) || []
      const juneRows = branchRows.filter(r => r.month === 6)
      let dbExpBudget = 0
      juneRows.forEach(r => {
        const d = normDesc(r.description)
        if (KPI_EXPENSE_LINES.has(d)) {
          dbExpBudget += Number(r.budget_value || 0)
        }
      })

      const diff = Math.abs(dbExpBudget - excelJuneBudget)
      if (diff > 1) {
        console.log(`  ⚠️  ${file} → ${branch.code} ${branch.name}: Excel June expense=$${excelJuneBudget.toFixed(0)}, DB=$${dbExpBudget.toFixed(0)}, DIFF=$${diff.toFixed(0)}`)
      }
    }
  }

  console.log("\nDone.")
}

main().catch(e => { console.error(e); process.exit(1) })
