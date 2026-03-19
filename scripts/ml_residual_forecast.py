#!/usr/bin/env python3
"""
ML Residual Layer: Train LightGBM on (Actual - Deterministic) residual.
Final forecast = Deterministic + ML_residual_prediction.

Uses 2023-2025 history. Deterministic = Seasonal naive + growth.
Features: lag_1, lag_12, month, branch_idx, desc_hash, working_days, acquisition_flag, branch_age_months.

Prerequisites:
  1. Run forecast:rebuild first (creates deterministic 2026 forecasts)
  2. pip install -r requirements-ml.txt

Usage:
  pnpm forecast:rebuild:ml   (rebuild + ML residual)
  pnpm forecast:ml-residual  (ML residual only, after rebuild)

Requires: .env with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
"""

import os
import sys
import json
from pathlib import Path

# Load .env
root = Path(__file__).resolve().parent.parent
env_path = root / ".env"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            k, v = k.strip(), v.strip()
            if v.startswith('"') and v.endswith('"'): v = v[1:-1]
            elif v.startswith("'") and v.endswith("'"): v = v[1:-1]
            os.environ[k] = v

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not url or not key:
    print("❌ Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env", file=sys.stderr)
    sys.exit(1)

# Load branch metadata (acquisition dates) and working days
DATA_DIR = root / "scripts" / "data"
BRANCH_META = {}
WORKING_DAYS = {}
if (DATA_DIR / "branch_metadata.json").exists():
    BRANCH_META = json.loads((DATA_DIR / "branch_metadata.json").read_text())
if (DATA_DIR / "working_days.json").exists():
    WORKING_DAYS = json.loads((DATA_DIR / "working_days.json").read_text())


def _norm_code(c):
    s = str(c or "").strip()
    return s.zfill(3) if s.isdigit() else s


def _acquisition_months(branch_code, year, month):
    """Months since acquisition at (year, month). Returns 999 if not acquired."""
    for k, v in BRANCH_META.items():
        if k.startswith("_"):
            continue
        if _norm_code(k) == _norm_code(branch_code):
            d = v.get("acquisition_date") or ""
            if not d or len(d) < 7:
                return 999
            parts = d.split("-")
            acq_y, acq_m = int(parts[0]), int(parts[1]) if len(parts) > 1 else 1
            return max(0, (year - acq_y) * 12 + (month - acq_m))
    return 999


def _acquisition_flag(branch_code):
    for k in BRANCH_META:
        if k.startswith("_"):
            continue
        if _norm_code(k) == _norm_code(branch_code):
            return 1
    return 0


import pandas as pd
import lightgbm as lgb
from supabase import create_client

MONTHS = list(range(1, 13))
HIST_YEARS = [2023, 2024, 2025]
TARGET_YEAR = 2026
# DECIMAL(15,2) max = 9,999,999,999,999.99
MAX_FORECAST = 9999999999999.99


def fetch_all(client, table, select, filters=None):
    page = 1000
    offset = 0
    rows = []
    while True:
        q = client.table(table).select(select)
        for k, v in (filters or {}).items():
            if isinstance(v, list):
                q = q.in_(k, v)
            else:
                q = q.eq(k, v)
        resp = q.range(offset, offset + page - 1).execute()
        chunk = getattr(resp, "data", None) or []
        rows.extend(chunk)
        if len(chunk) < page:
            break
        offset += page
    return rows


def deterministic_forecast(hist_by_month, target_year):
    """Seasonal naive + growth. hist_by_month = {2023: [12 vals], 2024: [12 vals], 2025: [12 vals]}."""
    last = hist_by_month.get(2025) or hist_by_month.get(2024)
    prior = hist_by_month.get(2024) or hist_by_month.get(2023)
    if not last:
        return [0.0] * 12
    last = [float(x) for x in last]
    prior = [float(x) for x in prior] if prior else last
    last_sum = sum(last)
    prior_sum = sum(prior) or 1e-9
    growth = last_sum / prior_sum - 1
    return [max(0, last[m - 1] * (1 + growth)) for m in MONTHS]


