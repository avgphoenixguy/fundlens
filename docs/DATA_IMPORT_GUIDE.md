# FundLens data import guide

## Benchmark TRI CSV

1. Open the latest scheme SID or factsheet and confirm the scheme's exact benchmark (Tier 1 where applicable).
2. Use the NSE Indices historical data page and select the **Total Returns Index Values** report, or use the relevant benchmark provider for a non-Nifty index.
3. Select the exact index and the period you want to analyse, then download the CSV.
4. In FundLens Advanced view, select the matching benchmark and upload the CSV.
5. The file must include a date column and a Total Returns Index value column. The app checks for at least 30 valid observations and joins exact dates only.

Do not upload the ordinary price index close series as if it were TRI. NSE explains that TRI includes dividends and is the appropriate benchmark for total-return comparisons.

## AMC portfolio disclosure CSV

Upload a latest AMC scheme portfolio CSV with:
- Security / Instrument / Name
- Sector / Industry (recommended)
- Weight / Allocation / Weight %

The app aggregates uploaded weights by sector. This is a lightweight exposure view, not a full look-through risk model. Cash, derivatives and unclassified assets may affect the total.

## Data handling

Files are parsed in the browser session and are not uploaded to FundLens servers. Dated static AMC snapshots shown for six sample funds are separate from NAV API data. Always check the source date, plan, option and cost label before comparing figures.
