# PropScore Main Pipeline — Refactor Plan

**Goal:** break the 105-node monolith (`PropScore: Main Pipeline`, `pKLkd1TNccAKf8Sx`)
into focused sub-workflows, and collapse the redundant Dataverse writes into one.
No behavior change to the front-end contract — this is structure and efficiency
only.

_Status: planned (task #58). Not started._

---

## Why

The Main Pipeline does far too much in one canvas:

- **Three unrelated webhooks live in the same workflow** — `GHL Inbound Property`
  (scoring/submission), `RentCast Quicklook Webhook`, and `Report Status Webhook`.
  They share nothing but the canvas; a change to one risks the others.
- **The same `new_properties` row is written 3× per submission** (see the write
  map below) — three round-trips where one or two would do.
- One 105-node graph is hard to read, test, or hand off. Only OIA Scoring is
  extracted today.

---

## Workstream A — Consolidate the Dataverse writes  *(folded in per owner, 2026-07-14)*

**Today, one fresh submission PATCHes the same `new_properties` row up to 3×**,
plus 2 conditional writes:

| Node | Writes | Fires |
|---|---|---|
| `Upsert Property to Dataverse` | facts, scores, protections, fee, leasing, address, RentCast JSON | always |
| `Store Proposal` | `cr55d_onlineproposaljson` | fresh-report path |
| `Save ContactId to Dataverse` | `cr55d_ghl_contactid` | after GHL contact link |
| `Store Proposal PDF URL` | PDF link | PDF-gen path — **inert today** |
| `Rekey Property Row` | re-key row | address-dedup path only |

They write **disjoint fields**, so there's no lost-update risk — it's purely
extra round-trips, staged by when each value becomes available.

**Target: 1 property write + 1 late contact write.**

1. **Merge `Store Proposal` into `Upsert Property to Dataverse`.** Both PATCH the
   same row on the fresh path. Assemble the property fields **and**
   `cr55d_onlineproposaljson` in one `Build Property Record` (Set/Code) node, then
   do a single PATCH. The proposal JSON is already built by the time the Upsert
   runs, so this is a straight merge. **3 → 2 writes.**
2. **Keep `Save ContactId` as one late write.** The GHL contact is created and
   associated on a *later, separate branch*; its id genuinely isn't known at the
   property write. Leave it as a single trailing PATCH (`cr55d_ghl_contactid`
   only). Folding it into the first write would mean blocking the property write
   on the GHL branch — not worth the coupling.
3. **Retire `Store Proposal PDF URL`** as part of the write-count cleanup unless
   the PDF-gen flow is revived (it's a dead placeholder — see `COMMUNICATIONS.md`
   §2). If revived, it stays a separate late write (PDF arrives async).
4. `Rekey Property Row` stays — it's a rare dedup-path correction, not a
   per-submission write.

**Net:** typical submission goes from **3 writes → 2** (one consolidated
property+proposal PATCH, one trailing contact-id PATCH), with the write order
explicit instead of emergent.

---

## Workstream B — Split into sub-workflows

Cut along the seams that already exist (webhooks + self-contained concerns).
Each becomes its own workflow called via Execute Sub-workflow, exactly like
`Run OIA Scoring` is today.

| New workflow | Absorbs | Trigger |
|---|---|---|
| **Quicklook** | `RentCast Quicklook Webhook` → normalize → fetch → assemble → respond | its own webhook |
| **Report Status** | `Report Status Webhook` → fetch proposal status → respond | its own webhook |
| **Scoring & Proposal** (the core) | `GHL Inbound Property` → normalize → OIA → RentCast cache/fetch → report → fee → **consolidated Dataverse write** → respond | the scoring webhook |
| **GHL Sync** (sub-workflow of the core) | contact upsert, association, consent note, opportunity create, the heal/orphan branches | called after the property write |
| **RentCast Cache** (optional sub-workflow) | cache lookup / freshness / fetch / cache-write | called by the core |

`Run OIA Scoring` (`66sDsDzoRwBYwQlW`) already follows this pattern — the model.

Splitting the three webhooks out is the highest-value, lowest-risk first move:
it isolates blast radius immediately with no logic change.

---

## Sequencing

1. **A — write consolidation** first (small, self-contained, measurable: 3→2
   writes). Do it inside the current monolith so it's easy to verify in isolation.
2. **B1 — extract the two side webhooks** (Quicklook, Report Status) into their
   own workflows. Pure move, no logic change.
3. **B2 — extract GHL Sync** from the core into a sub-workflow (it's the largest
   self-contained block).
4. **B3 — (optional) extract RentCast Cache.**

Each step ships and is verified before the next — never a big-bang rewrite.

---

## Guardrails

- **The front-end contract is frozen.** Same webhook paths, same request/response
  shapes (see `docs/INTAKE-INTEGRATION-CONTRACT.md`). The widgets must not notice.
- **Verify with pinned data, not live submissions** — a live run creates a real
  GHL contact + opportunity and can send a nurture email. Use test-pinned inputs;
  never point tests at a real email.
- **One concern per PR-equivalent change**, each published and confirmed green
  before the next, so a regression is easy to localize and revert.
- **No new Dataverse columns needed** — the scores/protections/fee columns now
  exist and are written (2026-07-14).

---

## Related

- `docs/PIPELINE-MAP.md` — what runs where (n8n vs GHL vs Dataverse vs PA).
- `docs/COMMUNICATIONS.md` — the email/comms side.
- `docs/INTAKE-INTEGRATION-CONTRACT.md` — the frozen front-end ↔ backend contract.
