# Power Pages — Proposal Engine / Property Lookup: Handoff Punchlist

**Prepared:** 2026-08-28 · **Last code change:** 2026-07-17 · **Last data write:** 2026-08-28 14:11 PT

> Committed from the 2026-08-28 handoff so the punchlist lives with the code it
> describes. §7 records what was checked against this repo afterward — including
> one item whose stated impact the code contradicts.

---

## 1. Where things stand

Two staff-facing Power Pages web templates, both **Published** and functional. Last code edit was a paired change on 7/17 at 05:34 — the point at which the direct Power Pages Web API was abandoned in favor of an n8n webhook for reads. No code has changed since; the app is still in active use (a proposal was recalculated through it today).

| | Proposal Engine | Property Lookup |
|---|---|---|
| Path | `/proposal-engine/` | `/property-lookup/` |
| Purpose | Create or recalculate a proposal | Read-only property search |
| Modes | `create` (no-contact/claimable) · `recalculate` | n/a |
| DRY_RUN | `false` — wrapper live, verified end-to-end | n/a |
| Data path | n8n webhooks | n8n webhook (`internal-property-lookup`) |

---

## 2. Environment facts

**Site**
- Name: `Property Intake` · created 2026-05-08
- URL: `https://propertyintake-2dd3.powerappsportals.com`
- Entra ID gated at the site root (staff web role)
- Second site `Site 1 - site-h6r8w` (created 3/15) is an untouched scaffold — candidate for deletion

**Data model**
- Enhanced data model. Site content lives in **`powerpagecomponent`**, not `mspp_*`. The `mspp_webpage` / `mspp_webtemplate` / `mspp_website` tables return **empty** — don't chase them.
- Web Template = `powerpagecomponenttype` 8; Web Page = 2; Web File = 3; Page Template = 6; Site Setting = 9; Web Role = 11; List = 17; Table Permission = 18.
- Template source is in the `content` column as JSON with a `source` key.

**Component IDs**
- Proposal Engine (Web Template): `417688f4-9680-f111-ab0e-000d3a333ce9`
- Property Lookup (Web Template): `aa20973c-4c81-f111-ab0f-000d3a333ce9`

**Endpoints (n8n · `brichaus.app.n8n.cloud/webhook/`)**
- `ghl-site-selected` — canonicalizer + RentCast (shared with public funnel; parity is load-bearing)
- `ghl-contact-recognition` — `action: getCachedProposal`
- `internal-proposal-create`
- `internal-proposal-recalculate`
- `internal-property-lookup`

**Test record**
- Place ID: `ChIJ7Q4ysT-5woARDsimV3PdsuQ`
- `new_propertyid`: `00e5d06d-5e37-f111-88b4-00224803cb8b`
- 6264 Commodore Sloat Dr, Los Angeles, CA 90048 · Multifamily · 4 units · $3,200/unit
- Claimed (GHL contact `oYwtArtFRvBF3DmMFhV2`) → exercises the recalculate path
- Deep link: `/proposal-engine/?placeId=ChIJ7Q4ysT-5woARDsimV3PdsuQ&address=6264%20Commodore%20Sloat%20Dr%2C%20Los%20Angeles%2C%20CA%2C%2090048`

---

## 3. Punchlist

### P1 — Fee integrity (contract-facing)

**1.1 Rounded % and dollar figure disagree**
- Observed: `cr55d_proposedmgmtfee` = `6.25`; actual `feeRate` = `0.0625155251453331`; `monthlyFee` = `800.20`.
- 6.25% of $12,800 EGR = $800.00. The stored percentage and the stored dollar amount describe different fees.
- Decide which is authoritative, then make both sides agree. If the % goes into the management agreement, round the rate *first* and derive the dollar figure from the rounded value.
- Done when: `monthlyFee` is reproducible from the displayed % and unit/rent inputs, to the cent.

