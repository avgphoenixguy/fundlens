# FundLens rolling-return methodology

## User-controlled inputs

- Holding window: 1 to 120 calendar months.
- Start-date frequency:
  - Daily: each available NAV observation can become a start date.
  - Weekly: every fifth NAV observation.
  - Monthly: every twenty-first NAV observation.
- Output:
  - Absolute return over the selected holding period.
  - Annualised CAGR over the actual elapsed calendar time represented by the selected calendar-month window.

## Window construction

For each eligible start observation (i):

1. Set the target end date to the start date plus the selected number of calendar months.
2. Find the first NAV observation on or after the target end date.
3. Compute the absolute return as (NAV_{end}/NAV_{start}-1).
4. For CAGR mode, annualise the holding-period return using the selected window length in months.
5. Continue until the NAV series no longer contains a valid end observation.

The output contains an overlapping sequence of historical outcomes. Adjacent windows are not independent observations.

## Summary statistics

- Average and median rolling outcome.
- Minimum and maximum rolling outcome.
- Percentage of rolling windows with a positive return.
- Histogram of the observed rolling outcomes.

## Other risk metrics

- Daily simple NAV returns are computed from adjacent available observations.
- Annualised volatility = sample standard deviation of daily returns × square root of 252.
- Drawdown = NAV / previous running maximum NAV − 1.
- Maximum drawdown = minimum observed drawdown.

## Important caveats

- The current prototype uses NAV observations only. It does not yet adjust for a benchmark, risk-free rate, distributions outside a Growth option, or investor cash flows.
- A benchmark comparison requires a matched total-return index series, aligned on dates and methodology. Do not substitute a price index for a TRI.
- NAV API coverage and uptime depend on the third-party provider. Confirm current values against AMC and AMFI disclosures.
- Expense ratio, AUM and holdings are not derived from NAV; they need separate dated sources.
- Comparisons must respect category, plan, option, inception history and snapshot date.
