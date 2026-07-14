# ALM & toolchain — how this app is sourced, built, and deployed

The goal: the Canvas App lives in **source control as YAML**, builds into a
**Dataverse solution**, and deploys by **importing that solution** — the same
git-first workflow as the rest of this repo, adapted to Power Platform.

> Currency note: `pac canvas pack` / `pac canvas unpack` are **deprecated**
> (Microsoft's own CLI docs flag them). The supported path for source-
> controlling a canvas app is the **YAML solution source format** via
> **Dataverse Git integration** and/or `pac solution clone` / `pac solution
> pack`. Canvas source is `*.pa.yaml` inside the `.msapp`, and the `.msapp`
> lives under `canvasapps/` in the solution folder. Don't build tooling around
> the deprecated `pac canvas` verbs.

## Prerequisites

- **Power Platform CLI (`pac`)** — v2.4.1+ (YAML solution format requires it).
  Install via the standalone MSI, the .NET tool (`dotnet tool install --global
  Microsoft.PowerApps.CLI.Tool`), or the VS Code "Power Platform Tools"
  extension. Verify: `pac --version`.
- A **Dataverse environment** with the `new_property` model already deployed
  (it is — that's what the funnel uses).
- Maker/customizer rights + the ability to create a **solution** and a
  **publisher**.

## One-time environment setup

### 1. Auth profile
```bash
pac auth create --name brichaus --environment https://<yourorg>.crm.dynamics.com
pac auth list
pac org who        # confirm you're pointed at the right environment
```

### 2. Publisher + solution
Create a dedicated **publisher** (prefix e.g. `bh`) and an **unmanaged
solution** to hold the app. In the maker portal (Solutions → New solution), or:
```bash
# after creating the publisher in the portal:
pac solution init --publisher-name BrichausGroup --publisher-prefix bh   # scaffolds a solution project (optional local project)
```
Recommended solution unique name: **`BrichausPropertyOps`**.

Add to the solution: the Canvas App (created per `03`), plus **existing**
tables as *dependencies* — add `new_property`, `new_unitconfiguration`,
`new_managementagreementterm`, `cr55d_propertycontact`,
`new_propertytypeclassification` to the solution so the app's references travel
with it. (Add them as-is; don't re-create them.)

### 3. Security role + column security
Create the role and column-security profiles from
[`02-access-model.md`](02-access-model.md) **in the same solution** so they
deploy together.

## Source-control workflow (YAML solution format)

The `solution/` folder in this workspace is the **YAML solution source root**.
It is populated by tooling, not hand-authored:

```bash
# From power-platform/ ; writes the YAML source tree into ./solution
pac solution clone --name BrichausPropertyOps --targetdirectory ./solution
```

This produces the Microsoft-standard layout (see `solution/README.md`):
```
solution/
  solutions/BrichausPropertyOps/
    solution.yml
    solutioncomponents.yml
    rootcomponents.yml
    missingdependencies.yml
  publishers/BrichausGroup/
    publisher.yml
  canvasapps/<app-schema-name>/     ← the .msapp lives here
  entities/  workflows/  ...        ← other components as added
```

### Editing the canvas app as source

The human-editable canvas source is `*.pa.yaml` inside the `.msapp`. Two ways
to get at it:

- **Preferred — Dataverse Git integration:** connect the environment/solution
  to this Git repo in the maker portal. Studio then commits `*.pa.yaml`
  directly; no manual unpack step. This is the current recommended path.
- **CLI — download + extract:**
  ```bash
  pac canvas list                                   # find the app
  pac canvas download --name "Brichaus Property Ops" --extract-to-directory ./solution/canvasapps/bh_propertyops
  ```
  Edit the `*.pa.yaml` files under the extracted `\src` folder — those are the
  only source-of-truth files. **Do not** treat the `.json` files as source;
  they aren't stable across save/load.

## Build & deploy

```bash
# Pack the YAML source tree back into an importable solution .zip
pac solution pack --folder ./solution --zipfile ./out/BrichausPropertyOps.zip

# Import into a target environment (dev → test → prod)
pac solution import --path ./out/BrichausPropertyOps.zip --activate-plugins
```

- The presence of the `solutions/` subfolder makes `pack` use the YAML format
  automatically.
- For prod, export/import a **managed** version (`pac solution export
  --managed`) and keep the unmanaged one in dev.
- If `pack` warns "component declared in rootcomponents.yml has no source
  files" for the canvas app, the `.msapp` under `canvasapps/<name>/` is
  missing — re-run `pac solution clone` for a complete extract.

## What to commit vs. ignore

**Commit:** everything under `solution/` that `pac solution clone` / Git
integration writes — the `*.yml` manifests, the `canvasapps/.../*.pa.yaml`
source, entity metadata. That's the reviewable, diffable source.

**Ignore** (see `power-platform/.gitignore`): built `.zip`/`.msapp` artifacts,
the `out/` build dir, `pac` auth/`bin`/`obj` scratch, and the studio-only
`EditorState` cache. Binary `.msapp` in git is a smell — the `*.pa.yaml` is the
source; regenerate the `.msapp` on pack.

## Promotion path

```
dev environment  ──(export managed)──►  test  ──►  prod
      ▲
      │ pac solution clone / Git integration
   this repo (YAML source, reviewed via PR)
```

Keep the funnel's n8n pipeline untouched throughout — the internal app is
additive. The only cross-system contract is the `new_property` table
([`01`](01-data-contract.md)); as long as the app honors the ownership matrix
([`02`](02-access-model.md)), dev/test/prod imports of this solution never
affect the public funnel.