def main():
    print("Connecting to Supabase...")
    supabase = create_client(url, key)

    print("Fetching branches...")
    branches = fetch_all(supabase, "branches", "id,code,name,region_id")
    branch_df = pd.DataFrame(branches)
    branch_to_region = dict(zip(branch_df["id"], branch_df["region_id"].fillna("")))
    branch_to_idx = {b: i for i, b in enumerate(branch_df["id"])}
    branch_to_code = dict(zip(branch_df["id"], branch_df["code"].astype(str)))

    print("Fetching forecasts (2023, 2024, 2025, 2026)...")
    forecasts = fetch_all(
        supabase, "forecasts",
        "branch_id,description,year,month,forecast_value,budget_value,last_month_value,last_year_value",
        {"year": [2023, 2024, 2025, 2026]}
    )
    df = pd.DataFrame(forecasts)
    if df.empty:
        print("❌ No forecast data found.", file=sys.stderr)
        sys.exit(1)

    # Try actuals if available (more accurate for residual)
    print("Fetching actuals (2023, 2024, 2025)...")
    actuals = fetch_all(
        supabase, "actuals",
        "branch_id,description,year,month,value",
        {"year": [2023, 2024, 2025]}
    )
    use_actuals = len(actuals) > 1000
    if use_actuals:
        act_df = pd.DataFrame(actuals)
        act_df = act_df.rename(columns={"value": "actual"})
    else:
        print("  (Few actuals; using forecasts.forecast_value as history)")

    # Build training data: residual = actual - deterministic (for 2025)
    print("Building training data...")
    train_records = []
    pred_records = []
    by_key = df.groupby(["branch_id", "description"])

    for (branch_id, desc), grp in by_key:
        hist = {}
        for _, r in grp.iterrows():
            y, m = int(r["year"]), int(r["month"])
            v = float(r["forecast_value"] or 0)
            if y not in hist:
                hist[y] = [0.0] * 12
            hist[y][m - 1] = max(hist[y][m - 1], v)

        det_2025 = deterministic_forecast(hist, 2025)
        det_2026 = deterministic_forecast(hist, 2026)
        vals_2025 = hist.get(2025, [0.0] * 12)
        vals_2024 = hist.get(2024, [0.0] * 12)
        vals_2023 = hist.get(2023, [0.0] * 12)

        for m in MONTHS:
            actual_2025 = vals_2025[m - 1]
            if use_actuals:
                match = act_df[(act_df["branch_id"] == branch_id) & (act_df["description"] == desc) & (act_df["year"] == 2025) & (act_df["month"] == m)]
                if not match.empty:
                    actual_2025 = float(match.iloc[0]["actual"])
            residual_2025 = actual_2025 - det_2025[m - 1]

            prev_m = 12 if m == 1 else m - 1
            lag_1 = vals_2025[prev_m - 1] if vals_2025 else vals_2024[m - 1]
            lag_12 = vals_2024[m - 1] if vals_2024 else (vals_2023[m - 1] if vals_2023 else vals_2025[m - 1])

            code = branch_to_code.get(branch_id, "")
            _wd = globals().get("WORKING_DAYS", {}) or {}
            wd_train = _wd.get("2025", {}).get(str(m), 21)
            wd_pred = _wd.get("2026", {}).get(str(m), 21)
            feats = {
                "lag_1": lag_1,
                "lag_12": lag_12,
                "month": m,
                "branch_idx": branch_to_idx.get(branch_id, 0),
                "desc_hash": hash(desc) % 10000,
                "working_days": wd_train,
                "acquisition_flag": _acquisition_flag(code),
                "branch_age_months": _acquisition_months(code, 2025, m),
            }
            train_records.append({"residual": residual_2025, **feats, "branch_id": branch_id, "description": desc, "det_2026": det_2026[m - 1]})
            pred_feats = {**feats, "working_days": wd_pred, "branch_age_months": _acquisition_months(code, 2026, m)}
            pred_records.append({**pred_feats, "branch_id": branch_id, "description": desc, "det_2026": det_2026[m - 1]})

    train_df = pd.DataFrame(train_records)
    pred_df = pd.DataFrame(pred_records)

    if train_df["residual"].abs().sum() < 1:
        print("⚠️ Residuals near zero; skipping ML. Run forecast:rebuild only.")
        return

    feature_cols = ["lag_1", "lag_12", "month", "branch_idx", "desc_hash", "working_days", "acquisition_flag", "branch_age_months"]
    X_train = train_df[feature_cols]
    y_train = train_df["residual"]

    print("Training LightGBM...")
    model = lgb.LGBMRegressor(n_estimators=100, max_depth=5, learning_rate=0.1, verbose=-1)
    model.fit(X_train, y_train)

    X_pred = pred_df[feature_cols]
    pred_df["residual_pred"] = model.predict(X_pred)
    pred_df["final_forecast"] = (pred_df["det_2026"] + pred_df["residual_pred"]).clip(lower=0)

    # Fetch existing 2026 to preserve budget_value, last_month_value, last_year_value
    f2026 = df[df["year"] == TARGET_YEAR].copy()
    for c in ["budget_value", "last_month_value", "last_year_value"]:
        if c not in f2026.columns:
            f2026[c] = 0
    f2026 = f2026[["branch_id", "description", "month", "budget_value", "last_month_value", "last_year_value"]].drop_duplicates(subset=["branch_id", "description", "month"])
    by_existing = f2026.set_index(["branch_id", "description", "month"])

    print("Updating 2026 forecasts with ML residual...")
    full_upserts = []
    for _, r in pred_df.iterrows():
        row_key = (r["branch_id"], r["description"], int(r["month"]))
        try:
            row = by_existing.loc[row_key]
            budget = float(row["budget_value"]) if pd.notna(row.get("budget_value")) else 0
            last_m = float(row["last_month_value"]) if pd.notna(row.get("last_month_value")) else 0
            last_y = float(row["last_year_value"]) if pd.notna(row.get("last_year_value")) else 0
        except (KeyError, TypeError):
            budget = last_m = last_y = 0
        fv = max(0, min(MAX_FORECAST, round(float(r["final_forecast"]), 2)))
        full_upserts.append({
            "branch_id": r["branch_id"],
            "description": r["description"],
            "year": TARGET_YEAR,
            "month": int(r["month"]),
            "forecast_value": fv,
            "budget_value": round(budget, 2),
            "last_month_value": round(last_m, 2),
            "last_year_value": round(last_y, 2),
        })

    for i in range(0, len(full_upserts), 500):
        batch = full_upserts[i : i + 500]
        supabase.table("forecasts").upsert(batch, on_conflict="branch_id,description,year,month").execute()

    print(f"✓ Updated {len(full_upserts)} rows with Deterministic + ML residual")
    print("Done.")


if __name__ == "__main__":
    main()
