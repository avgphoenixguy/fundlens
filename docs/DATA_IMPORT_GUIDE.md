# FundLens automatic data integration guide (no user uploads)

FundLens has no user-facing upload controls. The application requests scheme and disclosure inputs automatically from public sources wherever the source supports the requested field.

## 1. Scheme NAV

- Source: MFapi.in scheme search and scheme history endpoints, which republish AMFI NAV disclosures.
- Trigger: when a scheme is selected or loaded.
- Use: trailing returns, rolling returns, volatility and drawdown.
- Caveat: NAV freshness depends on MFapi.in. NAV is not benchmark TRI and does not supply all scheme disclosures.

## 2. AMFI Fund Performance API

- Endpoint family: AMFI Fund Performance API, accessed via the public AMFI Fund Performance page.
- Trigger: on selected-scheme load.
- Lookup: scheme name, scheme category and Direct / Regular plan are used to find the scheme record. The server checks recent AMFI report dates and relevant subcategory records.
- Fields used: AMFI benchmark name, AUM, Riskometer, official Information Ratio for 1Y / 3Y / 5Y / 10Y by plan, and AMFI trailing fund / benchmark performance for those periods.
- Source date: the AMFI report date returned by the API is displayed.
- Match rule: exact normalized scheme-name match preferred; fuzzy matching only above a strict similarity threshold. When no sufficiently close match is found, the app leaves the field unavailable rather than guessing.
- Interpretation: AMFI-reported IR values are official data disclosures. They are shown separately from a FundLens-calculated ratio and are selected by the chosen plan and selected period.

## 3. AMFI Total Expense Ratio workbook

- Endpoint: AMFI monthly TER workbook at https://www.amfiindia.com/api/populate-te-rdata-revised.
- Trigger: on selected-scheme load.
- Retrieval: current month workbook first; preceding month is attempted if the current month's workbook is unavailable.
- Fields: scheme name, NSDL scheme code, TER date, Direct Plan - Total TER (%) and Regular Plan - Total TER (%).
- Matching: scheme name is normalized and matched to the selected scheme. If no match is found, no automatic TER is returned. The app does not silently reuse a different scheme's value.
- Output: full plan-specific TER and TER date. This must not be confused with a Base Expense Ratio (BER).

## 4. RBI risk-free proxy

- Source: Reserve Bank of India Current Rates, Government Securities Market.
- Proxy: yield on 6.94% GS 2036, the long-dated Government of India security closest to 10 years to maturity in the current RBI table.
- Current verified observation: 7.2430% with yield date 12 November 2026, as returned by the RBI page fetched on 13 November 2026.
- Fallback: if the live RBI page is unavailable or the table structure changes, the app returns 7.2178% dated 11 November 2026 and visibly labels it as a fallback snapshot.
- Calculation: annual yield / 252 is used as the daily risk-free proxy and held constant across the selected historical NAV sample. It is not a daily historical risk-free curve.
- Usage: Sharpe and Alpha use it as the excess-return rate. Sortino uses the same rate as the downside target.
- Caveat: a long-dated G-Sec yield is an opportunity-cost proxy, not a universally correct risk-free rate for every period or category. A duration-matched short-term sovereign rate could be better for some debt funds.

## 5. Benchmark TRI

- Scheme mapping: current AMFI benchmark name is retrieved automatically when a sufficiently close scheme record is found.
- Published history source: Tipsheet's public indices/p dataset family, which Tipsheet documents as the weekly series used by its NSE index pages.
- Underlying source: NSE Indices Total Return Index data, with dividends reinvested. Tipsheet documents repairs of identified anomalous TRI prints against the corresponding price index. FundLens does not use the full price-return series as a substitute.
- Dataset shape: ISO dates, a series map, resolution and metadata. The observed compact keys include tr (Total Return), pr (Price Return), dd, vol, r3 and r5.
- Selection rule: FundLens selects only tr, excludes pr and other non-return fields, and validates weekly spacing.
- Output: rebased growth-of-100 observations, not raw NSE index levels. Tipsheet model indices are not used.
- Matching: exact-date matching only; no forward-fill, interpolation or price-index substitution.
- Verification: parser and path fixes are committed in GitHub but have not yet been verified in the paused Netlify production deployment. Until a deployed endpoint returns validated weekly observations, benchmark-dependent FundLens calculations remain unavailable.
- Official AMFI trailing benchmark returns and plan-specific IR remain separate source disclosures.

## 6. Metric availability

| Metric | Automatic inputs | Current status |
|---|---|---|
| NAV trailing returns / rolling returns | MFapi.in NAV | Automatic |
| Volatility / drawdown | MFapi.in NAV | Automatic |
| Sharpe | NAV + RBI long-dated G-Sec proxy | Automatic |
| Sortino | NAV + same RBI proxy as downside target | Automatic |
| Official AMFI IR | AMFI Fund Performance API, selected plan and report period | Automatic when scheme match / value is available |
| AMFI trailing fund / benchmark returns | AMFI Fund Performance API | Automatic when report value is available |
| AUM / Riskometer / benchmark name | AMFI Fund Performance API | Automatic when scheme match is available |
| Direct / Regular TER | AMFI monthly TER workbook | Automatic when scheme match is available |
| Alpha / Beta | NAV + exact-date-matched weekly TRI-derived benchmark + weekly RBI proxy for Alpha | Code committed; live deployment verification pending |
| Calculated IR / tracking error | NAV + matched weekly TRI-derived benchmark | Code committed; live deployment verification pending |
| Benchmark-relative rolling outcomes | NAV + matched weekly TRI-derived benchmark | Code committed; live deployment verification pending |
| YTM / modified duration / credit quality / holdings | AMC / scheme portfolio disclosures | Not automatically integrated yet |

## Sources

- MFapi.in documentation: https://www.mfapi.in/docs/
- AMFI Fund Performance page: https://www.amfiindia.com/polling/amfi/fund-performance
- AMFI monthly TER workbook endpoint: https://www.amfiindia.com/api/populate-te-rdata-revised
- AMFI Total TER disclosure page: https://www.amfiindia.com/ter
- Tipsheet public data catalogue: https://tipsheet.markets/data/
- Tipsheet index-page method: https://tipsheet.markets/methods/index_pages/
- Tipsheet TRI repair method: https://tipsheet.markets/methods/indices/
- NSE Indices historical data reports: https://www.niftyindices.com/reports/historical-data
- RBI Current Rates: https://www.rbi.org.in/?id=10395
- SEBI Information Ratio circular, 17 January 2025: https://www.sebi.gov.in/legal/circulars/jan-2025/disclosure-of-risk-adjusted-return-information-ratio-ir-for-mutual-fund-schemes-_90928.html
