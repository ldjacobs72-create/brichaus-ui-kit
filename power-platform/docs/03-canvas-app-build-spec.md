# Canvas App build spec — "Brichaus Property Ops"

The screen-by-screen plan for the internal Canvas App. Written so Claude Code
(or a maker in Power Apps Studio) can execute it against the data contract
([`01`](01-data-contract.md)) and access model ([`02`](02-access-model.md)).

## Live data notes (verified against `org985aea18`, 2026-07-14)

Grounding facts pulled from the real table — build to these, not to assumptions:

- **~29 property records**, actively written (last modified same day) by the n8n
  app user `n8n-dataverse-propscore`. Small table today, but design delegable
  (it grows with the funnel).
- **Status spread:** 25 Prospect, 6 Managed today; **no Pending or Lost yet**.
  Those two choice options exist but are unused — the app introduces them, so
  don't rely on any existing Pending/Lost rows for testing.
- **`statecode` is NOT a proxy for lifecycle.** Observed live: 19 Active
  Prospect, 6 Active Managed, **4 *Inactive* Prospect**. `statecode` and
  `cr55d_managementstatus` are decoupled here. Two consequences, both handled
  below:
  1. **Filter galleries on `cr55d_managementstatus`, never on the default
     `statecode = Active`** — a `statecode`-based filter would silently hide
     those 4 Inactive Prospects.
  2. **"Deactivate" must not couple "Lost" to `statecode`.** Model Lost purely
     via `cr55d_managementstatus` + `cr55d_islost`; leave `statecode` alone
     (something else is already setting it, reason TBD — confirm with n8n before
     ever writing `statecode` from the app).

## Validation round 2 — field-level facts (same env, 2026-07-14)

More live checks, each with a build consequence:

- **The `is*` bits already drift from `cr55d_managementstatus` — 4 of 29 rows
  disagree** (1 Prospect with `isprospect`=No; 3 Managed with `ismanaged`=No and
  `isprospect` still Yes). So **treat `cr55d_managementstatus` as the single
  source of truth**, filter/label from it (never from the bits), and rewrite all
  four bits on every save (the sync `Patch` below). Optionally add a one-time
  "reconcile flags" fix for the 4 stale rows.
- **`cr55d_feebase` and `cr55d_proposedmgmtfee` are PERCENTAGES, not dollars**
  (live range ≈ 2.9%–7.0%, avg ~5.0%). Format the read-only fee cards as `%`.
- **`cr55d_leasingfeerate` is 100% on all 29 rows** — the 50/20 options exist but
  are unused. Still offer all three in the dropdown; expect 100 as the norm.
- **`new_goggleplace_id` has no duplicates** — the search-or-request `LookUp` is
  a safe identity check. ⚠️ But at least one **test record** exists
  (`ChIJ_pin_audit_place_001`, not a real Place ID) — tolerate junk keys and
  consider hiding obvious test rows.
- **`new_unitcount`:** 21 single-unit, a few MF (4/12/52/55 units), and **4 rows
  with NULL**. The list's unit-count column must render null as "—".
- **Operational intensity** (`cr55d_score_operationalintensity`) ranges 0–6,
  avg ~0.5 (mostly Very Low). Size any score gauge for ~0–6, not 0–100.

## App-level facts

- **Type:** Canvas app, **tablet layout** (staff use it on desktop; tablet
  layout gives the horizontal room for master/detail).
- **Data source:** native **Dataverse** connector — **`new_property` only**
  (aliased `Properties`). The related/link tables (`new_unitconfiguration`,
  `cr55d_propertycontact`, `new_managementagreementterm`,
  `new_propertytypeclassification`, `contact`) are **out of scope for this
  build** — this is a single-table property console. See "Out of scope" below.
- **Lives in a solution** (`docs/04`), so it deploys as a solution component,
  not a standalone export.
- **Auth/identity:** `User()` for "modified by me" attribution; row visibility
  comes from the security role, not app logic.

## Delegation — the one thing that will bite you

Dataverse is delegable, but a few operations are not, and this table will grow.
Rules to keep the app correct past 500/2000 rows:

- **Search:** use delegable operators. `StartsWith(new_propertyname, txt)` and
  `Filter(Properties, cr55d_managementstatus = 'Management Status'.Prospect)`
  delegate. Avoid `Search()` over multiple columns and avoid `in` on text —
  they warn and cap at the delegation limit.
