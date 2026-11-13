# FundLens prototype scope, integrations and interview defensibility

## Product problem

FundLens addresses a research-interpretation opportunity in the mutual fund discovery journey. Investors can access scheme returns, ratings, category information and peer comparisons, but these items do not automatically answer:
- How have outcomes varied across different historical investment start dates?
- Did the scheme outperform its appropriate benchmark on matched dates?
- What level and type of risk accompanied the return?
- Are multiple schemes in an investor's portfolio holding many of the same companies?
- What do the metrics mean, and what data / assumptions produced them?

The product proposition is a category-aware, explainable research workspace with Guided / Basic and Advanced experiences. It is not "a mutual fund comparison tool" in isolation; comparison and many ratios already exist elsewhere in the market.

## Implemented in the current static prototype

| Area | What is implemented | Data dependency |
|---|---|---|
| Guided / Basic | Plain-language rolling consistency, median outcome, positive-window share and drawdown interpretation | Scheme NAV history |
| Advanced | Formula notes, selectable risk-free assumption, 1Y / 3Y / 5Y / 10Y / Max analysis periods | Scheme NAV; benchmark TRI for benchmark ratios |
| Fund discovery | Scheme search and scheme-code selection | MFapi.in scheme directory |
| NAV history | Historical NAV download and NAV-derived trailing performance | MFapi.in API availability |
| Rolling consistency | Configurable holding window, sampling frequency, distribution, best / worst / median / average and positive-window share | Scheme NAV history |
| Benchmark-relative rolling | Same-date matched fund and TRI CAGR across holding windows | User-imported daily benchmark TRI |
| Risk-adjusted scorecard | NAV Sharpe / Sortino, matched Alpha / Beta / Information Ratio / tracking error | Risk-free assumption; benchmark TRI required for benchmark metrics |
| Category-aware lens | Distinct active equity, index / passive, debt and hybrid research priorities | Heuristic scheme classification plus user verification |
| Dated scheme references | Selected-scheme AUM, costs, riskometer, benchmark and source snapshots | Curated dated sources, not updated by NAV API |
| Portfolio overlap | Not included. Deliberately excluded after finding an Angel One-hosted NXT overlap tool | Not a FundLens differentiator |
| Comparison | Up to three scheme comparison and NAV-derived return / risk summaries | Loaded NAV histories; matching category / plan / option still matters |

## What is not an automatic live integration

The prototype does not have a production data agreement, API key or backend connection for:
- Official benchmark TRI history from NSE Indices or other index providers.
- Universal live TER, AUM, YTM, duration, credit and manager disclosures.
- Automatic effective-dated mapping from scheme code to the current Tier 1 benchmark.
- User portfolios from Angel One accounts or demat / CAS statements.

Benchmark TRI files are imported manually and held only in browser memory. Dated curated data should not be described as live.

## Why these gaps remain

1. **Benchmark source / licensing:** official index data is published through index-provider channels, but a public prototype should not scrape, redistribute or republish it as a permanent data service without checking provider terms and obtaining appropriate access.
2. **Scheme-to-benchmark mapping:** the authoritative benchmark is scheme-specific and can change. It must be checked against the current SID / factsheet, not guessed from the fund name.
3. **Holdings formats vary:** AMC disclosures differ in identifiers, debt instrument descriptions, cash, derivatives and reporting dates. Reliable cross-AMC ingestion requires normalisation and validation.
4. **Static app architecture:** the current product is a single-page static website. Browser uploads are session-only; there is no database, scheduled refresh, user authentication, file persistence or audited calculation service.

These gaps do not make the product concept impossible. They are reasons not to pretend those capabilities are already live. A production build would connect approved provider data, add normalisation and validation, version source snapshots, and display freshness / coverage per metric.

## Interview-safe statements

Use:
- "The prototype calculates these measures when the required data is present."
- "Benchmark-relative metrics require the current scheme benchmark and matched TRI observations."
- "Holdings overlap uses dated AMC portfolio disclosures uploaded for the selected schemes."
- "The user can inspect the formula, period, source and missing-data limitations."

Do not use:
- "All ratios are live for every Indian mutual fund."
- "FundLens automatically downloads every AMC's portfolio."
- "The overlap score proves diversification."
- "A positive rolling-window share is the probability of future gains."
- "FundLens recommends the best fund."

## Validation still needed

The original product hypothesis requires user research and a current hands-on Angel One product audit. Useful tests:
- Can a new investor understand positive rolling-window share and drawdown in Guided view?
- Does Advanced view make benchmark, date and risk-free assumptions sufficiently inspectable?
- Do users understand the difference between overlap, correlation and diversification?
- Does repeated-holdings insight help investors ask better questions about sector and single-stock concentration?
- Does the workflow improve investor understanding without implying a recommendation?

Treat these as hypotheses and validation tasks until evidence is collected.

## Competitive finding: portfolio overlap

An Angel One-hosted NXT Fund & Stock Lab page advertises an Overlap Checker, pairwise overlap matrix, common holdings, stock search across schemes and portfolio visualisations. The primary Angel One mutual-fund user guide documents individual scheme holdings and peer comparison, but does not describe cross-scheme overlap in that journey. The NXT page is a separate research surface, and the indexed page reports that its mutual-fund dataset must be refreshed from an upstream API; the refresh controls are protected. Thus the feature exists on an Angel One-hosted surface, but public evidence does not establish that it is fully populated and available to every retail app user. FundLens excludes a duplicate overlap widget and treats integration / discoverability only as a possible future product question, subject to first-party verification.
