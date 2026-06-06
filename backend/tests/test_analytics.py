"""Unit tests for the comparison analytics (pure functions)."""

import numpy as np
import pandas as pd
import pytest

from app.services.analytics import (
    compute_comparison_stats,
    compute_correlation,
    compute_growth,
    describe_window,
    restrict_to_common_window,
    simulate_portfolio_value,
)


def _frame(data: dict[str, list[float]], dates: list[str]) -> pd.DataFrame:
    idx = pd.Index(pd.to_datetime(dates).date, name="date")
    return pd.DataFrame(data, index=idx)


def test_restrict_to_common_window_intersects_histories() -> None:
    """A younger ticker constrains the window to the overlap; both columns end
    up sharing an identical index."""
    prices = _frame(
        {"AAA": [100.0, 110.0, 121.0], "BBB": [float("nan"), 200.0, 220.0]},
        ["2024-01-02", "2024-01-03", "2024-01-04"],
    )
    aligned, missing = restrict_to_common_window(prices)

    assert missing == []
    assert list(aligned.columns) == ["AAA", "BBB"]
    # Only the two days where both have prices survive.
    assert len(aligned) == 2
    assert aligned["AAA"].tolist() == [110.0, 121.0]
    assert aligned["BBB"].tolist() == [200.0, 220.0]


def test_restrict_reports_entirely_missing_ticker() -> None:
    """A ticker the upstream returned no data for is reported, not fatal."""
    prices = _frame(
        {"AAA": [100.0, 110.0], "GHOST": [float("nan"), float("nan")]},
        ["2024-01-02", "2024-01-03"],
    )
    aligned, missing = restrict_to_common_window(prices)

    assert missing == ["GHOST"]
    assert list(aligned.columns) == ["AAA"]
    assert len(aligned) == 2


def test_restrict_all_missing_returns_empty() -> None:
    prices = _frame(
        {"GHOST": [float("nan"), float("nan")]}, ["2024-01-02", "2024-01-03"]
    )
    aligned, missing = restrict_to_common_window(prices)
    assert missing == ["GHOST"]
    assert aligned.empty


def test_compute_growth_rebases_each_series_to_one() -> None:
    """Every growth curve starts at exactly 1.0 on the common start date."""
    prices = _frame(
        {"AAA": [100.0, 110.0, 121.0], "BBB": [200.0, 210.0, 231.0]},
        ["2024-01-02", "2024-01-03", "2024-01-04"],
    )
    growth = compute_growth(prices, max_points=2000)

    assert growth["AAA"][0]["value"] == pytest.approx(1.0)
    assert growth["BBB"][0]["value"] == pytest.approx(1.0)
    assert growth["AAA"][-1]["value"] == pytest.approx(1.21)
    assert growth["BBB"][-1]["value"] == pytest.approx(231.0 / 200.0)
    # Dates are carried through as ISO strings.
    assert growth["AAA"][0]["date"] == "2024-01-02"


def test_compute_growth_downsamples_long_series() -> None:
    n = 5000
    dates = pd.date_range("2000-01-03", periods=n, freq="B").strftime("%Y-%m-%d")
    prices = _frame({"AAA": list(np.linspace(100.0, 500.0, n))}, list(dates))
    growth = compute_growth(prices, max_points=2000)

    assert len(growth["AAA"]) == 2000
    # First and last survive LTTB.
    assert growth["AAA"][0]["value"] == pytest.approx(1.0)
    assert growth["AAA"][-1]["value"] == pytest.approx(5.0)


def test_comparison_stats_total_return_and_extremes() -> None:
    prices = _frame(
        {"AAA": [100.0, 110.0, 121.0]},
        ["2024-01-02", "2024-01-03", "2024-01-04"],
    )
    stats = compute_comparison_stats(prices, trading_days_per_year=252)["AAA"]

    assert stats["total_return"] == pytest.approx(0.21)
    assert stats["best"] == pytest.approx(0.1)
    assert stats["worst"] == pytest.approx(0.1)
    assert stats["count"] == 2
    # Constant 10% daily return -> zero variance -> zero vol/Sharpe (no NaN/inf).
    assert stats["annual_vol"] == 0.0
    assert stats["sharpe"] == 0.0
    assert stats["max_drawdown"] == 0.0  # monotonically rising


def test_comparison_stats_max_drawdown() -> None:
    """Peak-to-trough decline is the most negative running drawdown."""
    prices = _frame(
        {"AAA": [100.0, 120.0, 90.0, 110.0]},
        ["2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05"],
    )
    stats = compute_comparison_stats(prices, trading_days_per_year=252)["AAA"]
    # Peak 120 -> trough 90 = -25%.
    assert stats["max_drawdown"] == pytest.approx(-0.25)


