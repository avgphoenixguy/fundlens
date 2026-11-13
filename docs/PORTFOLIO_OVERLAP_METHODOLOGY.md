# FundLens portfolio overlap and concentration methodology

## Objective

This workspace addresses a different but related investor problem from return comparison: an investor may own several mutual funds that appear diversified by scheme name or category, while the underlying portfolios hold many of the same companies. FundLens makes duplicated stock exposures and blended holdings concentration visible.

The output is a descriptive holdings analysis, not a risk model or buy / sell recommendation.

## Input structure

One combined CSV is uploaded for multiple schemes. Each row represents one security holding in one scheme.

| Column | Required? | Purpose |
|---|---|---|
| SchemeName (or Fund / Scheme) | Yes, unless SchemeCode is supplied | Groups rows into a scheme |
| Security (or Instrument / Stock / Company) | Yes | Display name of the holding |
| WeightPct (or Weight / Allocation) | Yes | Weight as a percentage of scheme net assets |
| SchemeCode | Recommended | Stable scheme grouping key |
| ISIN | Strongly recommended | Primary identifier to match the same security across schemes |
| Sector | Recommended | Sector aggregation |
| DisclosureDate | Strongly recommended | As-of date / comparability check |
| InvestmentAmount | Optional | Investor's amount in the scheme; defaults to ₹10,000 per scheme if absent |

The user should download current AMC / AMFI portfolio disclosures, use the FundLens template and combine the scheme rows. FundLens does not currently scrape or centrally store holdings for every scheme.

## Security matching

- When a holding has an ISIN, the upload key is `ISIN:<value>`.
- If ISIN is missing, the upload key is `NAME:<normalised security name>`.
- Rows with the same key in the same scheme are aggregated.
- ISIN is the preferred matching key. If one scheme row has an ISIN and another scheme row for the same company omits it, the current implementation will not automatically reconcile the two different identifiers. Consistent ISIN coverage is important.
- Similar or differently formatted names can lead to missed or false matches when ISIN is absent.

## Pairwise fund overlap

For two schemes A and B, let `w_A,i` and `w_B,i` be the reported portfolio weights for security i. Pairwise overlap is:

`Overlap(A,B) = Σ_i min(w_A,i, w_B,i)`

The sum is across securities present in both schemes. Example: if a stock is 5.0% of Scheme A and 3.0% of Scheme B, that stock contributes 3.0 percentage points to their overlap. Pairwise overlap is reported as a percentage of scheme NAV. This is a common holdings-weight overlap convention; it is not a measure of return correlation.

## Blended investor portfolio look-through

Let `A_j` be the investor-entered amount allocated to scheme j and `w_j,i` be the holding's percentage weight inside scheme j.

`BlendedWeight_i = Σ_j (A_j × w_j,i / 100) / Σ_j A_j × 100`

This calculates the security's estimated weight in the investor's combined mutual-fund allocation. Sector exposure is the same calculation aggregated by sector. The top-ten exposure sums the ten largest blended security weights. These calculations assume the amounts entered are the market values allocated to the schemes and the uploaded holdings weights are valid percentages of scheme net assets.

## Concentration interpretation

A repeated security is not automatically a problem. A duplicated holding may be an intentional allocation to a high-conviction company. The feature highlights:
- Which names are held by multiple schemes.
- The combined look-through weight after accounting for the investor's allocation to each scheme.
- The largest blended single-stock and sector exposures.
- The portion of portfolio holdings represented in the uploaded disclosure.

Investors should interpret this alongside category, market capitalisation, geography, asset class, factor exposures, liquidity and risk tolerance. Stock overlap alone is not a complete diversification measure.

## Data quality checks and caveats

- The disclosure date is shown per scheme. Different dates reduce comparability because positions can change between month ends.
- The current prototype flags unusually low / high reported holding totals, but does not automatically repair or rescale portfolio weights.
- The holdings input may omit cash, derivatives, futures, options, receivables or unclassified assets. An incomplete security-only extract can understate look-through exposure.
- ISIN should be populated consistently. Name fallback is less reliable.
- Corporate actions, multiple share classes and security identifier changes may need manual reconciliation.
- The current tool does not consolidate derivatives into underlying equity exposures.
- Holdings are a point-in-time snapshot and may have changed since disclosure.
- Uploaded files stay in browser memory for the current session. They are not stored in a FundLens database.

## Regulatory / source context

SEBI's mutual fund disclosure framework requires monthly portfolio disclosure, including ISIN, in downloadable spreadsheet format. Refer to the current SEBI Master Circular for Mutual Funds and the latest AMC / AMFI portfolio files:
- [SEBI Master Circular for Mutual Funds, 20 March 2026](https://www.sebi.gov.in/legal/master-circulars/mar-2026/master-circular-for-mutual-funds_100707.html)
- [SEBI circular on monthly portfolio disclosure / related portfolio disclosures](https://www.sebi.gov.in/legal/circulars/apr-2021/circular-on-relevant-portfolio-disclosure-and-risk-o-meter-disclosure_49912.html)

FundLens is a research prototype, not investment advice.
