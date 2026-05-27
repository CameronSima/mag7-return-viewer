"""Tests for the in-memory TTL cache."""

import time

from app.services.cache import InMemoryTTLCache


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
