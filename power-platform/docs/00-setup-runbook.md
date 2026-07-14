# Setup runbook — from zero to "ready to build the app"

Do these phases **in order**. Each ends in a checkpoint you can verify before
moving on. Most of this is one-time; once it's done, building and iterating on
the app is just edit → pack → import.

**Legend for who does each step:**
- 🧑‍💼 **You, in a browser** (admin/maker portal — can't be scripted from here)
- 💻 **A command** you run on your machine (`pac` CLI)
- 🤖 **Claude Code can do it** (generate app source, Power Fx, docs)

> ⚠️ You'll be doing the portal + CLI steps yourself: this workspace can't reach
> your Power Platform tenant (no credentials here, and `pac` runs on your
> machine). Claude Code's job starts at Phase 5 — authoring the app source once
> the environment, solution, and security are in place.

---

## Phase 0 — Prerequisites & access check 🧑‍💼

Confirm all of these before touching anything. If any is "no", resolve it first
(it'll block a later phase otherwise).

- [ ] **Which environment?** The `new_property` data lives in one specific
  Dataverse environment (the one your funnel/n8n write to). **Build the app in
  that same environment** — the app needs the data, and Dataverse data is
  per-environment. (A separate "dev" environment wouldn't have your properties.)
  Get its URL: `https://<yourorg>.crm.dynamics.com`.
- [ ] **Your rights in that environment.** You need **System Administrator** or
  **System Customizer** to create a solution/publisher and author tables/apps,
  **and** admin rights in the **Power Platform Admin Center** to create the
  security role and column-security profiles (Phases 3–4). If you're not an
  admin, line up whoever is — Phases 3–4 are theirs to do.
- [ ] **Licensing.** Each staff user who'll open the app needs a **Power Apps**
  license (standalone Power Apps, or a Microsoft 365 plan that includes Power
  Apps for the Dataverse tables in scope). Confirm your ops users are licensed.
- [ ] **Who are the app's users?** Ideally a **Microsoft Entra ID group** for
  the ops team (e.g. "Brichaus Property Ops"). Create it now if it doesn't
  exist — Phase 3 grants the role to the group, not to individuals.
- [ ] **The n8n service principal.** Find the **application user** n8n uses to
  write to Dataverse (its app registration / client ID). You'll give it the
  read-write column profile in Phase 4 so the pipeline keeps working. If you're
  not sure which app user it is, check the n8n Dataverse credential.

**Checkpoint:** you can name the environment URL, confirm you (or a named admin)
have the two admin rights, confirm the ops users are licensed, and you know the
Entra group + the n8n app user.

---

## Phase 1 — Install and connect `pac` 💻

> **Using VS Code + Power Platform Tools?** You've already done most of this.
> The extension **bundles the `pac` CLI**, so skip the install and just
> authenticate from the integrated terminal. See
> [Appendix A — VS Code workflow](#appendix-a--vs-code--power-platform-tools-workflow)
> for how the extension changes Phases 1, 6, and 7.

```bash
# Install the Power Platform CLI (pick one):
#  - Already have the VS Code "Power Platform Tools" extension? pac is bundled — skip to `pac --version`.
#  - .NET tool (cross-platform):
dotnet tool install --global Microsoft.PowerApps.CLI.Tool
#  - or the standalone MSI.

pac --version            # need 2.4.1+ (for YAML solution format)

# Authenticate to your environment:
pac auth create --name brichaus --environment https://<yourorg>.crm.dynamics.com
pac auth list            # confirm the profile is selected
pac org who              # confirm you're pointed at the RIGHT environment
```

**Checkpoint:** `pac org who` prints your environment's URL and your user.

---

## Phase 2 — Publisher + solution, with the existing tables added 🧑‍💼

Do this in the maker portal ([make.powerapps.com](https://make.powerapps.com) →
**Solutions**), confirming you're in the correct environment (top-right picker).

1. **Create a publisher** (once): **New solution → + New publisher**.
   - Display name: `Brichaus Group`
   - Prefix: `bh` (this becomes the prefix on anything *new* you add)
2. **Create the solution:**
   - Display name: `Brichaus Property Ops`
   - Unique name: `BrichausPropertyOps`
   - Publisher: `Brichaus Group`
3. **Add the existing tables** to the solution so the app's references travel
   with it (**Add existing → Table**, add each *as-is* — do **not** recreate):
   - `new_property`, `new_unitconfiguration`, `new_managementagreementterm`,
     `cr55d_propertycontact`, `new_propertytypeclassification`
   - When prompted, add **"All objects"** or at least the columns +
     relationships (you want the metadata, not the data rows).

**Checkpoint:** the `BrichausPropertyOps` solution exists and lists those five
tables.

---

## Phase 3 — Security role 🧑‍💼

In **[Power Platform Admin Center](https://admin.powerplatform.microsoft.com)** →
**Manage → Environments →** *your env* **→ Settings → Users + permissions →
Security roles**.

1. **Copy** the **Basic User** role (select it → **… → Copy**) to a new role —
   copying gives you the minimum app-open privileges for free. Name it
   **`Brichaus — Internal Property Ops`**.
2. Open the new role → set the table privileges from
   [`02-access-model.md`](02-access-model.md) (click a cell to cycle access
   levels — **None → User → BU → Parent:Child BU → Org**). The critical ones:
   - `new_property`: **Create = None**, Read = Org, Write = BU, **Delete = None**, Append/AppendTo = BU
   - `new_unitconfiguration`, `new_managementagreementterm`, `cr55d_propertycontact`: Create/Read/Write/Delete = BU/Org per the matrix
   - `new_propertytypeclassification`: Read = Org, everything else None
   - `contact`: Read = Org
3. **Save**.
4. **Assign** the role to the **Entra ID group / team** from Phase 0 (add the
   group as a team with this role, or assign the role to the group), **not** to
   individuals.

> Why Create = None on `new_property`: records must be *born* from the intake
> funnel (only that path links a Contact + real `googlePlaceId`). See the
> access model.

**Checkpoint:** an ops user (or a test user in the group) can open the tables
and see property rows, but **cannot** create or delete a property record.

---

## Phase 4 — Column-level security (lock the n8n-owned fields) 🧑‍💼

This keeps staff from hand-editing the scoring/fee/JSON fields *even though*
they have table Write. Two parts: secure the columns, then hand out profiles.

**A. Secure the columns** — in [make.powerapps.com](https://make.powerapps.com)
→ **Tables → `new_property` → Columns**. For each column below: open it →
**Advanced options → General → ✔ Enable column security → Save**:

- `cr55d_onlineproposaljson`, `cr55d_snapshot_json`, `cr55d_rentcastjsonsnapshot`, `cr55d_rentcast_json_date`, `cr55d_propertytype_rentcast`
- `cr55d_scoremaintenanceburden`, `cr55d_scoreturnoverpressure`, `cr55d_scorecomplianceburden`, `cr55d_score_operationalintensity`, `cr55d_tenantfrictionscore`
- `cr55d_feebase`, `cr55d_proposedmgmtfee`
- `new_goggleplace_id` *(the business key — lock it against edits)*

> If **Enable column security** is greyed out for a column, that column type
> can't be secured — skip it; the convention layer still keeps the app from
> writing it.

**B. Create the profiles** — in **Admin Center → your env → Settings →
Users + permissions → Column security profiles** (a.k.a. field security
profiles):

1. **`Property — Scoring (read-only)`**: for the secured columns above set
   **Read = Allowed, Update = Denied, Create = Denied**. Assign the **ops Entra
   group** to this profile.
2. **`Property — Scoring (read-write)`**: same columns, **Read + Update =
   Allowed**. Assign the **n8n application user** (Phase 0) to this profile so
   the pipeline keeps writing scores/fees/JSON.

> Column security is *additive on top of* record access — a user must already
> have row access for a profile to matter. That's why this is a second layer,
> not a replacement for Phase 3.

**Checkpoint:** an ops user sees the scores/fees/proposal JSON but any edit is
rejected; the n8n pipeline can still update them (run one property through the
pipeline to confirm nothing regressed).

---

## Phase 5 — Create the app + wire data sources 🤖 (with your sign-in)

1. **Create the Canvas app inside the solution** (Solutions →
   `BrichausPropertyOps` → **New → App → Canvas app**, **Tablet** layout). Name
   it `Brichaus Property Ops`. Creating it *inside the solution* is what makes
   it a deployable component.
2. **Add the Dataverse data sources** (Data → Add data → **Dataverse**):
   `new_property`, `new_unitconfiguration`, `new_managementagreementterm`,
   `cr55d_propertycontact`, `new_propertytypeclassification`, `contact`.
3. From here, **Claude Code follows [`03-canvas-app-build-spec.md`](03-canvas-app-build-spec.md)**
   to author the screens, galleries, forms, and Power Fx (including the
   status↔`is*`-bit sync `Patch` and the search-or-request add flow). You'll
   paste/import the generated `*.pa.yaml`, or build alongside it in Studio.

**Checkpoint:** the app opens, the property list populates from Dataverse, and
the scoring cards render read-only.

---

## Phase 6 — Put it under source control (pac CLI → this GitHub repo) 💻

Native Dataverse Git integration targets **Azure DevOps only** and needs Managed
Environments — since this repo is **GitHub**, use the `pac` CLI and commit here.

```bash
# From power-platform/ — extract the whole solution as YAML source into ./solution
pac solution clone --name BrichausPropertyOps --targetdirectory ./solution

# The canvas app's editable source is *.pa.yaml under solution/canvasapps/<name>/src/
git add power-platform/solution
git commit -m "Add BrichausPropertyOps solution source (canvas app + metadata)"
git push
```

Built `.zip`/`.msapp`/`EditorState` artifacts are already git-ignored
([`../.gitignore`](../.gitignore)) — the `*.pa.yaml` + `*.yml` are the source of
truth you review in PRs.

**Checkpoint:** `power-platform/solution/solutions/BrichausPropertyOps/` and
`.../canvasapps/.../src/*.pa.yaml` exist and are committed.

---

## Phase 7 — Build & deploy 💻

```bash
pac solution pack   --folder ./solution --zipfile ./out/BrichausPropertyOps.zip
pac solution import --path ./out/BrichausPropertyOps.zip
```

For a real promotion path later, export a **managed** copy
(`pac solution export --managed`) for test/prod and keep the unmanaged one in
your build environment. Details + troubleshooting in
[`04-alm-and-toolchain.md`](04-alm-and-toolchain.md).

**Checkpoint:** the solution imports cleanly and the app runs for a test user in
the ops group.

---

## The whole thing at a glance

| Phase | What | Who | Blocks the app build? |
|---|---|---|---|
| 0 | Access/license/env check | 🧑‍💼 | Yes — do first |
| 1 | Install + auth `pac` | 💻 | For source control (6–7) |
| 2 | Publisher + solution + add tables | 🧑‍💼 | Yes |
| 3 | Security role | 🧑‍💼 (admin) | Before real users; not before authoring |
| 4 | Column-level security | 🧑‍💼 (admin) | Before real users; not before authoring |
| 5 | Create app + data sources | 🤖 + you | This *is* the build |
| 6 | Source control (pac → GitHub) | 💻 | No — but do it early |
| 7 | Build/deploy/promote | 💻 | Ship step |

**Minimum to let Claude Code start authoring:** Phases 0, 2, and 5.1–5.2 (env
confirmed, solution with tables, app shell with data sources). Security (3–4)
must be done before you hand the app to real staff, but it doesn't block writing
the screens.

---

## Appendix A — VS Code + Power Platform Tools workflow

You have the **Power Platform Tools** extension for VS Code, authenticated as
`larry@brichausgroup.com` (the **Auth Profiles** panel), with your environments
listed under **Environments & Solutions**. That bundles the `pac` CLI and folds
several phases into one window. Here's what changes.

### Pick the target environment first (the #1 gotcha)

The panel shows multiple environments (Belen Jaia Investments, **brichaus_prod**,
Larry Jacobs's Environment, Microsoft 365). The starred one is just the *active*
target — it is **not** necessarily where `new_property` lives.

- `new_property` (funnel + n8n data) is in **one** environment — almost
  certainly **`brichaus_prod`**, not a personal default env.
- **Build the app there.** Building against the wrong environment gives you
  empty tables.
- Confirm and set the active org in the integrated terminal:
  ```bash
  pac org who            # must show brichaus_prod
  pac org list           # list environment URLs
  pac org select --environment <brichaus_prod-url>
  ```
  Or right-click **brichaus_prod** in the panel → set as active/default.

### What the extension simplifies, phase by phase

| Phase | With the extension |
|---|---|
| **1 — Install + auth `pac`** | ✅ **Already done.** `pac` is bundled; you're authenticated. Just confirm the *active org* is prod (`pac org who`). |
| **2 — Solution + tables** | ⚪ Partly. You can browse/expand solutions in the panel and scaffold with `pac solution init`, but **adding the existing tables** to the solution is still done in the maker portal. |
| **3–4 — Security role + column security** | ❌ Unchanged — **Admin Center** in the browser. No IDE does these. |
| **5 — Build the app (Canvas)** | ❌ Design still happens in **Power Apps Studio** (browser). The extension has **no canvas designer**. It edits the `*.pa.yaml` text, which is great for review — not for laying out screens. |
| **6 — Source control** | ✅ **Biggest win.** `pac solution clone`/`pac canvas download` in the integrated terminal, then stage/commit with VS Code's Source Control panel — all in one window, right next to this repo. |
| **7 — Build / deploy** | ✅ `pac solution pack` / `pac solution import` from the integrated terminal (or the command palette). |

### The canvas source-control loop (Canvas app model)

Because there's no canvas designer in VS Code, the round-trip is:

1. **Design** the screens in Power Apps Studio (browser) — or have Claude Code
   generate `*.pa.yaml` you import.
2. **Download** the source into this repo from the VS Code terminal:
   ```bash
   pac canvas download --name "Brichaus Property Ops" \
     --extract-to-directory ./power-platform/solution/canvasapps/bh_propertyops
   ```
3. **Review & commit** the `*.pa.yaml` diffs with the Source Control panel.
4. **Repack/deploy** with `pac solution pack` / `import` when shipping.

Visual edits made in VS Code don't round-trip back into Studio's designer —
treat Studio as the design surface and VS Code as the source-control + review +
CLI surface. (If you ever want the IDE to be the *primary* build surface, that's
the **Code Apps** / React model — a different app type, out of scope for this
Canvas build.)

### Net for you

Phases **1, 6, 7** collapse into VS Code; **2** is mostly portal; **3–4** are
Admin Center; **5** stays in Studio. Nothing about having the extension removes
the portal/Studio steps — it just makes the CLI and source-control half of the
project live in one place alongside this repo.
