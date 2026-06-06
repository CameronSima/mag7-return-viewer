"""Pydantic models for request validation and response serialization.

These define the wire contract for the API. The frontend imports matching
TypeScript types in src/types.ts.
"""

import re
from datetime import date

from pydantic import BaseModel, Field, field_validator, model_validator

from app.config import MAX_COMPARE_TICKERS

# A conservative ticker charset: letters, digits, dot (BRK.B) and hyphen.
# Anchored so the whole symbol must match.
_TICKER_RE = re.compile(r"^[A-Z0-9.\-]{1,12}$")


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
        if isinstance(value, str):
            raw = value.split(",")
        elif isinstance(value, (list, tuple)):
            raw = [str(v) for v in value]
        else:
            raise ValueError("tickers must be a comma-separated string or list")

        seen: set[str] = set()
        cleaned: list[str] = []
        for item in raw:
            symbol = item.strip().upper()
            if not symbol:
                continue
            if not _TICKER_RE.match(symbol):
                raise ValueError(f"invalid ticker symbol: {item.strip()!r}")
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
