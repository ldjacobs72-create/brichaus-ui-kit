# Internal Proposal Tool + Owner Portal — Architecture Plan

**Status:** design agreed, not built. Platform decision locked: **Power Pages** (all
surfaces). This doc is the architecture-on-paper to build against.

**One-line intent:** give staff an authenticated back-end to see *all* proposals, create
new ones, and rework assumptions — reusing the existing generation engine and the
customer proposal UI, not rebuilding them — on a platform that can later grow into a
**client/owner portal** without a re-platform.

---

## Why Power Pages (and not a model-driven app)

The deciding factor isn't the internal tool — it's the owner-login future. Verified
against Microsoft Learn (2026-07):

- Power Pages is a SaaS platform for **external-facing sites that work across browsers
  and devices**; **responsive/mobile-friendly** natively (Bootstrap 5 with the enhanced
  data model). — *[Introduction](https://learn.microsoft.com/power-pages/introduction),
  [Capabilities](https://learn.microsoft.com/power-pages/capabilities),
  [Bootstrap 5](https://learn.microsoft.com/power-pages/configure/bootstrap-version-5)*
- **External/owner sign-in is native** via **Microsoft Entra External ID** (CIAM):
  self-service sign-up *or* invitation-only. Azure AD B2C is **end-of-sale for new
  customers (May 1 2025)** — Entra External ID is the forward path. —
  *[Entra External ID + Power Pages](https://learn.microsoft.com/power-pages/security/authentication/entra-external-id)*
- **One site, two audiences.** Internal staff sign in with **Entra ID work accounts**;
  owners with **Entra External ID** — separated by **web roles**. —
  *[Secure your Power Pages](https://learn.microsoft.com/dynamics365/guidance/implementation-guide/security-strategy-product-portals)*
- **Record-level scoping.** **Table permissions** support a **contact-level scope** — an
  owner sees only *their* property/proposal; staff get a global-scope role. —
  *[Table permissions](https://learn.microsoft.com/power-pages/security/table-permissions)*
- **Login auto-associates to a Dataverse contact** by email ("contact mapping with
  email") — the same association the claim flow needs, done by the platform.

| | Internal staff tool (now) | Owner/client portal (later) |
|---|---|---|
| Model-driven app | ✅ fast, zero-build grid | ❌ impossible — internal licensed users only |
| **Power Pages** | ⚠️ more build for grid/CRUD | ✅ native external login + contact-scoped data |

**Trade-off accepted:** more build than a model-driven app for plain list/edit screens,
plus external-authenticated-user **licensing** (per-user or capacity packs — cost-check at
expected owner volume). Worth it: one platform hosts staff tooling now and the owner
portal later, on the same Dataverse data and contacts.

---

## The reuse principle (why this is practical now)

Recent decoupling work made the engine reusable — the internal tool wraps it, doesn't
rebuild it:

- **Report assembly is deterministic** (per-flow AI removed) — inputs → report JSON is
  pure computation.
- **Fee calc is a callable endpoint** (Power Automate) — hand it any coverage/leasing/rent
  combo.
- **Logic + wording live in Dataverse** (OIA bands, score labels, evidence notes, fee
  coverage rules) — one source of truth for every surface.
- **`proposal.html` is a standalone render page** — reused as-is for preview.

---

## Surfaces (all in Power Pages)

### Surface 1 — Create New Proposal  (the intake-v2 widget in "internal mode")
Reuses the **exact address gate** — this is non-negotiable (Option A):
Google Autocomplete → `placeId` → geocoding canonicalization → RentCast Property Records
→ RentCast AVM rent. Differs from public only by:
- **Auth:** EntraID-gated page (staff web role).
- **No consent / no email-verification gate** (no owner present).
- **Added staff fields:** fill RentCast gaps (type / units / rent), toggle coverage
  options, pick leasing % — the "toggle and select."
- **Creates a record with NO `cr55d_ghl_contactid`** → *claimable*.

### Surface 2 — Manage / Edit  (staff web pages over Dataverse)
- **All proposals** — a list over `new_properties` (staff global-scope table permission).
- **Edit form** — coverage toggles, leasing %, rent, score overrides.
- **Recalculate & Publish** button → re-runs the Generate core with the *current
  (edited)* values and re-writes `cr55d_onlineproposaljson`.
- **Preview** — link to the same `proposal.html`.

### Surface 3 — Owner Portal  (later; same site, external login)
- Owner signs in with **Entra External ID** (self-service or invited).
- **Contact-scoped** table permission → sees only their property, proposal, and (future)
  management agreement / documents / engagement history.
- Not built now — but the platform choice guarantees it needs **no re-platform**.

---

## The address gate = the claim linchpin (Option A, locked)

The `placeId` a staff member creates a record with **must equal** the `placeId` a prospect
produces when they later type the same address — otherwise the record is never found and
the proposal can't be claimed.

- **Both paths must source `placeId` from the same Google Autocomplete** and run the same
  **geocoding canonicalization** (already in the pipeline, task #46). That shared
  canonicalization is what makes them converge.
- This is why Surface 1 embeds the **actual autocomplete widget** rather than a
  type-a-string-and-geocode form: a server-side geocode can return a *different*
  `place_id` for some addresses, silently breaking claim.

---

## The shared engine — "Generate Proposal" core

Extract a single sub-workflow (this is refactor task #58, now with a driving reason). It
does the deterministic generation and **nothing audience-specific**:

```
canonicalize placeId → RentCast Property Records → RentCast AVM rent
   → OIA scoring (Dataverse config) → fee calc (Power Automate)
   → assemble report JSON → store cr55d_onlineproposaljson
```

Two thin wrappers call it — neither bolts onto the Main Pipeline:

- **Public funnel wrapper** = core + consent gate + email verify + GHL contact + Owner↔
  Property association (today's Main Pipeline, refactored to call the core).
- **Internal wrapper** = core + staff overrides + **no-contact create** (claimable).

**Coverage on edit:** the Recalculate path uses the record's **saved/edited** coverage
values — it does **not** re-derive from scores. Re-derivation from the fee-rules table is
the *initial recommendation only*, at first generation. (Consistent with "run once → save
→ reuse"; a human override becomes the saved value.)

---

## Auth model (Power Pages)

| Audience | Identity provider | Web role | Table permission scope |
|---|---|---|---|
| **Staff** | Entra ID (work accounts) | `Staff` | **Global** on `new_properties` (+ config tables read) |
| **Owner** (later) | Entra External ID (CIAM) | `Owner` | **Contact-level** — own records only |
| Anonymous | — | default anon | none (or public marketing pages only) |

- Owner registration: **invitation-driven** at first (control who "graduates" into portal
  access), self-service optional later.
- Login → contact mapping by email → owner auto-associated to their Dataverse contact →
  their property surfaces via the contact-scoped permission.

---

## The claim flow (one addition to Recognition)

Today a record with a proposal but no contact falls to the *render-known* route (facts
only). Add a first-class **claim** route:

1. Prospect types the address in the public funnel → canonicalize → `placeId` matches the
   internally-created record.
2. Record found **with a proposal and no `cr55d_ghl_contactid`** → **claimable**.
3. Show the proposal + capture contact (email) → write `cr55d_ghl_contactid`, create/link
   the GHL contact, associate Owner↔Property.
4. From then on it behaves like any recognized returning owner.

This lives in the Recognition / routing workflow — **not** the Main Pipeline.

---

## Security notes

- **Creation is never a public endpoint.** Autocomplete runs client-side (needed for the
  parity `placeId`), but the *create* call goes through the authenticated Power Pages
  session → server-side Generate core. No anonymous "create a proposal" webhook.
- **Config tables** stay read-only to the runtime identity (the n8n app-user has Read;
  editing is staff-only, via the tool or the maker portal).
- Optional hardening: IP restriction / WAF on the Power Pages site.

---

## Build sequence

1. **Generate Proposal core** — extract the deterministic core sub-workflow; public funnel
   refactored to call it. *(Buildable/verifiable in n8n now; also satisfies #58.)*
2. **Internal wrapper** — core + no-contact create + staff overrides (protected path).
3. **Power Pages site** — enhanced data model + Bootstrap 5; **Staff** web role (Entra ID);
   Manage/Edit pages (list + edit form + Recalculate button + preview link).
4. **Create-New page** — embed the intake-v2 widget in internal mode (autocomplete gate),
   posting through the authenticated session to the internal wrapper.
5. **Claim route** — add to Recognition; test end-to-end (internal create → prospect
   claims by address).
6. **Owner portal (later)** — Entra External ID provider + `Owner` web role +
   contact-scoped table permissions + owner pages.

Each step ships and is verified before the next; nothing is added to the Main Pipeline.

---

## Open questions / dependencies

- **Power Pages licensing** at expected staff + owner volume (per-authenticated-user vs.
  capacity pack) — cost-check before committing the owner-portal phase.
- **Enhanced data model** must be enabled in the environment for Bootstrap 5 / new sites.
- **Entra External ID tenant** setup for the owner phase (external tenant + app
  registration + user flow).
- Confirm the intake-v2 widget can be embedded in a Power Pages page cleanly (script/CSP)
  — it's self-contained, so expected to be straightforward.

---

## Related

- `docs/PIPELINE-MAP.md` — what runs where (n8n / GHL / Dataverse / PA).
- `docs/PIPELINE-REFACTOR.md` — the sub-workflow extraction (#58) this builds on.
- `docs/DATAVERSE-CONFIG-TABLES.md` — the config/wording now in Dataverse.
