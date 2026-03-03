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
const n = (v) => Number(v || 0)
const norm = (s) => String(s || "").toUpperCase().replace(/\s+/g, " ").trim()

async function main() {
  const pageSize = 1000
  let from = 0
  const rows = []
  while (true) {
    const { data, error } = await supabase
      .from("forecasts")
      .select("description, forecast_value, budget_value")
      .eq("year", 2026)
      .eq("month", 1)
      .range(from, from + pageSize - 1)
    if (error) throw error
    const batch = data || []
    rows.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }

  let allForecast = 0
  let allBudget = 0
  let revForecast = 0
  let revBudget = 0
  let expForecast = 0
  let expBudget = 0

  for (const r of rows) {
    const d = norm(r.description)
    const f = n(r.forecast_value)
    const b = n(r.budget_value)
    allForecast += f
    allBudget += b
    if (d === "TOTAL NET REVENUE") {
      revForecast += f
      revBudget += b
    }
    if (d === "TOTAL EXPENSES" || d === "TOTAL OVERHEAD ALLOCATIONS") {
      expForecast += f
      expBudget += b
    }
  }

  console.log(`January all-lines forecast: ${allForecast.toFixed(2)}`)
  console.log(`January all-lines budget:   ${allBudget.toFixed(2)}`)
  console.log(`January revenue forecast (TOTAL NET REVENUE): ${revForecast.toFixed(2)}`)
  console.log(`January revenue budget   (TOTAL NET REVENUE): ${revBudget.toFixed(2)}`)
  console.log(`January expense forecast (TOTAL EXPENSES + OVERHEAD): ${expForecast.toFixed(2)}`)
  console.log(`January expense budget   (TOTAL EXPENSES + OVERHEAD): ${expBudget.toFixed(2)}`)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})

