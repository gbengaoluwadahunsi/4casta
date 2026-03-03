# Seed / import data

This folder holds Excel sources for seeding Supabase.

## Per-branch upload (recommended)

Upload **one Excel file per branch**. Each file should have a first sheet with the same layout as in **`BUDGET_STRUCTURE.md`**: a row with **Description** and **January**…**December** (or **budget month 1**…**12**), or a **Total** column (e.g. column O) after the month columns.

From the project root:

```bash
# One branch, one file (dry run first)
node scripts/import-branch-file.mjs --branch "25 WESTSIDE" --file path/to/branch-25.xlsx --dry-run
node scripts/import-branch-file.mjs --branch "25 WESTSIDE" --file path/to/branch-25.xlsx

# By branch code and optional year
node scripts/import-branch-file.mjs --branch 60 --file ./PEI-2026.xlsx --year 2026
```

- **`--branch`** – Branch name (e.g. `"25 WESTSIDE"`) or code (e.g. `60`, `025`).
- **`--file`** – Path to the Excel file for that branch (first sheet is used).
- **`--year`** – Year (default `2026`).
- **`--dry-run`** – Don’t write to the database.

After clearing data with `node scripts/clear-forecasts-and-budget.mjs`, run this once per branch with each branch’s file.

---

## Import actuals (three_years.xlsx)

To import `three_years.xlsx` into Supabase:

## 1. See how the file is structured

From the project root:

```bash
node scripts/import-actuals.mjs --inspect
```

This prints sheet names and the first rows so we can match sheets to branches and years.

## 2. Import (dry run, then real)

- **Sheet names** are matched to branch **name** (e.g. `25 WESTSIDE`) or **3-digit code** (e.g. `025`). TOC, Inputs, ORKIN CANADA, regional sheets (PACIFIC REGION, GVR REGION, etc.), and TTL PAC_GVR are skipped.
- **Layout:** The script auto-detects a row with **Description** and **January** … **December** (e.g. row 8). Data rows below that row are read. Year is taken from the sheet (e.g. "November 30, 2025") or use `--year 2025`.

```bash
# Dry run (no writes)
node scripts/import-actuals.mjs --dry-run

# Or if the whole file is one year:
node scripts/import-actuals.mjs --year 2024 --dry-run

# Real import (needs SUPABASE_SERVICE_ROLE_KEY in .env)
node scripts/import-actuals.mjs
```

## 3. .env

Add `SUPABASE_SERVICE_ROLE_KEY` to `.env` (Supabase → Settings → API → service_role). The script uses it to insert into `actuals` for all branches.
