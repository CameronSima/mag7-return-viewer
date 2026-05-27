"""Price fetching service.

Isolates all yfinance interaction behind a Protocol so the API layer can
be tested without network access, and so the data source can be swapped
(e.g., for an internal price store) without touching call sites.
"""

from datetime import date
from typing import Protocol

import pandas as pd
import yfinance as yf


class PriceFetchError(Exception):
    """Raised when the upstream request itself fails (network, rate limit, etc.)."""


class NoPriceDataError(Exception):
    """Raised when the request succeeds but the range contains no price data.

    Distinct from PriceFetchError so the API can tell apart "the upstream is
    broken" (a 502, worth retrying) from "this otherwise-valid range has no
    trading data" (a 422 the user fixes by picking different dates).
    """


class PriceFetcher(Protocol):
    """Fetches daily close prices for a set of tickers over a date range."""

    def fetch(
        self,
        tickers: tuple[str, ...],
        start: date,
        end: date,
    ) -> pd.DataFrame:
        """Return a DataFrame indexed by date with one column per ticker.

        Columns are ticker symbols, values are adjusted close prices.
        Missing data should be left as NaN; the caller decides how to handle it.
        """
        ...


class YFinancePriceFetcher:
    """PriceFetcher backed by yfinance.

    yfinance is the spec'd data source for this assignment. It's known to be
    occasionally flaky (rate limits, schema drift), so we wrap calls in a
    narrow try/except and translate failures into PriceFetchError for the
    API layer to handle uniformly.
    """

    def fetch(
        self,
        tickers: tuple[str, ...],
        start: date,
        end: date,
    ) -> pd.DataFrame:
        try:
            # yfinance's `end` is exclusive; bump by one day so callers can
            # treat the range as inclusive (matches user expectation).
            raw = yf.download(
                tickers=list(tickers),
                start=start.isoformat(),
                end=(pd.Timestamp(end) + pd.Timedelta(days=1)).date().isoformat(),
                progress=False,
                auto_adjust=True,
                group_by="ticker",
                threads=True,
            )
        except Exception as exc:
            raise PriceFetchError(f"yfinance request failed: {exc}") from exc

        if raw is None or raw.empty:
            raise NoPriceDataError("no price data returned for the requested range")

        return self._extract_closes(raw, tickers)

    @staticmethod
    def _extract_closes(raw: pd.DataFrame, tickers: tuple[str, ...]) -> pd.DataFrame:
        """Normalize yfinance's multi-shape output into a flat (date x ticker) frame.

        yfinance returns a MultiIndex columns frame when multiple tickers are
        requested and a flat frame when only one is. We always want
        flat: index=date, columns=ticker symbols, values=close prices.
        """
        if isinstance(raw.columns, pd.MultiIndex):
            # Shape: columns are (ticker, field). Pull "Close" per ticker.
            closes = pd.DataFrame(
                {
                    ticker: raw[ticker]["Close"]
                    for ticker in tickers
                    if ticker in raw.columns.get_level_values(0)
                }
            )
        else:
            # Single ticker case: flat columns with "Close" present.
            closes = pd.DataFrame({tickers[0]: raw["Close"]})

        closes.index = pd.to_datetime(closes.index).date
        closes.index.name = "date"
        return closes
