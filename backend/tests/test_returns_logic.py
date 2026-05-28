"""Unit tests for the pure returns computation."""

from datetime import date, timedelta

import pandas as pd
import pytest

from app.services.returns import (
    ReturnPointDict,
    compute_daily_returns,
    compute_summary_stats,
    downsample_series,
    to_response_dict,
)


def _make_points(n: int) -> list[ReturnPointDict]:
    base = date(2000, 1, 1)
    return [
        {"date": (base + timedelta(days=i)).isoformat(), "return": (i % 7) * 0.01 - 0.03}
        for i in range(n)
    ]


def test_compute_daily_returns_basic(sample_prices: pd.DataFrame) -> None:
    """Returns should be (today - yesterday) / yesterday, with first row dropped."""
    returns = compute_daily_returns(sample_prices)

    assert len(returns) == 4  # 5 prices -> 4 returns
    assert "MSFT" in returns.columns
    assert returns["MSFT"].iloc[0] == pytest.approx(0.01)
    assert returns["AAPL"].iloc[0] == pytest.approx(-0.01)


def test_compute_daily_returns_empty() -> None:
    """Empty input should return empty output, not crash."""
    empty = pd.DataFrame()
    result = compute_daily_returns(empty)
    assert result.empty


def test_to_response_dict_drops_nan(sample_prices: pd.DataFrame) -> None:
    """NaN observations should not appear in the wire format."""
    prices = sample_prices.copy()
    prices.iloc[2, 0] = float("nan")  # punch a hole in MSFT
    returns = compute_daily_returns(prices)

    payload = to_response_dict(returns)

    # MSFT loses two points (the NaN itself and the next day, which is
    # NaN-derived from the NaN price).
    assert len(payload["MSFT"]) < len(payload["AAPL"])
    # No NaN values leaked through.
    for point in payload["MSFT"]:
        assert point["return"] == point["return"]  # NaN != NaN trick


def test_summary_stats_handles_known_values(sample_prices: pd.DataFrame) -> None:
    """Summary stats should match computed-by-hand values."""
    returns = compute_daily_returns(sample_prices)
    stats = compute_summary_stats(returns)

    assert stats["MSFT"]["mean"] == pytest.approx(0.01)
    assert stats["AAPL"]["mean"] == pytest.approx(-0.01)
    assert stats["MSFT"]["min"] == pytest.approx(0.01)
    assert stats["MSFT"]["max"] == pytest.approx(0.01)
    # count is the number of return observations (5 prices -> 4 returns).
    assert stats["MSFT"]["count"] == 4


def test_summary_stats_empty_series_does_not_crash() -> None:
    """A ticker column of all-NaN should produce zeros, not errors."""
    df = pd.DataFrame({"GHOST": [float("nan"), float("nan")]})
    stats = compute_summary_stats(df)
    assert stats["GHOST"] == {"min": 0.0, "max": 0.0, "mean": 0.0, "count": 0}


def test_downsample_noop_when_below_threshold() -> None:
    """Series at or under the cap are returned unchanged (identity)."""
    points = _make_points(500)
    assert downsample_series(points, 2000) is points
    assert downsample_series(points, 500) is points


def test_downsample_reduces_to_cap_and_keeps_endpoints() -> None:
    """A long series is thinned to the cap, preserving first/last and order."""
    points = _make_points(11_000)
    out = downsample_series(points, 2000)

    assert len(out) == 2000
    assert out[0] == points[0]  # first kept
    assert out[-1] == points[-1]  # last kept
    # Output stays chronological and is a subset of the input.
    dates = [p["date"] for p in out]
    assert dates == sorted(dates)
    assert set(d["date"] for d in out) <= set(d["date"] for d in points)


def test_downsample_handles_tiny_inputs() -> None:
    """Degenerate caps/inputs don't crash and return the input unchanged."""
    assert downsample_series([], 2000) == []
    two = _make_points(2)
    assert downsample_series(two, 2) is two
