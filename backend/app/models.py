"""Pydantic models for request validation and response serialization.

These define the wire contract for the API. The frontend imports matching
TypeScript types in src/types.ts.
"""

import re
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.config import MAX_COMPARE_TICKERS

# A conservative ticker charset: letters, digits, dot (BRK.B) and hyphen.
# Anchored so the whole symbol must match.
_TICKER_RE = re.compile(r"^[A-Z0-9.\-]{1,12}$")


def _clean_symbol(raw: str) -> str:
    """Normalize and validate a single ticker symbol (upper, trimmed)."""
    symbol = raw.strip().upper()
    if not _TICKER_RE.match(symbol):
        raise ValueError(f"invalid ticker symbol: {raw.strip()!r}")
    return symbol


def _parse_symbol_list(value: object) -> list[str]:
    """Parse a comma-separated string (or list) into validated symbols, keeping
    order and dropping blanks. Does not dedupe — callers that pair symbols with
    other parallel data (e.g. weights) need the raw order preserved."""
    if isinstance(value, str):
        raw = value.split(",")
    elif isinstance(value, (list, tuple)):
        raw = [str(v) for v in value]
    else:
        raise ValueError("tickers must be a comma-separated string or list")
    return [_clean_symbol(item) for item in raw if item.strip()]


class ReturnPoint(BaseModel):
    """A single daily return observation for a ticker.

    The field is `return_` (a Python keyword can't be a field name) but
    serializes via its alias to the wire key "return".
    """

    date: date
    return_: float = Field(alias="return")

    # Accept either "return" (alias) or "return_" (name) on input; the
    # endpoint serializes by alias so the wire key is always "return".
    model_config = {"populate_by_name": True}


class TickerStats(BaseModel):
    """Per-ticker summary statistics over the requested range.

    `count` is the number of return observations (trading days) in the full
    series — not the downsampled chart series — so the UI reports true days.
    """

    min: float
    max: float
    mean: float
    count: int


class ReturnsResponse(BaseModel):
    """Full response for GET /returns — the API's wire contract.

    Serializes as:
        {
            "returns": {"MSFT": [{"date": "...", "return": 0.004}, ...], ...},
            "stats":   {"MSFT": {"min": ..., "max": ..., "mean": ...}, ...}
        }

    Mirrors the frontend's ReturnsResponse type in src/types.ts.
    """

    returns: dict[str, list[ReturnPoint]]
    stats: dict[str, TickerStats]


class DateRangeQuery(BaseModel):
    """Validated date range for the /returns endpoint."""

    start: date
    end: date

    @model_validator(mode="after")
    def validate_range(self) -> "DateRangeQuery":
        if self.end < self.start:
            raise ValueError("end date must be on or after start date")
        return self


# --- /compare contract -------------------------------------------------------


class GrowthPoint(BaseModel):
    """One point on a normalized growth curve. ``value`` is the growth of $1
    invested at the common start date (1.0 on day one)."""

    date: date
    value: float


class CompareStats(BaseModel):
    """Per-ticker risk/return statistics over the common window. All values are
    fractions (0.18 == +18%); annualized figures use the 252-day convention and
    Sharpe assumes a 0% risk-free rate."""

    total_return: float
    cagr: float
    annual_vol: float
    sharpe: float
    max_drawdown: float
    best: float
    worst: float
    count: int


class CorrelationMatrix(BaseModel):
    """Daily-return correlation matrix. ``matrix[i][j]`` is corr of
    ``tickers[i]`` with ``tickers[j]``."""

    tickers: list[str]
    matrix: list[list[float]]


class CompareWindow(BaseModel):
    """The effective comparison window — the overlap of the requested tickers'
    histories. ``start``/``end`` are null only when there is no overlap."""

    start: date | None
    end: date | None
    trading_days: int


class CompareResponse(BaseModel):
    """Full response for GET /compare — the comparison engine's wire contract.

    Mirrors the frontend's CompareResponse type in src/types.ts.
    """

    growth: dict[str, list[GrowthPoint]]
    stats: dict[str, CompareStats]
    correlation: CorrelationMatrix
    window: CompareWindow
    # Tickers the upstream returned no data for. Reported, not fatal — the rest
    # still render. Lets the UI flag, e.g., a typo'd symbol.
    missing: list[str]


