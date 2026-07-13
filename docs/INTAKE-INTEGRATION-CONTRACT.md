# Assessment Intake — Integration Contract

**Read this before rewriting the front-end.** The intake UI (`app/index.html`)
is the visible half of a system whose other half is a live n8n → GHL →
Dataverse pipeline. You may redesign the entire UX — steps, layout, framework,
styling — **but the boundary below must stay byte-identical**, or the backend
silently breaks (no GHL records, no opportunities, no nurture, no Dataverse).

Reference implementation for every contract below: `app/index.html` (functions
named in parentheses). The current file is a single self-contained HTML page
that loads the `bui-*` component kit from `/components` + `/core` via jsDelivr.

---

## 1. The scoring webhook payload — THE critical contract

On final submission the UI POSTs JSON to **`WEBHOOK_URL`**
(`https://brichaus.app.n8n.cloud/webhook/ghl-property-scoring`). n8n's
"Normalize Intake" node reads these EXACT field names (`buildWebhookPayload()`):

| Field | Type | Meaning / how derived |
|---|---|---|
| `UnitCount` | number | 1 for single-family; the entered unit count for multifamily (≥2) |
| `RentValue` | number | avg monthly rent per unit |
| `TenantScore` | number | driver multiplier: 0.5 / 1.0 / 1.5 / 2.0 (Minimal/Standard/Active/Intense) |
| `TurnoverScore` | number | same scale |
| `MaintenanceScore` | number | same scale |
| `ComplianceScore` | number | same scale |
| `GooglePlaceID` | string | Google Places place_id — **the primary key** for the whole pipeline; must be a real place_id from a selected suggestion, never a typed string |
| `FormattedAddress` | string | full formatted address |
| `PropertyName` | string | short property name (street line) — falls back to formatted address |
| `PropertyType` | string | `"Single Family"` or `"Multifamily"` (the Step-1 choice) |
| `RentCastPropertyType` | string | granular RentCast type from the quicklook (e.g. `"Condo"`); `""` if unavailable |
| `FirstName` | string | contact first name |
| `LastName` | string | contact last name (intake-v2). One "Full Name" field is split: first token → `FirstName`, remainder → `LastName`; `""` for a single-word name. The live funnel omits this. |
| `Phone` | string | contact phone (intake-v2). Required to submit (except a recognized+confirmed visitor); light client check = ≥10 digits. Feeds the GHL contact `phone` and the recognition phone-handoff path. The live funnel omits this. |
| `Email` | string | contact email |
| `ContactID` | string | known GHL contact id if the visitor confirmed as an existing contact (recognition), else `""` |
| `Consent` | boolean | consent checkbox state (must be true to submit) |
| `ConsentTimestamp` | ISO string | moment consent was given |
| `EvictionCoverage` | boolean | add-on toggle (default false) |
| `PetCoverage` | boolean | default false |
| `LeasePlacements` | boolean | default false |
| `LeasingFeePct` | number | default 0 |
| `Inspections` | boolean | default false |
| `AsyncReport` | boolean | true only if `REPORT_STATUS_URL` is set (two-phase report) |

The driver multiplier scale is fixed: **Minimal=0.5, Standard=1.0, Active=1.5,
Intense=2.0**. Four drivers: tenant, turnover, maintenance, compliance.

### Scoring response shape (what the UI renders)
```
{
  feeCalcResponse: "0.08",          // fee RATE as a string (0.08 = 8%)
  monthlyFee: 320,                  // optional; dollar/mo
  report: {
    clientSummary: "…",             // AI narrative (may arrive later if async)
    confidenceNote: "…",            // optional
    operationalProfile: {
      band: "Elevated",             // Very Low|Low|Normal|Elevated|High|Severe
      operationalIntensityDefinition: "…",  // one-sentence band def
      categories: [                 // per-driver rows
        { category: "Tenant Friction", label: "High", summary: "…" },
        { category: "Turnover Pressure", label: "Normal", summary: "…" },
        { category: "Maintenance Burden", label: "High", summary: "…" },
        { category: "Compliance & Administration", label: "Normal", summary: "…" }
      ]
    }
  }
}
```
Category display names are exactly: **Tenant Friction, Turnover Pressure,
Maintenance Burden, Compliance & Administration** (the proposal report maps
these; the old "Compliance Burden" string is still accepted for cached data).

