# FundLens prototype scope, integrations and interview defensibility

## Product problem

FundLens addresses a research-interpretation opportunity in the mutual fund discovery journey. Investors can access scheme returns, ratings, category information and peer comparisons, but these items do not automatically answer:
- How have outcomes varied across different historical investment start dates?
- Did the scheme outperform its appropriate benchmark on matched dates?
- What level and type of risk accompanied the return?
- What do the metrics mean, and what data / assumptions produced them?

The product proposition is a category-aware, explainable research workspace with Guided / Basic and Advanced experiences. It is not "a mutual fund comparison tool" in isolation; comparison and many ratios already exist elsewhere in the market.

## Implemented in the current static prototype

| Area | What is implemented | Data dependency |
|---|---|---|
| Guided / Basic | Plain-language rolling consistency, median outcome, positive-window share and drawdown interpretation | Scheme NAV history |
| Advanced | Formula notes, automatically retrieved RBI G-Sec risk-free proxy, 1Y / 3Y / 5Y / 10Y / Max analysis periods | Scheme NAV; benchmark TRI for benchmark ratios |
| Fund discovery | Scheme search and scheme-code selection | MFapi.in scheme directory |
| NAV history | Historical NAV download and NAV-derived trailing performance | MFapi.in API availability |
| Rolling consistency | Configurable holding window, sampling frequency, distribution, best / worst / median / average and positive-window share | Scheme NAV history |
| Benchmark-relative rolling | Same-date matched fund and TRI CAGR across holding windows | Automatically retrieved NSE TRI for supported Nifty benchmarks; no substitute for unsupported CRISIL / unmapped indices |
| Risk-adjusted scorecard | NAV Sharpe / Sortino; official AMFI IR; matched Alpha / Beta / calculated IR / tracking error only when daily TRI is available | RBI 10Y G-Sec proxy; AMFI official IR; daily TRI for regression metrics |
| Category-aware lens | Distinct active equity, index / passive, debt and hybrid research priorities | Heuristic scheme classification plus user verification |
| Automatic disclosures | AMFI AUM, Riskometer, benchmark, plan-specific official IR, trailing fund / benchmark performance, and plan-specific full TER | AMFI Fund Performance API and monthly TER workbook; curated snapshots are fallbacks |
| Holdings overlap & exposure | Search up to five schemes, automatically retrieve supported AMC files, ISIN-matched listed-equity pairwise overlap, and hypothetical allocation-weighted security / sector exposure | PPFAS and HDFC public monthly scheme workbooks; no user uploads; dated snapshots |
| Comparison | Up to three scheme comparison and NAV-derived return / risk summaries | Loaded NAV histories; matching category / plan / option still matters |

## Automatic holdings module: supported scope and safeguards

The prototype now has a Holdings Overlap workspace. It searches schemes through MFAPI and requests a public monthly portfolio workbook from either PPFAS or HDFC Mutual Fund. The PPFAS adapter reads scheme-level XLSX files from its Portfolio Disclosure page. The HDFC adapter reads monthly scheme XLSX files from its Monthly Portfolio page. These are the first two verified AMC adapters, not universal AMC coverage. The backend checks the source host and XLSX structure, requires instrument name / ISIN / weight columns, validates ISINs and weights, aggregates duplicate ISIN rows and rejects workbooks whose parsed listed-equity weight exceeds 105% of scheme NAV. Overlap uses exact ISIN matches only.

Pairwise overlap is calculated as the sum of the lower scheme NAV weight for each common ISIN. Combined security and sector exposures use hypothetical allocations among selected funds (equal-weighted by default). This does not read or claim to represent a user's Angel One portfolio. The app withholds analysis when selected disclosure dates differ by more than 45 days and flags files older than 60 days. Debt, cash, derivatives, non-equity rows and missing-ISIN lines are excluded from this equity-only calculation. Unsupported AMCs and unvalidated workbook formats remain unavailable rather than being estimated.

## What is not an automatic live integration

The prototype does not have a production data agreement, API key or backend connection for:
- A reliable daily benchmark TRI provider. The current NSE public endpoint returns an HTML challenge when called from the Vercel serverless environment.
- Automatic YTM, duration, credit-quality and manager disclosures for every scheme. Holdings ingestion currently has PPFAS and HDFC adapters; other AMC formats are not guessed. AUM, Riskometer, IR, benchmark and TER are retrieved automatically when AMFI returns a sufficiently close scheme match.
- Automatic effective-dated mapping from scheme code to the current Tier 1 benchmark.
- User portfolios from Angel One accounts or demat / CAS statements.

