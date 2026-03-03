import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"
import * as XLSX from "xlsx"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, "..")
const workbookPath = path.join(rootDir, "branchData", "2026-Orkin .xlsm")
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
const n = (v) => {
  if (v === undefined || v === null || v === "") return 0
  if (typeof v === "number" && Number.isFinite(v)) return v
  const x = Number(String(v).replace(/,/g, ""))
  return Number.isFinite(x) ? x : 0
}
const norm = (s) => String(s || "").toUpperCase().replace(/\s+/g, " ").trim()

function findHeader(rows) {
  for (let r = 0; r < Math.min(rows.length, 90); r++) {
    const row = rows[r] || []
    for (let c = 0; c <= row.length - 12; c++) {
      const ok = FULL_MONTHS.every((m, i) => {
        const s = String(row[c + i] || "").trim().toLowerCase()
        return s === m.toLowerCase() || s === SHORT_MONTHS[i].toLowerCase()
      })
      if (ok) return { headerRow: r, descCol: c > 0 ? c - 1 : 0, monthCols: Array.from({ length: 12 }, (_, i) => c + i) }
    }
  }
  return null
}

function lineTotal(rows, header, label) {
  let total = 0
  const target = norm(label)
  for (let i = header.headerRow + 1; i < rows.length; i++) {
    const row = rows[i] || []
    if (norm(row[header.descCol]) !== target) continue
    total += header.monthCols.reduce((s, c) => s + n(row[c]), 0)
  }
  return total
}

function sheetCode(name) {
  const m = String(name || "").trim().match(/^(\d{1,3})\b/)
  return m ? m[1].padStart(3, "0") : null
}

async function main() {
  const { data: branches, error } = await supabase.from("branches").select("code").order("code")
  if (error) throw error
  const validCodes = new Set((branches || []).map((b) => String(b.code).padStart(3, "0")))

  const wb = XLSX.read(fs.readFileSync(workbookPath), { type: "buffer", bookVBA: true })
  let revenue = 0
  let expenses = 0
  let overhead = 0
  let used = 0

  for (const s of wb.SheetNames) {
    const code = sheetCode(s)
    if (!code || !validCodes.has(code)) continue
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, defval: "" })
    const header = findHeader(rows)
    if (!header) continue
    used += 1
    revenue += lineTotal(rows, header, "TOTAL NET REVENUE")
    expenses += lineTotal(rows, header, "TOTAL EXPENSES")
    overhead += lineTotal(rows, header, "TOTAL OVERHEAD ALLOCATIONS")
  }

  console.log(`Operational sheets used: ${used}`)
  console.log(`TOTAL NET REVENUE: ${revenue.toFixed(2)}`)
  console.log(`TOTAL EXPENSES: ${expenses.toFixed(2)}`)
  console.log(`TOTAL OVERHEAD ALLOCATIONS: ${overhead.toFixed(2)}`)
  console.log(`TOTAL EXPENSES + OVERHEAD: ${(expenses + overhead).toFixed(2)}`)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})

