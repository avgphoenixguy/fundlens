# FundLens automatic data and assumptions guide

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

- Scheme mapping: current AMFI benchmark name is retrieved automatically when available.
- Intended history source: NSE Indices Historical Data Reports, Total Returns Index Values.
- Implementation: FundLens requests daily TRI through a cached Vercel /api/benchmark route for supported Nifty benchmark names.
- Current limitation: NSE historical-data requests return HTML challenge responses from the Vercel serverless environment. Consequently, Alpha, Beta, FundLens-calculated IR, tracking error, benchmark CAGR and benchmark-relative rolling outcomes are suppressed when no matched daily TRI is received.
- No price-index substitution is used. AMFI-reported trailing benchmark performance and official IR remain available from the AMFI Fund Performance API even when daily TRI history is not.

## 6. Automatic AMC portfolio holdings

- Search: scheme name and scheme code are discovered from the MFAPI directory. No uploads or account credentials are requested.
- First verified adapter: PPFAS Mutual Fund's public Portfolio Disclosure page, which lists separate month-end XLSX workbooks by scheme identifier. This is a deliberately narrow adapter, not universal AMC support.
- Trigger: when a Direct Growth scheme is added to Holdings Overlap, the backend retrieves the AMC disclosure page and selects the matching scheme workbook.
- Validation: HTTPS host allowlist, XLSX ZIP structure, valid worksheet, explicit instrument-name / ISIN / portfolio-weight columns, valid ISIN pattern, numeric weights, and as-of date parsed from the file name / link. Duplicate ISIN rows are aggregated. The total parsed listed-equity weight must not exceed 105% of scheme NAV or the workbook is rejected.
- Matching: overlap is calculated only on exact ISINs. Fuzzy company-name matches are never used. Listed-equity rows are included; debt, cash, derivatives, non-equity and rows without a valid ISIN are excluded.
- Pairwise formula: Overlap(A,B) = sum across ISINs of min(weight in A, weight in B), with each weight expressed as a percentage of scheme NAV.
- Combined exposure: sum across schemes of (hypothetical allocation to scheme x disclosed holding weight). Allocations are user-controlled hypothetical weights across selected schemes and normalize to 100%. Equal allocation is the default. These are not actual account holdings.
- Snapshot rule: analysis is suppressed if selected disclosure dates differ by more than 45 days. Files older than 60 days are marked stale. Data is a dated disclosure snapshot, not live intraday holdings.
- Coverage rule: unsupported AMC, unrecognized scheme mapping, unavailable workbook, unsupported workbook layout, missing as-of date or failed validation returns unavailable/error. FundLens never fills missing holdings with estimates or another AMC's values.
- Source page: https://amc.ppfas.com/downloads/portfolio-disclosure/index.php

## 7. Metric availability

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
| Alpha / Beta | NAV + matched daily benchmark TRI + RBI proxy for Alpha | Not available while NSE TRI requests are blocked |
| Calculated IR / tracking error | NAV + matched daily benchmark TRI | Not available while NSE TRI requests are blocked |
| Benchmark-relative rolling outcomes | NAV + matched daily benchmark TRI | Not available while NSE TRI requests are blocked |
| Listed-equity holdings / stock overlap | PPFAS public scheme workbook + exact ISIN matching | Automatic for supported PPFAS workbooks; other AMCs unavailable |
| YTM / modified duration / credit quality | AMC / scheme portfolio disclosures | Not automatically integrated; not inferred from NAV or equity holdings |

## Sources

- MFapi.in documentation: https://www.mfapi.in/docs/
- AMFI Fund Performance page: https://www.amfiindia.com/polling/amfi/fund-performance
- AMFI monthly TER workbook endpoint: https://www.amfiindia.com/api/populate-te-rdata-revised
- AMFI Total TER disclosure page: https://www.amfiindia.com/ter
- NSE Indices historical data reports: https://www.niftyindices.com/reports/historical-data
- RBI Current Rates: https://www.rbi.org.in/?id=10395
- PPFAS monthly Portfolio Disclosure: https://amc.ppfas.com/downloads/portfolio-disclosure/index.php
- SEBI Master Circular for Mutual Funds (20 March 2026), portfolio disclosure clause 6.1.1: https://www.sebi.gov.in/sebi_data/attachdocs/mar-2026/1774024028162.pdf
- SEBI Information Ratio circular, 17 January 2025: https://www.sebi.gov.in/legal/circulars/jan-2025/disclosure-of-risk-adjusted-return-information-ratio-ir-for-mutual-fund-schemes-_90928.html
