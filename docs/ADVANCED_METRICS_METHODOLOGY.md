# FundLens advanced metrics methodology

## Data inputs and matching

Historical scheme NAV data is requested from MFapi.in, which republishes AMFI scheme NAV observations. Benchmark-relative metrics require a separate daily Total Return Index (TRI) series for the exact benchmark named in the scheme's current Scheme Information Document (SID) or factsheet.

The Advanced view accepts a user-supplied CSV with a date column and a Total Returns Index value column. Fund and benchmark observations are joined on exact dates. No forward-fill, price-index substitution or synthetic benchmark observations are used. At least 30 matched daily returns are required before benchmark-relative metrics are displayed. A materially longer history is recommended for interpretation.

NSE Indices provides historical index data and a separate [Total Returns Index Values report](https://niftyindices.com/reports/historical-data). Its [TRI explainer](https://www.niftyindices.com/resources/index-concepts/total-return-index) explains that TRI includes constituent dividends. NSE explains that TRI includes constituent dividend receipts, whereas a price index does not. Mutual-fund performance should therefore be compared with the relevant TRI, not its price index.

## Calculations

Let r_p,t be the scheme's daily NAV return and r_b,t the benchmark's daily TRI return. Annualisation uses 252 trading observations. The user-supplied risk-free rate is converted to a daily assumption by dividing the annual rate by 252.

- Annualised volatility: sample standard deviation of daily scheme returns multiplied by square root of 252.
- Sharpe ratio: mean daily scheme return less daily risk-free assumption, divided by daily standard deviation, multiplied by square root of 252.
- Sortino ratio: mean daily scheme return less the same target rate, divided by the square root of the mean squared negative target-relative daily returns, multiplied by square root of 252.
- Beta: sample covariance of scheme and benchmark daily returns divided by benchmark return variance.
- Alpha: annualised daily CAPM intercept, 252 × [mean scheme return - risk-free rate - beta × (mean benchmark return - risk-free rate)].
- Tracking error: sample standard deviation of daily active returns multiplied by square root of 252.
- Information Ratio (equity-oriented schemes only): mean daily arithmetic active return divided by the standard deviation of daily arithmetic excess returns, using the scheme's Tier 1 benchmark. The SEBI circular does not specify a square-root-of-252 multiplier in this formula, so FundLens does not annualise this daily IR estimate.
- Benchmark CAGR and excess CAGR use the same matched first and last dates.

The risk-free assumption is visible in the interface and editable. A zero value means a zero-return target, not a claim about the prevailing Indian risk-free rate. Set the risk-free proxy and observation period before interpreting Sharpe, Sortino or Alpha.

## Rolling return methodology

For every eligible NAV date, the engine finds the first available NAV observation on or after the date shifted by the selected number of calendar months. It computes either absolute return or annualised CAGR using actual elapsed calendar time. Daily, weekly and monthly frequencies change the spacing of start dates. Overlapping windows are not independent observations.

When a benchmark TRI is loaded, the engine calculates fund and benchmark CAGR over matched start and end dates for each rolling window. It reports the proportion of matched windows in which the fund CAGR exceeded benchmark CAGR, plus median excess CAGR.

## Category-aware interpretation

- Active equity: rolling-return outcomes, benchmark-relative returns, Sharpe, Sortino, Alpha, Beta, Information Ratio, tracking error, drawdown and expenses.
- Index / passive: tracking difference, tracking error, Direct-plan TER, AUM, replication and portfolio exposures.
- Debt: credit quality, YTM, modified duration, maturity profile, liquidity, expenses and concentration. Equity Alpha / Beta are not substitutes for credit analysis.
- Hybrid: equity / debt allocation, sleeve-level risk, duration, credit exposure and rebalancing behaviour.

The app does not calculate one universal fund score. A high Sharpe ratio for an equity fund does not answer whether a liquid fund has appropriate credit exposure.

## AMC-reported values versus prototype estimates

The Scheme Disclosures panel contains dated factsheet snapshots for selected schemes. It keeps AMC-reported ratios and dated AUM / cost disclosures separate from figures calculated by the app. BER is not relabelled as TER. Plan and option mismatches are explicitly called out.

The Information Ratio calculated from an imported matched series is an analytical estimate. It is not labelled as the AMC's regulatory disclosure. Where a daily AMC-reported IR is available, users should consult the AMC's statutory disclosure and use the AMC figure with its reported date and source.

## Limitations and production requirements

The current prototype does not automatically identify the authoritative Tier 1 benchmark for every searched scheme. Confirm the benchmark from the latest SID / factsheet before importing its TRI. TRI and holdings CSV uploads are processed in browser memory for the current session only. Curated AUM, TER and AMC risk snapshots are dated and not refreshed by the NAV API.

A production implementation should connect approved / licensed benchmark and disclosure feeds; map schemes to authoritative benchmarks; version source snapshots; validate scheme plan and option; monitor stale or missing data; and preserve source lineage. The prototype is research support, not investment advice.
