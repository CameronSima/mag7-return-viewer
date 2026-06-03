"""GET /returns endpoint.

Orchestrates the cache, price fetcher, and returns computation. Kept thin
on purpose — the interesting logic lives in app/services/*.
"""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import ValidationError

from app.config import MAG7_TICKER_SET, MAG7_TICKERS, MAX_CHART_POINTS
from app.dependencies import get_cache, get_price_fetcher
from app.models import DateRangeQuery, ReturnsResponse
from app.services.cache import Cache
from app.services.prices import NoPriceDataError, PriceFetcher, PriceFetchError
from app.services.returns import (
    compute_daily_returns,
    compute_summary_stats,
    downsample_series,
    to_response_dict,
)

router = APIRouter()

# Cache value shape: the full computed response, ready to return.
CachedPayload = dict[str, object]
# Cache key is (start, end, selected-tickers). The ticker set is part of the
# key — omitting it would serve a 2-ticker response to a later 7-ticker request
# for the same dates. The tuple is canonicalized (sorted, deduped) before use so
# requests that differ only in ticker order still share a cache entry.
CacheType = Cache[tuple[str, str, tuple[str, ...]], CachedPayload]


def _resolve_tickers(raw: list[str] | None) -> tuple[str, ...]:
    """Normalize and validate a caller-supplied ticker subset.

    Returns the full MAG7 set when none are requested. Otherwise upper-cases,
    dedupes (preserving request order), and rejects any symbol outside the
    MAG7 whitelist with a 422 — we only fetch names this tool knows about.
    """
    if not raw:
        return MAG7_TICKERS
    resolved: list[str] = []
    for symbol in raw:
        normalized = symbol.strip().upper()
        if not normalized:
            continue
        if normalized not in MAG7_TICKER_SET:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"unknown ticker '{symbol}'; choose from {', '.join(MAG7_TICKERS)}",
            )
        if normalized not in resolved:
            resolved.append(normalized)
    return tuple(resolved) if resolved else MAG7_TICKERS


@router.get("/returns", response_model=ReturnsResponse)
def get_returns(
    start: Annotated[date, Query(description="Start date, inclusive (YYYY-MM-DD)")],
    end: Annotated[date, Query(description="End date, inclusive (YYYY-MM-DD)")],
    cache: Annotated[CacheType, Depends(get_cache)],
    price_fetcher: Annotated[PriceFetcher, Depends(get_price_fetcher)],
    tickers: Annotated[
        list[str] | None,
        Query(description="Subset of MAG7 tickers; defaults to all seven"),
    ] = None,
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
    except ValidationError as exc:
        # Surface a clean, human-readable message. str(ValidationError) is a
        # multi-line dump (type tags, input repr, a docs URL) that would
        # otherwise reach the UI verbatim via the error response.
        detail = "; ".join(e["msg"].removeprefix("Value error, ") for e in exc.errors())
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=detail,
        ) from exc

    selected = _resolve_tickers(tickers)
    # Sorted tuple so the key is order-independent: {MSFT, AAPL} and
    # {AAPL, MSFT} hit the same entry.
    cache_key = (start.isoformat(), end.isoformat(), tuple(sorted(selected)))
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        prices = price_fetcher.fetch(selected, start, end)
    except NoPriceDataError as exc:
        # Valid request, but the range has no trading data (e.g. a weekend,
        # a future range, or dates before any ticker existed). This is a user
        # input issue, not an upstream failure — 422, no point retrying.
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

    returns_frame = compute_daily_returns(prices)
    # Stats are computed on the full daily series; only the charted series is
    # thinned, so min/max/mean stay exact even when downsampling kicks in.
    series = {
        ticker: downsample_series(points, MAX_CHART_POINTS)
        for ticker, points in to_response_dict(returns_frame).items()
    }
    payload: CachedPayload = {
        "returns": series,
        "stats": compute_summary_stats(returns_frame),
    }
    cache.set(cache_key, payload)
    return payload