AMFI scheme details and TER are retrieved automatically through cached serverless routes when matched. PPFAS and HDFC month-end listed-equity holdings are retrieved automatically from their scheme-level workbook disclosures when matching files can be validated. The RBI G-Sec yield proxy is fetched and held constant across the selected sample. Daily Nifty TRI requests are attempted but currently blocked by NSE HTML challenge responses. Curated disclosures are dated fallbacks only.

## Why these gaps remain

1. **Benchmark source / licensing:** official index data is published through index-provider channels, but the current public NSE endpoint returns an HTML challenge to serverless requests. A production build should use an approved index-data API or subscription.
2. **Scheme-to-benchmark mapping:** AMFI supplies the declared scheme benchmark for matched records. It must still be checked against the current SID / factsheet because the benchmark is scheme-specific and can change.
3. **Static app architecture:** the current product is a single-page static website with cached serverless API routes. There is no database, user authentication, persisted user portfolio or audited calculation service.

These gaps do not make the product concept impossible. They are reasons not to pretend those capabilities are already live. A production build would connect approved provider data, add normalisation and validation, version source snapshots, and display freshness / coverage per metric.

## Interview-safe statements

Use:
- "The prototype calculates these measures when the required data is present."
- "Benchmark-relative metrics require the current scheme benchmark and matched TRI observations."
- "The user can inspect the formula, period, source and missing-data limitations."

Do not use:
- "All ratios are live for every Indian mutual fund."
- "FundLens automatically downloads every AMC's portfolio."
- "A positive rolling-window share is the probability of future gains."
- "FundLens recommends the best fund."

## Validation still needed

The original product hypothesis requires user research and a current hands-on Angel One product audit. Useful tests:
- Can a new investor understand positive rolling-window share and drawdown in Guided view?
- Does Advanced view make benchmark, date and risk-free assumptions sufficiently inspectable?
- Does the workflow improve investor understanding without implying a recommendation?

Treat these as hypotheses and validation tasks until evidence is collected.

## Competitive finding: portfolio overlap

An Angel One-hosted NXT Fund & Stock Lab page advertises an Overlap Checker, pairwise overlap matrix, common holdings, stock search across schemes and portfolio visualisations. The primary Angel One mutual-fund user guide documents individual scheme holdings and peer comparison, but does not describe cross-scheme overlap in that journey. The NXT page is a separate research surface, and the indexed page reports that its mutual-fund dataset must be refreshed from an upstream API; the refresh controls are protected. Thus the feature exists on an Angel One-hosted surface, but public evidence does not establish that it is fully populated and available to every retail app user. FundLens excludes a duplicate overlap widget and treats integration / discoverability only as a possible future product question, subject to first-party verification.


## Public holdings data feasibility

Public holdings data is available on a recurring disclosure basis. SEBI's Master Circular dated 20 March 2026, clause 6.1.1, requires AMCs to disclose each scheme portfolio with ISIN as at month end on both AMC and AMFI websites within 10 calendar days, in a user-friendly downloadable spreadsheet. Debt scheme portfolios, including instrument yield, are disclosed fortnightly within five calendar days.

This means automatic holdings ingestion is technically feasible through scheduled retrieval of public AMC / AMFI files, followed by format normalisation, ISIN mapping, validation and versioned storage. It is not equivalent to a clean real-time API: files and layouts still need robust ingestion and quality controls.

That technical feasibility does not make a generic overlap module a FundLens opportunity. Angel One's NXT Fund & Stock Lab already advertises search by stock / scheme, holdings search, an overlap checker, pairwise matrix, chord / Venn views and common-holdings analysis. Its indexed page also says the MF snapshot has not yet been loaded and that refresh controls are protected. The capability exists as an Angel One-hosted product surface; whether it is fully populated and surfaced to every core-app user still needs first-party verification.


## Automatic inputs and user uploads

The live UI has no upload controls. Scheme NAV is requested from MFapi.in. AMFI Fund Performance supplies benchmark mapping, AUM, Riskometer, official plan-specific IR and trailing fund / benchmark returns. AMFI monthly workbook supplies Direct / Regular full TER. The RBI current 10-year G-Sec proxy is automatically retrieved and displayed with source and date. PPFAS and HDFC scheme portfolio workbooks are automatically requested for supported schemes and processed using exact ISINs. The current NSE TRI endpoint is blocked from the serverless environment, so daily benchmark ratios are not populated until an approved TRI feed is available.


## Automatic-source smoke tests

On 13 November 2026, FundLens' AMFI Fund Performance route returned Parag Parikh Flexi Cap Fund (Direct) with the AMFI benchmark Nifty 500 TRI, AUM ₹1,56,539.94 crore, Riskometer Very High, and official Direct-plan IR values for 1Y / 3Y / 5Y / 10Y. The AMFI TER route returned Direct-plan full TER 0.68% with a TER date of 12 November 2026. These are source tests for one scheme, not proof of universal coverage across all AMCs.