> **Decided 2026-08-28: the rounded percentage is authoritative.** It is the
> figure that goes into the management agreement, so the dollar amount is
> derived from it. The Proposal Engine now does this (§7.3); the n8n write path
> still has to follow, and until it does the widget flags the divergence.

**1.2 Fee components don't reconcile to the final rate**
- Stored: base `6.00`, adjustment `0.50`, lease protect `1.25`, inspection `0.39`, eviction `0.21`, pet `0.21`, leasing `0.00`.
- All four coverage flags are `false`, yet the coverage components carry non-zero values. No simple sum reaches `6.2516` (base + adjustment = 6.50).
- These look like rate-card values rather than applied amounts. Determine intent; if they're catalog values, either stop writing them to the record or add an applied-vs-catalog distinction.
- Done when: the fee can be rebuilt from the record's own columns without consulting the n8n logic.

**1.3 OIA score isn't the mean of its inputs**
- Stored `cr55d_score_operationalintensity` = `0.75`. Straight average of the four scores (0.5, 1.0, 1.0, 1.5) = `1.00`.
- `0.75` equals the average of Tenant Friction + Turnover Pressure alone — Maintenance and Compliance appear to be excluded. Compliance is the only above-normal score on this record, so the exclusion is material.
- Confirm the weighting is deliberate and document it, or fix it.

> **Resolved — not a defect. See §7.5.** The OIA is the **product** of the four
> multipliers, not their mean. `0.5 x 1.0 x 1.0 x 1.5 = 0.75` exactly. All four
> inputs are included; the match against "the average of the first two" is a
> coincidence of these particular values.

### P1 — Owner-facing output

**1.4 Proposal narrative renders empty but reports ready**
- `clientSummary` and `confidenceNote` are empty strings; `rentRangeLow`/`rentRangeHigh` are `null`; `reportStatus` is `"ready"`.
- The owner-facing proposal page will render blank summary sections.
- Either populate them in the generate/recalculate core, or make `reportStatus` reflect the missing narrative so the page can degrade gracefully.

> **See §7.2 — the stated impact does not match the code.** The narrative is
> deliberately not rendered to owners, so nothing on the proposal page goes
> blank. The defect is real but its blast radius is internal.

**1.5 `new_owner_contact` not written on the recalculate path**
- The GHL contact ID is set, but the Dataverse contact lookup is empty.
- This is the field added for property→contact association and future owner-portal permissions — portal access keyed on it will not resolve.
- Done when: a claimed property has both `cr55d_ghl_contactid` and `new_owner_contact` populated after recalculate.

### P2 — Auth and routing

**2.1 Verify deep links survive sign-in**
- The OAuth authorize request sets `redirect_uri` to the site root, not the requested path.
- Property Lookup's click-through generates exactly the deep-link URL shape above, so a signed-out staff member clicking a result may land on Home with the params gone.
- Test: sign out fully, hit the deep link, sign in, confirm you land on the loaded proposal.

### P2 — Architecture debt

**2.2 Direct Web API path abandoned, not resolved**
- `/_api/new_property` returned an opaque `9004010A` on every request with table permission, site settings, and web role all verified correct — including with `Webapi/error/innererror` enabled.
- Property Lookup now routes reads through n8n instead. Revisit if Microsoft support resolves it.
- Meanwhile the three `Webapi/new_property/*` site settings (created 7/16) are dead config still enabled on the site — remove or annotate.

**2.3 Read traffic consumes n8n executions**
- A read-only page now costs a webhook execution per search. The Proposal Engine's `postJson` comment records that an n8n account execution-limit error once presented as a generic connectivity failure during live testing.
- Consider caching or a debounce ceiling if lookup usage grows.

> **Addressed in-repo — see §7.4.**

**2.4 RentCast facts are stale on recalculate**
- Snapshot dated `2026-07-20`. Recalculate reuses the saved rent rather than refreshing. Defensible for a fee recalc, but $3,200/unit is a July number.
- Decide whether recalculate should refresh facts or explicitly display the snapshot date.

