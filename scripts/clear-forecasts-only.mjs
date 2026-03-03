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
const ZERO = "00000000-0000-0000-0000-000000000000"

async function main() {
  const { count: before } = await supabase.from("forecasts").select("id", { count: "exact", head: true })
  const { error } = await supabase.from("forecasts").delete().neq("id", ZERO)
  if (error) throw error
  const { count: after } = await supabase.from("forecasts").select("id", { count: "exact", head: true })
  console.log(`Forecast rows before: ${before ?? 0}`)
  console.log(`Forecast rows after: ${after ?? 0}`)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})

