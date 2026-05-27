"""GET /returns endpoint.

Orchestrates the cache, price fetcher, and returns computation. Kept thin
on purpose — the interesting logic lives in app/services/*.
"""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.models import DateRangeQuery, ReturnsResponse
from app.services.cache import Cache
from app.services.prices import PriceFetcher, PriceFetchError
from app.services.returns import (
    ReturnPointDict,
    compute_daily_returns,
    compute_summary_stats,
    to_response_dict,
)
from app.config import MAG7_TICKERS
from app.dependencies import get_cache, get_price_fetcher

router = APIRouter()

# Cache value shape: the full computed response, ready to return.
CachedPayload = dict[str, object]
CacheType = Cache[tuple[str, str], CachedPayload]


@router.get("/returns", response_model=ReturnsResponse)
def get_returns(
    start: Annotated[date, Query(description="Start date, inclusive (YYYY-MM-DD)")],
    end: Annotated[date, Query(description="End date, inclusive (YYYY-MM-DD)")],
    cache: Annotated[CacheType, Depends(get_cache)],
    price_fetcher: Annotated[PriceFetcher, Depends(get_price_fetcher)],
) -> CachedPayload:
    """Return daily returns and summary stats for the MAG7 over a date range.

    Response shape:
        {
            "returns": {"MSFT": [{"date": "...", "return": 0.004}, ...], ...},
            "stats":   {"MSFT": {"min": ..., "max": ..., "mean": ...}, ...}
        }

    Results are cached in-memory keyed by (start, end) for CACHE_TTL_SECONDS.
    """
    # Validate the date range using the same model that documents the rules.
    try:
        DateRangeQuery(start=start, end=end)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    cache_key = (start.isoformat(), end.isoformat())
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        prices = price_fetcher.fetch(MAG7_TICKERS, start, end)
    except PriceFetchError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"upstream price data unavailable: {exc}",
        ) from exc

    returns_frame = compute_daily_returns(prices)
    payload: CachedPayload = {
        "returns": to_response_dict(returns_frame),
        "stats": compute_summary_stats(returns_frame),
    }
    cache.set(cache_key, payload)
    return payload
