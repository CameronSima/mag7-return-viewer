"""End-to-end tests for the /portfolio endpoint using a fake price fetcher."""

import pandas as pd
from fastapi.testclient import TestClient


def _frame(data: dict[str, list[float]], dates: list[str]) -> pd.DataFrame:
    idx = pd.Index(pd.to_datetime(dates).date, name="date")
    return pd.DataFrame(data, index=idx)


def test_portfolio_happy_path(client: TestClient) -> None:
    """A valid portfolio returns growth/stats/correlation, window, and holdings."""
    response = client.get(
        "/portfolio?tickers=MSFT,AAPL&weights=0.5,0.5&start=2024-01-02&end=2024-01-08"
    )
    assert response.status_code == 200
    body = response.json()

    assert set(body.keys()) == {
        "growth", "stats", "correlation", "window", "holdings", "annual",
        "benchmark", "missing",
    }
    # Calendar-year returns are present and keyed by the series names.
    assert body["annual"]
    assert "Portfolio" in body["annual"][0]["returns"]
    # The simulated portfolio is keyed as "Portfolio" and starts at 1.0.
    assert "Portfolio" in body["growth"]
    assert body["growth"]["Portfolio"][0]["value"] == 1.0
    assert "Portfolio" in body["stats"]

    assert {h["ticker"] for h in body["holdings"]} == {"MSFT", "AAPL"}
    assert all(h["weight"] == 0.5 for h in body["holdings"])
    assert body["benchmark"] is None
    assert body["window"]["trading_days"] == 5


def test_portfolio_equal_weight_default(client: TestClient) -> None:
    """Omitting weights yields an equal-weight portfolio."""
    response = client.get(
        "/portfolio?tickers=MSFT,AAPL&start=2024-01-02&end=2024-01-08"
    )
    assert response.status_code == 200
    weights = {h["ticker"]: h["weight"] for h in response.json()["holdings"]}
    assert weights == {"MSFT": 0.5, "AAPL": 0.5}


def test_portfolio_weights_normalized(client: TestClient) -> None:
    """Raw weights are normalized to sum to 1."""
    response = client.get(
        "/portfolio?tickers=MSFT,AAPL&weights=3,1&start=2024-01-02&end=2024-01-08"
    )
    assert response.status_code == 200
    weights = {h["ticker"]: h["weight"] for h in response.json()["holdings"]}
    assert weights["MSFT"] == 0.75
    assert weights["AAPL"] == 0.25


def test_portfolio_with_benchmark(client: TestClient) -> None:
    """A benchmark is fetched, compared, and surfaced as its own series."""
    frame = _frame(
        {
            "MSFT": [100.0, 101.0, 102.0],
            "AAPL": [200.0, 198.0, 196.0],
            "SPY": [400.0, 402.0, 404.0],
        },
        ["2024-01-02", "2024-01-03", "2024-01-04"],
    )
    client.fake_fetcher.fetch = lambda *_a, **_kw: frame  # type: ignore[attr-defined,method-assign]

    response = client.get(
        "/portfolio?tickers=MSFT,AAPL&benchmark=SPY&start=2024-01-02&end=2024-01-04"
    )
    assert response.status_code == 200
    body = response.json()
    assert body["benchmark"] == "SPY"
    assert "SPY" in body["growth"]
    assert "Portfolio" in body["growth"]
    # SPY is the benchmark, not a holding.
    assert "SPY" not in {h["ticker"] for h in body["holdings"]}
    assert set(body["correlation"]["tickers"]) == {"Portfolio", "SPY"}


def test_portfolio_rejects_weight_count_mismatch(client: TestClient) -> None:
    response = client.get(
        "/portfolio?tickers=MSFT,AAPL&weights=0.5&start=2024-01-02&end=2024-01-08"
    )
    assert response.status_code == 422
    assert "same length" in response.json()["detail"].lower()


def test_portfolio_rejects_negative_weight(client: TestClient) -> None:
    response = client.get(
        "/portfolio?tickers=MSFT,AAPL&weights=0.8,-0.2&start=2024-01-02&end=2024-01-08"
    )
    assert response.status_code == 422
    assert "positive" in response.json()["detail"].lower()


def test_portfolio_rejects_bad_rebalance(client: TestClient) -> None:
    """An unknown rebalance frequency is rejected by the query enum."""
    response = client.get(
        "/portfolio?tickers=MSFT&rebalance=hourly&start=2024-01-02&end=2024-01-08"
    )
    assert response.status_code == 422


def test_portfolio_uses_cache_order_independent(client: TestClient) -> None:
    """Reordering holdings (weights traveling with them) hits the cache."""
    client.get(
        "/portfolio?tickers=MSFT,AAPL&weights=0.5,0.5&start=2024-01-02&end=2024-01-08"
    )
    client.get(
        "/portfolio?tickers=AAPL,MSFT&weights=0.5,0.5&start=2024-01-02&end=2024-01-08"
    )
    assert client.fake_fetcher.call_count == 1  # type: ignore[attr-defined]


def test_portfolio_reports_missing_holding(client: TestClient) -> None:
    """A holding with no data is reported and weights renormalize over the rest."""
    frame = _frame(
        {"MSFT": [100.0, 101.0, 102.0], "GHOST": [float("nan")] * 3},
        ["2024-01-02", "2024-01-03", "2024-01-04"],
    )
    client.fake_fetcher.fetch = lambda *_a, **_kw: frame  # type: ignore[attr-defined,method-assign]

    response = client.get(
        "/portfolio?tickers=MSFT,GHOST&weights=0.5,0.5&start=2024-01-02&end=2024-01-04"
    )
    assert response.status_code == 200
    body = response.json()
    assert body["missing"] == ["GHOST"]
    # MSFT absorbs the full weight after GHOST is dropped.
    assert body["holdings"] == [
        {"ticker": "MSFT", "weight": 1.0, "total_return": body["holdings"][0]["total_return"]}
    ]


def test_portfolio_upstream_failure_returns_502(client: TestClient) -> None:
    from app.services.prices import PriceFetchError

    def boom(*_a, **_kw):
        raise PriceFetchError("simulated outage")

    client.fake_fetcher.fetch = boom  # type: ignore[attr-defined,method-assign]
    response = client.get("/portfolio?tickers=MSFT&start=2024-01-02&end=2024-01-08")
    assert response.status_code == 502
