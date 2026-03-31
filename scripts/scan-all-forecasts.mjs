
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, "..")
const envPath = path.join(rootDir, ".env")

const env = fs.readFileSync(envPath, "utf8")
env.split("\n").forEach(line => {
    const [key, value] = line.split("=")
    if (key && value) process.env[key.trim()] = value.trim()
})

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function main() {
    console.log("Checking for huge forecasts manually...")

    let from = 0
    const pageSize = 5000
    let anomalies = []

    while (true) {
        const { data: rows, error } = await supabase
            .from("forecasts")
            .select("branch_id, description, year, month, forecast_value, budget_value")
            .range(from, from + pageSize - 1)

        if (error) {
            console.error("\nError fetching rows:", error.message)
            break
        }
        if (!rows || rows.length === 0) break

        for (const r of rows) {
            if (Math.abs(r.forecast_value) > 100000000) { // 100M
                anomalies.push(r)
            }
        }

        process.stdout.write(".")
        if (rows.length < pageSize) break
        from += pageSize
    }

    console.log(`\n\nFound ${anomalies.length} anomalies > 100M:`)
    console.table(anomalies)
}

main().catch(console.error)
