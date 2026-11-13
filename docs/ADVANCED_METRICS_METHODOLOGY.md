# FundLens advanced metrics methodology

## 1. Inputs and matching

### Scheme returns
FundLens fetches scheme NAV observations through MFapi.in. Daily simple return is calculated as:

`r_f,t = NAV_t / NAV_(t-1) - 1`

The history belongs to the scheme code / plan / option returned by the scheme directory. Confirm the exact Direct / Regular plan and Growth / IDCW option in the scheme name and current scheme documents. IDCW distributions are not reinvested by a plain NAV-only Growth-style calculation; use a compatible total-return series if analysing distributed options.

### Benchmark returns
Benchmark-relative measures require a daily Total Returns Index series for the exact benchmark identified in the latest SID / factsheet. The benchmark selector and imported file must refer to the same index. FundLens parses a date column and a TRI value column, sorts observations and removes duplicate dates. It then joins fund NAV and TRI on exact dates only. It does not forward-fill, interpolate, or substitute a price-index close.

A minimum of 30 matched return observations is a software display threshold, not a claim that 30 days is enough for robust inference. Multi-year, like-for-like periods are preferable. Both scheme and benchmark must be observed on the same dates.

NSE Indices provides historical Total Returns Index Values reports. TRI includes constituent dividends reinvested into the index and is the correct index concept for comparison with total fund returns. See:
- [NSE Indices historical data reports](https://www.niftyindices.com/reports/historical-data)
- [NSE Total Returns Index explanation](https://www.nseindia.com/static/products-services/indices-total-returns-index)

For non-Nifty benchmarks, use the official index provider and verify the benchmark named in the latest scheme SID / factsheet.

## 2. Period and daily assumptions

The Advanced workspace lets the user choose an analysis period (1Y, 3Y, 5Y, 10Y or maximum available) and an annual risk-free-rate assumption. The selected analysis period is anchored to the latest available date in the NAV series. If the scheme does not have enough observations to cover the selected period, period-dependent metrics are suppressed.

The current prototype converts the annual risk-free assumption to a simple daily approximation by dividing by 252. It uses 252 trading observations for annualisation. This is a transparent modelling convention, not a live risk-free market feed. Change the assumption and check the sample period before interpreting the ratios.

## 3. Metrics

Let:
- `r_f,t` = daily arithmetic scheme NAV return
- `r_b,t` = daily arithmetic benchmark TRI return
- `r_0` = annual user-entered risk-free rate divided by 252
- `N = 252` = annualisation convention

### Annualised volatility
Sample standard deviation of daily scheme returns × `√252`.

### Sharpe ratio
`mean(r_f,t - r_0) / sample_sd(r_f,t) × √252`.

This is a NAV-derived estimate based on the visible risk-free assumption. It is not necessarily the same as an AMC factsheet Sharpe, which may use another period, frequency or risk-free proxy.

### Sortino ratio
`mean(r_f,t - r_0) / downside_deviation × √252`, where downside deviation is the root mean square of the negative daily deviations below the selected target rate. In the current UI, the same annual rate input is used as the risk-free / downside target assumption. It should not be interpreted as a universal target return.

### Beta
For exact-date-matched daily fund and benchmark returns:

`Cov_sample(r_f, r_b) / Var_sample(r_b)`.

### Alpha
Annualised daily CAPM intercept:

`252 × [mean(r_f) - r_0 - Beta × (mean(r_b) - r_0)]`.

Alpha is an estimate that is sensitive to benchmark choice, sample period and assumptions. It is not a guarantee of manager skill.

### Tracking error
Sample standard deviation of daily active return `(r_f - r_b)` × `√252`.

### Information Ratio

For equity-oriented schemes, FundLens displays an **annualised research estimate**:

mean(daily arithmetic active return) / sample_sd(daily arithmetic active return) × √252.

The √252 factor annualises the daily ratio using the same 252-observation convention used for daily volatility and tracking error. SEBI Circular SEBI/HO/IMD/IMD-PoD-2/P/CIR/2025/6 (17 January 2025) specifies the portfolio-minus-Tier-1-benchmark excess-return formula, requires daily return values and arithmetic daily portfolio returns, but the circular's formula text does not itself state an annualisation multiplier. AMFI's explanatory illustration annualises the numerator / denominator using the observation frequency. Therefore FundLens labels its result as an annualised research estimate, not as the AMC / AMFI regulatory disclosure. For a regulatory or factsheet comparison, use the scheme's official published IR and methodology / period.

### Benchmark CAGR / excess CAGR
Fund and benchmark CAGR are calculated across the same first and last matched NAV / TRI observations. Excess CAGR is fund CAGR less benchmark CAGR over those dates.

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

The six-scheme reference register contains dated snapshots of scheme AUM, cost, riskometer, benchmark, selected returns and AMC-reported ratios. Those values are not fetched from the NAV API and may have different observation dates. The display retains each source date and preserves the distinction between:
- **TER**: total expense ratio, where the source explicitly reports TER.
- **BER**: base expense ratio, where the source reports only BER. BER is not relabelled as full TER.
- **AMC-reported ratio**: a figure published by the AMC for its own stated period / methodology.
- **FundLens estimate**: a value calculated from the NAV and TRI observations currently loaded.

The UTI sample register, for example, warns that reported return data is Regular Plan Growth while the NAV and cost examples are Direct Plan Growth. Do not treat that as a like-for-like combination.

## 7. Limitations and production requirements

The prototype does not automatically discover authoritative Tier 1 benchmarks for every searched scheme. The investor must confirm the current benchmark and import matching TRI data. It does not have a production data licence, benchmark API key or AMC disclosure integration. Files imported into the static web app remain in browser memory for that session.

A production build should:
1. Connect approved benchmark and disclosure feeds with usage rights.
2. Maintain scheme-code / plan / option and benchmark mappings with effective dates.
3. Validate TRI data type, index name, base history, duplicate dates and missing observations.
4. Record source URL, download date, disclosure date, observation window, formula version and data hash for each calculation.
5. Use authoritative AMC / AMFI reported IR values for regulatory display, with the FundLens estimate labelled separately.
6. Monitor stale data and display warnings when any metric's input snapshot is old or mismatched.

FundLens is research support, not investment advice.
