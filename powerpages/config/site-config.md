# Power Pages — declarative config (studio setup checklist)

The standard-components half of the hybrid site. Apply in the Power Pages design studio
(or generate as `pac pages` YAML once a base site is downloaded). Everything here is
config, not code.

Environment: `org985aea18` · table: `new_properties` (custom columns are `cr55d_*`).

---

## 1 · Identity providers (Security workspace)

| Provider | Audience | When |
|---|---|---|
| **Microsoft Entra ID** (work accounts) | Staff | now |
| **Microsoft Entra External ID** (CIAM) | Owners/clients | owner-portal phase (later) |

- Registration: **invitation-only** to start (control who gets access).
- Contact mapping with email: **On** (auto-associates a login to its Dataverse contact —
  the mechanic the online claim relies on).

---

## 2 · Web roles (Security workspace)

| Web role | Assigned to | Purpose |
|---|---|---|
| **Staff** | authenticated Entra ID users | full access to all proposals |
| **Owner** *(later)* | authenticated Entra External ID users | their own property only |
| Anonymous (default) | unauthenticated | none / marketing pages only |

---

## 3 · Table permissions (Security workspace)

| Name | Table | Web role | Scope | Privileges |
|---|---|---|---|---|
| Staff – Properties | `new_properties` | Staff | **Global** | Read, Write, Create, Append/AppendTo |
| Staff – Config (read) | `cr55d_oiaband`, `cr55d_oiascorelabel`, `cr55d_oiaevidencenote`, `cr55d_feeprotectionrule`, `cr55d_servicearea`, `cr55d_appconfig` | Staff | Global | Read |
| Owner – My Property *(later)* | `new_properties` | Owner | **Contact** | Read |

> Contact-scope uses the `new_properties` → contact relationship (the record's
> `cr55d_ghl_contactid`/contact lookup). An owner sees only records tied to their contact.

---

## 4 · Proposals **List** (Surface 2 — manage)

Standard Power Pages List over a `new_properties` view. Suggested columns:

| Column | Source |
|---|---|
| Property name | `new_propertyname` |
| Address | `cr55d_street` / `cr55d_city` / `cr55d_state` |
| Claimed? | derived — has `cr55d_ghl_contactid` (show "Unclaimed" when empty) |
| Proposed mgmt fee | `cr55d_proposedmgmtfee` |
| Leasing % | `cr55d_leasingfeerate` |
| Created | `createdon` |

- Enable **search**, **sort**, **paging** (built-in).
- Row action → opens the **Proposal edit** form (below).
- Page permission: **Staff** role only.

---

## 5 · Proposal **Basic Form** (Surface 2 — edit)

Edit-mode Basic Form on `new_properties`. Fields (grouped):

- **Scores:** `cr55d_tenantfrictionscore`, `cr55d_scoreturnoverpressure`,
  `cr55d_scoremaintenanceburden`, `cr55d_scorecomplianceburden`
- **Coverage (override):** `cr55d_evictioncoverage`, `cr55d_leaseplacementcoverage`,
  `cr55d_annualinspection`, `cr55d_petcoverage`
- **Fee inputs:** `cr55d_leasingfeerate`, rent (`new_*rent*` / captured value)
- **Read-only context:** `cr55d_proposedmgmtfee`, address fields, RentCast facts

Actions on the form:
- **Recalculate & Publish** → button runs a small web-template/JS action that calls the
  **internal wrapper** (authenticated) with the record id → re-runs the Generate core with
  the *current (edited)* values → rewrites `cr55d_onlineproposaljson`. It uses the saved
  coverage values (does **not** re-derive).
- **Preview** → link to `https://brichausgroup.com/mgmt_proposal?placeId={cr55d_...placeid}`.

Page permission: **Staff** role only.

---

## 6 · Create New page (Surface 1)

- A web page whose content is the **`create-new-proposal` web template**
  (`../web-templates/create-new-proposal.html`).
- Page permission: **Staff** role only.
- Launched from the Proposals list ("+ Create New") and/or main nav.

---

## 7 · Site settings

- **Content Security Policy** — allowlist for the create widget:
  - `https://maps.googleapis.com` (Autocomplete/Maps JS)
  - `https://cdn.jsdelivr.net` (the `bui-*` component kit)
  - `https://fonts.googleapis.com` / `https://fonts.gstatic.com` (Montserrat)
  - `connect-src`: `https://brichaus.app.n8n.cloud` (ghl-site-selected + internal wrapper)
- **Enhanced data model** + **Bootstrap 5** enabled (environment-level).
- Optional: IP restriction / WAF for the staff site.

---

## Backend endpoints (n8n)

- **Internal create wrapper** — ✅ built + published: `PropScore: Internal Proposal Create`
  (`aJsNgnkTqcl0iNAw`), webhook `POST /webhook/internal-proposal-create`. Reuses the OIA
  Scoring sub-workflow + the same Power Automate fee endpoint, applies the create widget's
  coverage **overrides** (no re-derive), assembles the report, and upserts `new_properties`
  **without a contact id** (claimable). Verified with a pinned run (OIA live; fee + store
  pinned = no writes). **Final gate before flipping the widget off DRY_RUN:** one live
  end-to-end call with a disposable test placeId to confirm the real fee call + the
  Dataverse write, then delete the test record.
- **Recalculate wrapper** — not built yet (edit path; same engine, uses the record's saved
  values).

## Open items

- **Owner-phase** rows (Entra External ID provider, Owner role, contact-scope permission)
  — deferred to the portal phase.
- **v1 is "lighter"**: it uses the RentCast property facts the create page already fetched
  and the staff-entered rent; it does not re-fetch AVM market rent + comps. Full AVM/comps
  parity would come from extracting the shared Generate core (#58).