**2.5 Internal nav is hand-duplicated**
- Both templates carry their own copy of `.bui-internal-nav` markup and CSS. Intentional (self-contained documents), but a third page means a third copy.

**2.6 Mixed field prefixes**
- `new_propertyname`, `new_goggleplace_id`, `new_unitcount` vs `cr55d_*` for everything else. Note the typo in `new_goggleplace_id` is the real column name — it's the dedupe key, don't "fix" it.

---

## 4. Gotchas — read before editing either template

- **`bui-select` options must be injected in JS.** `connectedCallback` fires when the parser inserts the opening tag, before nested `<option>` children exist. On a network-parsed page, static options become inert siblings of the internal `<select>`. Confirmed by DOM inspection. All three selects populate via `fillSelectOptions()` in `init()`.
- **The whole document sits inside a Liquid `raw` block.** Writing the literal raw-tag syntax anywhere inside — including in a comment — closes the block early and breaks the page.
- **One Liquid tag lives outside the raw block on purpose:** the `google_maps_key` site setting lookup, placed immediately after `<head>` so the DOCTYPE stays the first byte. Local dev (`powerpages/dev/serve-widget.js`) substitutes that exact line at serve time — keep it intact and in place.
- **Page links must be absolute** (`/proposal-engine/`). Power Pages routes by Partial URL with no extension, so a bare filename appends to the current path.
- **`powerpagesite.modifiedon` does not update on component edits.** The site record still reads 5/8. Query `powerpagecomponent.modifiedon` for the real audit trail.
- **Update the Maps key in the site setting only**, never in the template source.

---

## 5. Suggested order

1. 1.1 and 1.2 together — both are the fee write path, and 1.2 may explain 1.1.
2. 1.3 — needs a decision from you before code changes.
3. 1.5, then 1.4.
4. 2.1 (quick test, no code).
5. 2.2 cleanup of dead site settings.

**As of 2026-08-28 this order has moved on.** 1.3 is closed (§7.5) and 2.3 is
done (§7.4). 1.1 is decided and its display half shipped (§7.3), leaving its
write path — still best paired with 1.2, as the original note says. So the
live queue is: **1.1 write path + 1.2**, then **1.5**, then **1.4** (which
§7.2 downgrades from owner-facing to internal), then 2.1 and 2.2.

All of the remaining P1 work is inside n8n, which this session could not
reach — see §7.6 for what that needs.

---

## 6. Where each item actually lives

The punchlist is written from the Dataverse record outward, so it reads as one
body of work. It isn't — the fixes are spread across four systems, and only one
of them is this repository. This matters for planning: a session with only the
repo checked out cannot close most of the P1 items, no matter how much context
it has.

| Item | System of record | Fixable from this repo? |
|---|---|---|
| 1.1 fee rounding | n8n write path + Power Automate **Fee Calc** flow | Display half **done** (§7.3); write path still n8n |
| 1.2 fee components | n8n / Fee Calc flow | No |
| 1.3 OIA weighting | n8n OIA scoring | **Closed — not a defect** (§7.5) |
| 1.4 empty narrative | n8n generate/recalculate core | No — and see §7.2 |
| 1.5 `new_owner_contact` | n8n `internal-proposal-recalculate` | No |
| 2.1 deep link + sign-in | Power Pages / Entra config | No — live sign-in test |
| 2.2 dead site settings | Dataverse `powerpagecomponent` type 9 | No — maker portal or Dataverse write |
| 2.3 read traffic | `property-lookup.html` | **Yes — done, §7.4** |
| 2.4 stale RentCast facts | n8n (refresh) or templates (show date) | Display half only |
| 2.5 duplicated nav | Both templates | Yes |
| 2.6 mixed prefixes | Dataverse schema | Documentation only |

