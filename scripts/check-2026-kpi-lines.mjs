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
const YEAR = 2026

const n = (v) => Number(v || 0)
const norm = (s) => String(s || "").toUpperCase().replace(/\s+/g, " ").trim()

async function main() {
  const pageSize = 1000
  let from = 0
  const rows = []
  while (true) {
    const { data, error } = await supabase
      .from("forecasts")
      .select("description, month, budget_value")
      .eq("year", YEAR)
      .range(from, from + pageSize - 1)
    if (error) throw error
    const batch = data || []
    rows.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }

  const byDesc = new Map()
  for (const r of rows) {
    const d = norm(r.description)
    byDesc.set(d, (byDesc.get(d) || 0) + n(r.budget_value))
  }

  const get = (label) => byDesc.get(label) || 0
  const revenue = get("TOTAL NET REVENUE")
  const grossProfit = get("GROSS PROFIT")
  const operatingExpense =
    get("TOTAL OPERATING EXPENSE") ||
    get("TOTAL OPERATING EXPENSES") ||
    get("TOTAL EXPENSE") ||
    get("TOTAL EXPENSES")
  const netIncome =
    get("NET INCOME") ||
    get("NET OPERATING INCOME") ||
    get("NET PROFIT")

  console.log(`TOTAL NET REVENUE: ${revenue.toFixed(2)}`)
  console.log(`GROSS PROFIT: ${grossProfit.toFixed(2)}`)
  console.log(`TOTAL OPERATING EXPENSE(S): ${operatingExpense.toFixed(2)}`)
  console.log(`NET INCOME / NET OPERATING INCOME: ${netIncome.toFixed(2)}`)

  const top = [...byDesc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)
  console.log("\nTop 20 budget lines by annual total:")
  top.forEach(([d, v], i) => console.log(`${String(i + 1).padStart(2, "0")}. ${d}: ${v.toFixed(2)}`))
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})