def test_comparison_stats_annualized_vol_and_sharpe() -> None:
    """Vol annualizes by sqrt(252); Sharpe is mean/std * sqrt(252)."""
    # Alternating returns give a known nonzero sample std.
    prices = _frame(
        {"AAA": [100.0, 110.0, 99.0, 108.9]},
        ["2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05"],
    )
    returns = pd.Series([0.10, -0.10, 0.10])
    expected_vol = float(returns.std()) * np.sqrt(252)
    expected_sharpe = float(returns.mean()) / float(returns.std()) * np.sqrt(252)

    stats = compute_comparison_stats(prices, trading_days_per_year=252)["AAA"]
    assert stats["annual_vol"] == pytest.approx(expected_vol)
    assert stats["sharpe"] == pytest.approx(expected_sharpe)


def test_comparison_stats_empty_frame() -> None:
    assert compute_comparison_stats(pd.DataFrame(), trading_days_per_year=252) == {}


def test_compute_correlation_structure_and_values() -> None:
    """Two perfectly co-moving series correlate at 1.0; the matrix is square,
    symmetric, with a unit diagonal."""
    # Returns must vary for correlation to be defined (a constant series has
    # zero variance). Both move +10% then -10%, so they correlate perfectly.
    prices = _frame(
        {"AAA": [100.0, 110.0, 99.0], "BBB": [50.0, 55.0, 49.5]},
        ["2024-01-02", "2024-01-03", "2024-01-04"],
    )
    corr = compute_correlation(prices)

    assert corr["tickers"] == ["AAA", "BBB"]
    assert corr["matrix"][0][0] == pytest.approx(1.0)
    assert corr["matrix"][1][1] == pytest.approx(1.0)
    # Identical return paths -> correlation 1.0, symmetric.
    assert corr["matrix"][0][1] == pytest.approx(1.0)
    assert corr["matrix"][0][1] == pytest.approx(corr["matrix"][1][0])


def test_compute_correlation_constant_series_is_finite() -> None:
    """A zero-variance series yields NaN correlation in pandas; we coerce to 0.0
    so the JSON payload stays valid."""
    prices = _frame(
        {"AAA": [100.0, 110.0, 121.0], "FLAT": [10.0, 10.0, 10.0]},
        ["2024-01-02", "2024-01-03", "2024-01-04"],
    )
    corr = compute_correlation(prices)
    for row in corr["matrix"]:
        for value in row:
            assert np.isfinite(value)


def test_describe_window_reports_bounds_and_count() -> None:
    prices = _frame(
        {"AAA": [100.0, 110.0, 121.0]},
        ["2024-01-02", "2024-01-03", "2024-01-04"],
    )
    window = describe_window(prices)
    assert window == {
        "start": "2024-01-02",
        "end": "2024-01-04",
        "trading_days": 3,
    }


def test_describe_window_empty() -> None:
    assert describe_window(pd.DataFrame()) == {
        "start": None,
        "end": None,
        "trading_days": 0,
    }


def test_portfolio_single_holding_equals_its_growth() -> None:
    """A one-holding portfolio is just that holding's growth, starting at 1.0."""
    prices = _frame(
        {"AAA": [100.0, 110.0, 121.0]},
        ["2024-01-02", "2024-01-03", "2024-01-04"],
    )
    value = simulate_portfolio_value(prices, {"AAA": 1.0}, "none")
    assert value.tolist() == pytest.approx([1.0, 1.1, 1.21])


def test_portfolio_buy_and_hold_drifts() -> None:
    """Without rebalancing, weights drift: a 50/50 of a +10%/day and a -10%/day
    name starts at 1.0, stays 1.0 after one offsetting day, then drifts up."""
    prices = _frame(
        {"AAA": [100.0, 110.0, 121.0], "BBB": [100.0, 90.0, 81.0]},
        ["2024-01-02", "2024-01-03", "2024-01-04"],
    )
    value = simulate_portfolio_value(prices, {"AAA": 0.5, "BBB": 0.5}, "none")
    # day1: 0.5*1.1 + 0.5*0.9 = 1.0 ; day2: 0.55*1.1 + 0.45*0.9 = 1.01
    assert value.tolist() == pytest.approx([1.0, 1.0, 1.01])


def test_portfolio_rebalances_on_period_boundary() -> None:
    """Monthly rebalancing resets to target weights at the first day of the new
    month, producing a different path than buy-and-hold."""
    dates = ["2024-01-30", "2024-01-31", "2024-02-01", "2024-02-02"]
    prices = _frame(
        {
            "AAA": [100.0, 110.0, 121.0, 133.1],  # +10%/day
            "BBB": [100.0, 90.0, 81.0, 72.9],  # -10%/day
        },
        dates,
    )
    weights = {"AAA": 0.5, "BBB": 0.5}

    rebalanced = simulate_portfolio_value(prices, weights, "monthly")
    buyhold = simulate_portfolio_value(prices, weights, "none")

    # Through 2024-02-01 both equal 1.01; the rebalance there resets to 50/50,
    # so the final day differs: rebalanced 1.01 vs buy-and-hold ~1.03.
    assert rebalanced.tolist() == pytest.approx([1.0, 1.0, 1.01, 1.01])
    assert buyhold.iloc[-1] == pytest.approx(1.03)
    assert rebalanced.iloc[-1] != pytest.approx(buyhold.iloc[-1])


def test_portfolio_empty_frame() -> None:
    assert simulate_portfolio_value(pd.DataFrame(), {}, "none").empty
