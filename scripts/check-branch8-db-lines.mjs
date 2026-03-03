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

async function main() {
  const { data: branch } = await supabase.from("branches").select("id,code,name").eq("code", "008").single()
  if (!branch) {
    console.log("Branch 008 not found")
    return
  }
  const { data, error } = await supabase
    .from("forecasts")
    .select("description, month, budget_value")
    .eq("branch_id", branch.id)
    .eq("year", 2026)
  if (error) throw error
  const totals = new Map()
  for (const r of data || []) {
    const d = String(r.description || "")
    totals.set(d, (totals.get(d) || 0) + Number(r.budget_value || 0))
  }
  const rows = [...totals.entries()]
    .filter(([d]) => d.toUpperCase().includes("TOTAL NET") || d.toUpperCase().includes("TOTAL EXPENSE") || d.toUpperCase().includes("OVERHEAD"))
    .sort((a, b) => b[1] - a[1])
  console.log(`Branch: ${branch.code} ${branch.name}`)
  rows.forEach(([d, v]) => console.log(`${d}: ${v.toFixed(2)}`))
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})

