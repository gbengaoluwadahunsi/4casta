/**
 * Clear all forecasting and budgeting data in Supabase.
 * Keeps: regions, branches, profiles. Removes: forecasts, actuals, uploads.
 * Run from project root: pnpm run clear-forecasts  (or node clear-forecasts-and-budget.mjs)
 * Prerequisites: .env with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = __dirname

const envPath = path.join(rootDir, ".env")
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8")
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith("#")) {
      const eq = trimmed.indexOf("=")
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim()
        let value = trimmed.slice(eq + 1).trim()
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        process.env[key] = value
      }
    }
  })
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error("❌ Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
  process.exit(1)
}

const supabase = createClient(url, serviceKey)
const ZERO_UUID = "00000000-0000-0000-0000-000000000000"

async function main() {
  console.log("Clearing forecasts, actuals, and uploads...\n")

  const { error: errF } = await supabase.from("forecasts").delete().neq("id", ZERO_UUID)
  if (errF) {
    console.error("❌ forecasts:", errF.message)
    process.exit(1)
  }
  console.log("  ✓ forecasts: all rows removed")

  const { error: errA } = await supabase.from("actuals").delete().neq("id", ZERO_UUID)
  if (errA) {
    console.error("❌ actuals:", errA.message)
    process.exit(1)
  }
  console.log("  ✓ actuals: all rows removed")

  const { error: errU } = await supabase.from("uploads").delete().neq("id", ZERO_UUID)
  if (errU) {
    console.error("❌ uploads:", errU.message)
    process.exit(1)
  }
  console.log("  ✓ uploads: all rows removed")

  console.log("\nDone. Upload per-branch data with: pnpm run import-branch (or node scripts/import-branch-file.mjs --branch <name> --file <path>)")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