class CompareQuery(BaseModel):
    """Validated request for the /compare endpoint."""

    tickers: list[str]
    start: date
    end: date

    @field_validator("tickers", mode="before")
    @classmethod
    def parse_tickers(cls, value: object) -> list[str]:
        """Accept a comma-separated string or a list; normalize to uppercase,
        trim blanks, validate the charset, and dedupe while preserving order."""
        seen: set[str] = set()
        cleaned: list[str] = []
        for symbol in _parse_symbol_list(value):
            if symbol not in seen:
                seen.add(symbol)
                cleaned.append(symbol)

        if not cleaned:
            raise ValueError("at least one ticker is required")
        if len(cleaned) > MAX_COMPARE_TICKERS:
            raise ValueError(f"at most {MAX_COMPARE_TICKERS} tickers may be compared")
        return cleaned

    @model_validator(mode="after")
    def validate_range(self) -> "CompareQuery":
        if self.end < self.start:
            raise ValueError("end date must be on or after start date")
        return self


# --- /portfolio contract -----------------------------------------------------

RebalanceFreq = Literal["none", "monthly", "quarterly", "annually"]


class Holding(BaseModel):
    """One portfolio constituent: its normalized weight (post-renormalization if
    any sibling was dropped), total return over the common window, and share of
    portfolio risk (percent contribution to volatility; sums to 1 across
    holdings, and can differ from weight)."""

    ticker: str
    weight: float
    total_return: float
    risk_contribution: float


class AnnualReturn(BaseModel):
    """Calendar-year return for each series (keyed by "Portfolio"/benchmark).
    ``partial`` flags a first/last year the window doesn't fully span."""

    year: int
    partial: bool
    returns: dict[str, float]


class BenchmarkMetrics(BaseModel):
    """Portfolio metrics relative to the benchmark (only present when one is set
    and there's enough overlapping history). Annualized via the 252-day rule."""

    benchmark: str
    beta: float
    alpha: float
    r_squared: float
    tracking_error: float
    information_ratio: float
    correlation: float


class PortfolioResponse(BaseModel):
    """Full response for GET /portfolio.

    `growth`/`stats`/`correlation` are keyed by "Portfolio" and (if given) the
    benchmark symbol, so the same chart/table components render them. Mirrors the
    frontend's PortfolioResponse type in src/types.ts.
    """

    growth: dict[str, list[GrowthPoint]]
    stats: dict[str, CompareStats]
    correlation: CorrelationMatrix
    window: CompareWindow
    holdings: list[Holding]
    annual: list[AnnualReturn]
    benchmark: str | None
    benchmark_metrics: BenchmarkMetrics | None
    missing: list[str]


class PortfolioQuery(BaseModel):
    """Validated request for the /portfolio endpoint.

    `tickers` and `weights` are parallel arrays. Weights are merged across
    duplicate tickers and normalized to sum to 1; an empty `weights` means
    equal-weight.
    """

    tickers: list[str]
    weights: list[float] = Field(default_factory=list)
    rebalance: RebalanceFreq = "none"
    benchmark: str | None = None
    start: date
    end: date

    @field_validator("tickers", mode="before")
    @classmethod
    def parse_tickers(cls, value: object) -> list[str]:
        # Order-preserving, NOT deduped — weights are paired positionally and
        # duplicates are merged in the model validator below.
        tickers = _parse_symbol_list(value)
        if not tickers:
            raise ValueError("at least one ticker is required")
        if len(tickers) > MAX_COMPARE_TICKERS:
            raise ValueError(f"at most {MAX_COMPARE_TICKERS} tickers may be held")
        return tickers

    @field_validator("weights", mode="before")
    @classmethod
    def parse_weights(cls, value: object) -> list[float]:
        if value is None or value == "":
            return []
        if isinstance(value, str):
            items: list[object] = list(value.split(","))
        elif isinstance(value, (list, tuple)):
            items = list(value)
        else:
            raise ValueError("weights must be a comma-separated string or list")
        out: list[float] = []
        for item in items:
            try:
                out.append(float(item))  # type: ignore[arg-type]
            except (TypeError, ValueError) as exc:
                raise ValueError(f"invalid weight: {item!r}") from exc
        return out

    @field_validator("benchmark", mode="before")
    @classmethod
    def parse_benchmark(cls, value: object) -> str | None:
        if value is None or (isinstance(value, str) and not value.strip()):
            return None
        return _clean_symbol(str(value))

    @model_validator(mode="after")
    def finalize(self) -> "PortfolioQuery":
        if self.end < self.start:
            raise ValueError("end date must be on or after start date")

        weights = self.weights or [1.0] * len(self.tickers)
        if len(weights) != len(self.tickers):
            raise ValueError("weights must have the same length as tickers")
        if any(w <= 0 for w in weights):
            raise ValueError("weights must be positive")

        # Merge duplicate tickers (summing weights), preserving first-seen order.
        merged: dict[str, float] = {}
        for ticker, weight in zip(self.tickers, weights, strict=True):
            merged[ticker] = merged.get(ticker, 0.0) + weight

        total = sum(merged.values())
        self.tickers = list(merged.keys())
        self.weights = [merged[t] / total for t in self.tickers]
        return self
