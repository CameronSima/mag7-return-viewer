"""TTL cache abstraction.

Wraps cachetools.TTLCache behind a minimal Protocol so the cache backend
can be swapped (e.g., for Redis) without touching call sites.
"""

from typing import Generic, Protocol, TypeVar

from cachetools import TTLCache

from app.config import CACHE_MAX_SIZE, CACHE_TTL_SECONDS

K = TypeVar("K")
V = TypeVar("V")
# Keys are only ever consumed (lookup/insert arguments), never returned, so the
# protocol's key parameter is contravariant. Values are both returned (get) and
# consumed (set), so V stays invariant.
K_contra = TypeVar("K_contra", contravariant=True)


class Cache(Protocol[K_contra, V]):
    """Minimal cache interface. Implementations may be in-memory or remote."""

    def get(self, key: K_contra) -> V | None: ...
    def set(self, key: K_contra, value: V) -> None: ...
    def clear(self) -> None: ...


class InMemoryTTLCache(Generic[K, V]):
    """In-memory TTL cache backed by cachetools."""

    def __init__(
        self,
        maxsize: int = CACHE_MAX_SIZE,
        ttl_seconds: int = CACHE_TTL_SECONDS,
    ) -> None:
        self._cache: TTLCache[K, V] = TTLCache(maxsize=maxsize, ttl=ttl_seconds)

    def get(self, key: K) -> V | None:
        return self._cache.get(key)

    def set(self, key: K, value: V) -> None:
        self._cache[key] = value

    def clear(self) -> None:
        self._cache.clear()
