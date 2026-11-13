# FundLens advanced metrics methodology

## 1. Inputs and matching

### Scheme returns
FundLens fetches scheme NAV observations through MFapi.in. Daily simple return is calculated as:

`r_f,t = NAV_t / NAV_(t-1) - 1`

The history belongs to the scheme code / plan / option returned by the scheme directory. Confirm the exact Direct / Regular plan and Growth / IDCW option in the scheme name and current scheme documents. IDCW distributions are not reinvested by a plain NAV-only Growth-style calculation; use a compatible total-return series if analysing distributed options.

### Benchmark returns
Benchmark-relative measures require the correct total-return index for the benchmark named in the latest SID / factsheet. For supported Nifty indices, FundLens requests the published weekly series from Tipsheet's indices/p data family. Tipsheet documents these as the weekly series used by its NSE index pages. Its public data catalogue describes the JSON series shape as ISO dates, a series map, a resolution and metadata describing source and method.

The observed compact series keys include tr (Total Return), pr (Price Return), dd, vol, r3 and r5. FundLens selects only tr and explicitly excludes pr and the other chart statistics. The connector validates weekly observation spacing and returns a rebased growth-of-100 curve, not raw NSE index levels. Tipsheet's published method identifies NSE Indices TRI with dividends reinvested as the underlying source and documents repairs of identified anomalous TRI prints against the corresponding price index. This source-level repair must not be confused with substituting a price-return series.

The scheme's AMFI benchmark mapping determines the requested index. The response is sorted, duplicate dates are removed, and fund NAV / benchmark observations are joined on exact dates only. FundLens does not forward-fill, interpolate or replace a missing TRI observation with a price-index value. CRISIL and schemes without a verified Nifty mapping are not automatically mapped.

A minimum of 30 matched weekly return observations is a software display threshold, not a claim that 30 weeks is enough for robust inference. Multi-year, like-for-like periods are preferable. Both scheme and benchmark must be observed on the same dates. The current GitHub connector has been updated for the published series schema, but the latest Netlify production deployment has not yet been verified; benchmark calculations remain unavailable until validated weekly observations are loaded.

