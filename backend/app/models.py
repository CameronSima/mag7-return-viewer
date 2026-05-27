"""Pydantic models for request validation and response serialization.

These define the wire contract for the API. The frontend imports matching
TypeScript types in src/types.ts.
"""

from datetime import date

from pydantic import BaseModel, Field, RootModel, model_validator

from app.config import MAX_DATE_RANGE_DAYS


class ReturnPoint(BaseModel):
    """A single daily return observation for a ticker."""

    date: date
    return_: float = Field(alias="return")

    model_config = {"populate_by_name": True}


class ReturnsResponse(RootModel[dict[str, list[ReturnPoint]]]):
    """Response: ticker symbols mapping to return series.

    Serializes as: {"MSFT": [{"date": "...", "return": 0.004}, ...], ...}
    matching the assignment specification exactly.
    """

    pass


class DateRangeQuery(BaseModel):
    """Validated date range for the /returns endpoint."""

    start: date
    end: date

    @model_validator(mode="after")
    def validate_range(self) -> "DateRangeQuery":
        if self.end < self.start:
            raise ValueError("end date must be on or after start date")
        if (self.end - self.start).days > MAX_DATE_RANGE_DAYS:
            raise ValueError(f"date range cannot exceed {MAX_DATE_RANGE_DAYS} days")
        return self
