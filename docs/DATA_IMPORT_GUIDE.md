# FundLens automatic data and assumptions guide

FundLens does not ask users to upload benchmark TRI files. Research inputs are fetched automatically wherever a supported public source and verified scheme mapping are available.

## 1. Scheme NAV

- Source: MFapi.in scheme search and NAV history endpoints, which republish AMFI NAV data.
- Trigger: when a scheme is selected or loaded.
- Use: trailing returns, rolling returns, volatility and drawdown.
- Caveat: NAV source freshness depends on MFapi.in; NAV is not benchmark TRI and does not supply TER, AUM, holdings or factsheet risk ratios.

## 2. Benchmark TRI

- Source: NSE Indices Historical Data Reports, Total Returns Index Values.
- Retrieval: FundLens calls its cached /api/benchmark Vercel function for supported Nifty index names.
- Supported automatic Nifty benchmarks: NIFTY 50, NIFTY 100, NIFTY 500, NIFTY NEXT 50, NIFTY MIDCAP 150 and NIFTY SMALLCAP 250.
- Mapping: the app uses stored benchmark mappings for the six curated scheme examples. A current scheme benchmark must be confirmed from its latest SID / factsheet. MFapi scheme metadata does not contain a universal benchmark field.
- Date matching: exact scheme NAV and TRI dates only. No forward fill, interpolation or price-index substitution.
- Cache: benchmark API response is cached at Vercel edge for six hours, with stale-while-revalidate up to one day.
- Unsupported cases: CRISIL benchmarks, other non-Nifty benchmarks, and schemes without a verified stored Tier 1 mapping do not receive fabricated Nifty substitutes. Sharpe / Sortino remain available; Alpha / Beta / IR / tracking error and benchmark-relative rolling outputs are shown as unavailable.
- Integration caveat: the NSE Indices historical-data page exposes downloadable TRI values. The current connector uses the same site's underlying historical-data endpoint, which is not published as a documented public commercial API. It may change or be rate-limited. For production, use an approved index data subscription or official API / data agreement.

## 3. Risk-free assumption

- Source: Reserve Bank of India Current Rates, Government Securities Market.
- Selected proxy: yield on a long-dated Government of India security with maturity closest to 10 years.
- Example observation: RBI's page on 12 November 2026 displayed 7.2178% for 6.94% GS 2036, with the yield dated 11 November 2026.
- Retrieval: cached /api/risk-free-rate route attempts to fetch the RBI page on request. It displays the security, yield, source and date in Advanced view.
- Fallback: if the RBI page is unavailable or its structure changes, FundLens shows 7.2178% from 11 November 2026 and clearly labels the fallback.
- Calculation assumption: the latest annual yield is divided by 252 to derive a daily proxy and held constant over the selected historical NAV window. It is not a daily historical risk-free curve or a maturity-matched short-term rate.
- Usage: used in Sharpe and Alpha as the excess-return rate, and as the downside target in Sortino.
- Interpretation: the 10-year yield is a long-duration sovereign opportunity-cost proxy. For debt funds, a duration-matched short-term sovereign / T-bill series may be more appropriate. The prototype uses the requested 10-year proxy consistently and exposes the assumption.

## 4. Calculated metrics

| Metric | Required inputs | Current behaviour |
|---|---|---|
| Sharpe | Scheme NAV and RBI G-Sec proxy | Automatic |
| Sortino | Scheme NAV and same RBI proxy as minimum acceptable return | Automatic |
| Volatility | Scheme NAV | Automatic |
| Maximum drawdown | Scheme NAV | Automatic |
| Alpha | Scheme NAV, matched benchmark TRI and RBI proxy | Automatic only for mapped schemes with supported Nifty TRI |
| Beta | Scheme NAV and matched benchmark TRI | Automatic only for mapped schemes with supported Nifty TRI |
| Information Ratio | Scheme NAV and matched Tier 1 benchmark TRI | Automatic annualised research estimate for supported Nifty TRI; not official AMC / AMFI IR |
| Tracking error | Scheme NAV and matched benchmark TRI | Automatic for supported mapped benchmark |
| Benchmark-relative rolling returns | Scheme NAV and matched TRI history | Automatic for supported mapped benchmark |

## 5. What remains static / unavailable

- Curated AUM, BER / TER, riskometer, manager and debt-disclosure examples are dated reference values, not refreshed from the NAV API.
- There is no automatic AMC-wide mapping for every mutual fund scheme.
- CRISIL daily benchmark integrations are not connected.
- No uploads are required or provided in the current UI. Unsupported inputs are suppressed rather than guessed.

## Sources

- MFapi.in documentation: https://www.mfapi.in/docs/
- NSE Indices historical data reports: https://www.niftyindices.com/reports/historical-data
- NSE Total Return Index concept: https://www.nseindia.com/static/products-services/indices-total-returns-index
- RBI Current Rates: https://www.rbi.org.in/
- SEBI Information Ratio circular, 17 January 2025: https://www.sebi.gov.in/legal/circulars/jan-2025/disclosure-of-risk-adjusted-return-information-ratio-ir-for-mutual-fund-schemes-_90928.html
