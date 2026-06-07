"""GET /compare endpoint — the ticker comparison engine.

Accepts an arbitrary set of tickers and returns the data behind the comparison
view: normalized growth curves, per-ticker risk/return stats, and a correlation
matrix, all over the tickers' common window. Kept thin on purpose — the analytics
live in app/services/analytics.py.
"""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import ValidationError

from app.config import MAX_CHART_POINTS, ROLLING_WINDOW, TRADING_DAYS_PER_YEAR
from app.dependencies import get_compare_cache, get_price_fetcher
from app.models import CompareQuery, CompareResponse
from app.services.analytics import (
    compute_comparison_stats,
    compute_correlation,
    compute_growth,
    compute_rolling_correlation,
    compute_rolling_volatility,
    describe_window,
    restrict_to_common_window,
)
from app.services.cache import Cache
from app.services.prices import NoPriceDataError, PriceFetcher, PriceFetchError

router = APIRouter()

# Cache value shape: the full computed response, ready to return.
CachedPayload = dict[str, object]
# Key: (sorted_tickers_csv, start, end).
CacheType = Cache[tuple[str, str, str], CachedPayload]


@router.get("/compare", response_model=CompareResponse)
def get_compare(
    tickers: Annotated[
        str, Query(description="Comma-separated ticker symbols, e.g. AAPL,MSFT,SPY")
    ],
    start: Annotated[date, Query(description="Start date, inclusive (YYYY-MM-DD)")],
    end: Annotated[date, Query(description="End date, inclusive (YYYY-MM-DD)")],
    cache: Annotated[CacheType, Depends(get_compare_cache)],
    price_fetcher: Annotated[PriceFetcher, Depends(get_price_fetcher)],
) -> CachedPayload:
    """Compare a set of tickers over a date range.

    Response shape:
        {
            "growth":      {"AAPL": [{"date": "...", "value": 1.23}, ...], ...},
            "stats":       {"AAPL": {"totalReturn": ..., "cagr": ..., ...}, ...},
            "correlation": {"tickers": [...], "matrix": [[...], ...]},
            "window":      {"start": "...", "end": "...", "tradingDays": 1253},
            "missing":     ["XYZ"]
        }

    All series share a common window (the overlap of the tickers' histories) so
    the growth curves, correlations, and annualized stats are comparable.
    Cached in-memory keyed by (tickers, start, end) for CACHE_TTL_SECONDS.
    """
    try:
        # model_validate (not the kwargs constructor) so the `tickers` string is
        # routed through the before-validator that parses/normalizes it — the
        # declared field type is list[str].
        query = CompareQuery.model_validate(
            {"tickers": tickers, "start": start, "end": end}
        )
    except ValidationError as exc:
        detail = "; ".join(e["msg"].removeprefix("Value error, ") for e in exc.errors())
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=detail,
        ) from exc

    # Sort the ticker set for the cache key so AAPL,MSFT and MSFT,AAPL share an
    # entry; the growth/stats dicts are keyed by ticker so order doesn't matter.
    cache_key = (",".join(sorted(query.tickers)), start.isoformat(), end.isoformat())
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        prices = price_fetcher.fetch(tuple(query.tickers), start, end)
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

    # Need at least two common observations to draw a curve or compute a return.
    # If the requested tickers' histories don't overlap (e.g. one delisted
    # before another's IPO), that's a user-fixable input issue, not an outage.
    if len(aligned) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="The selected tickers have no overlapping trading history in "
            "this range. Try a different range or ticker set.",
        )

    rolling_reference, rolling_corr = compute_rolling_correlation(
        aligned, ROLLING_WINDOW, MAX_CHART_POINTS
    )
    payload: CachedPayload = {
        "growth": compute_growth(aligned, MAX_CHART_POINTS),
        "stats": compute_comparison_stats(aligned, TRADING_DAYS_PER_YEAR),
        "correlation": compute_correlation(aligned),
        "rolling": {
            "window": ROLLING_WINDOW,
            "volatility": compute_rolling_volatility(
                aligned, ROLLING_WINDOW, TRADING_DAYS_PER_YEAR, MAX_CHART_POINTS
            ),
            "correlation": rolling_corr,
            "reference": rolling_reference,
        },
        "window": describe_window(aligned),
        "missing": missing,
    }
    cache.set(cache_key, payload)
    return payload
