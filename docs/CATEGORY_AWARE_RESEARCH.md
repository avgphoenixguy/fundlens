# FundLens category-aware research framework

FundLens avoids a universal score because the questions that matter for an active equity fund are not the same as those for an index, debt or hybrid fund. This framework changes the research lens; it does not replace the statutory SEBI scheme category or the latest Scheme Information Document (SID).

| Category | Primary evaluation questions | Core measures and disclosures |
|---|---|---|
| Active equity | Has the scheme delivered consistent returns relative to its Tier 1 benchmark, and what risk did it take? | Rolling returns, positive-window share, median excess CAGR, Sharpe, Sortino, Alpha, Beta, Information Ratio, tracking error, drawdown, TER, AUM and holdings |
| Index / passive | How closely and cheaply has the scheme replicated its benchmark? | Matched tracking difference, tracking error, Direct-plan TER, AUM, replication, cash / derivatives exposure and portfolio holdings |
| Debt | What credit, duration, liquidity and reinvestment risks are present? | Credit quality, yield to maturity, modified duration, average maturity, issuer / instrument concentration, liquidity, TER and portfolio holdings |
| Hybrid | How are equity and debt sleeves contributing, and what risks exist within each sleeve? | Asset allocation, equity benchmark and risk measures, debt credit quality and duration, rebalancing, drawdown and holdings |

## Product behaviour

- Active-equity measures are shown only when benchmark and history inputs are available.
- Index / passive evaluation emphasises tracking and cost rather than manager Alpha.
- Debt research emphasises credit and interest-rate risk. Equity Beta is not a substitute for credit analysis.
- Hybrid schemes require a split-sleeve view; one equity metric does not describe the entire portfolio.
- Missing inputs are labelled unavailable. The app does not infer YTM, duration, credit quality or holdings from NAV.
- The curated reference disclosures are dated snapshots, not a live factsheet integration.

## Classification limits

The prototype infers its category lens from available scheme metadata and name patterns. Search metadata may not map perfectly to official SEBI category labels. Confirm the exact scheme category, benchmark, plan and option against the current SID / factsheet before comparing.

FundLens intentionally does not apply one numeric fund score across categories. A high Sharpe ratio for an equity fund does not establish acceptable credit quality for a debt fund or good replication for an index fund.
