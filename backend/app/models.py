"""Pydantic models for request validation and response serialization.

These define the wire contract for the API. The frontend imports matching
TypeScript types in src/types.ts.
"""

from datetime import date

from pydantic import BaseModel, Field, model_validator


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
    """Per-ticker summary statistics over the requested range."""

    min: float
    max: float
    mean: float


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
