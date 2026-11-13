# FundLens automatic-data smoke tests

**Tested:** 13 November 2026  
**Branch:** `feat/automatic-portfolio-holdings`  
**Purpose:** Preserve the historical Vercel preview smoke-test record for the automatic public holdings flow. Results below are from a public preview API and dated AMC disclosures, not production account data. They do not certify the current Cloudflare deployment.

## Preview build

- Frontend route returned HTTP 200.
- Holdings Overlap navigation and the common-security detail table were present.
- No HTML file-upload control was present.
- Temporary workbook-debug output was not present in the API response.
- Forced refresh returned HTTP 200 with `Cache-Control: no-store, max-age=0`.

## Public holdings retrieval

| Scheme | AMC | Reporting date | ISIN-matched positions | Listed-equity coverage of scheme NAV | Result |
|---|---|---:|---:|---:|---|
| HDFC Flexi Cap Fund - Direct Growth | HDFC Mutual Fund | 31 Oct 2026 | 85 | 97.56% | HTTP 200 |
| Parag Parikh Flexi Cap Fund - Direct Growth | PPFAS Mutual Fund | 31 Oct 2026 | 54 | 82.49% | HTTP 200 |
| Parag Parikh Large Cap Fund - Direct Growth | PPFAS Mutual Fund | 31 Oct 2026 | 101 | 99.36% | HTTP 200 |
| Parag Parikh Conservative Hybrid Fund - Direct Growth | PPFAS Mutual Fund | 31 Oct 2026 | 10 | 22.07% | HTTP 200 |
| Parag Parikh Liquid Fund - Direct Growth | PPFAS Mutual Fund | 31 Oct 2026 | 0 | Not applicable | HTTP 422, no listed-equity holdings |

Coverage is the sum of successfully parsed listed-equity / equity-related holding weights as a percentage of that scheme's NAV. It is not a claim that the workbook or scheme portfolio is 100% equity. The conservative hybrid result intentionally excludes the debt sleeve.

## Cross-AMC overlap calculation

HDFC Flexi Cap Fund (Direct Growth) and Parag Parikh Flexi Cap Fund (Direct Growth) both use 31 October 2026 portfolio snapshots.

- Common ISINs: **21**
- Pairwise overlap: **30.90%**
- Method: sum, across common ISINs, of the lower disclosed NAV weight in the two schemes.
- Largest overlap contributions included HDFC Bank (5.79 percentage points), ICICI Bank (5.48), Kotak Mahindra Bank (3.75), Bharti Airtel (3.07) and Axis Bank (2.79).

This is a holdings overlap measure, not correlation, diversification quality or a forecast. It does not incorporate hedges or a user's actual account-level fund allocation.

## Other automatic data checks

- RBI 10-year sovereign yield proxy returned HTTP 200, 7.243% as of 12 November 2026, from RBI Current Rates. The app labels this as a long-dated sovereign proxy held constant across the selected NAV sample, not a maturity-matched short-term daily risk-free series.
- AMFI Fund Performance API returned benchmark, AUM and official plan-specific IR for Parag Parikh Flexi Cap Fund Direct Growth.
- AMFI TER workbook retrieval succeeded on a direct retry for Parag Parikh Flexi Cap Fund Direct Growth (0.68%, date 12 November 2026). One concurrent smoke-test attempt timed out, so upstream availability should be treated as variable rather than guaranteed.
- The earlier direct NSE historical-data route returned HTML challenge responses and was retired.
- The replacement GitHub implementation reads Tipsheet's published weekly NSE TRI-derived dataset for supported Nifty indices. The connector selects only tr (Total Return), excludes pr (Price Return), validates weekly spacing and matches benchmark observations to NAV dates exactly.
- A local parser test selected tr from a representative nested dataset shape. This is a parser test, not a live upstream integration test.
- The benchmark parser is present in the repository and is routed through the Cloudflare Worker entry point. Benchmark-dependent Alpha, Beta, calculated IR, tracking error and relative rolling metrics remain conditional on a live `/api/benchmark` response containing validated weekly observations and sufficient exact-date NAV matches.
- No price-return series, Tipsheet model index, fabricated value or synthetic benchmark is permitted as a fallback.

## Scope and known limitations

- Verified automatic holdings adapters: **PPFAS Mutual Fund and HDFC Mutual Fund**. This does not mean every AMC or every scheme is covered.
- Holdings files are monthly disclosures, not real-time positions.
- Only exact ISIN matches are used for stock overlap. Name-only fuzzy security matches are not used.
- Debt, cash, derivatives, unclassified rows and rows without valid ISINs are excluded from the equity-overlap view.
- Arbitrage and equity-savings schemes are withheld because gross share holdings do not represent net market exposure.
- Analysis is suppressed when the selected reporting dates differ by more than 45 days. Disclosures older than 45 days are marked stale.
- Allocation inputs are hypothetical weights across selected funds. No Angel One login, account integration, holdings upload or personal portfolio access is used.
- Unsupported AMC sources, unrecognized workbooks, missing dates and failed validations must produce explicit unavailable states, never estimates.

## Reproduction

Use the preview build for branch `feat/automatic-portfolio-holdings` and call the Holdings API with an MFAPI scheme code:

- `/api/holdings?schemeCode=118955` (HDFC Flexi Cap Direct Growth)
- `/api/holdings?schemeCode=122639` (PPFAS Flexi Cap Direct Growth)
- `/api/holdings?schemeCode=154155` (PPFAS Large Cap Direct Growth)
- `/api/holdings?schemeCode=148958` (PPFAS Conservative Hybrid Direct Growth)
- `/api/holdings?schemeCode=143269` (PPFAS Liquid Direct Growth, expected no-equity response)
- Append `&refresh=1` to bypass edge caching for a source refresh.


## Cloudflare Workers deployment

**Canonical URL:** https://fundlens.krishnalahoti2004.workers.dev/

The repository now includes `wrangler.jsonc` and `cloudflare/worker.js`. The Worker serves the static `index.html` asset and dispatches these routes to the existing API handlers:

- `/api/health`
- `/api/risk-free-rate`
- `/api/amfi-performance`
- `/api/amfi-ter`
- `/api/benchmark`
- `/api/holdings`

This audit could not fetch the supplied `workers.dev` hostname from its current network environment. Therefore, the historical Vercel preview tests above are not treated as production verification for Cloudflare.

### Post-deployment checks

1. Open `/api/health` and confirm the response lists all five data routes.
2. Confirm `/api/risk-free-rate` returns a dated RBI observation and inspect `isFallback`.
3. Request `/api/benchmark?index=NIFTY%2050&start=2023-01-01&end=2026-11-13`; verify a weekly response and a non-zero observation count.
4. Request `/api/holdings?schemeCode=122639` and `/api/holdings?schemeCode=118955`; verify both return HTTP 200 and comparable disclosure dates.
5. In Holdings Overlap, add those two supported Direct Growth schemes, keep both hypothetical allocations above zero, and calculate. The pairwise heatmap should show the two off-diagonal overlap cells (same value in both directions), and the sector donut should show the allocation-weighted classified-equity mix. Existing tables should remain visible below the charts.

The charts depend on validated holdings, exact ISIN matching, disclosure dates within 45 days and positive allocation weights. If those conditions fail, FundLens intentionally withholds the combined charts instead of inventing or silently renormalising data.