### Async (two-phase) report — optional
If `AsyncReport:true`, the pipeline returns the deterministic answer fast and
the AI narrative later. The UI polls **`REPORT_STATUS_URL`**
(`…/webhook/ghl-report-status`) by `googlePlaceId` until `clientSummary` /
`confidenceNote` appear, then slots them in. Omit `REPORT_STATUS_URL` to force a
synchronous full response.

---

## 2. RentCast quicklook (fired the moment an address is selected)

POST to **`RENTCAST_QUICKLOOK_URL`** (`…/webhook/ghl-rentcast-quicklook`) with
`{ FormattedAddress, GooglePlaceID }`. Purely a UX preview (market-rent hint,
comps, and the granular `propertyType` the payload's `RentCastPropertyType`
comes from). Response includes `propertyType`, `rent`, `rentRangeLow/High`,
`comparables[]`, etc. Failure is silent — never blocks submission.

---

## 3. Contact Recognition webhook — 5 actions

POST to **`CONTACT_RECOGNITION_URL`** (`…/webhook/ghl-contact-recognition`) with
an `action` field. All keyed on `googlePlaceId`.

| action | request | response | when |
|---|---|---|---|
| `recognize` | `{action, googlePlaceId}` | `{recognized, firstName, contactId}` | on address select — is this property already known? |
| `confirmEmail` | `{action, googlePlaceId, emailAttempt}` | `{confirmed}` | visitor types email to prove they're the known contact |
| `conflict` | `{action, googlePlaceId, phone, existingFirstName, existingContactId, wrongEmailAttempts}` | `{}` | failed email confirmation → phone handoff |
| `getCachedProposal` | `{action, googlePlaceId, emailAttempt?}` | `{found, propertyName, feeCalcResponse, monthlyFee, report}` | proposal.html loads a saved proposal |
| `expansionLead` | `{action, email, state, formattedAddress, googlePlaceId}` | `{ok}` | out-of-area email capture (see §5) |

`sessionStorage['bui-confirmed-email']` hands a confirmed email between the
funnel and proposal.html (same origin) to skip a second confirmation.

---

## 3b. Site-selected routing (intake-v2 only)

`app/intake-v2.html` is address-first: the moment an in-area address is
selected it POSTs `{ googlePlaceId, formattedAddress, unitNumber }` to
**`SITE_ROUTING_URL`** (`…/webhook/ghl-site-selected`, n8n workflow
`JoypA2AkglKBsIGh`) and routes on the response. Fires AFTER the service-area
gate; fails OPEN to `fetch-rentcast`.

```
{
  route: "proposal" | "render-known" | "fetch-rentcast",
  recognized: bool,           // true only on "proposal"
  firstName: "",              // for the recognition welcome panel
  contactId: "",              // known GHL contact id, if any
  propertyFacts: { … } | null // enriched RentCast facts (below); null when unknown
}
```

- **proposal** — fresh cached JSON + a resolvable contact → recognition
  welcome panel → existing confirm-email → proposal path.
- **render-known** — fresh cached JSON, no contact match → render the facts
  snapshot, continue the funnel to capture.
- **fetch-rentcast** — no / stale (>3 mo) JSON → RentCast fetched server-side,
  facts snapshot rendered, continue.

### `propertyFacts` shape (the enriched render contract — Phase 2b)

The routing endpoint maps this from the first RentCast Property Records match
(`getCachedProposal`/cache on render-known; live fetch on fetch-rentcast).
**Every field is optional** — the front-end omits any row whose value is null,
so adding/removing a field never breaks the render.

| Field | From | Rendered as |
|---|---|---|
| `propertyType` | top-level | "Property type"; also drives the type pre-select + per-unit vs whole-building render |
| `bedrooms` / `bathrooms` / `squareFootage` | top-level | shown ONLY for Single Family / Condo / Townhouse (per-unit dwellings); suppressed for Multifamily/Apartment/etc. |
| `yearBuilt` | top-level | "Year built" — all types |
| `lotSize` | top-level | "Lot size" (sq ft) — all types |
| `county` | top-level | "County" (` County` appended) — all types |
| `floorCount` | features | "Floors" |
| `roomCount` | features | "Rooms" |
| `garageSpaces` / `garage` | features | "Garage" (space count, else Yes/No) |
| `architectureType` | features | "Architecture" (title-cased) |
| `roofType` | features | "Roof" |
| `heating` (bool) / `heatingType` (string) | features | "Heating" (prefers the type string) |
| `cooling` (bool) / `coolingType` (string) | features | "Cooling" (prefers the type string) |
| `pool` (bool) | features | "Pool: Yes" (only when true) |
| `viewType` | features | "View" |

