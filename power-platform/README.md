# Brichaus — Power Platform (internal Canvas App)

This folder is the workspace for the **internal, staff-facing Canvas App**
that operates on the *same* Dataverse property table (`new_property`) used by
the public-facing intake funnel (`app/index.html`) and proposal viewer
(`app/proposal.html`).

It is deliberately kept **separate from the UI kit** in the repo root. Nothing
in `/core`, `/components`, or `/integrations` depends on anything here, and
nothing here depends on the UI kit. The UI kit ships plain `<script>` files
into GoHighLevel pages; this folder ships a Canvas App into a Power Platform
environment. They share exactly one thing — the Dataverse `new_property`
table — and that shared surface is documented as a contract in
[`docs/01-data-contract.md`](docs/01-data-contract.md).

## Why this is a different kind of thing than the rest of the repo

| | UI kit (`/core`, `/components`) + `/app` pages | This folder (`/power-platform`) |
|---|---|---|
| Audience | Anonymous public visitors | Authenticated Brichaus staff |
| Host | GoHighLevel funnel pages | Power Platform (Power Apps) |
| Auth | None (public) | Entra ID sign-in + Dataverse security roles |
| Writes to Dataverse | **Indirectly** — GHL native submit creates the record, n8n enriches it | **Directly** — native Dataverse connector |
| Source format | `.js` / `.html`, no build | Canvas app `*.pa.yaml` inside a Dataverse solution (YAML source format) |
| Deploy | Copy into a GHL embed | `pac solution pack` → import solution |

Because the two never share code — only the table — the separation rule is
simple: **treat `new_property` as an API defined in
[`docs/01-data-contract.md`](docs/01-data-contract.md), and never let the
internal app overwrite a field another writer owns** (see
[`docs/02-access-model.md`](docs/02-access-model.md)).

## The three writers to `new_property`

The single most important thing to understand before building the internal app
is that **three independent systems write to this one table**, and each owns a
different slice of it:

1. **Public intake (`app/index.html`)** — via GHL's native Survey submit.
   *Creates* the Contact-linked record and sets `new_goggleplace_id`,
   `new_propertyname`, and the GHL Contact link. This is the *only* writer that
   creates a valid, Contact-associated record — see
   `integrations/ghl-bridge.js` for why a direct API `create` can't.
2. **n8n pipeline** ("PropScore: Main Pipeline") — via the Dataverse API.
   *Searches by `new_goggleplace_id` and updates* the scoring, fee, and JSON
   snapshot fields. It never creates a record.
3. **Internal Canvas App (this folder)** — via the native Dataverse connector.
   Owns the operational / CRM slice: management lifecycle status, fee
   overrides & coverage toggles, notes, and the related child records
   (units, contacts, agreement terms).

If the internal app overwrites fields owned by writers 1 or 2, it will clobber
the scoring pipeline's output. The column-ownership matrix in
[`docs/02-access-model.md`](docs/02-access-model.md) is the guardrail.

## What's in here

```
power-platform/
  README.md                        ← you are here
  docs/
    01-data-contract.md            The shared new_property schema + related tables, as a contract
    02-access-model.md             Read/write ownership matrix, security roles, column security, connector choice
    03-canvas-app-build-spec.md    The build plan Claude Code executes to author the Canvas App
    04-alm-and-toolchain.md        pac CLI, Dataverse Git integration, YAML solution layout, build/deploy
  solution/
    README.md                      How the solution source root gets populated (by tooling, not by hand)
    .gitkeep                       Placeholder until `pac solution clone` writes real YAML here
```

## Start here

1. Read [`docs/01-data-contract.md`](docs/01-data-contract.md) — the table you're building on.
2. Read [`docs/02-access-model.md`](docs/02-access-model.md) — what the app may read vs. write, and the security roles that enforce it.
3. Read [`docs/04-alm-and-toolchain.md`](docs/04-alm-and-toolchain.md) — install `pac`, connect the environment, populate `solution/`.
4. Follow [`docs/03-canvas-app-build-spec.md`](docs/03-canvas-app-build-spec.md) — the screen-by-screen build plan.