- **The business key** `new_goggleplace_id` is text → `LookUp(Properties,
  new_goggleplace_id = gpid)` delegates (equality on text is fine).
- Don't sort galleries on non-delegable expressions; sort on
  `new_propertyname` or `modifiedon`.
- Set **Data row limit** (App settings → General) to 2000, but treat it as a
  safety net, not a design assumption — always filter server-side first.

## Screen 1 — Property list (`scrProperties`)

Master list + search + status filter.

- **Search box** `txtSearch` (blank default).
- **Status filter** `drpStatus`: `["All","Prospect","Pending","Managed","Lost"]`.
- **Gallery** `galProperties`, `Items` (delegable):

  ```powerapps
  SortByColumns(
      Filter(
          Properties,
          (IsBlank(txtSearch.Text) || StartsWith(new_propertyname, txtSearch.Text)),
          (drpStatus.Selected.Value = "All"
              || cr55d_managementstatus = Switch(drpStatus.Selected.Value,
                     "Prospect", 'Management Status (Properties)'.Prospect,
                     "Pending",  'Management Status (Properties)'.Pending,
                     "Managed",  'Management Status (Properties)'.Managed,
                     "Lost",     'Management Status (Properties)'.Lost))
      ),
      "new_propertyname", SortOrder.Ascending
  )
  ```

  > Confirm the choice's global name in Studio (Power Fx surfaces choices as
  > `'<Choice display name>'.<Option>`). The logical column is
  > `cr55d_managementstatus` with options **Managed=4, Prospect=2,
  > Pending=875920001, Lost=1**.

- Each row shows: `new_propertyname`, address (`cr55d_city` & `cr55d_state`),
  a status pill, and `new_unitcount` (render NULL as "—" — 4 live rows have none).
- `OnSelect`: `Set(gblProperty, ThisItem); Navigate(scrPropertyDetail)`.
- **Header button "Add property"** → `scrAddProperty` (search-or-request, below).

## Screen 2 — Property detail (`scrPropertyDetail`)

Master/detail. Bind everything to `gblProperty`. **Group A/B controls are
display-only** (`DisplayMode.View`); only Group C is editable.

Lay it out as tabs/sections:

