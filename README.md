# FundLens

**Mutual Fund Research & Comparison Studio**

FundLens offers a **Guided** research experience for investors who want plain-language interpretation and an **Advanced** workspace for investors who want to inspect metrics, assumptions and source lineage. It is a research aid, not a recommendation engine.

<https://fundlens-studio.vercel.app/>

FundLens is an interactive research prototype for self-directed Indian mutual fund investors. It focuses on understanding return behaviour, not producing a black-box fund recommendation.

## Product areas

- **Fund universe:** searchable scheme directory with scheme-code-level selection and Direct / Regular / Growth quick filters.
- **Overview:** NAV performance chart, trailing NAV-derived returns, and drawdown chart.
- **Rolling-return lab:** custom holding windows from 1 to 120 calendar months, daily / weekly / monthly start-date sampling, rolling-return time series, outcome histogram, average, median, best/worst window, and percentage of positive windows.
- **Risk profile:** annualised volatility, maximum drawdown, positive-day share, and daily-return distribution.
- **Guided / Advanced modes:** guided rolling consistency and plain-language interpretation, plus an advanced risk-adjusted and benchmark-relative scorecard.
- **Advanced ratios:** Sharpe and Sortino from NAV; Alpha, Beta, Information Ratio, tracking error, benchmark CAGR and excess CAGR only when a matched daily benchmark TRI CSV is imported.
- **Benchmark-relative rolling analysis:** compares fund and benchmark CAGR over identical historical holding windows.
- **Category-aware research:** distinct evaluation lenses for active equity, index / passive, debt and hybrid schemes.
- **Scheme disclosures:** dated AMC AUM, cost, riskometer and reported metric snapshots for six curated schemes, kept separate from NAV-calculated results.
- **Portfolio exposure import:** session-only CSV upload for holdings and sector-weight aggregation.
- **Compare funds:** side-by-side NAV-derived return and risk comparisons for up to three schemes.

## Data and methodology

Historical NAV data is requested from [MFapi.in](https://www.mfapi.in/docs/), which documents a searchable scheme directory and scheme-level NAV history endpoints based on AMFI NAV disclosures. See the [AMFI NAV portal](https://www.amfiindia.com/net-asset-value/nav-download) for the primary NAV download and history surface.

The prototype calculates trailing CAGR, volatility, drawdown and rolling returns from the selected plan/option's NAV observations. For rolling returns, the engine shifts each eligible start date forward by the custom number of calendar months, finds the first NAV observation on or after that date, then calculates either absolute holding-period return or annualised CAGR. Start dates are sampled daily, weekly (every five trading observations), or monthly (every 21 trading observations).

**Benchmark caution:** benchmark-relative measures remain unavailable until a matched daily TRI file is uploaded. The app does not substitute a price index or invent benchmark data. AUM, TER and holdings are not returned by the NAV endpoint; the prototype therefore uses dated, separately sourced AMC snapshots for selected examples and offers a portfolio CSV import. See `docs/DATA_IMPORT_GUIDE.md`, `docs/ADVANCED_METRICS_METHODOLOGY.md` and `docs/CATEGORY_AWARE_RESEARCH.md`.

## Run locally

No package installation or build step is required.

```bash
python3 -m http.server 3000
```

Open <http://localhost:3000>.

## Deploy on Vercel

This is a static HTML app. Import the repository into Vercel and use:
- Framework preset: **Other**
- Build command: blank
- Output directory: `.`
- Install command: blank

The connected GitHub repository deploys the root `index.html` on pushes to `main`.

## Important

This is a product prototype, not investment advice. Data access depends on the third-party NAV API's availability, terms and rate limits. Verify current scheme information with the AMC and primary regulatory disclosures before making investment decisions.
