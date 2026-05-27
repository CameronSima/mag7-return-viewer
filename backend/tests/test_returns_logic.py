"""Unit tests for the pure returns computation."""

import pandas as pd
import pytest

from app.services.returns import (
    compute_daily_returns,
    compute_summary_stats,
    to_response_dict,
)


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
        assert point["return_"] == point["return_"]  # NaN != NaN trick


def test_summary_stats_handles_known_values(sample_prices: pd.DataFrame) -> None:
    """Summary stats should match computed-by-hand values."""
    returns = compute_daily_returns(sample_prices)
    stats = compute_summary_stats(returns)

    assert stats["MSFT"]["mean"] == pytest.approx(0.01)
    assert stats["AAPL"]["mean"] == pytest.approx(-0.01)
    assert stats["MSFT"]["min"] == pytest.approx(0.01)
    assert stats["MSFT"]["max"] == pytest.approx(0.01)


def test_summary_stats_empty_series_does_not_crash() -> None:
    """A ticker column of all-NaN should produce zeros, not errors."""
    df = pd.DataFrame({"GHOST": [float("nan"), float("nan")]})
    stats = compute_summary_stats(df)
    assert stats["GHOST"] == {"min": 0.0, "max": 0.0, "mean": 0.0}
