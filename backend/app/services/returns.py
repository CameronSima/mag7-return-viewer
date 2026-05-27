"""Returns computation.

Pure functions operating on a price DataFrame. No I/O, no caching, no
framework dependencies — trivially unit-testable.
"""

from datetime import date
from typing import TypedDict

import pandas as pd

# Wire format for a single return observation. `return` is a Python keyword,
# so the key must be declared via functional TypedDict syntax to match the
# JSON contract (and the frontend's ReturnPoint type) exactly.
ReturnPointDict = TypedDict("ReturnPointDict", {"date": str, "return": float})


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
    # fill_method=None: do not forward-fill across missing prices. A gap should
    # yield NaN returns (later dropped), not a fabricated 0% then a jump. This
    # is the pandas 3.x default, but pinning it keeps behavior identical on the
    # pandas>=2.2 floor, where the default still pads and emits a FutureWarning.
    returns = prices.pct_change(fill_method=None)
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
            {"date": _format_date(idx), "return": float(value)} for idx, value in series.items()
        ]
    return output


def _format_date(value: object) -> str:
    """Coerce a pandas index value into ISO date string."""
    if isinstance(value, date):
        return value.isoformat()
    return str(pd.Timestamp(value).date().isoformat())


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


def downsample_series(
    points: list[ReturnPointDict], max_points: int
) -> list[ReturnPointDict]:
    """Thin a return series to at most `max_points` for charting, via LTTB.

    Largest-Triangle-Three-Buckets keeps the points that best preserve the
    visual shape of the line (including spikes), rather than naive every-Nth
    decimation which can drop the days that matter. The first and last points
    are always kept; the x-coordinate is the point's index (trading days are
    ordered, so index spacing is what the chart shows).

    This only affects the *rendered* series. Summary stats are computed on the
    full daily series upstream, so min/max/mean remain exact regardless.
    """
    n = len(points)
    if max_points < 3 or n <= max_points:
        return points

    sampled: list[ReturnPointDict] = [points[0]]
    # Size of each interior bucket (first and last points sit outside buckets).
    bucket = (n - 2) / (max_points - 2)
    anchor = 0  # index of the last selected point

    for i in range(max_points - 2):
        # Average the *next* bucket to form the triangle's far vertex.
        next_start = int((i + 1) * bucket) + 1
        next_end = min(int((i + 2) * bucket) + 1, n)
        next_len = next_end - next_start
        avg_x = sum(range(next_start, next_end)) / next_len
        avg_y = sum(points[j]["return"] for j in range(next_start, next_end)) / next_len

        # Pick the point in the current bucket that maximizes triangle area
        # with the anchor and the next-bucket average.
        cur_start = int(i * bucket) + 1
        cur_end = int((i + 1) * bucket) + 1
        anchor_y = points[anchor]["return"]
        best_area = -1.0
        best = cur_start
        for j in range(cur_start, cur_end):
            area = abs(
                (anchor - avg_x) * (points[j]["return"] - anchor_y)
                - (anchor - j) * (avg_y - anchor_y)
            )
            if area > best_area:
                best_area = area
                best = j
        sampled.append(points[best])
        anchor = best

    sampled.append(points[n - 1])
    return sampled
