
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import * as XLSX from "xlsx"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, "..")

const branchFile = process.argv[2] || "1"
const filePath = path.join(rootDir, "branchData", "2026Budget", `${branchFile}.xlsx`)

const buf = fs.readFileSync(filePath)
const workbook = XLSX.read(buf, { type: "buffer" })
const sheet = workbook.Sheets[workbook.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })

const findRow = (desc) => {
    const r = rows.find(row => String(row[0] || "").toUpperCase().trim() === desc)
    return r ? r.slice(0, 15) : null
}

const rev = findRow("TOTAL NET REVENUE")
const exp = findRow("TOTAL EXPENSES")
const oh = findRow("TOTAL OVERHEAD ALLOCATIONS")
const net = findRow("BRANCH CONTRIBUTION")

console.log("NET REVENUE (Row 62):", JSON.stringify(rev))
console.log("TOTAL EXPENSES (Row 229):", JSON.stringify(exp))
console.log("OVERHEAD (Row 249):", JSON.stringify(oh))
console.log("BRANCH CONTRIBUTION:", JSON.stringify(net))

if (rev && exp && oh && net) {
    const juneRev = rev[6]
    const juneExp = exp[6]
    const juneOH = oh[6]
    const juneNet = net[6]

    console.log("\nJune Verification:")
    console.log(`Revenue: ${juneRev}`)
    console.log(`Expenses: ${juneExp}`)
    console.log(`Overhead: ${juneOH}`)
    console.log(`Branch Contribution: ${juneNet}`)

    const calcContribution = juneRev - juneExp - juneOH
    console.log(`Calculated Contribution (Rev - Exp - OH): ${calcContribution}`)
}
