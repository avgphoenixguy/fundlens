# FundLens

**Mutual Fund Research & Comparison Studio**

FundLens is a product prototype exploring how self-directed investors can research and compare mutual funds using category-aware metrics, benchmark context, portfolio information, and plain-language explanations.

## Run locally

This is a static prototype. No package installation or build step is required.

```bash
python3 -m http.server 3000
```

Open <http://localhost:3000>.

You can also open `index.html` directly in a browser.

## Deploy on Vercel

1. Import this repository into Vercel.
2. Select **Other** as the framework preset.
3. Leave the build and install commands blank.
4. Set the output directory to `.`.
5. Deploy.

The application is served directly from the root `index.html`.

## Project files

- `index.html`: interactive FundLens prototype.
- `docs/REAL_FUND_DATA_SOURCES.md`: source register for the six real scheme examples, including snapshot dates and caveats.

## Prototype scope and data notes

- Includes six real mutual fund scheme examples and dated public-source snapshots.
- Data is static, not a live NAV, portfolio, or performance integration.
- Snapshot dates can differ by metric and source. Plan/option differences are flagged in the source register and interface.
- Missing metrics are intentionally not represented as zero.
- The prototype is a research and comparison aid, not a fund recommendation or investment advice.

## Disclaimer

For product demonstration and case-study purposes only. Mutual fund investments are subject to market risks. Verify current scheme information from the respective AMC and regulatory disclosures before making investment decisions.
