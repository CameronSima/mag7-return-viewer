"""Application configuration constants.

Centralized here so they're easy to override (env vars, future settings file)
and easy to find when adding new tickers or tuning cache behavior.
"""

from typing import Final

# The MAG7 tickers, ordered as commonly presented in financial media.
# Kept as a tuple to signal immutability; convert to list at call sites if needed.
MAG7_TICKERS: Final[tuple[str, ...]] = (
    "MSFT",
    "AAPL",
    "GOOGL",
    "AMZN",
    "NVDA",
    "META",
    "TSLA",
)

# Cache TTL in seconds. Daily close prices don't change intraday for completed
# trading days, so a 5-minute TTL is a balance between freshness (for recent
# requests near market close) and minimizing yfinance load.
CACHE_TTL_SECONDS: Final[int] = 300

# Maximum entries in the price cache. Keys are (start, end) tuples; with normal
# usage this caps memory at a few hundred KB.
CACHE_MAX_SIZE: Final[int] = 128

# Maximum date range a single request can span. Prevents abuse and keeps
# response sizes bounded.
MAX_DATE_RANGE_DAYS: Final[int] = 365 * 5
