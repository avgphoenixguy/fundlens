# FundLens rolling-return methodology

## Inputs

- Holding window: 1 to 120 calendar months.
- Start-date frequency: daily (each NAV observation), weekly (every fifth observation), or monthly (every twenty-first observation).
- Return display: absolute holding-period return or annualised CAGR using actual elapsed calendar time between the start and end observations.

## Scheme-only window construction

For each eligible NAV start observation i:

1. Shift the start date forward by the selected number of calendar months.
2. Find the first available NAV observation on or after that target date.
3. Compute absolute return as NAV_end / NAV_start − 1.
4. For CAGR mode, annualise using actual elapsed days: (NAV_end / NAV_start)^(365.25 / elapsed_days) − 1.
5. Stop when history no longer contains an eligible end observation.

Each start date produces an overlapping historical holding window. Adjacent windows are not independent observations.

## Summary statistics

- Average and median rolling outcome.
- Best and worst observed window.
- Percentage of rolling windows with a positive outcome.
- Histogram of historical outcomes.

The positive-window share is a descriptive statistic of sampled historical windows, not a forecast or probability of a positive future return.

## Benchmark-relative rolling outcomes

When the weekly TRI-derived benchmark series is available, FundLens uses exact-date-matched scheme NAV / benchmark observations. The benchmark source is weekly, so this analysis cannot create daily benchmark observations. For each eligible matched weekly start date it:
1. Shifts by the selected calendar-month holding period.
2. Finds the first available matched observation on or after the target date.
3. Calculates fund CAGR and benchmark CAGR over the same matched start and end dates.
4. Records excess CAGR as fund CAGR less benchmark CAGR.

The interface reports the share of matched windows where fund CAGR exceeded benchmark CAGR, median excess CAGR and the number of matched windows. Five or more matched holding windows are required to show an aggregate result. When the main rolling lab uses monthly sampling, benchmark-relative starts are spaced every four weekly observations; otherwise they remain weekly. These are historical descriptive statistics, not probabilities of future outperformance. The deployed `/api/benchmark` route must return validated weekly TRI-derived observations before the interface can calculate benchmark-relative rolling outcomes.

## Risk metrics in other workspaces

- Daily simple NAV returns use adjacent available NAV observations.
- Annualised volatility = sample standard deviation of daily returns × √252.
- Drawdown = NAV / prior running maximum NAV − 1.
- Maximum drawdown = minimum drawdown observed in the selected history.

Benchmark-relative figures require the correct total-return index. A price index is not a substitute for TRI.

## Important caveats

- NAV history is not a full total-return series for every plan / option. Verify Direct / Regular and Growth / IDCW.
- NAV API coverage and uptime depend on the third-party provider. Verify NAV and scheme details against AMC / AMFI disclosures.
- Expense ratio, AUM and holdings are not derived from NAV; they require separate dated sources.
- The app does not model investor cash flows, taxes, exit loads, transaction costs or distributions not reflected in the selected NAV option.
- Comparisons must respect category, plan, option, inception history, benchmark and snapshot date.
- Benchmark-relative rolling statistics depend on the correctness of the imported TRI and scheme benchmark mapping.
