
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, "..")

// Robust .env loader
function loadEnv() {
    const envPath = path.join(rootDir, ".env")
    const content = fs.readFileSync(envPath, "utf8")
    const lines = content.split("\n")
    let currentKey = null
    let currentValue = ""

    for (const line of lines) {
        if (line.includes("=") && !line.startsWith(" ")) {
            if (currentKey) process.env[currentKey] = currentValue.trim()
            const [key, ...rest] = line.split("=")
            currentKey = key.trim()
            currentValue = rest.join("=")
        } else if (currentKey) {
            currentValue += "\n" + line
        }
    }
    if (currentKey) process.env[currentKey] = currentValue.trim()
}

loadEnv()

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function main() {
    console.log("Checking for huge forecasts manually (ROBUST ENV)...")

    let from = 0
    const pageSize = 5000
    let anomalies = []

    while (true) {
        const { data: rows, error } = await supabase
            .from("forecasts")
            .select("branch_id, description, year, month, forecast_value, budget_value")
            .range(from, from + pageSize - 1)

        if (error) {
            console.error("\nError fetch:", error)
            break
        }
        if (!rows || rows.length === 0) break

        for (const r of rows) {
            if (Math.abs(Number(r.forecast_value)) > 100000000000) { // 100B
                anomalies.push(r)
            }
        }

        process.stdout.write(`.${rows.length}`)
        if (rows.length < pageSize) break
        from += pageSize
    }

    console.log(`\n\nFound ${anomalies.length} anomalies > 100B:`)
    console.table(anomalies)
}

main().catch(console.error)
