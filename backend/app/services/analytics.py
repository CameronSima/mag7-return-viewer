"""Comparison analytics.

Pure functions that turn a price DataFrame into the data behind the
ticker-comparison view: normalized growth curves, per-ticker risk/return
statistics, and a correlation matrix. Like ``returns.py``, these are pure
(no I/O, no framework) so they're trivially unit-testable.

The central modeling decision is the **common window**. When several tickers
have different histories (a 2021 IPO vs. an index going back decades), every
series is restricted to the dates they *all* share. Three reasons:

  1. Growth curves can be rebased to a common start (every line begins at
     1.0 on the same date), so the chart compares like with like.
  2. Correlation is only defined on aligned observations.
  3. CAGR / volatility / Sharpe over a window are comparable only if the
     window is the same for every ticker.

The cost is that the youngest ticker constrains the window; the effective
range is reported back so the UI can surface it.
"""

from datetime import date
from math import sqrt
from typing import TypedDict

import numpy as np
import pandas as pd
from tsdownsample import LTTBDownsampler


class GrowthPointDict(TypedDict):
    """One point on a normalized growth curve. ``value`` is the growth of $1
    invested at the common start date (1.0 on day one)."""

    date: str
    value: float


class CompareStatsDict(TypedDict):
    """Per-ticker risk/return statistics over the common window.

    All fractions, not percentages (0.18 == +18%). Annualized figures use the
    standard 252-trading-day convention; Sharpe assumes a risk-free rate of 0.
    """

    total_return: float
    cagr: float
    annual_vol: float
    sharpe: float
    max_drawdown: float
    best: float
    worst: float
    count: int


class CorrelationDict(TypedDict):
    """Daily-return correlation matrix. ``matrix[i][j]`` is corr(tickers[i],
    tickers[j]); the diagonal is 1.0 and the matrix is symmetric."""

    tickers: list[str]
    matrix: list[list[float]]


class WindowDict(TypedDict):
    """The effective comparison window — the overlap of the requested tickers'
    histories. ``start``/``end`` are None only when there is no overlap."""

    start: str | None
    end: str | None
    trading_days: int


class AnnualReturnDict(TypedDict):
    """Calendar-year return for each series. ``returns`` is keyed by series name
    (e.g. "Portfolio", "SPY"); ``partial`` flags the first/last year when the
    window doesn't span the whole calendar year."""

    year: int
    partial: bool
    returns: dict[str, float]