Sources:
- [Tipsheet public data catalogue](https://tipsheet.markets/data/)
- [Tipsheet index-page method and weekly series description](https://tipsheet.markets/methods/index_pages/)
- [Tipsheet TRI repair method](https://tipsheet.markets/methods/indices/)
- [NSE Indices historical data reports](https://www.niftyindices.com/reports/historical-data)
- [NSE Total Returns Index explanation](https://www.nseindia.com/static/products-services/indices-total-returns-index)

For non-Nifty benchmarks, use the official index provider and verify the benchmark named in the latest scheme SID / factsheet. No Tipsheet model index is used as a fund benchmark.

## 2. Period and frequency assumptions

The Advanced workspace lets the user choose an analysis period (1Y, 3Y, 5Y, 10Y or maximum available) and the automatically retrieved RBI long-dated G-Sec yield proxy. The selected analysis period is anchored to the latest available date in the NAV series. If the scheme does not have enough observations to cover the selected period, period-dependent metrics are suppressed.

The app automatically fetches the RBI Current Rates Government Securities Market page and uses the yield on the long-dated Government of India security closest to 10 years to maturity as its risk-free proxy. On 13 November 2026, the live RBI page retrieved by the FundLens serverless function returned 7.2430% for 6.94% GS 2036, with the yield dated 12 November 2026. The app displays the security, rate, source and observation date. If live retrieval fails, the app uses a separately labelled fallback snapshot of 7.2178% dated 11 November 2026.


For daily NAV-only calculations, the current annual yield is converted to an effective daily rate using (1 + annual_yield)^(1/252) - 1 and held constant across the selected historical NAV window. This is a simplifying assumption, not a true historical daily risk-free time series. Sharpe and Sortino use the daily equivalent. For weekly benchmark regression, the same annual yield is converted to an effective weekly rate using (1 + annual_yield)^(1/52) - 1. A duration-matched short-term sovereign series would be methodologically preferable for some debt-fund categories; this prototype deliberately uses the requested long-dated sovereign proxy consistently.

## 3. Metrics

Let:
- `r_f,t` = daily arithmetic scheme NAV return for NAV-only risk measures
- `r_f,w` = weekly arithmetic scheme NAV return on an exact benchmark observation date
- `r_b,w` = weekly arithmetic return of the TRI-derived benchmark series
- `r_0,d` = effective daily equivalent of the current RBI long-dated G-Sec yield proxy
- `r_0,w` = effective weekly equivalent of the same annual yield proxy
- `N_d = 252` = annualisation convention for daily NAV-only measures
- `N_w = 52` = annualisation convention for weekly benchmark-relative measures

### Annualised volatility
Sample standard deviation of daily scheme returns × `√252`.

### Sharpe ratio
`mean(r_f,t - r_0) / sample_sd(r_f,t) × √252`.

This is a NAV-derived estimate based on the RBI G-Sec yield proxy displayed in Advanced view. It is not necessarily the same as an AMC factsheet Sharpe, which may use another period, frequency or risk-free proxy.

### Sortino ratio
`mean(r_f,t - r_0) / downside_deviation × √252`, where downside deviation is the root mean square of the negative daily deviations below the selected target rate. In the current UI, the same automatically fetched annual G-Sec yield proxy is used as the risk-free / downside target assumption. It should not be interpreted as a universal target return.

### Beta
For exact-date-matched weekly fund and benchmark returns:

`Cov_sample(r_f,w, r_b,w) / Var_sample(r_b,w)`.

### Alpha
Annualised weekly CAPM intercept:

`52 × [mean(r_f,w) - r_0,w - Beta × (mean(r_b,w) - r_0,w)]`.

Alpha is an estimate that is sensitive to benchmark choice, sample period and assumptions. It is not a guarantee of manager skill.

### Tracking error
Sample standard deviation of weekly active return `(r_f,w - r_b,w)` × `√52`.

### Information Ratio

For equity-oriented schemes, FundLens displays an **annualised weekly research estimate** when matched weekly data is available:

mean(weekly arithmetic active return) / sample_sd(weekly arithmetic active return) × √52.

This is a FundLens estimate, not the AMC / AMFI regulatory disclosure. The official AMFI Information Ratio is displayed separately when its plan-specific value is supplied. The weekly estimate must not be treated as interchangeable with an official scheme-published IR that may use a different period, benchmark convention or methodology.

### Benchmark CAGR / excess CAGR
Fund and benchmark CAGR are calculated across the same first and last exact-date-matched weekly NAV / TRI-derived observations. CAGR uses actual elapsed calendar time between those observations. Excess CAGR is fund CAGR less benchmark CAGR over the same dates.

## 4. Benchmark-relative rolling outcomes

For each eligible common start date, FundLens shifts the start date by the selected number of calendar months and locates the next available **matched** date. It calculates fund and benchmark CAGR over the same start / end pair. The interface reports:
- Share of matched windows in which fund CAGR exceeded benchmark CAGR.
- Median excess CAGR.
- Number of matched windows.

Windows overlap and therefore are not independent observations. A percentage of historical windows beating the benchmark is not the probability of outperformance in the future.

## 5. Category-aware interpretation

- **Active equity:** rolling consistency, matched benchmark excess returns, Sharpe, Sortino, Alpha, Beta, Information Ratio, tracking error, drawdown and expenses.
- **Index / passive:** tracking difference, tracking error, Direct-plan TER, AUM, replication and portfolio exposures.
- **Debt:** credit quality, YTM, modified duration, maturity profile, liquidity, issuer / instrument concentration and expenses. Equity Alpha / Beta are not substitutes for credit analysis.
- **Hybrid:** equity / debt allocation, sleeve-level risk, debt duration / credit exposures, rebalancing and drawdown.

Category classification in this prototype is inferred from scheme metadata and scheme-name patterns. It is a navigation aid, not a substitute for the SEBI category, SID or current factsheet. Verify before using category-specific comparisons.

FundLens deliberately does not calculate one universal scheme score. A high equity-fund Sharpe ratio does not answer whether a debt fund has acceptable credit quality or whether an index fund is tracking its benchmark efficiently.

## 6. AMC-reported disclosures versus FundLens calculations

The six-scheme reference register contains dated AMC snapshots used as fallbacks when AMFI does not return a matched record. Current AMFI data takes precedence. The display retains each source date and preserves the distinction between:
- **TER**: total expense ratio, where the source explicitly reports TER.
- **BER**: base expense ratio, where the source reports only BER. BER is not relabelled as full TER.
- **AMC-reported ratio**: a figure published by the AMC for its own stated period / methodology.
- **FundLens estimate**: a value calculated from the NAV and TRI observations currently loaded.

The UTI sample register, for example, warns that reported return data is Regular Plan Growth while the NAV and cost examples are Direct Plan Growth. Do not treat that as a like-for-like combination.

## 7. Limitations and production requirements

The AMFI Fund Performance API supplies scheme-specific benchmark names, AUM, Riskometer, official plan-specific IR and trailing scheme / benchmark performance when a scheme-name match is found. The AMFI monthly TER workbook supplies plan-specific full TER when a matching record is available. The app does not have automatic YTM, duration or credit-quality integration for every scheme. The benchmark connector now targets Tipsheet's published weekly NSE TRI-derived series, selecting only tr and excluding pr; the latest parser is committed in GitHub but has not yet been verified in the paused Netlify production deployment. Weekly benchmark-dependent Alpha / Beta / calculated IR / tracking error remain unavailable until validated weekly observations are loaded.

A production build should:
1. Verify the weekly Tipsheet / NSE TRI-derived connector end-to-end after deployment, and confirm data-use and index licensing rights before any commercial use.
2. Maintain scheme-code / plan / option and benchmark mappings with effective dates.
3. Validate TRI data type, index name, base history, duplicate dates and missing observations.
4. Record source URL, download date, disclosure date, observation window, formula version and data hash for each calculation.
5. Use authoritative AMC / AMFI reported IR values for regulatory display, with the FundLens estimate labelled separately.
6. Monitor stale data and display warnings when any metric's input snapshot is old or mismatched.

FundLens is research support, not investment advice.
