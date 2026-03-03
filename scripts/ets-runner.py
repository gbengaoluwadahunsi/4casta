"""
ETS (Holt-Winters) forecast runner. Chosen by 2025 backtest as best model.
Reads JSON from stdin, outputs 12 predictions as JSON to stdout.

Model: ExponentialSmoothing additive trend + additive seasonal (seasonal_periods=12).
Input: {"points": [[year, month, value], ...]}  # 36 points for 2023-2025
Output: {"predictions": [v1, ..., v12]}  # Jan-Dec 2026
"""

import json
import sys
from typing import List

import numpy as np
from statsmodels.tsa.holtwinters import ExponentialSmoothing

MONTHS = list(range(1, 13))
MAX_VAL = 99_999_999.99


def n(v) -> float:
    try:
        return float(v or 0)
    except Exception:
        return 0.0


def try_ets(points: List[List]) -> List[float]:
    series = np.array([n(p[2]) for p in points], dtype=float)
    if int(np.count_nonzero(series)) < 18:
        raise ValueError("Insufficient non-zero history")
    model = ExponentialSmoothing(
        series,
        trend="add",
        seasonal="add",
        seasonal_periods=12,
        initialization_method="estimated",
    )
    fit = model.fit(optimized=True)
    preds = np.asarray(fit.forecast(12), dtype=float)
    out = []
    for v in preds:
        if not np.isfinite(v) or v < 0:
            raise ValueError("ETS produced invalid value")
        out.append(min(MAX_VAL, float(v)))
    return out


def fallback_avg(points: List[List]) -> List[float]:
    by_month = {m: [] for m in MONTHS}
    for p in points:
        by_month[int(p[1])].append(n(p[2]))
    out = []
    for m in MONTHS:
        v = max(0.0, sum(by_month[m]) / len(by_month[m])) if by_month[m] else 0.0
        out.append(min(MAX_VAL, v))
    return out


def main():
    lines = sys.stdin.read().strip().split("\n")
    if not lines:
        return
    tasks = json.loads(lines[0]) if len(lines) == 1 else [json.loads(ln) for ln in lines if ln]
    if isinstance(tasks, dict):
        tasks = [tasks]
    out = []
    for t in tasks:
        pts = t.get("points") or []
        try:
            preds = try_ets(pts)
        except Exception:
            preds = fallback_avg(pts)
        out.append({"predictions": preds})
    print(json.dumps(out))


if __name__ == "__main__":
    main()
