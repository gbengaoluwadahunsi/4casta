
import { createClient } from "@supabase/supabase-js"
import fs from "fs"

// Simple one-line-at-a-time parser
const env = Object.fromEntries(
    fs.readFileSync(".env", "utf8")
        .split(/\r?\n/)
        .filter(line => line.includes("="))
        .map(line => {
            const [k, ...v] = line.split("=")
            return [k.trim(), v.join("=").trim()]
        })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function main() {
    const { data, error } = await supabase.from("forecasts").select("*", { count: "exact", head: true })
    if (error) {
        console.error("Error:", error)
    } else {
        console.log("Success! Total rows:", data, "(Wait, data is null for head:true)", "Count:", error ? "error" : "exists")
        // Let's actually fetch one row to prove it works
        const { data: row } = await supabase.from("forecasts").select("description").limit(1)
        console.log("One row:", row)
    }
}
main()
