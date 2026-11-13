# Competitive research: mutual fund portfolio overlap

**Research date: 13 November 2026**

## Finding

Do not pitch a generic mutual-fund stock overlap checker as a novel FundLens feature. An Angel One-hosted page on `nxt.angelone.in` titled **Fund & Stock Lab** already advertises this capability.

The indexed page describes:
- An Overlap Checker for comparing common holdings across funds.
- A pairwise overlap matrix in stock-count and weight views.
- A fund-overlap chord visualisation, Venn diagram and unique-versus-shared holdings view.
- Common holdings across multiple schemes.
- Search for a stock and discovery of mutual funds holding it.
- A portfolio analyzer and portfolio health check.
- Scheme / AMC / stock search, query builder and research filters.

The page explains a conservative overlap weight: if a stock is 2% of one fund and 3% of another, the shared position contributes 2% to overlap. This is essentially the same basic pairwise method explored in the first FundLens overlap prototype.

## Distinction from the primary Angel One Mutual Funds journey

Angel One's public Mutual Funds user guide describes an individual scheme page with Overview, Scheme details, Fund holdings and Peer comparison. It explains that Fund holdings show the proportion invested in each company, and Peer comparison lists similar schemes and returns. The guide does not describe a portfolio-wide overlap matrix within that main journey.

The portfolio user guide separately describes an aggregated account portfolio across asset classes and mutual funds.

The NXT Fund & Stock Lab page is hosted on an Angel One subdomain, but is a separate research surface from the documented standard Mutual Funds journey. Its indexed state reports "No mutual-fund data yet" and says the latest AMC / scheme / holdings snapshot needs to be pulled from an upstream API. It also shows protected refresh controls. Therefore:
- Evidence supports that Angel One has built / exposed an overlap tool on an Angel One-hosted NXT surface.
- Evidence does **not** prove that the data refresh is currently working for all users or that the tool is a fully released, discoverable feature in the primary Angel One app.
- Before asserting a gap in the flagship app, verify in a live Angel One customer account and with the product team.

## Product decision

**Exclude portfolio overlap from FundLens' proposed differentiating bet.** Rebuilding the same feature with manual file uploads would be both less useful and less defensible than the Angel One-hosted surface already described.

A future product question may be whether overlap analysis should be surfaced contextually inside the primary MF discovery / portfolio journey, with a transparent explanation of what overlap means. That is an integration / discoverability hypothesis, not a claim that Angel One lacks the capability. It should only be pursued if first-party validation shows a real user-access problem.

## Sources

1. Angel One-hosted NXT Fund & Stock Lab: https://nxt.angelone.in/mfd-tools/holdings
2. Angel One Mutual Funds user guide (updated 24 June 2026): https://www.angelone.in/knowledge-center/user-manual/home
3. Angel One Portfolio user guide (updated 24 June 2026): https://www.angelone.in/knowledge-center/user-manual/portfolio
4. SEBI Master Circular for Mutual Funds, 20 March 2026, clause 6.1.1: https://www.sebi.gov.in/sebi_data/attachdocs/mar-2026/1774024028162.pdf

## Implication for case interview

Do not say "Angel One does not offer mutual fund overlap analysis." Say: "The standard Mutual Funds journey documents scheme-level holdings and peer comparison. I also found an Angel One-hosted NXT research surface with an overlap checker. I therefore removed overlap as a novel feature from FundLens; the open question is whether this tool is sufficiently surfaced and data-enabled within the core investor journey."

## Is automatic public holdings ingestion possible?

Yes, technically. SEBI's Master Circular for Mutual Funds dated 20 March 2026 (clause 6.1.1) requires AMCs to publish month-end scheme portfolios with ISIN on the AMC and AMFI websites within 10 calendar days in downloadable spreadsheet format. Debt scheme holdings, including instrument yield, are disclosed fortnightly within five calendar days. A backend can therefore discover and retrieve public files on a schedule, normalise different AMC formats, validate identifiers and dates, and make holdings searchable by scheme and stock.

The constraint is not that the data is private. The constraint is operational: public files are periodic, formats need normalisation, coverage and stale data must be monitored, and AMFI / AMC access and redistribution terms still need to be respected. The NXT page itself describes a protected refresh workflow and an upstream holdings refresh process. This strongly suggests that Angel One has already built the data-ingestion approach needed for its own overlap tool.

Source for the disclosure obligation: [SEBI Master Circular for Mutual Funds, 20 March 2026, clause 6.1.1](https://www.sebi.gov.in/sebi_data/attachdocs/mar-2026/1774024028162.pdf).
