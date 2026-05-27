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

# Max points per ticker sent to the chart. Longer ranges (e.g. full history,
# ~11k daily points for AAPL) are downsampled to this for payload/render size;
# summary stats are still computed on the full series. ~8 years of daily data
# is under this, so normal ranges are never thinned.
MAX_CHART_POINTS: Final[int] = 2000
