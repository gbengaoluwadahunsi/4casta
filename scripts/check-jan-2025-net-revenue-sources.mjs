import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import * as XLSX from "xlsx"
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

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const n = (v) => {
  if (v === undefined || v === null || v === "") return 0
  if (typeof v === "number" && Number.isFinite(v)) return v
  const x = Number(String(v).replace(/,/g, ""))
  return Number.isFinite(x) ? x : 0
}
const norm = (s) => String(s || "").toUpperCase().replace(/\s+/g, " ").trim()

async function dbJan2025TotalNetRevenue() {
  const pageSize = 1000
  let from = 0
  let total = 0
  while (true) {
    const { data, error } = await supabase
      .from("forecasts")
      .select("description, forecast_value")
      .eq("year", 2025)
      .eq("month", 1)
      .range(from, from + pageSize - 1)
    if (error) throw error
    const rows = data || []
    for (const r of rows) {
      if (norm(r.description) === "TOTAL NET REVENUE") total += n(r.forecast_value)
    }
    if (rows.length < pageSize) break
    from += pageSize
  }
  return total
}

function excelJan2025TotalNetRevenue() {
  const dir = path.join(rootDir, "branchData", "2025")
  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".xlsx"))
  let total = 0
  for (const f of files) {
    const wb = XLSX.read(fs.readFileSync(path.join(dir, f)), { type: "buffer", bookVBA: true })
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" })
    // Find the row containing TOTAL NET REVENUE and read Jan from col B (index 1)
    for (const row of rows) {
      if (norm(row[0]) === "TOTAL NET REVENUE") {
        total += n(row[1])
        break
      }
    }
  }
  return { total, fileCount: files.length }
}

async function main() {
  const dbTotal = await dbJan2025TotalNetRevenue()
  const ex = excelJan2025TotalNetRevenue()
  console.log(`DB Jan 2025 TOTAL NET REVENUE: ${dbTotal.toFixed(2)}`)
  console.log(`Excel Jan 2025 TOTAL NET REVENUE (${ex.fileCount} files): ${ex.total.toFixed(2)}`)
  console.log(`Gap (DB-Excel): ${(dbTotal - ex.total).toFixed(2)}`)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})

