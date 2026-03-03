/**
 * Seed branches from branchData/REGIONS (2).xlsx
 *
 * Sheet1:
 *   Row 1 = region names (columns)
 *   Row 2+ = branch numbers under each region column
 *
 * Sheet2:
 *   Col A = branch number (No)
 *   Col B = branch name
 *
 * Usage:
 *   node scripts/seed-branches-from-region-file.mjs
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"
import * as XLSX from "xlsx"

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

const workbookPath = path.join(rootDir, "branchData", "REGIONS (2).xlsx")
if (!fs.existsSync(workbookPath)) {
  console.error(`❌ File not found: ${workbookPath}`)
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

const normalize = (s) => String(s ?? "").trim().toUpperCase()

function parseBranchNo(value) {
  const raw = String(value ?? "").trim()
  if (!raw) return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  return Math.trunc(n)
}

async function main() {
  const workbookBuffer = fs.readFileSync(workbookPath)
  const wb = XLSX.read(workbookBuffer, { type: "buffer", bookVBA: true })
  const sheet1 = wb.Sheets["Sheet1"]
  const sheet2 = wb.Sheets["Sheet2"]
  if (!sheet1 || !sheet2) {
    console.error("❌ Expected Sheet1 and Sheet2 in workbook")
    process.exit(1)
  }

  const rows1 = XLSX.utils.sheet_to_json(sheet1, { header: 1, defval: "" })
  const rows2 = XLSX.utils.sheet_to_json(sheet2, { header: 1, defval: "" })
  if (!rows1.length || !rows2.length) {
    console.error("❌ Workbook sheets are empty")
    process.exit(1)
  }

  const { data: dbRegions, error: regionErr } = await supabase
    .from("regions")
    .select("id, name")
    .order("name")
  if (regionErr) {
    console.error("❌ Failed reading regions:", regionErr.message)
    process.exit(1)
  }
  const regionByName = new Map((dbRegions ?? []).map((r) => [normalize(r.name), r]))

  // Build branchNo -> branchName map from Sheet2 (skip header)
  const branchNameByNo = new Map()
  for (let i = 1; i < rows2.length; i++) {
    const no = parseBranchNo(rows2[i]?.[0])
    const name = String(rows2[i]?.[1] ?? "").trim()
    if (!no || !name) continue
    branchNameByNo.set(no, name)
  }

  const regionHeaders = (rows1[0] ?? []).map((h) => String(h ?? "").trim())
  const branchRows = rows1.slice(1)

  const records = []
  const seenCodes = new Set()

  for (let col = 0; col < regionHeaders.length; col++) {
    const regionName = regionHeaders[col]
    if (!regionName) continue
    const region = regionByName.get(normalize(regionName))
    if (!region) {
      console.error(`❌ Region in Sheet1 not found in DB: "${regionName}"`)
      process.exit(1)
    }

    for (let r = 0; r < branchRows.length; r++) {
      const no = parseBranchNo(branchRows[r]?.[col])
      if (!no) continue
      const branchName = branchNameByNo.get(no)
      if (!branchName) {
        console.error(`❌ Branch number ${no} exists in Sheet1 but not in Sheet2`)
        process.exit(1)
      }
      const code = String(no).padStart(3, "0")
      if (seenCodes.has(code)) continue
      seenCodes.add(code)
      records.push({
        name: `${no} ${branchName}`.trim(),
        code,
        region_id: region.id,
      })
    }
  }

  if (records.length !== 46) {
    console.error(`❌ Expected 46 branches from workbook, got ${records.length}`)
    process.exit(1)
  }

  const { error: upsertErr } = await supabase
    .from("branches")
    .upsert(records, { onConflict: "code" })
  if (upsertErr) {
    console.error("❌ Failed inserting branches:", upsertErr.message)
    process.exit(1)
  }

  const { count, error: countErr } = await supabase
    .from("branches")
    .select("id", { count: "exact", head: true })
  if (countErr) {
    console.error("❌ Failed counting branches:", countErr.message)
    process.exit(1)
  }

  console.log(`✓ Seeded ${records.length} branches from workbook`)
  console.log(`✓ Branches in DB now: ${count ?? 0}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
