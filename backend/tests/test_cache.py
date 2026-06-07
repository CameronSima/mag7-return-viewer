"""Tests for the cache backends."""

import time

from app.services.cache import InMemoryTTLCache, RedisTTLCache


def test_cache_set_and_get() -> None:
    cache: InMemoryTTLCache[str, int] = InMemoryTTLCache()
    cache.set("key", 42)
    assert cache.get("key") == 42


def test_cache_returns_none_for_missing_key() -> None:
    cache: InMemoryTTLCache[str, int] = InMemoryTTLCache()
    assert cache.get("nope") is None


def test_cache_expires_after_ttl() -> None:
    """Entries should be evicted after the TTL elapses."""
    cache: InMemoryTTLCache[str, int] = InMemoryTTLCache(ttl_seconds=1)
    cache.set("key", 42)
    assert cache.get("key") == 42
    time.sleep(1.1)
    assert cache.get("key") is None


class FakeRedis:
    """Minimal in-memory stand-in for the redis client surface we use.

    Covers get/set(ex=...)/scan_iter(match=...)/delete with decode_responses
    semantics (str in, str out) so RedisTTLCache can be tested without a server.
    """

    def __init__(self) -> None:
        self.store: dict[str, str] = {}
        self.last_ex: int | None = None

    def get(self, key: str) -> str | None:
        return self.store.get(key)

    def set(self, key: str, value: str, ex: int | None = None) -> None:
        self.store[key] = value
        self.last_ex = ex

    def scan_iter(self, match: str):  # noqa: ANN201 - mirrors redis signature
        prefix = match.rstrip("*")
        return [k for k in list(self.store) if k.startswith(prefix)]

    def delete(self, *keys: str) -> None:
        for k in keys:
            self.store.pop(k, None)


def test_redis_cache_roundtrips_json_payloads() -> None:
    client = FakeRedis()
    cache: RedisTTLCache[tuple[str, str], dict[str, object]] = RedisTTLCache(
        client, namespace="returns", ttl_seconds=300
    )
    payload = {"returns": {"MSFT": [{"date": "2020-01-02", "return": 0.01}]}}
    cache.set(("2020-01-01", "2020-12-31"), payload)

    assert cache.get(("2020-01-01", "2020-12-31")) == payload
    assert client.last_ex == 300


def test_redis_cache_returns_none_for_missing_key() -> None:
    cache: RedisTTLCache[str, int] = RedisTTLCache(FakeRedis(), namespace="x")
    assert cache.get("nope") is None


def test_redis_cache_namespaces_keys_to_avoid_collisions() -> None:
    """The same logical key in two namespaces must not collide."""
    client = FakeRedis()
    returns: RedisTTLCache[str, str] = RedisTTLCache(client, namespace="returns")
    compare: RedisTTLCache[str, str] = RedisTTLCache(client, namespace="compare")

    returns.set("k", "r")
    compare.set("k", "c")

    assert returns.get("k") == "r"
    assert compare.get("k") == "c"


def test_redis_cache_clear_only_drops_own_namespace() -> None:
    client = FakeRedis()
    returns: RedisTTLCache[str, str] = RedisTTLCache(client, namespace="returns")
    compare: RedisTTLCache[str, str] = RedisTTLCache(client, namespace="compare")
    returns.set("a", "1")
    compare.set("b", "2")

    returns.clear()

    assert returns.get("a") is None
    assert compare.get("b") == "2"
