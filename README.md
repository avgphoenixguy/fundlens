# FundLens

**Mutual Fund Research & Comparison Studio**

Live prototype: [https://fundlens-studio.vercel.app/](https://fundlens-studio.netlify.app/)

FundLens is a research workspace for self-directed Indian mutual fund investors. It explores a product opportunity: helping investors move beyond a single trailing-return figure to understand performance consistency, risk-adjusted outcomes, benchmark context and the assumptions behind each metric.

It is not a recommendation engine and does not provide investment advice.

## Product experience

### Guided / Basic
A plain-language experience that explains:
- How rolling-return outcomes differ across historical investment start dates.
- The share of historical windows with positive returns.
- Median rolling CAGR and maximum observed drawdown.
- What the current risk-free proxy means.
- Why benchmark-relative conclusions need a real matched TRI series.

### Advanced
A methodology-first workspace that exposes:
- NAV-derived trailing returns, annualised volatility and maximum drawdown.
- Sharpe and Sortino estimates using an automatically retrieved RBI long-dated G-Sec proxy.
- Official AMFI Information Ratio values for the selected Direct / Regular plan and supported 1Y / 3Y / 5Y / 10Y periods.
- AMFI-published benchmark mapping and trailing scheme / benchmark performance.
- Alpha, Beta, tracking error and benchmark-relative rolling returns only when a real daily benchmark TRI series is successfully matched to NAV dates.
- Category-aware interpretation for active equity, index / passive, debt and hybrid schemes.

## Research workspaces

- **Fund universe:** search scheme names and AMCs using the MFapi.in scheme directory.
- **Overview:** selected scheme metadata, NAV-based trailing returns, investment growth and historical drawdown.
- **Rolling lab:** configurable 1–120 month holding windows, daily / weekly / monthly start-date sampling, absolute or annualised returns, rolling outcome chart and histogram.
- **Compare funds:** compare up to three schemes with NAV-derived return / risk measures. This is a descriptive research comparison, not a universal ranking.
- **Risk profile:** annualised volatility, maximum drawdown, positive-day share and daily-return distribution.
- **Advanced research:** automatic AMFI disclosures, automatic RBI risk-free proxy, metric definitions, data dates and category-specific research lenses.
- **Holdings overlap & exposure:** search up to five Direct Growth schemes, automatically retrieve supported public AMC holdings workbooks, compare listed-equity positions by ISIN, and calculate hypothetical allocation-weighted security / sector exposures.

## Automatic data integrations

### Scheme NAV
Scheme search and historical NAV observations are requested from MFapi.in, which republishes AMFI NAV disclosures. NAV data is not a benchmark TRI and does not supply all scheme disclosures. NAV freshness depends on the third-party provider.

### AMFI Fund Performance API
When a scheme is loaded, FundLens queries AMFI's Fund Performance API using the scheme name, inferred category and Direct / Regular plan. When an adequate name match is found, the response supplies:
- AMFI-declared benchmark name.
- Scheme AUM.
- Riskometer.
- AMFI-reported Information Ratio for 1Y, 3Y, 5Y and 10Y, plan-specific.
- AMFI-reported trailing fund and benchmark performance for those periods.
- Report date and retrieval timestamp.

The official AMFI IR is shown separately from a FundLens-calculated IR estimate. Missing official values are shown as unavailable, never as zero.

### AMFI Total Expense Ratio workbook
FundLens automatically retrieves the latest available AMFI monthly TER workbook, looks up the selected scheme and returns Direct or Regular full TER with the TER observation date. It retries the preceding month if the current month's workbook is unavailable. If no sufficiently close scheme match exists, it does not guess a TER. A dated curated cost disclosure may be displayed as a clearly labelled fallback.

### Automatic AMC holdings
FundLens searches the MFAPI scheme directory and requests a public monthly portfolio workbook from the scheme's AMC. The verified adapters currently support PPFAS and HDFC Mutual Fund. Each adapter reads month-end scheme workbooks from the AMC's own public disclosure page; HDFC files are hosted on files.hdfcfund.com. The backend validates the AMC host, workbook type, disclosure date, instrument / ISIN / weight columns and listed-equity rows. Holdings are matched by exact ISIN only. Unsupported AMCs or malformed / stale-source data are reported; FundLens does not substitute or estimate holdings. This is not universal AMC coverage.

Pairwise overlap is the sum, across common ISINs, of the lower of the two schemes' disclosed NAV weights. Combined exposure uses hypothetical allocations across the selected funds (equal-weighted by default), not a linked Angel One account or the user's actual portfolio. Snapshot dates must be within 45 days before overlap is calculated. Debt, cash, derivatives, non-equity and rows without a valid ISIN are excluded from this equity-overlap view. Source links and as-of dates are displayed.

### RBI risk-free proxy
FundLens fetches the RBI Current Rates Government Securities Market page and uses the yield on the long-dated Government of India security closest to ten years to maturity. It displays the security, annual yield, source and observation date. The current yield is divided by 252 and held constant over the selected historical NAV window. This is a transparent proxy, not a historical daily risk-free curve or a maturity-matched short-term rate.

### Benchmark TRI
The scheme's declared benchmark is retrieved from AMFI. FundLens attempts to obtain daily Nifty TRI from the NSE Indices historical-data endpoint for supported Nifty benchmarks. The current server-side connection is returning HTML challenge responses from NSE in this environment, so benchmark TRI data is not reliably available in the public prototype at present. The UI suppresses Alpha, Beta, tracking error and benchmark-relative rolling results when matched daily TRI is absent. It does not substitute a price index or fabricate observations.

## Metric calculations

- **CAGR:** NAV growth over actual elapsed calendar time.
- **Volatility:** sample standard deviation of daily NAV returns multiplied by √252.
- **Sharpe:** mean daily scheme return less the daily RBI G-Sec proxy, divided by daily return standard deviation, multiplied by √252.
- **Sortino:** mean daily scheme return less the same RBI G-Sec target, divided by downside deviation, multiplied by √252.
- **Alpha:** annualised daily CAPM intercept using matched fund / benchmark returns and the RBI G-Sec proxy.
- **Beta:** sample covariance of matched fund and benchmark daily returns divided by benchmark return variance.
- **FundLens Information Ratio estimate:** daily arithmetic active return divided by sample standard deviation of daily active returns, annualised by √252. It is shown only when a matched benchmark TRI is available.
- **AMFI Information Ratio:** official AMFI-published plan-specific period value, preferred over the FundLens estimate when available. It is not recalculated by FundLens.
- **Tracking error:** sample standard deviation of daily active returns multiplied by √252.
- **Benchmark-relative rolling:** fund and benchmark CAGR over exactly the same matched NAV / TRI start and end dates.

Full formulas, source lineage and limitations are in the Advanced Metrics Methodology, Rolling Return Methodology, Category-aware Research, Automatic Data Assumptions and Prototype Scope & Limitations documents.

## No user uploads

The current UI has no data upload controls. NAV, AMFI scheme disclosures, AMFI TER, supported AMC portfolio files and RBI yield are retrieved automatically. Holdings retrieval currently supports PPFAS and HDFC; other AMCs are not assumed to share the same workbook format. Benchmark TRI is requested automatically but is currently subject to NSE's upstream challenge response. Missing benchmark data is reported rather than replaced with an unsuitable index.

## Run locally

No front-end package installation or build step is required.

    python3 -m http.server 3000

For local API routes, deploy to Vercel or run the Vercel development runtime so the /api/* serverless functions are available.

## Limitations

- AMFI name matching is automated and may fail for renamed, legacy or unusual scheme names. A match must pass a similarity threshold.
- Scheme category classification for AMFI queries uses MFAPI scheme metadata and scheme-name heuristics. Confirm the category and benchmark against the current SID / factsheet.
- The RBI 10-year G-Sec yield is a current sovereign proxy held constant across the historical return sample. For debt funds, a duration-matched short-term sovereign reference could be more appropriate.
- NSE's public historical TRI endpoint is not a documented commercial API and is currently returning HTML challenge responses from the Vercel serverless environment. Benchmark-dependent metrics remain unavailable until the feed works reliably or an approved index-data integration is used.
- AMFI TER workbook formats and API endpoints may change. The app displays the TER date and does not infer missing TER values.
- Curated AMC references are dated fallbacks only. They are not represented as live if the AMFI source is unavailable.
- Automatic holdings ingestion currently has PPFAS and HDFC adapters. Other AMCs return unavailable until their public workbook URL, instrument layout and weight convention are independently verified. Portfolio disclosures are periodic, not live, and may be stale.
- Overlapping rolling windows are not independent observations. Positive-window share is not a probability forecast.

FundLens is a product research prototype, not investment advice. Verify information with AMC, AMFI, SEBI, RBI and index-provider disclosures before making investment decisions.

## Product-scope decision: portfolio overlap

FundLens includes a utility-level holdings overlap workspace for supported public AMC disclosures, with no claim that generic overlap analysis is novel. Angel One already has an Angel One-hosted NXT Fund & Stock Lab surface advertising overlap analysis, pairwise holdings matrices, stock search and common-holdings views. The FundLens module is a transparent automatic-data demonstration, not a differentiated product bet or an integration into Angel One's core app. See the competitive research note on portfolio overlap.
