"""Shared pytest fixtures."""

from datetime import date

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.dependencies import get_cache, get_price_fetcher
from app.main import app
from app.services.cache import InMemoryTTLCache


@pytest.fixture
def sample_prices() -> pd.DataFrame:
    """Five trading days of synthetic prices for MSFT and AAPL.

    Hand-picked so daily returns are easy to compute by inspection:
      MSFT: 100 -> 101 -> 102.01 -> ... (1% per day)
      AAPL: 200 -> 198 -> 196.02 -> ... (-1% per day)
    """
    idx = pd.to_datetime(
        ["2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05", "2024-01-08"]
    ).date
    return pd.DataFrame(
        {
            "MSFT": [100.0, 101.0, 102.01, 103.0301, 104.060401],
            "AAPL": [200.0, 198.0, 196.02, 194.0598, 192.119202],
        },
        index=pd.Index(idx, name="date"),
    )


class FakePriceFetcher:
    """In-memory PriceFetcher for tests. Returns a preconfigured DataFrame."""

    def __init__(self, df: pd.DataFrame) -> None:
        self.df = df
        self.call_count = 0
        self.last_tickers: tuple[str, ...] | None = None

    def fetch(self, tickers, start: date, end: date) -> pd.DataFrame:
        self.call_count += 1
        self.last_tickers = tuple(tickers)
        return self.df


@pytest.fixture
def client(sample_prices: pd.DataFrame):
    """TestClient with a fake fetcher and a fresh cache injected."""
    fake_fetcher = FakePriceFetcher(sample_prices)
    fresh_cache = InMemoryTTLCache()

    app.dependency_overrides[get_price_fetcher] = lambda: fake_fetcher
    app.dependency_overrides[get_cache] = lambda: fresh_cache

    with TestClient(app) as c:
        # Attach the fakes so tests can inspect them.
        c.fake_fetcher = fake_fetcher  # type: ignore[attr-defined]
        c.fresh_cache = fresh_cache  # type: ignore[attr-defined]
        yield c

    app.dependency_overrides.clear()
