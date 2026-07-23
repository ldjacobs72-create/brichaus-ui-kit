# Access model — read/write configuration

This is the "appropriate read/write configurations" half of the request. It
has three layers, from app-logic down to platform-enforced:

1. **Column-ownership convention** — which writer owns which fields (soft, in the app's Power Fx).
2. **Dataverse security roles** — table-level Create/Read/Write/Delete privileges (hard, platform-enforced).
3. **Column-level security** — field-level lock-down for the fields that must *never* be hand-edited (hard, platform-enforced).

Do all three. Convention alone is not a control; a security role alone is too
coarse for "read this field but not that one."

## Connector choice (decided)

The internal app connects to **Dataverse via the native Dataverse
connector** — not through the GHL/n8n webhooks the public pages use.

Rationale: the public pages are *anonymous* and cannot hold Dataverse
credentials, which is the entire reason they go through GHL's native submit +
n8n. The internal app is *authenticated* (staff sign in with Entra ID), so it
should use the first-class, delegable, transactional Dataverse connector.
Going back through n8n would lose delegation, transactions, row-level security,
and audit attribution — all of which you get for free with the native
connector.

## Layer 1 — Column-ownership convention

From [`01-data-contract.md`](01-data-contract.md), the internal app's rule is:

| Group | Fields | App permission |
|---|---|---|
| A. Identity / creation | `new_goggleplace_id`, name, Contact link, address | **Read.** (Address parts editable for cleanup; **key never editable.**) |
| B. Scoring / fee / JSON outputs | scores, `cr55d_feebase`, `cr55d_proposedmgmtfee`, all `*_json` | **Read only.** Displayed as report cards. |
| C. Operational / CRM | mgmt status + `is*` bits, fee overrides, coverage toggles, notes, property facts | **Read + Write.** This is what the app is for. |
| D. System / `*_base` money | audit + currency shadows | **Read only** (platform-managed). |

The app enforces group A/B read-only-ness by binding those controls to
`DisplayMode.View` and simply never `Patch`-ing them. That's the soft layer;
layers 2–3 make it real.

## Layer 2 — Dataverse security roles

Create **one dedicated security role** for the app's users, scoped to the
solution's tables. Recommended role: **"Brichaus — Internal Property Ops"**.

Recommended privileges (access level in parentheses; **BU** = Business Unit):

| Table | Create | Read | Write | Delete | Append | AppendTo |
|---|---|---|---|---|---|---|
| `new_property` | **None** | Org | BU | None | BU | BU |

> **Single-table scope.** This build is a console over `new_property` only. The
> related/link tables (`new_unitconfiguration`, `cr55d_propertycontact`,
> `new_managementagreementterm`, `new_propertytypeclassification`, `contact`)
> are **out of scope**, so the role needs **no privileges on them** — leave them
> at None. Fewer privileges = smaller attack surface and nothing extra to audit.
> If a later phase adds those tables to the app, add their privileges then.

Key decisions baked into that table:

- **`new_property` Create = None.** Staff must **not** create property records
  from the internal app. Records are *born* from the public intake (that's the
  only path that links a Contact and a real `googlePlaceId`). If the app could
  create them, staff would produce orphan records with no Contact link and no
  place ID — exactly the failure `integrations/ghl-bridge.js` documents. Instead
  the app's "add" flow is a **search-or-request**, never a bare create (see
  build spec).
- **`new_property` Delete = None.** Lifecycle is modeled by
  `cr55d_managementstatus = Lost` (set the choice + `is*` bits), never hard
  delete — deleting would lose the scoring/proposal history, and `statecode` is
  **not** the lifecycle flag here (live data shows it decoupled from
  management status, so the app doesn't touch it).
- **No privileges on the related/link tables.** Units, contacts, agreement
  terms, and the classification lookup are out of scope for this single-table
  build, so the role grants nothing on them.

Grant the role to a **security group / team** (e.g. an Entra ID group for the
ops team), not to individuals, so onboarding is "add to group."

## Layer 3 — Column-level security (the fields that must never be hand-edited)

Table Write (layer 2) is all-or-nothing across a table's columns. To keep the
**n8n-owned Group B fields** read-only *even for a user who has table Write*,
put them behind a **Column Security Profile**.

1. Enable column security (`IsSecured = true`) on these `new_property` columns:
   - `cr55d_onlineproposaljson`, `cr55d_snapshot_json`, `cr55d_rentcastjsonsnapshot`, `cr55d_rentcast_json_date`, `cr55d_propertytype_rentcast`
   - `cr55d_scoremaintenanceburden`, `cr55d_scoreturnoverpressure`, `cr55d_scorecomplianceburden`, `cr55d_score_operationalintensity`, `cr55d_tenantfrictionscore`
   - `cr55d_feebase`, `cr55d_proposedmgmtfee`
   - `new_goggleplace_id` (the business key — lock it against edits)
2. Create a Column Security Profile **"Property — Scoring (read-only)"** and, for
   the ops team, grant **Read = Allowed, Update = Denied, Create = Denied** on
   those columns.
3. Grant the **n8n service principal / application user** a profile with
   **Read + Update = Allowed** on the same columns, so the pipeline keeps
   writing them.

Net effect: staff *see* the scores/fees/proposal JSON and the place ID, but the
platform itself refuses any attempt (from the app or elsewhere) to change them.
Belt (convention) and suspenders (column security).

### Application users to keep straight

| Principal | What it is | Its access |
|---|---|---|
| Ops staff | Interactive users (Entra ID group) | "Internal Property Ops" role + "Scoring (read-only)" column profile |
| **`n8n-dataverse-propscore`** | The pipeline's Dataverse **application user** (confirmed — it's the `createdby`/`modifiedby` on live property records) | Its own role with Write on Group B + "Scoring (read-write)" column profile |
| GHL/native submit | Not a Dataverse user — writes via GHL→Dataverse sync | Out of scope of these roles; owns creation |

> The n8n application user is named **`n8n-dataverse-propscore`** in this
> environment (`org985aea18`). Grant *it* the read-write column profile in
> Phase 4 of the runbook — that's the account that must keep writing scores.

## Sharing / row scope

Read is **Org** across the board so any staffer can find any property (this is a
small internal team, not a multi-tenant scenario). If later you need to scope
who can *edit* which properties, tighten `new_property` Write from **BU** to
**User** and share specific records — but don't start there; org-wide read with
BU write is the right default for one ops team.

## Auditing

Turn on **Dataverse auditing** for `new_property` (at least for Group C fields
and `cr55d_managementstatus`). Three writers on one table means "who changed
this fee?" will come up; auditing answers it without guesswork.

## Summary checklist

- [ ] App uses the **native Dataverse connector** (not n8n).
- [ ] Security role **"Brichaus — Internal Property Ops"** created with the privilege matrix above (`new_property` **Create=None, Delete=None**).
- [ ] Role granted to the ops **Entra ID group/team**, not individuals.
- [ ] Column security enabled on Group B fields + `new_goggleplace_id`; ops profile = **Read only**, n8n profile = **Read+Write**.
- [ ] Auditing on for `new_property`.
- [ ] App never `Patch`es Group A/B fields; "add property" is search-or-request, never bare create.
