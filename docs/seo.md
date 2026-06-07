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

## TODOs

- [ ] Validate the clusters above with a keyword tool; rank by volume × (1 −
      competition). Start with single-metric + free-alternative (lowest comp).
- [ ] Add per-route SSR/pre-rendering so `/compare` and `/portfolio` URLs serve
      crawlable HTML with dynamic `<title>`/meta/H1.
- [ ] Template SEO copy for compare & portfolio routes (title, meta description,
      H1, one generated intro sentence with the headline number).
- [ ] Seed list of high-value ticker combos to statically pre-build (top-100
      pairwise, popular ETF trios, named portfolios).
- [ ] `sitemap.xml` + `robots.txt` generation covering the pre-built combos.
- [ ] Open Graph / Twitter card meta so shared links render rich previews.
- [ ] Structured data (JSON-LD) where applicable.

## Out of scope (don't target — we don't do these yet)

Avoid `dollar cost averaging calculator`, `inflation-adjusted returns`, `monte
carlo retirement`, `factor/expense-ratio analysis`. Ranking for them now bounces
visitors. They're a **future-features → future-keywords** roadmap, not current.
