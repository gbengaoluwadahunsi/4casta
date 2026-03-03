import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import * as XLSX from "xlsx"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, "..")
const workbookPath = path.join(rootDir, "branchData", "2026-Orkin .xlsm")

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

function sumLineInSheet(rows, header, label) {
  let total = 0
  const key = norm(label)
  for (let i = header.headerRow + 1; i < rows.length; i++) {
    const row = rows[i] || []
    if (norm(row[header.descCol]) !== key) continue
    total += header.monthCols.reduce((s, c) => s + n(row[c]), 0)
  }
  return total
}

function main() {
  if (!fs.existsSync(workbookPath)) {
    console.error(`File not found: ${workbookPath}`)
    process.exit(1)
  }

  const wb = XLSX.read(fs.readFileSync(workbookPath), { type: "buffer", bookVBA: true })
  let revenue = 0
  let expenses = 0
  let overhead = 0
  let sheetsUsed = 0

  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: "" })
    const header = findHeader(rows)
    if (!header) continue
    sheetsUsed += 1
    revenue += sumLineInSheet(rows, header, "TOTAL NET REVENUE")
    expenses += sumLineInSheet(rows, header, "TOTAL EXPENSES")
    overhead += sumLineInSheet(rows, header, "TOTAL OVERHEAD ALLOCATIONS")
  }

  console.log(`Workbook: ${path.basename(workbookPath)}`)
  console.log(`Sheets parsed: ${sheetsUsed}`)
  console.log(`TOTAL NET REVENUE: ${revenue.toFixed(2)}`)
  console.log(`TOTAL EXPENSES: ${expenses.toFixed(2)}`)
  console.log(`TOTAL OVERHEAD ALLOCATIONS: ${overhead.toFixed(2)}`)
  console.log(`TOTAL EXPENSES + OVERHEAD: ${(expenses + overhead).toFixed(2)}`)
}

main()

