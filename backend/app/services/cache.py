"""TTL cache abstraction.

Wraps cachetools.TTLCache behind a minimal Protocol so the cache backend
can be swapped (e.g., for Redis) without touching call sites. A Redis-backed
implementation lives alongside the in-memory one for production deployments
where the cache must be shared across worker processes/replicas.
"""

import json
from typing import TYPE_CHECKING, Generic, Protocol, TypeVar

from cachetools import TTLCache

from app.config import CACHE_MAX_SIZE, CACHE_TTL_SECONDS

if TYPE_CHECKING:
    from redis import Redis

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


class RedisTTLCache(Generic[K, V]):
    """TTL cache backed by Redis, for shared caching across processes/replicas.

    Values must be JSON-serializable (the endpoint payloads already are — plain
    dicts of lists/numbers/strings). Each cache instance is given a namespace so
    the /returns, /compare, and /portfolio payloads never collide on a shared
    Redis instance, and so a `clear()` only drops this cache's keys.

    The unbounded-size note: Redis enforces TTL expiry per key and, in
    production, an LRU `maxmemory-policy` caps total memory — so unlike the
    in-memory cache there's no per-cache maxsize to track here.
    """

    def __init__(
        self,
        client: "Redis",
        namespace: str,
        ttl_seconds: int = CACHE_TTL_SECONDS,
    ) -> None:
        self._client = client
        self._namespace = namespace
        self._ttl = ttl_seconds

    def _key(self, key: K) -> str:
        # Tuple keys (the (start, end[, tickers]) cache keys) are joined on a
        # control char that can't appear in dates/tickers, so distinct tuples
        # never map to the same string. Everything is prefixed with the
        # namespace to partition the keyspace per cache.
        raw = "\x1f".join(map(str, key)) if isinstance(key, tuple) else str(key)
        return f"{self._namespace}:{raw}"

    def get(self, key: K) -> V | None:
        cached = self._client.get(self._key(key))
        if cached is None:
            return None
        return json.loads(cached)  # type: ignore[no-any-return]

    def set(self, key: K, value: V) -> None:
        self._client.set(self._key(key), json.dumps(value), ex=self._ttl)

    def clear(self) -> None:
        # SCAN (not KEYS) so a large keyspace doesn't block the Redis event loop;
        # delete in batches scoped to this cache's namespace.
        keys = list(self._client.scan_iter(match=f"{self._namespace}:*"))
        if keys:
            self._client.delete(*keys)
