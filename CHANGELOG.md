# Changelog

One line per release. GHL embeds reference these tags.

## Unreleased

## v1.4.0 (brand v1.0)
- core.js tokens moved to brand v1.0 (Navy & Gold): Karla body font (Cormorant loaded for headings), accent #B6915E with navy text on gold, navy #1B2B44 replaces slate/charcoal, warm background #FDFCFB, ink #1A1A1B, muted #52525B, hairline #E7E4E1. Danger stays #9C3F2C as an approved exception to the rust-only-in-logo rule.

## v1.3.0 (Stage 1 of the site architecture plan; never tagged, ships in v1.4.0)
- Add `app/site-shell/`: sitewide header (mega-menu + accessible mobile accordion), footer with DRE license line, breadcrumbs, shared page components. Links are plain HTML anchors; menu items are added stage by stage.
- Add `app/site-pages/`: /hoa-management, /hoa-management/services-fees, /about, /about/larry-jacobs, /contact, each with SEO title, description, canonical and JSON-LD.
- hoa-pricing.css / embed.html: restyled to the updated brand system (navy #1B2B44 + gold #B6915E, Cormorant + Karla). Track markers: gold (Track One), navy/ivory (Track Two).
- hoa-pricing.js: every section is optional (ledger-only hub page, calculator-only fees page). New `[data-bh-from]` and `[data-bh-cover]` fill starting fee and base units from config.js.
- Add `docs/stage1/`: redirect list and go-live runbook.
- proposal.html: visitors arriving from the assessment funnel (`?email=`) now wait up to 20s ("Finalizing your proposal…", recognize retried every 2s) for the pipeline to link the new contact, instead of landing on "couldn't find a proposal". Covers cases where the instant sessionStorage handoff isn't available (GHL preview on link.brichausgroup.com, private mode, blocked storage).
- intake-v2: rent per unit must be $300–$50,000 and units a whole number from 2 to 50 before Continue enables (Property Type, Snapshot and Review steps). Over 50 units shows a "priced on a call" notice with a Schedule a meeting link instead of pricing online. Limits live in `CONFIG` (`MIN_UNITS`, `MAX_UNITS`, `MIN_RENT`, `MAX_RENT`).
- intake-v2: removed the placeholder fee entirely (band-based fallback and demo mode). A failed call, an error response, or a response without a real computed fee now shows an "unavailable" step with Try Again and Book a Call — never a number.
- Power Pages web templates pinned to `@v1.2.0` (were `@main`). No code change: kit files identical. Local dev server now rewrites any pinned version.
- README rewritten at the top: real repo map, CDN/version rules, release steps, pin table.

## v1.2.0
- Pricing rule: Track One per-unit rate steps down with scale; Track Two never does (management hours rise with every door). Console warning if config breaks it.
- HOA Track Two repriced: $650 covers the first 10 units (was 24), matching Track One; $16 per unit after that (19 units = $795). Published to 120 units; 121+ by proposal.
- Fee copy states the rule for each track and the 120-unit limit.
- Calculator rate line now names the band, e.g. "$16 per unit for units 11–120".

## v1.1.0
- Add `app/hoa-pricing/` — HOA scope ledger, fee calculator, and schedule of fees moved out of GHL into the repo. All prices now in `config.js`.
- HOA calculator range label now reads from config ("4 — 200 units · larger communities by proposal"); previous "200+" label was unreachable.

## v1.0.0
- Initial public release of the UI kit.
