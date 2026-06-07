# SEO & growth roadmap

Long-tail keyword research and the programmatic-SEO opportunity for the Stock
Comparison tool. Keep this honest: only target queries the tool actually serves
(adjusted-close **total return**, free/no-signup, comparison + portfolio
backtest, specific risk metrics). Volumes below are **hypotheses to validate**
in Keyword Planner / Ahrefs / Semrush before investing.

## Differentiators that map to search intent

1. **Free, no sign-up** — competitors (Portfolio Visualizer, Testfol.io,
   Morningstar) increasingly gate features. "Frustrated-by-paywall" queries are
   high-intent.
2. **Total return (adjusted close)** — dividends reinvested + splits handled, so
   "total return / dividends reinvested" keywords are accurate, not a stretch.
3. **Shareable URL = state** — unlocks programmatic SEO (see below).
4. **Specific metrics** — correlation matrix, Sharpe, max drawdown, beta/alpha,
   risk contribution, calendar-year returns — each its own niche query.

## Keyword clusters (long-tail examples)

**"Growth of money" — highest-volume long-tails**
- `how much would $10000 invested in [X] be worth today`
- `growth of $1 invested in S&P 500 chart`
- `$10,000 in [X] 5 years ago calculator`
- `[X] total return with dividends reinvested`

**Head-to-head comparison**
- `[X] vs [Y] historical performance chart`
- `[X] vs [Y] total return comparison`
- `compare ETF performance side by side free`
- `VOO vs VTI vs SPY long term returns`

**Free-alternative / no-signup (high intent)**
- `portfolio visualizer free alternative no sign up`
- `testfolio alternative free`
- `free portfolio backtester no account`
- `stock comparison tool no login`

**Portfolio backtest with rebalancing**
- `backtest portfolio with rebalancing free`
- `60 40 portfolio backtest calculator`
- `three fund portfolio backtest tool`
- `portfolio annual rebalancing return calculator`

**Single-metric tools (low competition, easy early wins)**
- `stock correlation matrix calculator free online`
- `portfolio max drawdown calculator`
- `portfolio sharpe ratio calculator free`
- `portfolio beta and alpha calculator`
- `ETF correlation checker for diversification`
- `calendar year returns comparison tool`

## The strategic play: programmatic SEO

The highest-leverage idea. Because the URL already encodes the full state, every
comparison is a real, indexable page. Auto-generate landing pages for the long
tail at near-zero marginal cost:

- `/compare?tickers=AAPL,MSFT` → *"AAPL vs MSFT — Total Return Comparison"*
- Pre-render popular combos: top-N tickers pairwise, common ETF trios, "MAG7",
  3-fund lazy portfolios — each with server-rendered title/meta/H1 + a sentence
  of generated copy ("$10,000 in AAPL would be worth $X…").

**Blocker:** the app is a client-rendered SPA today. For crawlers to see real
HTML these routes need SSR or static pre-rendering (build-time generation or an
SSR layer). That's the prerequisite for the whole programmatic play.

## Status

Shipped (build-time static pre-render — no SSR server needed):

- [x] Dynamic `<head>` per selection — `src/hooks/useDocumentMeta.ts` sets the
      title, meta description, canonical (the clean `/compare/<slug>/` URL), and
      OG/Twitter tags from app state. Logic in the dependency-free `src/lib/seo.ts`.
- [x] Templated SEO copy for compare pages (title, meta, H1, intro sentence).
- [x] Seed list of high-value combos (`SEED_COMPARISONS`) statically pre-built
      by `scripts/generate-seo-pages.ts` (runs after `vite build`). Each page
      overrides the head, injects `window.__SEO_STATE__` so the SPA boots into
      that comparison, and ships a visible H1 + copy for non-JS crawlers.
- [x] `sitemap.xml` + `robots.txt` generated, covering the homepage + combos.
- [x] Open Graph / Twitter card meta (static defaults + per-page overrides).
- [x] Structured data (`WebApplication` JSON-LD) in `index.html`.

Remaining:

- [ ] Validate the clusters above with a keyword tool; rank by volume × (1 −
      competition). Start with single-metric + free-alternative (lowest comp).
- [ ] Scale the seed list (top-N pairwise, more ETF trios, portfolio pages). The
      generator already handles arbitrary entries — this is just data.
- [ ] For the *unbounded* tail (any `AAPL vs X` on demand), add real SSR or an
      on-request pre-render edge function; the static seed covers the head.
- [ ] Set `VITE_SITE_URL` at build for correct absolute canonicals/sitemap in
      production (defaults to a placeholder).
- [ ] Per-page OG **images** (generated cards) for richer social previews.

## Out of scope (don't target — we don't do these yet)

Avoid `dollar cost averaging calculator`, `inflation-adjusted returns`, `monte
carlo retirement`, `factor/expense-ratio analysis`. Ranking for them now bounces
visitors. They're a **future-features → future-keywords** roadmap, not current.
