import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"
import * as XLSX from "xlsx"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, "..")
const budgetDir = path.join(rootDir, "branchData", "2026Budget")

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

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const TARGET = "TOTAL NET REVENUE"

const num = (v) => {
  if (v === undefined || v === null || v === "") return 0
  if (typeof v === "number" && Number.isFinite(v)) return v
  const n = Number(String(v).replace(/,/g, ""))
  return Number.isFinite(n) ? n : 0
}

function findHeader(rows) {
  for (let r = 0; r < Math.min(rows.length, 80); r++) {
    const row = rows[r] || []
    for (let c = 0; c <= row.length - 12; c++) {
      const ok = FULL_MONTHS.every((m, i) => {
        const s = String(row[c + i] || "").trim().toLowerCase()
        return s === m.toLowerCase() || s === SHORT_MONTHS[i].toLowerCase()
      })
      if (ok) return { row: r, descCol: c > 0 ? c - 1 : 0, monthCols: Array.from({ length: 12 }, (_, i) => c + i) }
    }
  }
  return null
}

function norm(s) {
  return String(s || "").toUpperCase().replace(/\s+/g, " ").trim()
}

async function fetchAllForecastRows() {
  const all = []
  const pageSize = 1000
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from("forecasts")
      .select("branch_id, description, budget_value")
      .eq("year", 2026)
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
  const files = fs.readdirSync(budgetDir).filter((f) => f.endsWith(".xlsx")).sort((a, b) => a.localeCompare(b))

  // Excel totals by branch code
  const excelByCode = new Map()
  let excelTotal = 0
  for (const f of files) {
    const code = path.basename(f, ".xlsx").padStart(3, "0")
    const wb = XLSX.read(fs.readFileSync(path.join(budgetDir, f)), { type: "buffer", bookVBA: true })
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" })
    const header = findHeader(rows)
    if (!header) continue
    let branchTotal = 0
    for (let i = header.row + 1; i < rows.length; i++) {
      const row = rows[i] || []
      if (norm(row[header.descCol]) !== TARGET) continue
      branchTotal += header.monthCols.reduce((s, c) => s + num(row[c]), 0)
    }
    excelByCode.set(code, branchTotal)
    excelTotal += branchTotal
  }

  const [{ data: branches, error: bErr }, forecastRows] = await Promise.all([
    supabase.from("branches").select("id, code, name"),
    fetchAllForecastRows(),
  ])
  if (bErr) throw bErr
  const codeById = new Map((branches || []).map((b) => [b.id, b.code]))

  const dbByCode = new Map()
  let dbTotal = 0
  for (const r of forecastRows) {
    if (norm(r.description) !== TARGET) continue
    const code = codeById.get(r.branch_id)
    if (!code) continue
    const v = num(r.budget_value)
    dbByCode.set(code, (dbByCode.get(code) || 0) + v)
    dbTotal += v
  }

  console.log(`Excel TOTAL NET REVENUE: ${excelTotal.toFixed(2)}`)
  console.log(`DB    TOTAL NET REVENUE: ${dbTotal.toFixed(2)}`)
  console.log(`Gap (Excel-DB): ${(excelTotal - dbTotal).toFixed(2)}`)

  const diffs = []
  for (const [code, ex] of excelByCode.entries()) {
    const db = dbByCode.get(code) || 0
    const gap = ex - db
    if (Math.abs(gap) > 0.01) diffs.push({ code, ex, db, gap })
  }
  diffs.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))

  console.log(`Branches with mismatch: ${diffs.length}`)
  diffs.slice(0, 20).forEach((d) => {
    console.log(`${d.code}: excel=${d.ex.toFixed(2)} db=${d.db.toFixed(2)} gap=${d.gap.toFixed(2)}`)
  })
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})

