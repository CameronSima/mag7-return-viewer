"""Application configuration constants.

Centralized here so they're easy to override (env vars, future settings file)
and easy to find when adding new tickers or tuning cache behavior.
"""

import os
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

# Maximum number of tickers accepted by the /compare endpoint. Caps the chart's
# line count (readability) and the payload size. The MAG7 preset (7) is well
# under it; the headroom allows comparing the seven against a couple of
# benchmarks (e.g. SPY, QQQ) in one view.
MAX_COMPARE_TICKERS: Final[int] = 10

# Trading days per year, used to annualize volatility and the Sharpe ratio.
# 252 is the standard convention (≈ 365 calendar days minus weekends/holidays).
TRADING_DAYS_PER_YEAR: Final[int] = 252

# Window (trading days) for the rolling volatility / correlation views. 63 ≈ one
# trading quarter — long enough to be stable, short enough to reveal regime
# shifts (a vol spike, a correlation breakdown) that a single window-wide number
# averages away.
ROLLING_WINDOW: Final[int] = 63

# ---- Deployment-driven settings (env vars) ----------------------------------
# These are read from the environment so the same image runs in dev and prod.

# Redis connection URL (e.g. "redis://redis:6379/0"). When unset, the app falls
# back to the in-memory cache — handy for local runs and tests with no Redis.
REDIS_URL: Final[str | None] = os.getenv("REDIS_URL") or None

# Allowed CORS origins, comma-separated. The frontend is served cross-origin
# from Cloudflare (Workers `*.workers.dev` or Pages `*.pages.dev`), so this MUST
# include its exact origin in production, e.g.
#   CORS_ORIGINS=https://mag7-return-viewer.cjsima.workers.dev
# Defaults to the Vite dev server so local `npm run dev` works out of the box.
CORS_ORIGINS: Final[tuple[str, ...]] = tuple(
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
)

# Optional regex matching additional allowed origins. Cloudflare gives preview
# deployments hashed subdomains (e.g. https://<hash>-mag7-return-viewer.cjsima
# .workers.dev), which an exact-match list can't anticipate. Set this to allow a
# whole family of origins, e.g.
#   CORS_ORIGIN_REGEX=https://([a-z0-9-]+-)?mag7-return-viewer\.cjsima\.workers\.dev
# Unset by default so only the explicit CORS_ORIGINS list applies.
CORS_ORIGIN_REGEX: Final[str | None] = os.getenv("CORS_ORIGIN_REGEX") or None
