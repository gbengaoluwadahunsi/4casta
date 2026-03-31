import { createClient } from "@supabase/supabase-js"
import fs from "fs"

const env = Object.fromEntries(
    fs.readFileSync(".env", "utf8")
        .split(/\r?\n/)
        .filter(l => l.includes("="))
        .map(l => [l.split("=")[0].trim(), l.split("=").slice(1).join("=").trim()])
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function main() {
    // Get all descriptions for any branch with data for 2026
    const pageSize = 1000
    let from = 0
    const allDescs = new Set()

    while (true) {
        const { data, error } = await supabase
            .from("forecasts")
            .select("description")
            .eq("year", 2026)
            .range(from, from + pageSize - 1)

        if (error) { console.error(error); break }
        if (!data || data.length === 0) break
        data.forEach(r => allDescs.add(r.description))
        if (data.length < pageSize) break
        from += pageSize
    }

    const sorted = [...allDescs].sort()
    console.log(`Found ${sorted.length} unique descriptions for 2026:`)
    sorted.forEach((d, i) => console.log(`${String(i + 1).padStart(3)}. ${d}`))
}

main().catch(console.error)
