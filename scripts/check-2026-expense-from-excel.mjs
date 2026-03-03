import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import * as XLSX from "xlsx"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, "..")
const budgetDir = path.join(rootDir, "branchData", "2026Budget")

const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const n = (v) => {
  if (v === undefined || v === null || v === "") return 0
  if (typeof v === "number" && Number.isFinite(v)) return v
  const x = Number(String(v).replace(/,/g, ""))
  return Number.isFinite(x) ? x : 0
}

function findHeader(rows) {
  for (let r = 0; r < Math.min(rows.length, 80); r++) {
    const row = rows[r] || []
    // Description + Jan..Dec layout
    const descIdx = row.findIndex((c) => String(c || "").trim().toLowerCase() === "description")
    if (descIdx !== -1) {
      const monthCols = []
      for (let m = 0; m < 12; m++) {
        const idx = row.findIndex((c) => {
          const s = String(c || "").trim().toLowerCase()
          return s === FULL_MONTHS[m].toLowerCase() || s === SHORT_MONTHS[m].toLowerCase()
        })
        if (idx === -1) break
        monthCols.push(idx)
      }
      if (monthCols.length === 12) return { headerRow: r, descCol: descIdx, monthCols }
    }

    // Fallback: first visible row has Jan..Dec and description immediately before
    for (let c = 0; c <= row.length - 12; c++) {
      const ok = FULL_MONTHS.every((mName, i) => {
        const s = String(row[c + i] || "").trim().toLowerCase()
        return s === mName.toLowerCase() || s === SHORT_MONTHS[i].toLowerCase()
      })
      if (ok) return { headerRow: r, descCol: c > 0 ? c - 1 : 0, monthCols: Array.from({ length: 12 }, (_, i) => c + i) }
    }
  }
  return null
}

function normDesc(s) {
  return String(s || "").toUpperCase().replace(/\s+/g, " ").trim()
}

async function main() {
  const files = fs
    .readdirSync(budgetDir)
    .filter((f) => f.toLowerCase().endsWith(".xlsx"))
    .sort((a, b) => a.localeCompare(b))

  const byDesc = new Map()

  for (const file of files) {
    const full = path.join(budgetDir, file)
    const buf = fs.readFileSync(full)
    const wb = XLSX.read(buf, { type: "buffer", bookVBA: true })
    const sheetName = wb.SheetNames[0]
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: "" })
    const header = findHeader(rows)
    if (!header) continue

    for (let i = header.headerRow + 1; i < rows.length; i++) {
      const row = rows[i] || []
      const description = String(row[header.descCol] ?? "").trim()
      if (!description) continue
      const key = normDesc(description)
      if (!key) continue

      const annual = header.monthCols.reduce((sum, c) => sum + n(row[c]), 0)
      if (annual === 0) continue

      byDesc.set(key, (byDesc.get(key) || 0) + annual)
    }
  }

  const get = (label) => byDesc.get(label) || 0
  const totalNetRevenue = get("TOTAL NET REVENUE")
  const totalExpenses = get("TOTAL EXPENSES")
  const overhead = get("TOTAL OVERHEAD ALLOCATIONS")

  console.log(`Files read: ${files.length}`)
  console.log(`TOTAL NET REVENUE: ${totalNetRevenue.toFixed(2)}`)
  console.log(`TOTAL EXPENSES: ${totalExpenses.toFixed(2)}`)
  console.log(`TOTAL OVERHEAD ALLOCATIONS: ${overhead.toFixed(2)}`)
  console.log(`TOTAL EXPENSES + OVERHEAD: ${(totalExpenses + overhead).toFixed(2)}`)

  const expenseLike = [...byDesc.entries()]
    .filter(([d]) => d.includes("EXPENSE") || d.includes("OVERHEAD"))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)

  console.log("\nTop expense-like lines:")
  expenseLike.forEach(([d, v], i) => {
    console.log(`${String(i + 1).padStart(2, "0")}. ${d}: ${v.toFixed(2)}`)
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

