# Orkin – Branch Forecasting

Monthly forecasting app for **46 operational branches** across 7 regions, with role-based access: **HQ Admin**, **Region Admin**, and **Branch User**. Import branch-level Excel actuals/budget via scripts, generate forecasts per branch, and drill down by region.

## Tech stack

- **Next.js 16** (App Router), **React 19**, **TypeScript**
- **Supabase** (Auth, Postgres, RLS)
- **Tailwind CSS**, **shadcn/ui**, **Recharts**

## Quick start

1. **Clone and install**
   ```bash
   pnpm install
   ```
   After adding or changing dependencies in `package.json`, run `pnpm install` again and commit `pnpm-lock.yaml` so Vercel (and CI) can install with a frozen lockfile.

2. **Environment**
   - Copy `.env.example` to `.env`
   - Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from [Supabase](https://supabase.com/dashboard) → your project → Settings → API
   - For production, set `NEXT_PUBLIC_APP_URL` (e.g. `https://yourdomain.com`)

3. **Database**
   - In Supabase: SQL Editor → run the full contents of `scripts/001_create_schema.sql`
   - See **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** for step-by-step setup (auth redirect URLs, first HQ admin, etc.)

4. **Run**
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command      | Description                |
|-------------|----------------------------|
| `pnpm dev`  | Start dev server           |
| `pnpm build`| Production build           |
| `pnpm start`| Start production server    |
| `pnpm lint` | Run ESLint                 |
| `pnpm test` | Run unit tests (Vitest)     |
| `pnpm forecast:rebuild` | Rebuild 2026 forecasts (Seasonal naive + growth + working days + seasonal index) — reprobes all branches |

**Branch-by-branch import from Excel:** Use one file per branch and import with `node scripts/import-branch-file.mjs --branch <code|name> --file <path> --year <year>`. See **scripts/data/README.md**.

## Excel import format

- **Column A** = line item (Description)
- **Columns B–M** = Jan–Dec (numeric values)
- **Row 1** = header (skipped)

Use the documented spreadsheet layout in **[UPLOAD_FORMAT.md](./UPLOAD_FORMAT.md)**.

## Forecasting and dates

- Forecasts use historical actuals and budget data stored in Supabase.
- Production forecasting uses **Seasonal naive + growth + driver-based layer**: 2025 seasonal pattern with YoY growth from 2024→2025, plus working days and seasonal index (unbiased, no budget input). Uses 2023–2025 history.
- `budget_value` is kept separate from `forecast_value`; budget is for comparison only, not used in the forecast formula.
- **Current month** and **forecast year** can be set on the Forecast page; underlying logic uses the selected year/month for “as of” and remaining months.
- Server date is **UTC** for “current month” when not overridden.

## Docs

- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** – Supabase project, schema, auth redirects, roles
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** – Deploy to Vercel (env vars + Supabase redirect URLs)
- **[UPLOAD_FORMAT.md](./UPLOAD_FORMAT.md)** – Excel layout and tips for accurate forecasting
- **[TESTING_ROLES.md](./TESTING_ROLES.md)** – Test login and RLS for HQ Admin, Region Admin, Branch User

## License

Private.
