# MAG7 Returns Viewer

A full-stack application that visualizes daily returns for the MAG7 stocks
(MSFT, AAPL, GOOGL, AMZN, NVDA, META, TSLA) over a user-selected date range.

**Backend:** FastAPI + yfinance + pandas, with a TTL cache and dependency
injection. **Frontend:** React 19 + TypeScript + MUI + MUI X + Plotly,
with React Query for server state.

---

## Table of contents

- [Quick start](#quick-start)
- [Architecture](#architecture)
- [Key decisions](#key-decisions)
- [Deviations from the spec](#deviations-from-the-spec)
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

Open [http://localhost:5173](http://localhost:5173). Pick a date range. Done.

API docs are auto-generated at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## Architecture

```
 ┌──────────────┐    GET /api/returns   ┌─────────────────┐
 │   React UI   │ ───────────────────▶  │  FastAPI route  │
 │ (TS + MUI)   │ ◀───────────────────  │   (thin layer)  │
 └──────────────┘                       └────────┬────────┘
                                                 │
                              ┌──────────────────┼──────────────────┐
                              ▼                  ▼                  ▼
                       ┌───────────┐      ┌───────────┐      ┌─────────────┐
                       │ TTL cache │      │  Prices   │      │   Returns   │
                       │ (keyed by │      │ (yfinance)│      │  (pure math)│
                       │ date range│      │           │      │             │
                       └───────────┘      └───────────┘      └─────────────┘
```

**Separation of concerns is the central design choice.** Every external
dependency (yfinance, the cache, the FastAPI request) is isolated behind a
`Protocol` interface so the business logic — returns computation — is a
pure function on a DataFrame. This makes the math trivially testable and
keeps the route handler boring.

On the frontend, the same idea: a typed API client below a React Query
hook below presentational components. Components don't know about `fetch`,
caching, or retries — only about the shape of the data they render.

---

## Key decisions

### Adjusted close prices, not raw

Returns are computed from split- and dividend-adjusted close prices
(`yfinance auto_adjust=True`), so they reflect **total return** — what a
shareholder actually experienced.

Using raw closes would introduce spurious negative returns on
ex-dividend dates and large artificial drops on split days. For an
attribution-adjacent tool that would be wrong; for a quant audience
it would be glaring.

### Simple returns, not log returns

The spec asks for "daily % returns." I use simple (arithmetic) returns
via `pct_change()`. Two reasons:

1. Simple returns are additive **across instruments** at a point in time
   — which is how portfolio attribution actually works.
2. Log returns are nicer for time-aggregation, but that's not what's
   being computed here.

### Server-computed summary statistics

Min/max/mean per ticker are computed on the backend rather than in the
frontend. Two reasons:

1. Same numbers appear in the per-card stats and the summary table,
   guaranteed consistent.
2. For large date ranges the frontend would be re-deriving stats from
   thousands of points on every render. Backend does it once.

### Dependency injection over module globals

The cache and price fetcher are wired via FastAPI's `Depends()` system,
backed by `lru_cache`-singletons. Tests override these via
`app.dependency_overrides` — no monkeypatching, no fragile import paths.
This is the architecture line that makes the test suite fast and stable.

### React Query for server state, not Redux

The app has minimal client state (the date range) and one server resource.
Reaching for Redux or Zustand would be premature. React Query handles
request deduplication, caching, retries, and loading/error states for the
cost of one dependency.

### Plotly for charts

Recharts would be simpler, but Recharts gets sluggish past a few hundred
points and would force me to write zoom/pan/tooltip handlers by hand.
Plotly ships all of that out of the box and remains performant on
multi-year ranges. The cost is bundle size — see "What I'd do next."

### Per-card y-axis scaling

Each ticker's chart auto-scales its y-axis to its own min/max rather than
sharing a common scale across the grid. This optimizes for reading the
*shape* of each name's return series independently — the trade-off is that
magnitudes aren't visually comparable across cards (e.g. a ±1% swing on one
card can look as dramatic as a ±4% swing on another). The per-card min/max/mean
stats and the summary table give the absolute numbers, so the scale only
affects the visual sweep, not the data. A shared y-axis (or a toggle between
the two modes) would be a reasonable enhancement if cross-ticker volatility
comparison became a priority.

### Free MUI X, not paid

The MUI X `DateRangePicker` is behind a commercial license. I use two
free `DatePicker`s configured to enforce the range constraint via
`minDate`/`maxDate`. UX is essentially identical for this case.

---

## Deviations from the spec

**Response shape:** The spec shows the response as
`{"MSFT": [...], ...}` at the top level. I extended this to:

```json
{
  "returns": { "MSFT": [...], ... },
  "stats":   { "MSFT": { "min": -0.05, "max": 0.04, "mean": 0.001 }, ... }
}
```

This lets the bonus "summary table across all 7 names" come back in the
same network round-trip and stay atomic with respect to the date range.
The shape inside `returns` matches the spec exactly.

**`/api/` prefix in dev:** Vite proxies `/api/*` to the FastAPI backend
during development so the frontend doesn't hardcode `http://localhost:8000`.
The backend itself serves `GET /returns` at the root — the prefix is a
client-side convenience that disappears in any reasonable production
deployment (reverse proxy, ingress, etc.).

That's it. Everything else matches the spec.

---

## Assumptions

- **Date range is inclusive on both ends.** The user picks Jan 1–Jan 31
  and gets returns for valid trading days within that range. (yfinance's
  `end` parameter is exclusive — I adjust internally so the API behaves
  intuitively.)
- **The first day in the range has no return.** Returns are
  `(today / yesterday) - 1`, so day 1 has no prior price. That row is
  dropped; the response starts at day 2.
- **Non-trading days are absent, not zero.** Weekends and holidays don't
  appear in the response. This is yfinance's behavior and is the right
  one — a "0% return on Saturday" is nonsense.
- **No artificial range cap — full history is supported.** A request is
  bounded only by what yfinance has (each ticker from its IPO onward). Even
  the full ~14-year common history of all seven names is a ~1 MB response, so
  a hard cap isn't worth the lost functionality. A range that genuinely has no
  trading data (a weekend, a future range, or dates before any ticker existed)
  returns a **422** with a clear message — distinct from a real upstream
  failure (**502**), so the UI doesn't offer a pointless retry.
- **Partial coverage is fine.** Over a long range, younger tickers simply
  start later (META from its 2012 IPO, etc.); each chart shows its own
  available history.
- **The TTL cache is 5 minutes.** Daily closes don't change intraday for
  completed trading days, so 5 minutes is a balance between freshness near
  the current day's close and minimizing yfinance load.
- **All 7 tickers are always requested together.** The cache key is the
  date range alone, not (range × ticker). This matches how the tool is
  used and keeps the cache small.

---

## Testing

```bash
# Backend
cd backend
uv run pytest -v

# Frontend
cd frontend
npm test
```

**Backend** (13 tests):

- Pure logic: returns math, stats math, NaN handling, empty inputs
- Cache: set/get, TTL expiration
- API: happy path, cache-hit verification, validation rejection, no-data
  range → 422, upstream failure → 502 translation

**Frontend** (13 tests):

- Pure utils: percentage formatting, sign behavior
- Component: TickerCard renders ticker, stats, and empty data
- End-to-end via MSW: initial empty state, happy-path load, server
  validation error displayed verbatim, recoverable error with retry

External dependencies (yfinance, the network) are never hit in tests.
The Plotly chart is mocked to a placeholder because jsdom doesn't
implement canvas. Every other code path runs for real.

---

## What I'd do next

Things deliberately out of scope for a take-home but worth naming, in
roughly the order I'd tackle them in a real codebase:

1. **Replace `plotly.js` with `plotly.js-basic-dist`** in the frontend
   bundle. Same chart capabilities for this use case, ~80% smaller.
2. **Swap the in-memory cache for Redis** behind the same `Cache` protocol.
   No code changes outside `dependencies.py` — that's why the abstraction
   exists.
3. **Wire CI** (GitHub Actions): pytest + ruff + mypy on the backend, vitest
   - tsc + biome/eslint on the frontend, on every PR.
4. **Configuration via `pydantic-settings`**, sourcing from environment.
   Today the constants live in `config.py`; the swap is mechanical.
5. **Add a `/health` deep-check** that pings yfinance lazily and reports
   degraded status. The cheap `/health` we have is fine for liveness;
   readiness wants more.
6. **Error budgets on the upstream.** Track yfinance failure rates and
   return cached-stale data with a "data may be outdated" indicator
   on the UI rather than a hard error.
7. **Server-Sent Events for live updates** during the trading day. Today
   the user clicks a date range and gets a snapshot; an internal tool
   would want a live tape.
8. **Properly typed yfinance.** I have `ignore_missing_imports` for it
   in mypy; in a real codebase I'd write a small stub file.
9. **Storybook for the components**, especially the cards. Designers like it,
   visual regressions get caught early.
10. **Auth.** Obvious, but worth naming so it's not "forgotten."

---

## Project layout

```
acadian-mag7/
├── README.md
├── backend/
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py            # FastAPI app, CORS, router mounting
│   │   ├── config.py          # Constants
│   │   ├── models.py          # Pydantic models
│   │   ├── dependencies.py    # DI providers
│   │   ├── api/
│   │   │   └── returns.py     # Route handler (thin)
│   │   └── services/
│   │       ├── cache.py       # TTL cache + protocol
│   │       ├── prices.py      # yfinance wrapper + protocol
│   │       └── returns.py     # Pure returns math
│   └── tests/
│       ├── conftest.py
│       ├── test_returns_logic.py
│       ├── test_cache.py
│       └── test_api.py
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── theme.ts
    │   ├── types.ts
    │   ├── api/returns.ts
    │   ├── hooks/useReturns.ts
    │   ├── utils/stats.ts
    │   └── components/
    │       ├── DateRangePicker.tsx
    │       ├── ReturnsGrid.tsx
    │       ├── TickerCard.tsx
    │       ├── SummaryTable.tsx
    │       ├── LoadingState.tsx
    │       └── ErrorState.tsx
    └── tests/
        ├── setup.ts
        ├── test-utils.tsx
        ├── mocks/
        │   ├── server.ts
        │   └── handlers.ts
        ├── components/
        │   ├── TickerCard.test.tsx
        │   └── App.test.tsx
        └── utils/
            └── stats.test.ts
```
