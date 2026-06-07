"""FastAPI dependency providers.

Single source of truth for service instances. Tests override these via
`app.dependency_overrides` to inject fakes.

Cache backend selection: when ``REDIS_URL`` is set the caches are backed by a
shared Redis instance (so every uvicorn worker/replica sees the same entries);
otherwise they fall back to per-process in-memory TTL caches. The endpoint code
is unaffected — both back the same ``Cache`` Protocol.
"""

from functools import lru_cache

from redis import Redis

from app.config import REDIS_URL
from app.services.cache import Cache, InMemoryTTLCache, RedisTTLCache
from app.services.prices import PriceFetcher, YFinancePriceFetcher


@lru_cache(maxsize=1)
def get_redis_client() -> Redis | None:
    """Process-wide Redis client (connection pool), or None when unconfigured."""
    if REDIS_URL is None:
        return None
    return Redis.from_url(REDIS_URL, decode_responses=True)


def _make_cache(namespace: str) -> Cache[object, dict[str, object]]:
    """Build a cache for ``namespace``: Redis-backed if configured, else memory."""
    client = get_redis_client()
    if client is None:
        return InMemoryTTLCache()
    return RedisTTLCache(client, namespace=namespace)


@lru_cache(maxsize=1)
def get_cache() -> Cache[tuple[str, str], dict[str, object]]:
    """Singleton cache for the /returns endpoint, keyed by (start, end)."""
    return _make_cache("returns")


@lru_cache(maxsize=1)
def get_compare_cache() -> Cache[tuple[str, str, str], dict[str, object]]:
    """Singleton cache for the /compare endpoint.

    Separate from get_cache because its keys carry the ticker set
    (sorted_tickers, start, end), a different shape from the /returns key.
    """
    return _make_cache("compare")


@lru_cache(maxsize=1)
def get_portfolio_cache() -> Cache[str, dict[str, object]]:
    """Singleton cache for the /portfolio endpoint, keyed by a canonical string
    of the holdings, weights, rebalance frequency, benchmark, and date range."""
    return _make_cache("portfolio")


@lru_cache(maxsize=1)
def get_price_fetcher() -> PriceFetcher:
    """Singleton price fetcher. Stateless, but no reason to construct repeatedly."""
    return YFinancePriceFetcher()