The n8n workflow definitions are not in this repository and are not exported
anywhere in it. `docs/PIPELINE-MAP.md` describes the pipeline's shape; it does
not carry the fee arithmetic. Fixing 1.1–1.5 means editing the n8n workflows and
the Power Automate **Fee Calc** flow directly.

## 7. Verified against the code (2026-08-28)

### 7.1 Stored values could not be re-checked

The Dataverse MCP server errored on every call this session (protocol
mismatch — malformed tool results; see §7.6). **No figure in §3 was
independently verified**; the arithmetic below is reasoning about the numbers
as written in the punchlist, not a fresh read of the record.

### 7.2 1.4's stated impact contradicts the code

> "The owner-facing proposal page will render blank summary sections."

It will not. `clientSummary` / `confidenceNote` are deliberately never rendered
to owners, stated in two independent places:

- `app/proposal.html:1580-1585` — "The AI narrative (clientSummary/confidenceNote)
  is likewise **NOT** rendered — internal, kept in a GHL field for call scripts /
  follow-up."
- `app/intake-v2.html:1689-1691` — the narrative "is never fetched back for
  display — the funnel hands off to the proposal page the moment scoring
  returns, and the narrative isn't shown to customers."

The `.report-summary` / `.report-narrative` / `.report-confidence` rules in
`app/proposal.html` are CSS-only leftovers from when it *was* rendered — no
markup references them, so there is no element to go blank.

`rentRangeLow` / `rentRangeHigh` likewise do not reach the proposal page. They
are consumed only by the funnel's `renderRentVsMarket()`
(`app/intake-v2.html:2890`), sourced live from the RentCast quicklook rather
than from the stored record, and that function already hides its whole block
when any of the three values is null.

**The defect is still real, with a different consequence.** The two-phase
report contract (`docs/INTAKE-INTEGRATION-CONTRACT.md:76-82`) has the pipeline
return the deterministic answer fast and generate the narrative in the
background, with `reportStatus` marking readiness. `reportStatus: "ready"`
alongside an empty `clientSummary` means that contract is being satisfied
vacuously — the async generation is no-opping and reporting success. What is
lost is the **internal** artifact: the call-script / follow-up prose in GHL,
silently absent with nothing signalling it. That reframes 1.4 from an
owner-facing rendering bug to a silent-failure bug in the generate core, and it
argues for the punchlist's second option (make `reportStatus` tell the truth)
over the first.

Reordering note: §5 puts 1.4 after 1.5. Nothing owner-facing is broken by it,
which supports leaving it there or later.

### 7.3 1.1 — rounded % made authoritative in the Proposal Engine

Decision recorded 2026-08-28: **the rounded percentage wins.** It is the number
that goes into the management agreement, so the dollar figure has to be derived
from it rather than from the unrounded rate.

Three render sites printed a rounded percentage beside a dollar amount derived
from the unrounded rate:

- `proposal-engine.html` `prefillFromExisting()` — `(feeCalcResponse * 100).toFixed(2)`
  beside `monthlyFee` as stored. On the test record, exactly the reported
  symptom: **6.25%** beside **$800.20**.
- Same file, `onGenerate()` — the same pairing on the fresh response.
- `property-lookup.html` — the Fee column prints `cr55d_proposedmgmtfee` to two
  decimals and shows no dollar figure, so it is already consistent with this
  decision. **Unchanged.**

Both Proposal Engine sites now go through one `renderFee()` helper that rounds
the rate first and applies the *rounded* rate to gross monthly rent (rent per
unit x units, the two inputs on screen). On the test record that reads 6.25% and
$800.00 on $12,800 gross — reproducible to the cent from what staff can see,
which is §3's own done-condition.

`app/proposal.html:1555-1565` was already self-consistent by a different route:
it shows the rate to one decimal and back-computes gross from
`monthlyFee / feeRate` using the unrounded rate, so its three numbers reconcile
with each other. Left alone — it is the owner-facing page, and changing it is
part of the n8n write-path change, not this one.