Owner name / last-sale price / owner-occupancy are **deliberately NOT sent to
the render** (the visitor isn't verified as the owner). No rent, no comps on
this step — those stay on the Snapshot step. Storage of these key fields is
**Dataverse-only** (no new GHL custom fields); see the plan's Phase 2b.

---

## 4. Config endpoints (all currently live)

```
WEBHOOK_URL            …/webhook/ghl-property-scoring     (submission)
RENTCAST_QUICKLOOK_URL …/webhook/ghl-rentcast-quicklook   (address-select preview)
CONTACT_RECOGNITION_URL…/webhook/ghl-contact-recognition  (recognition + expansion)
REPORT_STATUS_URL      …/webhook/ghl-report-status        (async poll; optional)
IMAGE_PROXY_URL        …/webhook/ghl-property-image        (proposal.html property images)
PROPOSAL_PAGE_URL      {{custom_values.management_proposal_url}}  (GHL custom value; JS falls back to https://brichausgroup.com/mgmt_proposal)
BOOKING_URL            https://api.leadconnectorhq.com/widget/booking/s2N572QXrgVZKGzRCsya
```

### Property image proxy (proposal.html)

`GET IMAGE_PROXY_URL?type=<streetview|compsmap>&placeId=<GooglePlaceID>` returns a
server-side-generated, **per-property-cached** Google image so the public proposal
page never sees a Google key:
- `streetview` → the subject property's Street View photo (JPEG), or **204** when
  Google has no imagery / the property can't be resolved.
- `compsmap` → a Static Map of the subject + its RentCast rental comps as markers
  (PNG). **Single-family / condo / townhome only** — multifamily uses per-unit-type
  market rents (no point-comps to map), so multifamily → **204**. Also **204** when
  there are no comp coordinates.

The proxy holds `GOOGLE_GEOCODING_KEY` server-side, precheck-gates Street View via
the free metadata endpoint, and caches each image by `placeId:type` so repeat views
never re-bill Google. `proposal.html` renders each via an `<img>` that reveals on
load and hides on `onerror` (the 204 trips onerror), so a property with no imagery
just shows no banner.
```

---

## 5. Service-area gate (business rule — keep it)

Checked the instant an address is selected, using Google's
`administrative_area_level_1` (USPS state code). Fail OPEN if no state returned.
- **active** (`AR`, `CA`) → full assessment runs.
- **expansion** (`TX`, `OK`, `FL`, `GA`, `LA`) → NO assessment; show a
  stay-in-touch email capture that POSTs the `expansionLead` action (tags a GHL
  contact `expansion-market` + `expansion-<state>`). Skips quicklook/recognition
  spend.
- **anything else** → polite "not served" message, nothing captured.

---

## 6. GHL embedding — the SHA-pinned paste process

The page runs INSIDE a GHL page/custom-code block. Assets load from jsDelivr
pinned to a commit SHA (never `@main` in production — CDN caching). To deploy:
1. Extract from the first `cdn.jsdelivr` line to the last standalone `</script>`.
2. `sed s#brichaus-ui-kit@main/#brichaus-ui-kit@<SHA>/#g`.
3. Verify 0 stray `@main` and balanced `<script>`/`</script>` counts.
4. Paste into the GHL page's custom-code element.

A rewrite can change the asset set, but must preserve: same-origin with
proposal.html (for the sessionStorage handoff) and the SHA-pin discipline.

---

## 7. What is FREE to redesign vs. FIXED

**Free**: every step's layout/order/visuals, the component kit or framework,
copy, the map/street-view extras, animations, the results-report presentation
(as long as it consumes the §1 response shape), mobile treatment.

**Fixed (breaks the backend if changed)**: the §1 payload field names + the
driver multiplier scale; the §3 recognition action names + shapes; `GooglePlaceID`
must be a real Google place_id; the §5 state lists (unless business changes);
same-origin + SHA-pin from §6.

**Historical note**: the funnel used to submit via GHL's native survey; that is
dead (GHL ignores synthetic clicks). Record creation is 100% server-side from
the §1 payload now. Don't reintroduce native-survey submission.

---

## 8. Verifying a rewrite

The established harness (see `scratchpad/verify/*.js` in the build session):
copy the page to scratch, rewrite the jsDelivr CDN base to local file paths,
mock Google Places via `addInitScript`, mock the webhooks via `page.route`,
drive the funnel with Playwright, and assert the §1 payload the scoring route
receives has every field with correct values. Add a live n8n execution check
(one real submission → inspect the pipeline run) before shipping.
