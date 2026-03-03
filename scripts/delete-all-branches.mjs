/**
 * Delete all branches from Supabase.
 * Keeps: regions, profiles.
 * Effects: clears related uploads/actuals/forecasts via cascade; sets profiles.branch_id to NULL.
 *
 * Prerequisites: .env with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * Usage: node scripts/delete-all-branches.mjs
 */

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
  const { count: beforeCount, error: beforeErr } = await supabase
    .from("branches")
    .select("id", { count: "exact", head: true })
  if (beforeErr) {
    console.error("❌ Could not count branches:", beforeErr.message)
    process.exit(1)
  }
  console.log(`Branches before delete: ${beforeCount ?? 0}`)

  const { error: delErr } = await supabase.from("branches").delete().neq("id", ZERO_UUID)
  if (delErr) {
    console.error("❌ Failed deleting branches:", delErr.message)
    process.exit(1)
  }

  const { count: afterCount, error: afterErr } = await supabase
    .from("branches")
    .select("id", { count: "exact", head: true })
  if (afterErr) {
    console.error("❌ Could not count branches after delete:", afterErr.message)
    process.exit(1)
  }
  console.log(`Branches after delete: ${afterCount ?? 0}`)
  console.log("Done.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
