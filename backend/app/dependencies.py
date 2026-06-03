"""FastAPI dependency providers.

Single source of truth for service instances. Tests override these via
`app.dependency_overrides` to inject fakes.
"""

from functools import lru_cache

from app.services.cache import Cache, InMemoryTTLCache
from app.services.prices import PriceFetcher, YFinancePriceFetcher


@lru_cache(maxsize=1)
def get_cache() -> Cache[tuple[str, str, tuple[str, ...]], dict[str, object]]:
    """Singleton cache for the lifetime of the process."""
    return InMemoryTTLCache()


@lru_cache(maxsize=1)
def get_price_fetcher() -> PriceFetcher:
    """Singleton price fetcher. Stateless, but no reason to construct repeatedly."""
    return YFinancePriceFetcher()
