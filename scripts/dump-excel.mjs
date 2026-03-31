/**
 * Dump the raw content of a single branch Excel file from branchData/2026Budget/
 * to verify what the correct budget values should be.
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import * as XLSX from "xlsx"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, "..")

const branchFile = process.argv[2] || "8"
const filePath = path.join(rootDir, "branchData", "2026Budget", `${branchFile}.xlsx`)

if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath)
    process.exit(1)
}

const buf = fs.readFileSync(filePath)
const workbook = XLSX.read(buf, { type: "buffer" })
console.log("Sheets:", workbook.SheetNames)

const sheet = workbook.Sheets[workbook.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })

console.log(`\nTotal rows: ${rows.length}\n`)

// Print first 10 rows to see headers
console.log("=== FIRST 10 ROWS ===")
for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const row = rows[r] || []
    console.log(`Row ${r}: ${JSON.stringify(row.slice(0, 16))}`)
}

// Find "TOTAL EXPENSES" and "TOTAL OVERHEAD ALLOCATIONS"
console.log("\n=== SEARCHING FOR TOTALS ===")
for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || []
    for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] || "").toUpperCase().trim()
        if (cell.includes("CONTRIBUTION")) {
            console.log(`\nRow ${r}, Col ${c}: "${cell}"`)
            console.log(`  Values: ${JSON.stringify(row.slice(0, 16))}`)
        }
    }
}
