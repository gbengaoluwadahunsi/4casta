# 2026 Orkin Canada Budget – File Structure & Categories

Reference for the **2026 Orkin Canada Budget.xlsm** file used by `import-branch-file.mjs`.

## Complete Guide: Extracting Branch Data

This section describes how to extract financial data **per branch** from the budget file. Each branch has its own worksheet with a standardized layout.

### File structure (109 worksheets)

| Type | Count | Examples | Import? |
|------|-------|----------|---------|
| Table of Contents | 1 | TOC | No |
| Inputs | 1 | Inputs (control parameters) | No |
| Company total | 1 | ORKIN CANADA | No |
| Regional consolidation | 7 | PACIFIC REGION, GVR REGION, PRAIRIE REGION, ONTARIO REGION, GTA REGION, QUEBEC REGION, ATLANTIC REGION, TTL PAC_GVR | No |
| **Individual branch sheets** | **70+** | 25 WESTSIDE, 26 BC INT C, 60 PEI, 1 TOR W, … | **Yes** (matched to DB branches) |
| Overhead/functional | 30+ | 42 PAC OH, 942 PAC CC, 442 PAC QA, 642 PAC SALES, 49 GVR OH, … | No |

**Extraction rule:** Only worksheets whose name matches an **operational branch** in the app (by code or name) are imported. All other sheets (TOC, Inputs, ORKIN CANADA, regional totals, overhead departments) are skipped.

## File & layout

- **Format:** Excel Macro-Enabled Workbook (.xlsm)
- **Sheets:** 109 worksheets (see table above)
- **Fiscal year:** 2026 (January–December)
- **Import:** One sheet per operational branch; sheet name matches branch code/name (e.g. `25 WESTSIDE`, `60 PEI`). Region/total/overhead sheets are skipped.

## Hierarchy in the file

1. **ORKIN CANADA** – company total
2. **Regions** – Pacific, GVR, Prairie, Ontario, GTA, Quebec, Atlantic
3. **Branches** – 70+ operating branches (we import ~49 operational branch sheets)
4. **Overhead/functional** – QA, Sales, Call Centers, Corporate, IT, HR, Marketing (skipped for branch import)

## Revenue categories (examples)

- **Pest control:** Commercial Revenue, Commercial Bed Bug, Fly Control, Orkin/Aire, Feminine Hygiene, Drain Maintenance
- **Alternate:** Residential Contract, Valu Plus Commercial, Seasonal & Other
- **Misc:** Bed Bug (Res/Comm), Special Services, Product Sales, Fumigation
- **Termite:** Termite Treating, Pretreat, Inspection Fees

## Expense categories (examples)

- **Payroll:** Division/Region/Branch Manager, QA, Office, Sales, Technicians, Vac/Holiday/Sick, Incentives
- **Direct costs:** Materials, vehicles, uniforms, safety
- **Fixed:** Rent, depreciation, insurance, taxes
- **Controllable:** Office supplies, printing, travel, telephone, professional services, postage, bank charges
- **Overhead allocations:** Sales/QA/AR, Data Processing, Accounting, Marketing, Fleet, IT, HR, Corporate
- **Other:** Home Office, acquisition, Ultipro, royalty, interest, Canadian taxes

## Per-sheet layout (branch sheets)

- **Row 0:** `Period`, `""`, `budget month 1` … `budget month 12` (or row 8: `GL`, `""`, `January` … `December`)
- **Description column:** Column B (index 1)
- **Month values:** Columns C–N (indices 2–13) = Jan–Dec
- **Column O:** Budget total (annual total per line item). Header may be "Total", "YTD", "Budget", etc. When present, the import uses this for `budget_value` (stored as total÷12 per month so the yearly sum matches the file).
- **Another column (e.g. P):** Total expense per line item when present. Used for reporting in `--total-only`.
- **Data rows:** GL code in column A, description in B, 12 monthly values in C–N, total in O, expense in another column when applicable.

## Geographic coverage (in file)

- **BC:** Vancouver, Victoria, Kelowna, Interior
- **Alberta:** Calgary N/S, Edmonton N/S
- **Saskatchewan / Manitoba:** Saskatoon, Regina, Winnipeg
- **Ontario:** Toronto, Ottawa, London, Windsor, Barrie, Cambridge, Hamilton, Niagara, Sudbury, North Bay
- **Quebec:** Montreal, Quebec City, Ottawa (QC)
- **Atlantic:** NS, NB, PEI, NL

## Purpose

- Monthly planning and forecasting
- Performance vs budget
- Regional and branch P&L
- Cost center and management reporting
- Consolidation (branch → region → company)

The import script maps each **branch** sheet to a branch in the DB and upserts rows into `forecasts` (year 2026, `budget_value` and `forecast_value`) so the app can show budget and forecast by branch/region/summary.

## Total budget: two definitions

- **Sum of all line items (revenue + expenses)**  
  The import sums every numeric cell across branch sheets (12 months × all categories). This gives a large total (on the order of billions) because it includes revenue and all expense categories (payroll, materials, rent, etc.).

- **Company-quoted “total budget” (e.g. ~$253M)**  
  The company may quote a single “total budget” figure (e.g. **$253,003,000**) that refers to **total revenue** or a summary from the **ORKIN CANADA** sheet, not the sum of every GL line. Budget is imported per branch via `node scripts/import-branch-file.mjs`.
