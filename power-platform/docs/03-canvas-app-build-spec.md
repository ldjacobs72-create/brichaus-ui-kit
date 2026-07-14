# Canvas App build spec — "Brichaus Property Ops"

The screen-by-screen plan for the internal Canvas App. Written so Claude Code
(or a maker in Power Apps Studio) can execute it against the data contract
([`01`](01-data-contract.md)) and access model ([`02`](02-access-model.md)).

## App-level facts

- **Type:** Canvas app, **tablet layout** (staff use it on desktop; tablet
  layout gives the horizontal room for master/detail).
- **Data source:** native **Dataverse** connector. Add these tables:
  `new_property` (Properties), `new_unitconfiguration`, `new_managementagreementterm`,
  `cr55d_propertycontact`, `new_propertytypeclassification`, `contact`.
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
  a status pill, and `new_unitcount`.
- `OnSelect`: `Set(gblProperty, ThisItem); Navigate(scrPropertyDetail)`.
- **Header button "Add property"** → `scrAddProperty` (search-or-request, below).

## Screen 2 — Property detail (`scrPropertyDetail`)

Master/detail. Bind everything to `gblProperty`. **Group A/B controls are
display-only** (`DisplayMode.View`); only Group C is editable.

Lay it out as tabs/sections:

### Section: Header (read-only)
`new_propertyname`, full address, `new_goggleplace_id` (small, monospace,
`DisplayMode.View` — it's the key, never editable), `createdon`, Contact link.

### Section: Scoring & fee (read-only — Group B, n8n-owned)
Report-style cards for `cr55d_score_operationalintensity`,
`cr55d_scoremaintenanceburden`, `cr55d_scoreturnoverpressure`,
`cr55d_scorecomplianceburden`, `cr55d_tenantfrictionscore`, `cr55d_feebase`,
`cr55d_proposedmgmtfee`. All `DisplayMode.View`. These are column-secured
read-only anyway (`02` layer 3) — binding them editable would just error on
save.

### Section: Operations (editable — Group C, the app's job)
Editable form `frmOps` (`DataSource = Properties`, `Item = gblProperty`), fields:
- `cr55d_managementstatus` (dropdown)
- `cr55d_leasingfeerate` (choice: 100/50/20)
- `cr55d_feeadjustment`, `cr55d_feeeviction`, `cr55d_feeinspection`, `cr55d_feeleaseprotect`, `cr55d_feeleasing`, `cr55d_feepetcoverage` (currency inputs)
- `cr55d_evictioncoverage`, `cr55d_petcoverage`, `cr55d_leaseplacementcoverage`, `cr55d_annualinspection` (toggles)
- `new_notes` (multiline)
- `new_property_type` (lookup → `new_propertytypeclassification`)

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

### Section: Units (`galUnits` — child records)
Gallery over `Filter(new_unitconfigurations, new_property.new_propertyid =
gblProperty.new_propertyid)`. Add/edit via `frmUnit` patched with
`new_property` set to `gblProperty`. Editable: `new_configurationname`,
`new_bedrooms`, `new_bathrooms`, `new_squarefootage`, `new_unitcount`,
`new_currentmarketrent`, `cr55d_marketrentlow`, `cr55d_marketrenthigh`.

### Section: Contacts (`galContacts` — join records)
Gallery over `cr55d_propertycontacts` filtered to this property. Fields:
`cr55d_role` (Owner/Decision Maker/Broker/PM/Vendor/Tenant/Other),
`cr55d_isprimary`, `cr55d_startdate`/`cr55d_enddate`, link to `contact`.

### Section: Agreement terms (`galTerms`)
Gallery over `Filter(new_managementagreementterms, new_new_propertyname... =
gblProperty...)`. Advance `new_status` Draft → Proposed → Accepted/Rejected;
edit `new_suggestedfee`, `new_effectivedate`, `new_description`.

### Actions row
- **Deactivate** (never delete): `Patch(Properties, gblProperty, {cr55d_managementstatus: 'Management Status (Properties)'.Lost, cr55d_islost: true, statecode: 'Status (Properties)'.Inactive})`.
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
5. Child galleries (units → contacts → terms).
6. Screen 3 search-or-request.
7. Theme pass.
8. Unpack to `*.pa.yaml`, commit, pack, deploy (`04`).

## Definition of done

- [ ] Group A/B fields are visibly read-only and no `Patch` targets them.
- [ ] Status choice + `is*` bits always saved together.
- [ ] Galleries filter server-side (no delegation warnings on `Items`).
- [ ] "Add" cannot create a bare record; it finds or requests.
- [ ] App is a component inside the solution and packs cleanly.
