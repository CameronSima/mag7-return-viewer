"""End-to-end tests for the /returns endpoint using a fake price fetcher."""

from fastapi.testclient import TestClient


def test_returns_endpoint_happy_path(client: TestClient) -> None:
    """Valid range returns 200 with both returns and stats."""
    response = client.get("/returns?start=2024-01-02&end=2024-01-08")

    assert response.status_code == 200
    body = response.json()

    assert "returns" in body
    assert "stats" in body
    assert "MSFT" in body["returns"]
    assert "AAPL" in body["returns"]
    assert body["stats"]["MSFT"]["mean"] > 0
    # count is the true observation count (5 prices -> 4 returns), exposed
    # so the summary table's "Days" survives chart downsampling.
    assert body["stats"]["MSFT"]["count"] == 4

    # Each return point must use the wire contract keys "date" and "return"
    # (not "return_"); the frontend's ReturnPoint type and charts depend on it.
    point = body["returns"]["MSFT"][0]
    assert set(point.keys()) == {"date", "return"}


def test_returns_endpoint_uses_cache(client: TestClient) -> None:
    """Second identical request should not call the price fetcher again."""
    client.get("/returns?start=2024-01-02&end=2024-01-08")
    client.get("/returns?start=2024-01-02&end=2024-01-08")

    assert client.fake_fetcher.call_count == 1  # type: ignore[attr-defined]


def test_returns_endpoint_rejects_inverted_range(client: TestClient) -> None:
    """end < start should be 422 with a clean, human-readable message."""
    response = client.get("/returns?start=2024-01-08&end=2024-01-02")

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail == "end date must be on or after start date"
    # The raw Pydantic dump must not leak to the client.
    assert "validation error" not in detail.lower()
    assert "https://" not in detail


def test_returns_endpoint_handles_upstream_failure(client: TestClient) -> None:
    """A PriceFetchError should translate to 502, not crash."""
    from app.services.prices import PriceFetchError

    def boom(*_a, **_kw):
        raise PriceFetchError("simulated yfinance outage")

    client.fake_fetcher.fetch = boom  # type: ignore[attr-defined,method-assign]

    response = client.get("/returns?start=2024-01-02&end=2024-01-08")
    assert response.status_code == 502
    assert "unavailable" in response.json()["detail"].lower()


def test_cors_allows_configured_origin(client: TestClient) -> None:
    """The CORS middleware reflects an allowed origin back to the browser.

    Regression guard for the cross-origin Cloudflare frontend: if CORS isn't
    wired (or a refactor drops the configured origin) the browser blocks every
    API call. The default config allows the Vite dev origin, so assert it is
    echoed and that an unrelated origin is not.
    """
    allowed = "http://localhost:5173"
    response = client.get("/returns?start=2024-01-02&end=2024-01-08", headers={"Origin": allowed})
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == allowed

    # An origin outside the allowlist gets no ACAO header (browser blocks it).
    blocked = client.get(
        "/returns?start=2024-01-02&end=2024-01-08",
        headers={"Origin": "https://evil.example.com"},
    )
    assert "access-control-allow-origin" not in blocked.headers


def test_returns_endpoint_no_data_returns_422(client: TestClient) -> None:
    """A range with no trading data is a 422 (user fixable), not a 502."""
    from app.services.prices import NoPriceDataError

    def empty(*_a, **_kw):
        raise NoPriceDataError("no price data returned for the requested range")

    client.fake_fetcher.fetch = empty  # type: ignore[attr-defined,method-assign]

    # A weekend-only range: valid input, but no trading days.
    response = client.get("/returns?start=2024-01-06&end=2024-01-07")
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert "no trading data" in detail.lower()
    # Must not look like an upstream outage (which would prompt a futile retry).
    assert "unavailable" not in detail.lower()
