import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, "..")
const envPath = path.join(rootDir, ".env")

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8")
  envContent.split("\n").forEach((line) => {
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
const upper = (s) => String(s || "").toUpperCase()

async function main() {
  const pageSize = 1000
  let from = 0
  const data = []
  while (true) {
    const { data: rows, error } = await supabase
      .from("forecasts")
      .select("description, month, budget_value")
      .eq("year", 2026)
      .range(from, from + pageSize - 1)
    if (error) {
      console.error(error.message)
      process.exit(1)
    }
    const batch = rows || []
    data.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }

  let month3All = 0
  let yearAll = 0
  let month3Revenue = 0
  let yearRevenue = 0
  let month3Expense = 0
  let yearExpense = 0
  const revenueByDescription = new Map()
  const expenseByDescription = new Map()

  for (const row of data || []) {
    const b = n(row.budget_value)
    yearAll += b
    if (row.month === 3) month3All += b
    if (upper(row.description).includes("REVENUE")) {
      yearRevenue += b
      if (row.month === 3) month3Revenue += b
      revenueByDescription.set(row.description, (revenueByDescription.get(row.description) || 0) + b)
    }
    if (upper(row.description).includes("EXPENSE") || upper(row.description).includes("COST")) {
      yearExpense += b
      if (row.month === 3) month3Expense += b
      expenseByDescription.set(row.description, (expenseByDescription.get(row.description) || 0) + b)
    }
  }

  console.log(`Rows: ${data.length}`)
  console.log(`March all lines: ${month3All.toFixed(2)}`)
  console.log(`Year all lines: ${yearAll.toFixed(2)}`)
  console.log(`March revenue-only: ${month3Revenue.toFixed(2)}`)
  console.log(`Year revenue-only: ${yearRevenue.toFixed(2)}`)
  console.log(`March expense/cost-only: ${month3Expense.toFixed(2)}`)
  console.log(`Year expense/cost-only: ${yearExpense.toFixed(2)}`)
  const topRevenue = [...revenueByDescription.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
  const topExpense = [...expenseByDescription.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
  console.log("\nTop revenue lines (annual):")
  topRevenue.forEach(([d, v], i) => {
    console.log(`${String(i + 1).padStart(2, "0")}. ${d}: ${v.toFixed(2)}`)
  })
  console.log("\nTop expense/cost lines (annual):")
  topExpense.forEach(([d, v], i) => {
    console.log(`${String(i + 1).padStart(2, "0")}. ${d}: ${v.toFixed(2)}`)
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

