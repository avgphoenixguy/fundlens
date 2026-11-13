# FundLens

**Mutual Fund Research & Comparison Studio**

**Live deployment (Cloudflare Workers):** [https://fundlens.krishnalahoti2004.workers.dev](https://fundlens.krishnalahoti2004.workers.dev)

**FundLens main landing page / research engine:** [Open FundLens](https://fundlens.krishnalahoti2004.workers.dev/)

**Angel One Portfolio Fit case-study demo:** Open FundLens first, then select **Try Angel One Portfolio Fit demo** on the landing page. The direct route is [here](https://fundlens.krishnalahoti2004.workers.dev/portfolio-fit/?demo=1).

The standalone concept is served from `case-study/portfolio-fit/index.html` at `/portfolio-fit/`. It is a demonstration of an optional portfolio-context layer inside Angel One Mutual Funds, uses synthetic holdings and values, and is not connected to Angel One accounts, orders, PAN or OTP.

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
- Alpha, Beta, FundLens Information Ratio estimates, tracking error and benchmark-relative rolling returns only when a weekly TRI-derived benchmark series is successfully matched to NAV dates.
- Category-aware interpretation for active equity, index / passive, debt and hybrid schemes.

## Research workspaces

- **Fund universe:** search scheme names and AMCs using the MFapi.in scheme directory.
- **Overview:** selected scheme metadata, NAV-based trailing returns, investment growth and historical drawdown.
- **Rolling lab:** configurable 1–120 month holding windows, daily / weekly / monthly start-date sampling, absolute or annualised returns, rolling outcome chart and histogram.
- **Compare funds:** compare up to three schemes without a restrictive like-for-like eligibility gate. The table shows each scheme's NAV-derived return / risk measures and its own AMFI disclosures. Benchmark-regression estimates are withheld when the selected schemes do not share a validated benchmark series or aligned NAV dates. This is a descriptive research comparison, not a universal ranking.
- **Risk profile:** annualised volatility, maximum drawdown, positive-day share and daily-return distribution.
- **Advanced research:** automatic AMFI disclosures, automatic RBI risk-free proxy, metric definitions, data dates and category-specific research lenses.
- **Holdings overlap & exposure:** search up to five Direct Growth schemes, automatically retrieve supported public AMC holdings workbooks, compare listed-equity positions by ISIN, inspect pairwise overlap in a fund-by-fund heatmap, and view hypothetical allocation-weighted sector exposure in a donut chart. Existing pairwise and security-level tables remain available for detail.

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
FundLens searches the MFAPI scheme directory and requests a public monthly portfolio workbook from the scheme's AMC. The verified adapters currently support PPFAS and HDFC Mutual Fund. Each adapter reads month-end scheme workbooks from the AMC's own public disclosure page; HDFC files are hosted on files.hdfcfund.com. The backend validates the AMC host, workbook type, disclosure date, instrument / ISIN / weight columns and listed-equity rows. Holdings are matched by exact ISIN only. Unsupported AMCs and malformed workbooks are reported; disclosures older than 45 days are ineligible for combined analysis. FundLens does not substitute or estimate holdings. This is not universal AMC coverage.

Pairwise overlap is the sum, across common ISINs, of the lower of the two schemes' disclosed NAV weights. Combined exposure uses hypothetical allocations across the selected funds (equal-weighted by default), not a linked Angel One account or the user's actual portfolio. Each holdings snapshot must be no more than 45 days old, and selected snapshot dates must be within 45 days of one another, otherwise combined analysis is withheld. Debt, cash, derivatives, non-equity and rows without a valid ISIN are excluded. Listed-equity rows with no sector field remain in an explicit 'Sector not disclosed' bucket in the donut. Source links and as-of dates are displayed.

### RBI risk-free proxy
FundLens fetches the RBI Current Rates Government Securities Market page and uses the yield on the long-dated Government of India security closest to ten years to maturity. It displays the security, annual yield, source and observation date. The annual yield is converted to an effective daily rate using (1 + annual_yield)^(1/252) - 1 for daily NAV-only metrics, and an effective weekly rate using (1 + annual_yield)^(1/52) - 1 for weekly benchmark regression. The chosen current yield is held constant over the selected historical NAV window. This is a transparent proxy, not a historical daily risk-free curve or a maturity-matched short-term rate.

### Benchmark TRI
The scheme's declared benchmark is retrieved from AMFI. The connector accepts only exact normalised names for the six configured Nifty indices (Nifty 50, 100, 500, Next 50, Midcap 150 and Smallcap 250); broader prefix matches such as Nifty 50 Equal Weight are rejected. When AMFI retrieval fails for a reference scheme, any curated benchmark fallback is labelled with its AMC source and date, not presented as an AMFI mapping. For supported Nifty benchmarks, the route reads Tipsheet's published weekly index-page dataset (indices/p/<index>). Tipsheet documents these as weekly chart series derived from NSE Indices Total Return Index data, with dividends reinvested. The dataset is published as a rebased growth-of-100 curve, not as raw NSE index levels.

The connector selects the compact tr (Total Return) series and excludes pr (Price Return), drawdown, volatility and other non-benchmark series. It validates the weekly observation cadence before returning data. Benchmark regression then uses only consecutive exact-date matches separated by 4–11 calendar days; longer gaps are skipped rather than annualised as single-week returns. The published method describes how identified anomalous TRI prints are repaired against the corresponding price index; this is a documented source correction, not a substitution of the full price-return series. FundLens does not use Tipsheet's separate model indices.

The weekly TRI connector is served through the Cloudflare Worker route `/api/benchmark`. FundLens computes benchmark-dependent Alpha, Beta, calculated Information Ratio, tracking error and relative rolling outcomes only when that route returns a validated weekly TRI-derived series and sufficient exact-date NAV matches. If retrieval, validation or date matching fails, those metrics remain explicitly unavailable. AMFI-published trailing benchmark returns and official plan-specific IR are separate source disclosures and can still be shown when AMFI supplies them.

## Metric calculations

- **CAGR:** NAV growth over actual elapsed calendar time.
- **Volatility:** sample standard deviation of daily NAV returns multiplied by √252.
- **Sharpe:** mean daily scheme return less the daily RBI G-Sec proxy, divided by daily return standard deviation, multiplied by √252.
- **Sortino:** mean daily scheme return less the same RBI G-Sec target, divided by downside deviation, multiplied by √252.
- **Alpha:** annualised weekly CAPM intercept using matched NAV / TRI-derived benchmark returns and the weekly-equivalent RBI G-Sec proxy; annualised with 52 periods per year.
- **Beta:** sample covariance of matched weekly fund and benchmark returns divided by weekly benchmark return variance.
- **FundLens Information Ratio estimate:** mean contiguous weekly arithmetic active return divided by sample standard deviation of weekly active returns, annualised by √52. Matched-date gaps outside 4–11 calendar days are excluded; at least 30 usable weekly return observations are required.
- **AMFI Information Ratio:** official AMFI-published plan-specific period value, preferred over the FundLens estimate when available. It is not recalculated by FundLens.
- **Tracking error:** sample standard deviation of weekly active returns multiplied by √52.
- **Benchmark CAGR / excess CAGR:** computed over the same first and last exact-date-matched weekly fund NAV / TRI-derived observations.
- **Benchmark-relative rolling:** fund and benchmark CAGR over exactly the same matched NAV / TRI start and end dates. Relative start dates are weekly, or monthly-spaced across weekly observations.

Full formulas, source lineage and limitations are in [Advanced Metrics Methodology](docs/ADVANCED_METRICS_METHODOLOGY.md), [Rolling Return Methodology](docs/ROLLING_RETURN_METHODOLOGY.md), [Category-aware Research](docs/CATEGORY_AWARE_RESEARCH.md), [Automatic Data Assumptions](docs/AUTO_DATA_ASSUMPTIONS.md), [Prototype Scope & Limitations](docs/PROTOTYPE_SCOPE_AND_LIMITATIONS.md) and [Automatic Data Smoke Tests](docs/AUTOMATIC_DATA_SMOKE_TESTS.md).

## No user uploads

The current UI has no data upload controls. NAV, AMFI scheme disclosures, AMFI TER, supported AMC portfolio files and RBI yield are retrieved automatically. Holdings retrieval currently supports PPFAS and HDFC; other AMCs are not assumed to share the same workbook format. Weekly benchmark TRI-derived data is requested automatically from Tipsheet for supported Nifty indices. The Cloudflare Worker entry point routes `/api/*` to the same source handlers; missing or invalid benchmark data is reported rather than replaced with an unsuitable index.

## Run locally

No front-end package installation is required. To run the full app locally with its API routes and static assets, use:

    npx wrangler dev

To publish the current `main` source to Cloudflare Workers, use:

    npx wrangler deploy

The `wrangler.jsonc` build step copies `index.html` into the configured static-assets directory. The Worker routes `/api/*` requests to the existing API handlers and serves other requests from the static-assets binding. A plain static server only serves the front end, not the data APIs.

## Cloudflare Workers deployment

The canonical public URL is [https://fundlens.krishnalahoti2004.workers.dev/](https://fundlens.krishnalahoti2004.workers.dev/). The repository includes:

- `wrangler.jsonc`: builds `dist/index.html` plus `dist/portfolio-fit/index.html`, configures static assets and sends `/api/*` requests through the Worker first.
- `case-study/portfolio-fit/index.html`: standalone Angel One Portfolio Fit case-study prototype, served at `/portfolio-fit/`.
- `cloudflare/worker.js`: routes the five data APIs to the existing handlers and serves static assets for the rest of the site.
- `/api/health`: a lightweight deployment check that lists the registered API routes.

For a manual deployment from the repository root, run `npx wrangler deploy`. When using Cloudflare Workers Builds, connect this repository on the `main` branch, set the Build command to `mkdir -p dist/portfolio-fit && cp index.html dist/index.html && cp case-study/portfolio-fit/index.html dist/portfolio-fit/index.html`, and set the Deploy command to `npx wrangler deploy`. Workers Builds does not use the `build.command` under Wrangler custom build settings, so enter the command in the Cloudflare dashboard under Settings > Build. After a deployment, check `/api/health`, then open `/portfolio-fit/` and test the data routes before relying on source-dependent outputs.

## Limitations

- AMFI name matching is automated and may fail for renamed, legacy or unusual scheme names. A match must pass a similarity threshold.
- Scheme category classification for AMFI queries uses MFAPI scheme metadata and scheme-name heuristics. Confirm the category and benchmark against the current SID / factsheet.
- The RBI 10-year G-Sec yield is a current sovereign proxy held constant across the historical return sample. For debt funds, a duration-matched short-term sovereign reference could be more appropriate.
- The weekly Tipsheet connector is an integration over published NSE TRI-derived data. Benchmark calculations remain conditional on a valid upstream response and exact-date matching. Confirm source permissions and any index-data licensing requirements before commercial use; public fetchability does not itself establish production redistribution rights.
- AMFI TER workbook formats and API endpoints may change. The app displays the TER date and does not infer missing TER values.
- Curated AMC references are dated fallbacks only. They are not represented as live if the AMFI source is unavailable.
- Automatic holdings ingestion currently has PPFAS and HDFC adapters. Other AMCs return unavailable until their public workbook URL, instrument layout and weight convention are independently verified. Portfolio disclosures are periodic, not live; snapshots older than 45 days are withheld from combined calculations.
- Overlapping rolling windows are not independent observations. Positive-window share is not a probability forecast.

FundLens is a product research prototype, not investment advice. Verify information with AMC, AMFI, SEBI, RBI and index-provider disclosures before making investment decisions.

## Product-scope decision: portfolio overlap

FundLens includes a utility-level holdings overlap workspace for supported public AMC disclosures, with no claim that generic overlap analysis is novel. Angel One already has an Angel One-hosted NXT Fund & Stock Lab surface advertising overlap analysis, pairwise holdings matrices, stock search and common-holdings views. The FundLens module is a transparent automatic-data demonstration, not a differentiated product bet or an integration into Angel One's core app. See the competitive research note on portfolio overlap.
