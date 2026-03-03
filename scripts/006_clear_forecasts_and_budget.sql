-- Clear all forecasting and budgeting data so you can upload per-branch afresh.
-- Keeps: regions, branches, profiles (users). Removes: forecasts, actuals, upload history.
--
-- Option A: Run in Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Option B: From project root with .env set: node scripts/clear-forecasts-and-budget.mjs
--
-- After clearing, import per branch: node scripts/import-branch-file.mjs --branch <name> --file <path>

-- 1. Remove all forecast/budget rows (branch × description × year × month)
DELETE FROM public.forecasts;

-- 2. Remove all actuals (historical data from uploads)
DELETE FROM public.actuals;

-- 3. Remove upload history so re-uploads are clean
DELETE FROM public.uploads;

-- Optional: show counts to confirm (should be 0)
-- SELECT 'forecasts' AS tbl, COUNT(*) FROM public.forecasts
-- UNION ALL SELECT 'actuals', COUNT(*) FROM public.actuals
-- UNION ALL SELECT 'uploads', COUNT(*) FROM public.uploads;
