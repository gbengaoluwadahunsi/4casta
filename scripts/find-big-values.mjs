
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
    // Query 1: Big forecasts
    const { data: bigForecasts } = await supabase
        .from("forecasts")
        .select("branch_id, description, month, forecast_value, budget_value")
        .gt("forecast_value", 1000000000)
        .limit(20)

    console.log("=== Big Forecasts (> 1B) ===")
    console.table(bigForecasts)

    // Query 2: Big budgets
    const { data: bigBudgets } = await supabase
        .from("forecasts")
        .select("branch_id, description, month, forecast_value, budget_value")
        .gt("budget_value", 1000000000)
        .limit(20)

    console.log("\n=== Big Budgets (> 1B) ===")
    console.table(bigBudgets)
}

main().catch(console.error)