def restrict_to_common_window(prices: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """Align a price frame to the window every present ticker shares.

    Returns ``(aligned_prices, missing)`` where:
      - ``missing`` lists tickers the upstream returned no data for (an entirely
        NaN column). They're reported, not fatal — the rest still compare.
      - ``aligned_prices`` keeps only the present tickers and only the dates on
        which *all* of them have a price (the overlap of their histories), so
        every column shares an identical index.
    """
    missing = [str(t) for t in prices.columns if prices[t].dropna().empty]
    present = [t for t in prices.columns if t not in set(missing)]
    if not present:
        return prices.iloc[0:0], missing
    aligned = prices[present].dropna()
    return aligned, missing


def describe_window(aligned_prices: pd.DataFrame) -> WindowDict:
    """Report the common window's bounds and trading-day count."""
    if aligned_prices.empty:
        return {"start": None, "end": None, "trading_days": 0}
    return {
        "start": _format_date(aligned_prices.index[0]),
        "end": _format_date(aligned_prices.index[-1]),
        "trading_days": int(len(aligned_prices)),
    }


def compute_growth(
    aligned_prices: pd.DataFrame, max_points: int
) -> dict[str, list[GrowthPointDict]]:
    """Growth of $1 invested at the common start: ``price_t / price_0``.

    Every series starts at exactly 1.0 on the first common date, so the lines
    are directly comparable. Long ranges are thinned with LTTB (same technique
    as the returns chart) to keep the payload small while preserving shape.
    """
    if aligned_prices.empty:
        return {}
    normalized = aligned_prices / aligned_prices.iloc[0]
    out: dict[str, list[GrowthPointDict]] = {}
    for ticker in normalized.columns:
        series = normalized[ticker]
        points: list[GrowthPointDict] = [
            {"date": _format_date(idx), "value": float(value)}
            for idx, value in series.items()
        ]
        out[str(ticker)] = _downsample_growth(points, max_points)
    return out


def compute_comparison_stats(
    aligned_prices: pd.DataFrame, trading_days_per_year: int
) -> dict[str, CompareStatsDict]:
    """Per-ticker total return, CAGR, annualized volatility, Sharpe, max
    drawdown, best/worst day, and the trading-day count — over the common
    window so the figures are comparable across tickers."""
    stats: dict[str, CompareStatsDict] = {}
    if aligned_prices.empty:
        return stats

    daily = aligned_prices.pct_change(fill_method=None).iloc[1:]
    for ticker in aligned_prices.columns:
        prices = aligned_prices[ticker]
        returns = daily[ticker].dropna()
        stats[str(ticker)] = _stats_for_series(prices, returns, trading_days_per_year)
    return stats


def simulate_portfolio_value(
    prices: pd.DataFrame,
    weights: dict[str, float],
    rebalance: str,
) -> pd.Series:
    """Backtest a weighted portfolio's value over an aligned price frame.

    Returns a value Series indexed like ``prices``, starting at exactly 1.0 on
    the first date (so it composes with ``compute_growth`` like a price series).
    Each holding starts at its target weight and then drifts with its own daily
    return; on a rebalance boundary the holdings are reset to target weights
    against the current total — modeling a periodic rebalance back to the
    policy mix. ``rebalance="none"`` is buy-and-hold (weights drift forever).
    """
    if prices.empty:
        return pd.Series(dtype=float)

    tickers = list(prices.columns)
    target = np.array([weights[str(t)] for t in tickers], dtype=float)
    # Daily simple returns; the first row is NaN (no prior price) -> 0 so day one
    # is the 1.0 baseline. Holdings are NaN-free (aligned), so fillna only hits row 0.
    returns = prices.pct_change(fill_method=None).fillna(0.0).to_numpy()
    rebal = _rebalance_mask(prices.index, rebalance)

    n = len(prices)
    values = np.empty(n, dtype=float)
    holding = target.copy()  # per-holding value; portfolio total starts at 1.0
    values[0] = float(holding.sum())
    for i in range(1, n):
        holding = holding * (1.0 + returns[i])
        total = float(holding.sum())
        values[i] = total
        if rebal[i]:
            holding = target * total
    return pd.Series(values, index=prices.index)


def _rebalance_mask(index: pd.Index, rebalance: str) -> np.ndarray:
    """Boolean mask marking the first trading day of each new period as a
    rebalance day (never the first day — it's already at target weights)."""
    n = len(index)
    if rebalance == "none" or n == 0:
        return np.zeros(n, dtype=bool)
    freq = {"monthly": "M", "quarterly": "Q", "annually": "Y"}[rebalance]
    periods = pd.DatetimeIndex(index).to_period(freq)
    mask = np.zeros(n, dtype=bool)
    mask[1:] = periods[1:] != periods[:-1]
    return mask


def compute_annual_returns(aligned_prices: pd.DataFrame) -> list[AnnualReturnDict]:
    """Calendar-year returns for each (price-like) series in the frame.

    Each year's return chains from the prior year-end — the year's last value
    over the previous year's last value, minus 1 — so the figures compound back
    to the total return. The first year's base is the window's first observation
    (it spans window-start → that year-end) and the last year runs to the
    window-end; both are flagged ``partial`` when the window doesn't cover the
    whole calendar year, so a stub first/last year isn't mistaken for a full one.
    """
    if aligned_prices.empty:
        return []

    dti = pd.DatetimeIndex(aligned_prices.index)
    years = dti.year.to_numpy()
    unique_years = sorted({int(y) for y in years})

    # The last row of each calendar year is the year-end mark we chain from.
    last_of_year = {y: aligned_prices[years == y].iloc[-1] for y in unique_years}

    # A year is "partial" when the window starts/ends well inside it (>1 week of
    # the calendar year is missing). Only the first and last year can be partial.
    first_partial = int(dti[0].dayofyear) > 7
    last_ts = dti[-1]
    last_partial = (pd.Timestamp(int(last_ts.year), 12, 31) - last_ts).days > 7

    rows: list[AnnualReturnDict] = []
    for i, year in enumerate(unique_years):
        base = aligned_prices.iloc[0] if i == 0 else last_of_year[unique_years[i - 1]]
        ratio = last_of_year[year] / base - 1.0
        partial = (i == 0 and first_partial) or (
            i == len(unique_years) - 1 and last_partial
        )
        rows.append(
            {
                "year": year,
                "partial": partial,
                "returns": {
                    str(col): _finite(float(ratio[col]))
                    for col in aligned_prices.columns
                },
            }
        )
    return rows


def compute_correlation(aligned_prices: pd.DataFrame) -> CorrelationDict:
    """Pairwise daily-return correlation across the common window."""
    if aligned_prices.empty:
        return {"tickers": [], "matrix": []}
    daily = aligned_prices.pct_change(fill_method=None).iloc[1:]
    tickers = [str(t) for t in daily.columns]
    corr = daily.corr()
    matrix = [
        [_finite(float(corr.iloc[i, j])) for j in range(len(tickers))]
        for i in range(len(tickers))
    ]
    return {"tickers": tickers, "matrix": matrix}


# --- internals ---------------------------------------------------------------


def _stats_for_series(
    prices: pd.Series, returns: pd.Series, trading_days_per_year: int
) -> CompareStatsDict:
    """Compute the stat bundle for one ticker. Degenerate windows (a single
    common day, a zero-variance series) yield zeros rather than NaN/inf."""
    n = int(returns.size)
    if n == 0 or prices.empty:
        return {
            "total_return": 0.0,
            "cagr": 0.0,
            "annual_vol": 0.0,
            "sharpe": 0.0,
            "max_drawdown": 0.0,
            "best": 0.0,
            "worst": 0.0,
            "count": n,
        }

    total_return = float(prices.iloc[-1] / prices.iloc[0] - 1.0)
    # Window length in years from trading-day steps, consistent with the 252
    # convention used to annualize volatility below.
    years = n / trading_days_per_year
    if years > 0 and total_return > -1.0:
        cagr = float((1.0 + total_return) ** (1.0 / years) - 1.0)
    else:
        cagr = 0.0

    std = float(returns.std())  # sample std (ddof=1), pandas default
    annual_vol = std * sqrt(trading_days_per_year) if std > 0 else 0.0
    sharpe = (float(returns.mean()) / std) * sqrt(trading_days_per_year) if std > 0 else 0.0

    return {
        "total_return": total_return,
        "cagr": cagr,
        "annual_vol": annual_vol,
        "sharpe": sharpe,
        "max_drawdown": _max_drawdown(prices),
        "best": float(returns.max()),
        "worst": float(returns.min()),
        "count": n,
    }


def _max_drawdown(prices: pd.Series) -> float:
    """Largest peak-to-trough decline as a (non-positive) fraction.

    For each point, drawdown is price / running-peak - 1; the max drawdown is
    the most negative such value over the window. 0.0 if the series only rose.
    """
    if prices.empty:
        return 0.0
    running_peak = prices.cummax()
    drawdown = prices / running_peak - 1.0
    return float(min(drawdown.min(), 0.0))


def _downsample_growth(
    points: list[GrowthPointDict], max_points: int
) -> list[GrowthPointDict]:
    """Thin a growth series to at most ``max_points`` via LTTB, preserving the
    visual shape (and the first/last points). Mirrors returns.downsample_series
    but over the ``value`` field."""
    n = len(points)
    if max_points < 3 or n <= max_points:
        return points
    values = np.fromiter((p["value"] for p in points), dtype=float, count=n)
    indices = LTTBDownsampler().downsample(values, n_out=max_points)
    return [points[int(i)] for i in indices]


def _finite(value: float) -> float:
    """Coerce NaN/inf (e.g. correlation of a constant series) to 0.0 so the
    JSON payload is always valid and the frontend never sees NaN."""
    return value if np.isfinite(value) else 0.0


def _format_date(value: object) -> str:
    """Coerce a pandas index value into an ISO date string."""
    if isinstance(value, date):
        return value.isoformat()
    return str(pd.Timestamp(value).date().isoformat())
