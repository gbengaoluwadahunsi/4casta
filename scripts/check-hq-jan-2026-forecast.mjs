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

async function main() {
  const pageSize = 1000
  let from = 0
  let hqForecast = 0
  while (true) {
    const { data, error } = await supabase
      .from("forecasts")
      .select("forecast_value")
      .eq("year", 2026)
      .eq("month", 1)
      .range(from, from + pageSize - 1)
    if (error) throw error
    const rows = data || []
    for (const r of rows) hqForecast += n(r.forecast_value)
    if (rows.length < pageSize) break
    from += pageSize
  }
  console.log(`HQ January 2026 forecast (all lines): ${hqForecast.toFixed(2)}`)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})

