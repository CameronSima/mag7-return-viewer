"""Returns computation.

Pure functions operating on a price DataFrame. No I/O, no caching, no
framework dependencies — trivially unit-testable.
"""

from datetime import date
from typing import TypedDict

import pandas as pd


class ReturnPointDict(TypedDict):
    """Wire format for a single return observation."""

    date: str
    return_: float


def compute_daily_returns(prices: pd.DataFrame) -> pd.DataFrame:
    """Compute simple daily percentage returns from a price frame.

    Simple (arithmetic) returns are used rather than log returns because:
      1. The assignment specifies "daily % returns".
      2. Simple returns are additive across instruments at a point in time
         (what PMs see in attribution reporting).

    The first row is NaN by construction (no prior price); it is dropped
    so the response contains only valid observations.
    """
    if prices.empty:
        return prices
    returns = prices.pct_change()
    return returns.iloc[1:]  # drop first NaN row


def to_response_dict(returns: pd.DataFrame) -> dict[str, list[ReturnPointDict]]:
    """Convert a returns DataFrame into the JSON-serializable response shape.

    Output shape:
        {
            "MSFT": [{"date": "2024-01-02", "return": 0.004}, ...],
            ...
        }

    NaN values (e.g., from missing prices on a ticker) are filtered out
    per-ticker so each series contains only well-defined observations.
    """
    output: dict[str, list[ReturnPointDict]] = {}
    for ticker in returns.columns:
        series = returns[ticker].dropna()
        output[ticker] = [
            {"date": _format_date(idx), "return_": float(value)} for idx, value in series.items()
        ]
    return output


def _format_date(value: object) -> str:
    """Coerce a pandas index value into ISO date string."""
    if isinstance(value, date):
        return value.isoformat()
    return pd.Timestamp(value).date().isoformat()


def compute_summary_stats(returns: pd.DataFrame) -> dict[str, dict[str, float]]:
    """Per-ticker summary statistics: min, max, mean.

    Returned shape:
        {"MSFT": {"min": -0.05, "max": 0.04, "mean": 0.001}, ...}

    Computed on the backend so the frontend doesn't have to re-derive,
    and so the same numbers appear in the summary table and per-card stats.
    """
    stats: dict[str, dict[str, float]] = {}
    for ticker in returns.columns:
        series = returns[ticker].dropna()
        if series.empty:
            stats[ticker] = {"min": 0.0, "max": 0.0, "mean": 0.0}
            continue
        stats[ticker] = {
            "min": float(series.min()),
            "max": float(series.max()),
            "mean": float(series.mean()),
        }
    return stats
