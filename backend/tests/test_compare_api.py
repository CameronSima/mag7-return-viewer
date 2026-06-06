"""End-to-end tests for the /compare endpoint using a fake price fetcher."""

import pandas as pd
from fastapi.testclient import TestClient


def test_compare_happy_path(client: TestClient) -> None:
    """A valid comparison returns growth, stats, correlation, window, missing."""
    response = client.get("/compare?tickers=MSFT,AAPL&start=2024-01-02&end=2024-01-08")

    assert response.status_code == 200
    body = response.json()

    assert set(body.keys()) == {"growth", "stats", "correlation", "window", "missing"}
    assert set(body["growth"].keys()) == {"MSFT", "AAPL"}
    # Growth curves are rebased to 1.0 at the common start.
    assert body["growth"]["MSFT"][0]["value"] == 1.0
    assert set(body["growth"]["MSFT"][0].keys()) == {"date", "value"}

    msft = body["stats"]["MSFT"]
    assert set(msft.keys()) == {
        "total_return", "cagr", "annual_vol", "sharpe",
        "max_drawdown", "best", "worst", "count",
    }
    # sample_prices has MSFT rising 1%/day -> positive total return.
    assert msft["total_return"] > 0

    assert body["correlation"]["tickers"] == ["MSFT", "AAPL"]
    assert body["window"]["trading_days"] == 5
    assert body["missing"] == []


def test_compare_normalizes_and_dedupes_tickers(client: TestClient) -> None:
    """Lowercase, whitespace, and duplicates are normalized before fetching."""
    response = client.get(
        "/compare?tickers=msft,%20aapl%20,MSFT&start=2024-01-02&end=2024-01-08"
    )
    assert response.status_code == 200
    assert set(response.json()["growth"].keys()) == {"MSFT", "AAPL"}


def test_compare_uses_cache(client: TestClient) -> None:
    """Identical requests (any ticker order) hit the cache once."""
    client.get("/compare?tickers=MSFT,AAPL&start=2024-01-02&end=2024-01-08")
    # Reordered tickers share the cache key (sorted), so no second fetch.
    client.get("/compare?tickers=AAPL,MSFT&start=2024-01-02&end=2024-01-08")
    assert client.fake_fetcher.call_count == 1  # type: ignore[attr-defined]


def test_compare_rejects_empty_tickers(client: TestClient) -> None:
    response = client.get("/compare?tickers=&start=2024-01-02&end=2024-01-08")
    assert response.status_code == 422
    assert "at least one ticker" in response.json()["detail"].lower()


def test_compare_rejects_too_many_tickers(client: TestClient) -> None:
    many = ",".join(f"TKR{i}" for i in range(11))
    response = client.get(f"/compare?tickers={many}&start=2024-01-02&end=2024-01-08")
    assert response.status_code == 422
    assert "at most" in response.json()["detail"].lower()


def test_compare_rejects_bad_symbol(client: TestClient) -> None:
    response = client.get(
        "/compare?tickers=MSFT,BAD$SYM&start=2024-01-02&end=2024-01-08"
    )
    assert response.status_code == 422
    assert "invalid ticker" in response.json()["detail"].lower()


def test_compare_rejects_inverted_range(client: TestClient) -> None:
    response = client.get("/compare?tickers=MSFT&start=2024-01-08&end=2024-01-02")
    assert response.status_code == 422
    assert response.json()["detail"] == "end date must be on or after start date"


def test_compare_reports_missing_ticker(client: TestClient) -> None:
    """A ticker the upstream has no data for is surfaced in `missing`, not fatal."""
    frame = pd.DataFrame(
        {
            "MSFT": [100.0, 101.0, 102.0],
            "GHOST": [float("nan")] * 3,
        },
        index=pd.Index(
            pd.to_datetime(["2024-01-02", "2024-01-03", "2024-01-04"]).date,
            name="date",
        ),
    )
    client.fake_fetcher.fetch = lambda *_a, **_kw: frame  # type: ignore[attr-defined,method-assign]

    response = client.get("/compare?tickers=MSFT,GHOST&start=2024-01-02&end=2024-01-04")
    assert response.status_code == 200
    body = response.json()
    assert body["missing"] == ["GHOST"]
    assert "GHOST" not in body["growth"]
    assert "MSFT" in body["growth"]


def test_compare_no_overlap_returns_422(client: TestClient) -> None:
    """Tickers whose histories don't overlap yield a clear 422, not a crash."""
    frame = pd.DataFrame(
        {
            "OLD": [10.0, 11.0, float("nan"), float("nan")],
            "NEW": [float("nan"), float("nan"), 20.0, 21.0],
        },
        index=pd.Index(
            pd.to_datetime(
                ["2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05"]
            ).date,
            name="date",
        ),
    )
    client.fake_fetcher.fetch = lambda *_a, **_kw: frame  # type: ignore[attr-defined,method-assign]

    response = client.get("/compare?tickers=OLD,NEW&start=2024-01-02&end=2024-01-05")
    assert response.status_code == 422
    assert "overlap" in response.json()["detail"].lower()


def test_compare_upstream_failure_returns_502(client: TestClient) -> None:
    from app.services.prices import PriceFetchError

    def boom(*_a, **_kw):
        raise PriceFetchError("simulated yfinance outage")

    client.fake_fetcher.fetch = boom  # type: ignore[attr-defined,method-assign]

    response = client.get("/compare?tickers=MSFT&start=2024-01-02&end=2024-01-08")
    assert response.status_code == 502
    assert "unavailable" in response.json()["detail"].lower()


def test_compare_no_data_returns_422(client: TestClient) -> None:
    from app.services.prices import NoPriceDataError

    def empty(*_a, **_kw):
        raise NoPriceDataError("no price data returned for the requested range")

    client.fake_fetcher.fetch = empty  # type: ignore[attr-defined,method-assign]

    response = client.get("/compare?tickers=MSFT&start=2024-01-06&end=2024-01-07")
    assert response.status_code == 422
    assert "no trading data" in response.json()["detail"].lower()
