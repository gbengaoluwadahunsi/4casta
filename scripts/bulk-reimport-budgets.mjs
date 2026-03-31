
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"
import { execSync } from "child_process"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, "..")

async function main() {
    const budgetDir = path.join(rootDir, "branchData", "2026Budget")
    if (!fs.existsSync(budgetDir)) {
        console.error("Budget directory not found")
        return
    }

    const files = fs.readdirSync(budgetDir).filter(f => f.endsWith(".xlsx"))
    console.log(`Found ${files.length} branch files. Starting bulk re-import (budget-only mode)...\n`)

    for (const file of files) {
        const branchCode = file.replace(".xlsx", "")
        const filePath = path.join("branchData", "2026Budget", file)

        console.log(`Importing ${branchCode} from ${file}...`)
        try {
            // We use --budget-only to preserve existing forecast_value (the model output)
            const cmd = `node scripts/import-branch-file.mjs --branch ${branchCode} --file ${filePath} --budget-only`
            execSync(cmd, { stdio: "inherit" })
        } catch (err) {
            console.error(`❌ Error importing ${branchCode}:`, err.message)
        }
    }

    console.log("\nFinished bulk import.")
}

main().catch(console.error)
