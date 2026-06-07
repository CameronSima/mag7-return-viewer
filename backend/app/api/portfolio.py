"""GET /portfolio endpoint — weighted portfolio backtester.

Backtests a weighted, optionally-rebalanced portfolio over a date range and
compares it to a benchmark. The portfolio's value series is treated like a
price series, so it reuses the same growth/stats/correlation analytics as the
comparison engine. Kept thin — the simulation lives in app/services/analytics.py.
"""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import ValidationError

from app.config import MAX_CHART_POINTS, ROLLING_WINDOW, TRADING_DAYS_PER_YEAR
from app.dependencies import get_portfolio_cache, get_price_fetcher
from app.models import PortfolioQuery, PortfolioResponse, RebalanceFreq
from app.services.analytics import (
    compute_annual_returns,
    compute_benchmark_metrics,
    compute_comparison_stats,
    compute_correlation,
    compute_growth,
    compute_risk_contributions,
    compute_rolling_correlation,
    compute_rolling_volatility,
    describe_window,
    restrict_to_common_window,
    simulate_portfolio_value,
)
from app.services.cache import Cache
from app.services.prices import NoPriceDataError, PriceFetcher, PriceFetchError

router = APIRouter()

CachedPayload = dict[str, object]
CacheType = Cache[str, CachedPayload]

# The series key for the simulated portfolio (alongside the benchmark symbol).
PORTFOLIO_KEY = "Portfolio"


@router.get("/portfolio", response_model=PortfolioResponse)
def get_portfolio(
    tickers: Annotated[
        str, Query(description="Comma-separated holding symbols, e.g. AAPL,MSFT")
    ],
    start: Annotated[date, Query(description="Start date, inclusive (YYYY-MM-DD)")],
    end: Annotated[date, Query(description="End date, inclusive (YYYY-MM-DD)")],
    cache: Annotated[CacheType, Depends(get_portfolio_cache)],
    price_fetcher: Annotated[PriceFetcher, Depends(get_price_fetcher)],
    weights: Annotated[
        str, Query(description="Comma-separated weights, parallel to tickers")
    ] = "",
    rebalance: Annotated[
        RebalanceFreq, Query(description="Rebalance frequency")
    ] = "none",
    benchmark: Annotated[
        str, Query(description="Optional benchmark symbol, e.g. SPY")
    ] = "",
) -> CachedPayload:
    """Backtest a weighted portfolio and compare it to a benchmark.

    Response shape mirrors /compare (growth/stats/correlation keyed by
    "Portfolio" and the benchmark), plus a per-holding breakdown. Everything is
    computed over the common window of the holdings and benchmark.
    """
    try:
        query = PortfolioQuery.model_validate(
            {
                "tickers": tickers,
                "weights": weights,
                "rebalance": rebalance,
                "benchmark": benchmark,
                "start": start,
                "end": end,
            }
        )
    except ValidationError as exc:
        detail = "; ".join(e["msg"].removeprefix("Value error, ") for e in exc.errors())
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=detail,
        ) from exc

    # weights are normalized & paired with tickers by the model.
    weight_map = dict(zip(query.tickers, query.weights, strict=True))
    fetch_symbols = list(query.tickers)
    if query.benchmark and query.benchmark not in weight_map:
        fetch_symbols.append(query.benchmark)

    cache_key = _cache_key(query)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        prices = price_fetcher.fetch(tuple(fetch_symbols), start, end)
    except NoPriceDataError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="No trading data found for the selected range. "
            "Pick a range that includes trading days.",
        ) from exc
    except PriceFetchError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"upstream price data unavailable: {exc}",
        ) from exc

    aligned, missing = restrict_to_common_window(prices)

    # Benchmark may be missing even if holdings aren't; track separately.
    active_benchmark = (
        query.benchmark if query.benchmark in aligned.columns else None
    )
    present_holdings = [t for t in query.tickers if t in aligned.columns]
    if len(aligned) < 2 or not present_holdings:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="The selected holdings have no overlapping trading history in "
            "this range. Try a different range or set of holdings.",
        )

    # Renormalize weights across the holdings that actually have data.
    total_weight = sum(weight_map[t] for t in present_holdings)
    norm_weights = {t: weight_map[t] / total_weight for t in present_holdings}

    holding_prices = aligned[present_holdings]
    portfolio_value = simulate_portfolio_value(
        holding_prices, norm_weights, query.rebalance
    )
    risk = compute_risk_contributions(holding_prices, norm_weights)

    # Assemble a "price-like" frame: the portfolio value plus the benchmark, so
    # the existing growth/stats/correlation analytics apply unchanged.
    combined = holding_prices.iloc[:, :0].copy()  # empty frame, shared index
    combined[PORTFOLIO_KEY] = portfolio_value
    if active_benchmark is not None:
        combined[active_benchmark] = aligned[active_benchmark]

    holdings = [
        {
            "ticker": t,
            "weight": norm_weights[t],
            "risk_contribution": risk.get(t, 0.0),
            "total_return": float(
                holding_prices[t].iloc[-1] / holding_prices[t].iloc[0] - 1.0
            ),
        }
        for t in present_holdings
    ]

    # Rolling views run on the combined frame; "Portfolio" is its first column,
    # so the rolling correlation is benchmark-vs-portfolio.
    rolling_reference, rolling_corr = compute_rolling_correlation(
        combined, ROLLING_WINDOW, MAX_CHART_POINTS
    )
    payload: CachedPayload = {
        "growth": compute_growth(combined, MAX_CHART_POINTS),
        "stats": compute_comparison_stats(combined, TRADING_DAYS_PER_YEAR),
        "correlation": compute_correlation(combined),
        "rolling": {
            "window": ROLLING_WINDOW,
            "volatility": compute_rolling_volatility(
                combined, ROLLING_WINDOW, TRADING_DAYS_PER_YEAR, MAX_CHART_POINTS
            ),
            "correlation": rolling_corr,
            "reference": rolling_reference,
        },
        "window": describe_window(combined),
        "holdings": holdings,
        "annual": compute_annual_returns(combined),
        "benchmark": active_benchmark,
        "benchmark_metrics": (
            compute_benchmark_metrics(
                combined, PORTFOLIO_KEY, active_benchmark, TRADING_DAYS_PER_YEAR
            )
            if active_benchmark is not None
            else None
        ),
        "missing": missing,
    }
    cache.set(cache_key, payload)
    return payload


def _cache_key(query: PortfolioQuery) -> str:
    """Canonical cache key. Holdings are sorted (weights travel with them) so the
    key is order-independent; rebalance, benchmark, and range complete it."""
    holdings = ",".join(
        f"{t}:{w:.6f}"
        for t, w in sorted(zip(query.tickers, query.weights, strict=True))
    )
    bench = query.benchmark or "-"
    return f"{holdings}|{query.rebalance}|{bench}|{query.start}|{query.end}"
