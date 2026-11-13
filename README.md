# FundLens

**Mutual Fund Research & Comparison Studio**

Live prototype: <https://fundlens-studio.vercel.app/>

FundLens is a research workspace for self-directed Indian mutual fund investors. It addresses a specific product opportunity: moving beyond a single trailing-return figure to understand consistency, risk-adjusted performance, benchmark-relative outcomes and portfolio duplication.

It is not a recommendation engine and does not provide investment advice.

## Product experience

### Guided / Basic
A plain-language experience that explains:
- What a rolling return measures and how outcomes vary by historical investment start date.
- The share of historical rolling windows with positive returns.
- Median rolling CAGR and maximum observed drawdown.
- Why a benchmark-relative conclusion cannot be drawn without a matched benchmark TRI.

### Advanced
A methodology-first workspace that exposes:
- NAV-derived trailing returns, annualised volatility and maximum drawdown.
- Sharpe and Sortino ratios using an explicit user-entered annual risk-free / target-rate assumption.
- Alpha, Beta, Information Ratio, tracking error and benchmark-relative CAGR only when an appropriate benchmark TRI is imported and matched by date.
- A configurable analysis period, benchmark selection and metric explanations.
- Category-aware interpretation for active equity, index/passive, debt and hybrid schemes. Category detection is a research aid and should be verified against the scheme's latest SID / factsheet.

## Research workspaces

- **Fund universe:** search scheme names / AMCs using the MFapi.in scheme directory and load scheme-level NAV history.
- **Overview:** selected scheme metadata, NAV-based trailing returns, a normalised investment-value chart and historical drawdown.
- **Rolling lab:** configurable 1–120 month holding windows, daily / weekly / monthly start-date sampling, absolute or annualised returns, rolling outcome chart and histogram.
- **Compare funds:** compare up to three schemes with NAV-derived return / risk measures. The comparison is descriptive, not a universal ranking.
- **Risk profile:** annualised volatility, maximum drawdown, positive-day share and daily-return distribution.
- **Source and methodology disclosures:** explain formulas, date matching, data limitations and source requirements.

## Data sources and integrations

### Scheme NAV
Scheme search and NAV observations are requested from [MFapi.in](https://www.mfapi.in/docs/), a third-party API that republishes AMFI NAV disclosures. The API is not a total-return index and does not supply the complete holdings, AUM, TER or factsheet risk data. The newest date returned by that service may lag the current date.

### Benchmark TRI
Benchmark-relative metrics require a daily Total Returns Index (TRI) series for the **exact Tier 1 benchmark** declared in the current scheme SID / factsheet. The user selects the benchmark name and imports the official TRI CSV in Advanced view. The app joins NAV and TRI on exact dates only, does not forward-fill, does not substitute a price index and does not manufacture missing observations.

For Nifty family indices, NSE Indices publishes downloadable historical Total Returns Index values through its [historical data reports](https://www.niftyindices.com/reports/historical-data). NSE explains why a TRI, which includes constituent dividends, is the appropriate comparison for total returns: [NSE Total Returns Index](https://www.nseindia.com/static/products-services/indices-total-returns-index).

### Fund disclosures
A small set of selected-scheme AUM, cost, riskometer, benchmark and AMC-reported ratio examples is included as dated reference data. These values are **not refreshed by the NAV API**. They are not comprehensive or synchronised to one common reporting date. BER is not relabelled as TER. The source register and caveats are in `docs/REAL_FUND_DATA_SOURCES.md`.

### Holdings
Portfolio overlap depends on the latest monthly holdings disclosure. SEBI's mutual fund disclosure framework requires scheme portfolios, including ISINs, to be made available in downloadable format. Users download the relevant AMC disclosures and combine the required rows into the provided FundLens template. The application does not currently scrape or centrally store every AMC's holdings file.

## Key calculations

- **CAGR:** NAV / TRI growth over actual elapsed calendar time.
- **Volatility:** sample standard deviation of daily NAV returns multiplied by √252.
- **Sharpe:** mean daily excess return over the user-entered risk-free assumption, divided by daily return standard deviation, multiplied by √252.
- **Sortino:** mean daily excess return divided by downside deviation relative to the same target-rate assumption, multiplied by √252.
- **Beta:** sample covariance of fund and benchmark daily returns divided by benchmark return variance.
- **Alpha:** annualised daily CAPM intercept using matched fund / benchmark returns and the selected risk-free assumption.
- **Tracking error:** sample standard deviation of daily active returns multiplied by √252.
- **Information Ratio:** daily arithmetic active return divided by the sample standard deviation of daily active returns, using the Tier 1 benchmark. The implementation does not apply an extra √252 multiplier to this daily estimate, in line with the daily return formulation described by SEBI.
- **Pairwise stock overlap:** sum, across securities present in both funds, of the lower of their two reported portfolio weights.
- **Blended stock / sector exposure:** sum of each fund's investor-entered allocation multiplied by its disclosed holding / sector weight, divided by the total investor allocation.

Full formulas, sample rules and limitations: `docs/ADVANCED_METRICS_METHODOLOGY.md`, `docs/ROLLING_RETURN_METHODOLOGY.md`, `docs/CATEGORY_AWARE_RESEARCH.md`, and `docs/PORTFOLIO_OVERLAP_METHODOLOGY.md`.

## Running locally

No package installation or build step is required.

```bash
python3 -m http.server 3000
```

Open <http://localhost:3000>.

## Important limitations

- Benchmark TRI import is currently manual and session-only. No production-grade benchmark data licence / API is connected.
- Scheme holdings import is manual and session-only. The quality and recency of overlap results depend on the AMC disclosure supplied by the user.
- Dated scheme disclosures cover selected examples only. They are not comprehensive live AUM / TER / holdings integrations.
- Category classification is heuristic and needs confirmation against the latest SID / factsheet.
- NAV-based risk and return calculations depend on the availability and quality of NAV history. A NAV series alone cannot provide benchmark-relative metrics.
- The app does not yet model derivatives look-through, transaction costs, investor cash flows, taxes, liquidity, credit migration, or complete risk across asset classes.
- Overlapping rolling windows are not independent observations. A positive-window share is a historical sample statistic, not a forecast or probability of future profit.

FundLens is a product prototype for research and discussion, not investment advice. Verify current information with AMC, AMFI, SEBI and index-provider disclosures before making investment decisions.

## Product-scope decision: portfolio overlap

FundLens does not currently ship a portfolio-overlap module. Angel One already has an Angel One-hosted NXT Fund & Stock Lab page that lists an Overlap Checker, pairwise overlap matrix, common holdings, stock-to-scheme holdings search and holdings-based visualisations. The page is separate from the documented primary Mutual Funds journey, and its indexed state says the MF data snapshot needs an upstream refresh. We therefore do not pitch stock overlap as a novel FundLens feature. See `docs/COMPETITIVE_RESEARCH_PORTFOLIO_OVERLAP.md` for the distinction between the mainstream app documentation and the NXT research surface.
