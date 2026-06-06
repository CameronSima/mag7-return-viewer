# Stock Comparison

A free, no-sign-up tool for comparing the long-run performance of any stocks or
ETFs — **growth, risk, and correlation, side by side.** Type some tickers, pick
a range, and get a normalized growth chart, a sortable risk/return table, and a
correlation heatmap. Every view is encoded in the URL, so any comparison is a
copy-pasteable link.

**Backend:** FastAPI + yfinance + pandas, with a TTL cache and dependency
injection. **Frontend:** React 19 + TypeScript + MUI + MUI X + Plotly, with
React Query for server state and the URL as the source of truth for shared state.

> It started life as a 7-stock daily-returns viewer (the MAG7); the
> comparison engine generalizes it to arbitrary tickers. The original
> `GET /returns` endpoint and its per-ticker daily-return contract are still
> present and tested — the comparison engine is additive.

---

## Table of contents

- [Quick start](#quick-start)
- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Key decisions](#key-decisions)
- [API contract](#api-contract)
- [The metrics, defined](#the-metrics-defined)
- [Assumptions](#assumptions)
- [Testing](#testing)
- [What I'd do next](#what-id-do-next)
- [Project layout](#project-layout)

---

## Quick start

Requirements: Python 3.11+, Node 20+, [uv](https://github.com/astral-sh/uv)
(or pip if you prefer).

**Backend (terminal 1):**

```bash
cd backend
uv sync                                # or: python -m venv .venv && pip install -e .
uv run uvicorn app.main:app --reload   # serves http://localhost:8000
```

**Frontend (terminal 2):**

```bash
cd frontend
npm install
npm run dev                            # serves http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173). It loads with a default
comparison (the leaders vs. the S&P 500 over five years). Add or remove tickers,
change the range, hit **Share link**. API docs are auto-generated at
[http://localhost:8000/docs](http://localhost:8000/docs).

---

## What it does

Enter up to 10 tickers (stocks or ETFs) and a date range. The app shows:

- **Growth of $1** — every ticker rebased to 1.0 at the common start date and
  overlaid on one shared axis, so magnitudes are directly comparable. Linear/log
  toggle for multi-fold differences.
- **Risk & return table** — total return, CAGR, annualized volatility, Sharpe,
  max drawdown, best/worst day, and trading-day count per ticker. Sortable.
- **Return correlation** — a heatmap of pairwise daily-return correlations, so
  diversifiers (low/negative correlation) stand out from names that move together.

Plus quick presets (MAG7, MAG7 vs. S&P 500, the index ETFs), a warning when a
typo'd symbol has no data, and the shareable URL.

---

## Architecture

```
 ┌──────────────┐   GET /api/compare    ┌─────────────────┐
 │   React UI   │   ?tickers=…&start=…  │  FastAPI route  │
 │ (URL = state)│ ───────────────────▶  │   (thin layer)  │
 └──────────────┘ ◀───────────────────  └────────┬────────┘
                                                  │
                          ┌───────────────────────┼───────────────────────┐
                          ▼                       ▼                       ▼
                   ┌───────────┐           ┌───────────┐          ┌──────────────────┐
                   │ TTL cache │           │  Prices   │          │    Analytics     │
                   │ (keyed by │           │ (yfinance)│          │   (pure math:    │
                   │ tickers + │           │           │          │ growth, stats,   │
                   │  range)   │           │           │          │ correlation)     │
                   └───────────┘           └───────────┘          └──────────────────┘
```

**Separation of concerns is the central design choice.** Every external
dependency (yfinance, the cache, the request) sits behind a `Protocol`, so the
business logic — `app/services/analytics.py` — is a set of pure functions on a
DataFrame. The math is trivially testable and the route handler stays boring.

On the frontend, the same idea: a typed API client below a React Query hook
below presentational components. Components don't know about `fetch`, caching,
or retries — only the shape of the data they render.

---

## Key decisions

### The common window

When tickers have different histories (a 2021 IPO vs. an index going back
decades), **every series is restricted to the dates they all share.** Three
reasons:

1. Growth curves can be rebased to a common start — every line begins at 1.0
   on the same date, so the chart compares like with like.
2. Correlation is only defined on aligned observations.
3. CAGR / volatility / Sharpe over a window are comparable only if the window
   is identical across tickers.

The cost: the youngest ticker constrains the window. The effective range and
its trading-day count are reported back (`window` in the response) and shown in
the UI, so the trade-off is never hidden. Tickers the upstream has no data for
are reported in `missing` rather than failing the whole request.

### Growth from prices, not re-compounded returns

The growth curve is `price_t / price_0` over the common window — exact, and it
starts at precisely 1.0 on day one. (Re-compounding daily returns would drift
on floating-point error and is needlessly indirect when we already hold prices.)
Returns for the stats and correlation are derived from the same aligned prices,
so every number on the page comes from one consistent source.

### Adjusted close prices, not raw

Everything is computed from split- and dividend-adjusted closes
(`yfinance auto_adjust=True`), so it reflects **total return** — what a
shareholder actually experienced. Raw closes would inject spurious drops on
ex-dividend and split days.

### Server-computed statistics

Growth, stats, and correlation are computed on the backend, on the full
(aligned) daily series. The frontend never re-derives them — guaranteeing the
chart, table, and heatmap agree, and keeping numbers exact even when the charted
growth series is downsampled (LTTB, `MAX_CHART_POINTS = 2000`) for long ranges.

### The URL is the state

The comparison's entire state (`tickers`, `start`, `end`) lives in the query
string, mirrored via `history.replaceState`. No accounts, no database, no
router dependency — yet every comparison is a shareable link, and a bare visit
falls back to a sensible default. This is the cheapest possible "share" feature:
it costs zero backend.

### Dependency injection over module globals

The cache and price fetcher are wired via FastAPI's `Depends()` system, backed
by `lru_cache`-singletons. Tests override them via `app.dependency_overrides` —
no monkeypatching, no fragile import paths. The `/compare` endpoint gets its own
cache (its key carries the ticker set), injected the same way.

### React Query for server state, Plotly for charts

React Query handles request dedup, caching, retries, and loading/error states
for one dependency. Plotly ships zoom, pan, hover, legends, and a heatmap out of
the box and stays performant on multi-year ranges; the cost is bundle size (see
"What I'd do next").

### Free MUI X, not paid

The ticker entry is a free MUI Autocomplete; the tables are the free MUI X
DataGrid (Community). The commercial `DateRangePicker` is avoided in favor of
two free `DatePicker`s constrained to a valid range.

---

## API contract

### `GET /compare`

Query params: `tickers` (comma-separated, e.g. `AAPL,MSFT,SPY`; 1–10),
`start`, `end` (ISO dates, inclusive).

```json
{
  "growth": {
    "AAPL": [{ "date": "2020-06-08", "value": 1.0 }, { "date": "...", "value": 3.41 }]
  },
  "stats": {
    "AAPL": {
      "total_return": 2.41, "cagr": 0.28, "annual_vol": 0.31, "sharpe": 0.95,
      "max_drawdown": -0.31, "best": 0.12, "worst": -0.13, "count": 1258
    }
  },
  "correlation": { "tickers": ["AAPL", "SPY"], "matrix": [[1.0, 0.78], [0.78, 1.0]] },
  "window": { "start": "2020-06-08", "end": "2025-06-06", "trading_days": 1258 },
  "missing": []
}
```

All values are fractions (`0.28` == +28%). `tickers` are normalized server-side
(uppercased, deduped). A range with no trading data, or tickers whose histories
don't overlap, returns a **422** with a clear message; a genuine upstream
failure returns a **502** (so the UI offers retry only when retrying could help).

### `GET /returns`

The original MAG7 daily-returns endpoint, unchanged. See git history / the
`stats` + `returns` contract in `app/models.py`.

---

## The metrics, defined

So there's no ambiguity about what the numbers mean:

- **Total return** — `price_last / price_first − 1` over the common window.
- **CAGR** — `(1 + total_return) ^ (1 / years) − 1`, where `years` is the
  window's trading-day count ÷ 252 (consistent with the volatility convention).
- **Annualized volatility** — sample standard deviation of daily returns × √252.
- **Sharpe** — `mean(daily) / std(daily) × √252`, **risk-free rate = 0**. A
  fine default for a free comparison tool; documented so it's not mistaken for
  an excess-return Sharpe.
- **Max drawdown** — the most negative `price / running-peak − 1` over the
  window (a non-positive fraction; 0 if the series only rose).
- **Best / worst day** — the largest single-day gain and loss.
- **Days** — trading-day observations in the common window.

Degenerate inputs (a single common day, a zero-variance series) yield zeros, not
`NaN`/`inf`, so the JSON is always valid and the UI never shows garbage.

---

## Assumptions

- **Date range is inclusive on both ends.** yfinance's `end` is exclusive; the
  backend adjusts internally so the API behaves intuitively.
- **Non-trading days are absent, not zero.** Weekends/holidays don't appear.
- **Comparison window = the overlap.** See "The common window."
- **No artificial range cap — full history is supported,** bounded only by what
  yfinance has. Long charted series are downsampled (LTTB) for payload size;
  the stats are computed on the full aligned series, so they stay exact.
- **The TTL cache is 5 minutes,** keyed by `(sorted tickers, start, end)` so
  reordering tickers is a cache hit.

---

## Testing

```bash
# Backend
cd backend
uv run pytest -v          # 40 tests
uv run ruff check . && uv run mypy app

# Frontend
cd frontend
npm test                  # 21 tests
npx tsc -b && npx eslint .
```

**Backend** covers the analytics math (common-window alignment, growth rebasing,
CAGR/vol/Sharpe, max drawdown, correlation, degenerate inputs, downsampling),
the cache, and both endpoints end-to-end (happy path, ticker normalization/
validation, missing-ticker reporting, no-overlap → 422, no-data → 422, upstream
→ 502, cache hits) against a fake price fetcher.

**Frontend** covers the formatters, the comparison table, the ticker input
(normalization, validation, cap), the URL-state hook (hydrate + mirror), and the
app end-to-end via MSW (default load, missing-ticker warning, 422 shown verbatim
with no retry, 502 with retry-and-recover). The Plotly charts are mocked because
jsdom has no canvas; every other path runs for real. External dependencies
(yfinance, the network) are never hit in tests.

---

## What I'd do next

In roughly the order I'd tackle them:

1. **Portfolio mode.** The natural next layer on this plumbing: weighted
   portfolios with rebalancing, a blended growth curve, and a benchmark — the
   "free Portfolio Visualizer" play. The analytics module is already shaped for it.
2. **Trim the bundle.** Plotly is ~80% of it. Most of the app needs only
   `plotly.js-basic-dist`; the heatmap is the lone holdout, so lazy-load the
   correlation view (or its Plotly bundle) behind a dynamic import.
3. **Rolling views** — rolling correlation and rolling volatility, for when a
   single window-wide number hides a regime change.
4. **Redis cache** behind the existing `Cache` protocol (no call-site changes).
5. **Symbol search/validation** — resolve and disambiguate tickers as the user
   types, instead of discovering a typo only after the request.
6. **Configuration via `pydantic-settings`** sourced from the environment.
7. **CI** (GitHub Actions): pytest + ruff + mypy; vitest + tsc + eslint.
8. **Risk-free input** for an excess-return Sharpe, for users who want it.

---

## Project layout

```
.
├── README.md
├── backend/
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py            # FastAPI app, CORS, router mounting
│   │   ├── config.py          # Constants (tickers, cache, caps, 252)
│   │   ├── models.py          # Pydantic models / wire contracts
│   │   ├── dependencies.py    # DI providers (per-endpoint caches, fetcher)
│   │   ├── api/
│   │   │   ├── returns.py     # GET /returns (original MAG7 daily returns)
│   │   │   └── compare.py     # GET /compare (the comparison engine)
│   │   └── services/
│   │       ├── cache.py       # TTL cache + protocol
│   │       ├── prices.py      # yfinance wrapper + protocol
│   │       ├── returns.py     # Daily-returns math + LTTB downsampling
│   │       └── analytics.py   # Growth, risk/return stats, correlation
│   └── tests/
│       ├── conftest.py
│       ├── test_returns_logic.py
│       ├── test_analytics.py
│       ├── test_cache.py
│       ├── test_api.py
│       └── test_compare_api.py
└── frontend/
    ├── package.json
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── theme.ts
    │   ├── types.ts
    │   ├── api/
    │   │   ├── client.ts       # ApiError + shared fetch/parse helper
    │   │   └── compare.ts      # GET /compare client
    │   ├── hooks/
    │   │   ├── useComparison.ts # React Query hook
    │   │   └── useUrlState.ts   # URL <-> state binding (shareable links)
    │   ├── utils/
    │   │   ├── stats.ts        # Formatters
    │   │   └── palette.ts      # Per-series colors
    │   └── components/
    │       ├── TickerInput.tsx
    │       ├── DateRangePicker.tsx
    │       ├── GrowthChart.tsx
    │       ├── ComparisonTable.tsx
    │       ├── CorrelationHeatmap.tsx
    │       ├── LoadingState.tsx
    │       └── ErrorState.tsx
    └── tests/
        ├── setup.ts
        ├── test-utils.tsx
        ├── mocks/{server,handlers}.ts
        ├── components/{App,ComparisonTable,TickerInput}.test.tsx
        ├── hooks/useUrlState.test.ts
        └── utils/stats.test.ts
```
