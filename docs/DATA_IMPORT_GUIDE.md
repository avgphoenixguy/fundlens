# FundLens data import guide

FundLens is currently a static browser prototype. Imported CSVs are parsed in the browser and are not sent to a FundLens backend. They remain available only for the current browser session.

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

## 2. Multi-scheme holdings CSV for portfolio overlap

Use the **Portfolio overlap** workspace. The easiest workflow is:
1. Download portfolio disclosure files for each mutual fund from the relevant AMC site or the AMFI disclosure surface.
2. Use the FundLens combined template.
3. Add all securities for all funds into one CSV. Include the scheme name or scheme code on every holding row.
4. Include ISIN and sector wherever available. Include the date of the disclosure.
5. Upload the combined CSV and review coverage warnings.
6. Set the amount invested in each scheme. FundLens calculates the investor's look-through stock and sector exposures using those amounts.

Required columns:
- `SchemeName` (or Fund / Scheme)
- `Security` (or Instrument / Stock / Company)
- `WeightPct` (or Weight / Allocation)

Strongly recommended:
- `ISIN` (primary matching key across schemes)
- `Sector` (for sector concentration)
- `DisclosureDate` (for as-of date checks)
- `SchemeCode` (stable scheme identity)
- `InvestmentAmount` (optional; if absent, the app defaults each fund to ₹10,000)

The upload can contain extra columns. FundLens ignores unrecognised fields. Repeated security rows within the same fund / identifier are added together.

### Important holdings rules
- Use portfolio weight as a percentage of scheme net assets, not market value in rupees.
- Use the same disclosure date for all funds wherever possible.
- ISIN matching is preferred. If ISIN is missing, FundLens matches a normalised security name. Name-only matching can miss a security whose issuer name is written differently or can merge similarly named securities.
- Holdings disclosed by the AMC may include cash, derivatives, receivables, or unclassified lines. Check whether those rows are included.
- Do not compare one full portfolio with one partial stock-only extract and treat the result as complete.

The app reports:
- Pairwise stock overlap = sum of the lower portfolio weight for every security held by both funds.
- Repeated positions = securities held by at least two uploaded schemes.
- Blended stock weight = sum of (investment amount in each scheme × that scheme's reported security weight) divided by total investment across schemes.
- Blended sector weight = same calculation aggregated by reported sector.

This is a holdings snapshot. It does not calculate statistical return correlation, factor overlap, risk contributions or a recommendation to sell a fund.

## 3. Dated scheme disclosures

The prototype contains a small curated set of dated AMC reference disclosures for selected schemes. These are not imported through this page and are not refreshed by the NAV API. See `REAL_FUND_DATA_SOURCES.md` for source URLs, snapshot dates and plan / option caveats.

## 4. Data handling and security

- CSV processing runs in the browser.
- Imported files are not uploaded to a server by this prototype.
- Imported data is not persisted across browser sessions.
- Do not upload personal account statements or investor-identifiable information. Scheme holdings CSVs should contain public portfolio data only.
