
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
        if (t && !t.startsWith("#") && t.includes("=")) {
            const eq = t.indexOf("=")
            const key = t.slice(0, eq).trim()
            let value = t.slice(eq + 1).trim()
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1)
            }
            process.env[key] = value
        }
    })
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(url, key)

async function main() {
    const branchCode = "001"
    const { data: branch } = await supabase.from("branches").select("id").eq("code", branchCode).single()

    if (!branch) {
        console.error("Branch not found")
        return
    }

    const { data: rows } = await supabase
        .from("forecasts")
        .select("description, month, forecast_value, budget_value")
        .eq("branch_id", branch.id)
        .eq("year", 2026)
        .eq("month", 6)
        .ilike("description", "TOTAL%")

    console.log(`Rows for branch ${branchCode}, June 2026:`)
    console.table(rows)
}

main().catch(console.error)
