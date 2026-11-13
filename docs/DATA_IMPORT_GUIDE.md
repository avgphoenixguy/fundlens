# FundLens data import guide

FundLens is currently a static browser prototype. Benchmark TRI CSVs are parsed in the browser and are not sent to a FundLens backend. They remain available only for the current browser session.

## 1. Daily benchmark TRI CSV

Benchmark-relative analysis requires a Total Returns Index (TRI) series for the exact benchmark stated in the latest scheme SID / factsheet.

1. Open the latest SID / factsheet and confirm the scheme's exact benchmark (Tier 1 for equity schemes).
2. For Nifty indices, open [NSE Indices historical data reports](https://www.niftyindices.com/reports/historical-data).
3. Select **Total Returns Index Values**, then select the exact index and date range. Download the CSV.
4. In FundLens Advanced view, select the same benchmark name in the benchmark selector and upload the file.
5. The file needs a date column and a TRI value column. FundLens expects at least 30 valid observations and at least 30 exact-date-matched daily returns before benchmark ratios appear.
6. Check the loaded date range and benchmark name before interpreting the output.

Do not upload an ordinary price-index close series as a TRI. NSE explains that TRI includes constituent dividend receipts and is the appropriate index concept for total-return comparisons: [NSE TRI explanation](https://www.nseindia.com/static/products-services/indices-total-returns-index).

The application does not automatically download NSE TRI files. Automated access would require a supported data integration, suitable permission / licence and a reliable mapping from every scheme to its current benchmark.

## 2. Dated scheme disclosures

The prototype contains a small curated set of dated AMC reference disclosures for selected schemes. These are not imported through this page and are not refreshed by the NAV API. See `REAL_FUND_DATA_SOURCES.md` for source URLs, snapshot dates and plan / option caveats.

## 3. Data handling and security

- Benchmark TRI CSV processing runs in the browser.
- The benchmark TRI import is not uploaded to a server by this prototype.
- Imported benchmark data is not persisted across browser sessions.
- Do not upload personal account statements or investor-identifiable information.