### Section: Header (read-only)
`new_propertyname`, full address, `new_goggleplace_id` (small, monospace,
`DisplayMode.View` — it's the key, never editable), `createdon`, and
`cr55d_ghl_contactid` shown as read-only text (a plain text column on the
property — no `contact` table needed). Also show `cr55d_propertytype_rentcast`
(text, e.g. "Multi-Family") as the property's type.

### Section: Scoring & fee (read-only — Group B, n8n-owned)
Report-style cards for `cr55d_score_operationalintensity`,
`cr55d_scoremaintenanceburden`, `cr55d_scoreturnoverpressure`,
`cr55d_scorecomplianceburden`, `cr55d_tenantfrictionscore`, `cr55d_feebase`,
`cr55d_proposedmgmtfee`. All `DisplayMode.View`. These are column-secured
read-only anyway (`02` layer 3) — binding them editable would just error on
save. **Format `cr55d_feebase` and `cr55d_proposedmgmtfee` as percentages**
(live values ≈3–7%), and size the operational-intensity readout for ~0–6.

### Section: Operations (editable — Group C, the app's job)
Editable form `frmOps` (`DataSource = Properties`, `Item = gblProperty`), fields:
- `cr55d_managementstatus` (dropdown)
- `cr55d_leasingfeerate` (choice: 100/50/20)
- `cr55d_feeadjustment`, `cr55d_feeeviction`, `cr55d_feeinspection`, `cr55d_feeleaseprotect`, `cr55d_feeleasing`, `cr55d_feepetcoverage` (currency inputs)
- `cr55d_evictioncoverage`, `cr55d_petcoverage`, `cr55d_leaseplacementcoverage`, `cr55d_annualinspection` (toggles)
- `new_notes` (multiline)

> Property classification (`new_property_type`) is **display-only** in this
> build — surface `cr55d_propertytype_rentcast` (plain text on the property) in
> the header rather than editing the `new_propertytypeclassification` lookup, so
> no extra table is needed. Promote it to an editable lookup only in a later
> phase if staff need to change classification.

**Save button** — keep the redundant status choice + `is*` bits in sync:

```powerapps
Patch(
    Properties, gblProperty,
    frmOps.Updates,
    {
        cr55d_ismanaged:  (frmOps.Updates.cr55d_managementstatus = 'Management Status (Properties)'.Managed),
        cr55d_isprospect: (frmOps.Updates.cr55d_managementstatus = 'Management Status (Properties)'.Prospect),
        cr55d_ispending:  (frmOps.Updates.cr55d_managementstatus = 'Management Status (Properties)'.Pending),
        cr55d_islost:     (frmOps.Updates.cr55d_managementstatus = 'Management Status (Properties)'.Lost)
    }
);
Set(gblProperty, LookUp(Properties, new_propertyid = gblProperty.new_propertyid))
```

> This is the single most important business rule in the app: **status choice
> and the four `is*` bits must never drift.** Both are written together here.

### Out of scope for this build — related/link tables
Units (`new_unitconfiguration`), property contacts (`cr55d_propertycontact`),
and agreement terms (`new_managementagreementterm`) are **intentionally not part
of this app.** This is a single-table console over `new_property`. Those tables
stay documented in [`01`](01-data-contract.md) for context, but the app does
**not** add them as data sources, render galleries for them, or write to them.
If they're needed later, that's an additive second phase — not this build.

### Actions row
- **Mark Lost** (never delete): `Patch(Properties, gblProperty, {cr55d_managementstatus: 'Management Status (Properties)'.Lost, cr55d_islost: true, cr55d_isprospect: false, cr55d_ismanaged: false, cr55d_ispending: false})`. **Do not write `statecode`** — it's independently in use on live rows (see Live data notes). If a true Dataverse deactivate is ever needed, confirm the `statecode` semantics with the n8n owner first.
- **Open public proposal**: `Launch("https://mgmt.brichausgroup.com/residential-management-proposal/?placeId=" & gblProperty.new_goggleplace_id)`.
- **Re-score** (optional): POST `new_goggleplace_id` to the n8n main pipeline
  webhook via a custom connector — do **not** write scores from the app. Scores
  are n8n's to own (`02`).

## Screen 3 — Add property (`scrAddProperty`) — search-or-request, never bare create

The access model sets `new_property` **Create = None** on purpose. So "add" is:

1. Text box for an address / place ID.
2. `LookUp(Properties, new_goggleplace_id = txtGpid.Text)` (delegable).
3. If found → navigate to its detail. (It already exists — don't duplicate.)
4. If not found → **do not create here.** Show: "New properties are created by
   the intake funnel. Send the owner the intake link, or (if this is an
   internal add) trigger the intake/creation flow." Optionally a button that
   POSTs to the n8n contact-creation path so the record is born with a proper
   Contact link + place ID, exactly like a public visitor.

> This screen is what keeps orphan, Contact-less, key-less property records out
> of the table. It's a feature, not a limitation.

## Theme

Match the funnel's brand tokens so the internal tool feels like one system
(values from the UI kit's `core/core.js` / repo README):
- Accent (conversion gold) `#C08A2E`, Slate `#4A5A72`, Surface-dark `#211E1C`,
  Background `#F4F5F7`, Danger/Brick `#9C3F2C`, Warning `#B5631E`.
- Font: Montserrat.
- Status pill colors: Managed = slate, Prospect = gold, Pending = warning,
  Lost = danger.

## Build order

1. Solution + connector + data sources (`04`).
2. Screen 1 (list + search + delegable filter).
3. Screen 2 header + read-only scoring cards (prove Group A/B are view-only).
4. Screen 2 Operations form + the status/`is*` sync `Patch`.
5. Screen 3 search-or-request.
6. Theme pass.
7. Unpack to `*.pa.yaml`, commit, pack, deploy (`04`).

## Definition of done

- [ ] Group A/B fields are visibly read-only and no `Patch` targets them.
- [ ] Status choice + `is*` bits always saved together.
- [ ] Galleries filter server-side (no delegation warnings on `Items`).
- [ ] "Add" cannot create a bare record; it finds or requests.
- [ ] App is a component inside the solution and packs cleanly.
