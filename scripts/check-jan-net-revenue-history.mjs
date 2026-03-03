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

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const YEARS = [2023, 2024, 2025]
const MONTH = 1
const n = (v) => Number(v || 0)
const norm = (s) => String(s || "").toUpperCase().replace(/\s+/g, " ").trim()

async function totalForYear(year) {
  const pageSize = 1000
  let from = 0
  let total = 0
  while (true) {
    const { data, error } = await supabase
      .from("forecasts")
      .select("description, forecast_value")
      .eq("year", year)
      .eq("month", MONTH)
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

async function main() {
  for (const y of YEARS) {
    const total = await totalForYear(y)
    console.log(`January ${y} TOTAL NET REVENUE: ${total.toFixed(2)}`)
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})