**The write path is still unfixed**, so `monthlyFee` in Dataverse continues to
come from the unrounded rate and will disagree with the widget by cents. That is
a real divergence between the screen and the record, so `renderFee()` surfaces
it rather than hiding it: when the stored figure differs from the derived one by
half a cent or more, the fee block shows what the record says and by how much it
is off. The note disappears on its own once the n8n side rounds first too — no
follow-up edit needed to retire it.

### 7.4 2.3 addressed

`property-lookup.html` already had a 300 ms debounce and a sequence guard
against out-of-order responses; what it lacked was any memory, so replayed
queries (backspace-and-retype, clear-and-re-enter, pausing mid-word and
finishing the same term) each cost another n8n execution. Added a 60-second,
25-entry result cache in front of `runSearch()`. The TTL is deliberately short
because these rows carry the proposed fee and a recalculation changes it — long
enough to absorb keystroke-level repetition, not long enough to show a fee that
has since moved.

A cache hit renders through the same `showRows()` path as a live read, so it is
indistinguishable on screen.

### 7.5 1.3 — the OIA is a product, not a mean

Closed as not-a-defect. The operational intensity figure is the **product** of
the four driver multipliers:

```
0.5 (Tenant Friction) x 1.0 (Turnover Pressure) x 1.0 (Maintenance Burden) x 1.5 (Compliance) = 0.75
```

which is the stored `cr55d_score_operationalintensity` exactly. §3's reading —
that the value equals the mean of the first two drivers, so Maintenance and
Compliance must be excluded — is a coincidence of these particular values: with
the middle two at 1.0 they are multiplicative identities and drop out of sight
without dropping out of the calculation. Compliance's 1.5 *is* included; it is
what lifts 0.5 to 0.75.

This is consistent with the rest of the pipeline, which has always called these
multipliers rather than scores — `docs/INTAKE-INTEGRATION-CONTRACT.md:48-49`:
"The driver **multiplier** scale is fixed: Minimal=0.5, Standard=1.0,
Active=1.5, Intense=2.0."

Worth noting for anyone re-deriving it later: a product over four multipliers
spans 0.0625 to 16, not the 0.5-2.0 of its inputs, so any band thresholds
consuming it have to be on the product's scale. Nothing to change; recorded so
this doesn't get re-raised as a bug.

### 7.6 Connector status — why the n8n items can't be worked from here

Both blockers are connector-side, and only one of them is fixable by the user.

**n8n — needs authentication.** The connector is installed on the account but
reports `installState: "unknown"`, is absent from this chat's tool surface
(`enabledInChat: false`), and appears in Claude Code's needs-auth cache
alongside Canva. So its tools never loaded and the workflows behind 1.1's write
path, 1.2, 1.4 and 1.5 are unreachable. **This is the one worth fixing** —
authenticating the n8n connector and enabling it in chat is what turns the
remaining P1 items from "specify and hand off" into "fix directly."

**Dataverse — a server-side bug, nothing to reconnect.** The connector is fully
`connected: true` and `enabledInChat: true`; its tools load fine. Every
`tools/call` fails identically, on `describe` as well as `read_query`, with:

> missing required `resultType` — servers implementing protocol revision
> 2026-07-28 MUST include it

That is the response envelope being malformed regardless of which tool is
called, so it is a protocol-compliance bug in Microsoft's hosted Dataverse MCP
server, not an auth or configuration problem. There is no local `mcpServers`
entry to pin to an earlier revision (it is a managed claude.ai connector), and
re-authenticating will not change the envelope. It clears when Microsoft ships
a compliant server.

Reads of the record are still reachable another way in the meantime: the live
`internal-property-lookup` and `getCachedProposal` webhooks both read Dataverse
and answer over plain HTTPS. That costs an n8n execution per call (§2.3), so it
is a deliberate fallback rather than a default.
