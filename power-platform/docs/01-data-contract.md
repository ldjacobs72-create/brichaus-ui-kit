# Data contract — `new_property` and its related tables

This is the **shared surface** between the public funnel, the n8n pipeline, and
the internal Canvas App. Treat it as an API. Field logical names, keys, and
choice values below are pulled directly from the live Dataverse environment;
if the schema changes, re-run `pac` / the Dataverse describe and update this
file — it is the source of truth the build spec relies on.

> Prefix note: this environment mixes two publisher prefixes on the same
> table — `new_` (older columns) and `cr55d_` (newer columns). Both are real
> and both matter. Don't "normalize" them; use each column's actual logical
> name exactly as listed.

## The hub table: `new_property`

- **Display name:** Property
- **Logical name:** `new_property`
- **Collection (plural, for OData):** `new_properties`
- **Primary name column:** `new_propertyname` (NVARCHAR 850, required)
- **Primary key:** `new_propertyid` (GUID)

### Business key (the join everything uses)

- **`new_goggleplace_id`** — NVARCHAR(200), **required**. The Google Place ID.
  This is the *de-facto unique business key* the whole system joins on: the
  intake page writes it, n8n searches by it, the proposal page loads by it.
  - ⚠️ The logical name is misspelled **`goggleplace`** (not `google`). This is
    baked into the environment and cannot be casually renamed without breaking
    n8n and the pages. Use it verbatim.
  - There is no alternate-key uniqueness enforced at the platform level today;
    treat it as unique by convention (see the access model's "don't create
    duplicates" note).

### Columns grouped by the writer that owns them

Ownership is enforced by convention + the access model, not (mostly) by the
platform. The internal app **displays** everything but **writes only** its own
group.

#### A. Identity / record-creation — owned by the **public intake** (read-only in the internal app)

| Logical name | Type | Meaning |
|---|---|---|
| `new_goggleplace_id` | nvarchar(200), req | Google Place ID — the business key |
| `new_propertyname` | nvarchar(850), req | Derived property name (see `computePropertyName()` in `app/index.html`) |
| `cr55d_ghl_contactid` | nvarchar(100) | GHL Contact ID linked at creation |
| `cr55d_streetnumber`, `cr55d_streetname`, `cr55d_street`, `cr55d_unitnumber` | nvarchar(100) | Parsed address parts |
| `cr55d_address1`, `cr55d_address2`, `cr55d_city`, `cr55d_state`, `cr55d_postalcode`, `cr55d_neighborhood` | nvarchar(100) | Address |
| `cr55d_latitude` / `cr55d_longitude` (nvarchar) + `_num` (decimal) | mixed | Geocode |

> These are safe to **edit** in the internal app for data-cleanup purposes
> (a typo'd address), but the internal app must **never change
> `new_goggleplace_id`** on an existing record — that's the key n8n and the
> proposal page resolve against.

#### B. Scoring / fee / snapshot outputs — owned by the **n8n pipeline** (read-only in the internal app)

| Logical name | Type | Meaning |
|---|---|---|
| `cr55d_scoremaintenanceburden` | decimal | OIA driver score |
| `cr55d_scoreturnoverpressure` | decimal | OIA driver score |
| `cr55d_scorecomplianceburden` | decimal | OIA driver score |
| `cr55d_score_operationalintensity` | decimal | Composite operational intensity |
| `cr55d_tenantfrictionscore` | decimal | Derived friction score |
| `cr55d_feebase` | decimal | Computed base fee |
| `cr55d_proposedmgmtfee` | decimal | Computed proposed management fee |
| `cr55d_rentcastjsonsnapshot` | multiline | Raw RentCast payload |
| `cr55d_rentcast_json_date` | date | RentCast snapshot date |
| `cr55d_propertytype_rentcast` | nvarchar(100) | RentCast-reported property type |
| `cr55d_snapshot_json` | multiline | Assembled snapshot JSON (feeds the report) |
| `cr55d_onlineproposaljson` | multiline | **The proposal payload `app/proposal.html` renders** |
| `new_averagerentperunit` (money), `new_egrmonthly` (money) | money | Rent / effective gross rent |
| `new_unitcount` | int | Unit count (also set from intake) |

> The internal app shows these as **read-only report cards**. Overwriting
> `cr55d_onlineproposaljson` or the score fields from the app would break the
> proposal viewer and the scoring history. If staff need to *re-run* scoring,
> the correct action is to trigger the n8n pipeline (see build spec
> "Re-score" action), not to hand-edit these.

#### C. Operational / CRM — **owned by the internal Canvas App** (read + write)

| Logical name | Type | Meaning |
|---|---|---|
| `cr55d_managementstatus` | choice | **Managed (4) · Prospect (2) · Pending (875920001) · Lost (1)** |
| `cr55d_ismanaged` / `cr55d_isprospect` / `cr55d_ispending` / `cr55d_islost` | bit | Denormalized lifecycle flags (keep in sync with `cr55d_managementstatus`) |
| `cr55d_leasingfeerate` | choice | **100% (100) · 50% (50) · 20% (20)** |
| `cr55d_feeadjustment` | decimal | Manual fee adjustment (staff override) |
| `cr55d_feeeviction`, `cr55d_feeinspection`, `cr55d_feeleaseprotect`, `cr55d_feeleasing`, `cr55d_feepetcoverage` | decimal | Per-line fee components |
| `cr55d_evictioncoverage`, `cr55d_petcoverage`, `cr55d_leaseplacementcoverage`, `cr55d_annualinspection` | bit | Coverage toggles staff set on the proposal |
| `new_notes` / `cr55d_...` notes | nvarchar | Free-text staff notes |
| `cr55d_lastsaledate` (date), `cr55d_lastsaleprice` (money), `cr55d_lotsize` (int), `cr55d_yearbuilt` (nvarchar) | mixed | Property facts staff may correct |
| `new_property_type` | lookup → `new_propertytypeclassification` | Classification (drives fee factors) |

> `cr55d_managementstatus` and the four `is*` bits are redundant on purpose
> (the pipeline and some views read the bits, others read the choice). When the
> app changes status, **write both** the choice and the matching bit set — the
> build spec has the exact Power Fx `Patch` for this.

#### D. System / audit columns (read-only everywhere)

`createdon`, `createdby`, `modifiedon`, `modifiedby`, `ownerid`,
`owningbusinessunit`, `statecode` (Active 0 / Inactive 1),
`statuscode` (Active 1 / Inactive 2), `versionnumber`, currency plumbing
(`transactioncurrencyid`, `exchangerate`, `*_base` money shadow columns).

> The `*_base` money columns (`cr55d_lastsaleprice_base`,
> `new_averagerentperunit_base`, `new_egrmonthly_base`) are the
> currency-normalized shadows Dataverse maintains automatically. **Never write
> them** — write the non-`_base` column and let the platform compute the base.

## Related tables (the internal app manages these as child records)

### `new_unitconfiguration` — unit types & rents per property
- Collection: `new_unitconfigurations`
- **Parent link:** `new_property` (lookup → `new_property`, **required**) — this is a **1:N** (one property → many unit configs).
- Key fields: `new_configurationname` (primary), `new_bedrooms`, `new_bathrooms`, `new_squarefootage`, `new_unitcount`, `new_currentmarketrent` (money), `cr55d_marketrentlow` / `cr55d_marketrenthigh` (money), `new_currentrentestimateid` (lookup → `new_rentestimate`).
- **App role:** editable gallery/subgrid on the property detail screen.

### `new_managementagreementterm` — proposed/generated agreement terms
- Collection: `new_managementagreementterms`
- **Parent link:** `new_new_propertyname` (lookup → `new_property`).
- Key fields: `new_termname` (primary), `new_status` (choice: **Draft 875920000 · Proposed 875920001 · Accepted 875920002 · Rejected 875920003**), `new_suggestedfee` (money), `new_effectivedate` (date), `new_description` (multiline).
- **App role:** staff advance term status (Draft → Proposed → Accepted/Rejected).

### `cr55d_propertycontact` — Property ↔ Contact join (roles)
- Collection: `cr55d_propertycontacts`
- Join table linking a property to a Contact with a role + dates.
- Key fields: `cr55d_propertycontact1` (primary), `cr55d_role` (choice: **Owner 875920000 · Decision Maker 875920001 · Broker 875920002 · PM 875920003 · Vendor 875920004 · Tenant 875920005 · Other 875920006**), `cr55d_isprimary` (bit), `cr55d_startdate` / `cr55d_enddate` (date).
- **App role:** manage who's who on a property (owner, decision maker, etc.).

### `new_propertytypeclassification` — classification lookup (reference data)
- Collection: `new_propertytypeclassifications`
- Key fields: `new_propertytypeclassification1` (primary), `new_minunits`, `new_maxunits`, `new_equivalentunitfactor` (decimal), `new_turnoverrateused` (decimal).
- **App role:** read-only lookup source for `new_property.new_property_type`. Reference data — the app selects from it, doesn't edit it.

## Not the table you want: `new_app_property`

A search for "property" also returns **`new_app_property`** (collection
`new_app_properties`). **Ignore it.** It is an empty stub — a single `new_name`
column and system fields, no data model, no relationships. It is almost
certainly a leftover from an earlier experiment. The real, populated,
intake/proposal-connected table is **`new_property`**. Building the internal app
against `new_app_property` would silently point staff at an empty table.

## Entity-relationship summary

```
                         new_propertytypeclassification   (reference data)
                                    ▲ new_property_type (lookup)
                                    │
   cr55d_propertycontact ─────► new_property ◄───── new_unitconfiguration
        (N:1, role)          (HUB — keyed by         (1:N, new_property)
                              new_goggleplace_id)
                                    ▲
                                    │ new_new_propertyname (lookup)
                         new_managementagreementterm  (1:N terms)
```
