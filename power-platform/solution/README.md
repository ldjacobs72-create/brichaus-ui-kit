# `solution/` — YAML solution source root

This folder is the **source-controlled root of the `BrichausPropertyOps`
Dataverse solution**. It is **populated by tooling, not hand-authored**.

Run (from `power-platform/`):

```bash
pac solution clone --name BrichausPropertyOps --targetdirectory ./solution
```

That command (or native Dataverse Git integration) writes the Microsoft
standard YAML layout into this folder:

```
solution/
  solutions/BrichausPropertyOps/
    solution.yml                 solution manifest
    solutioncomponents.yml
    rootcomponents.yml
    missingdependencies.yml
  publishers/BrichausGroup/
    publisher.yml
  canvasapps/<app-schema-name>/  the canvas app — .msapp + extracted *.pa.yaml source
  entities/                      table metadata for the tables added to the solution
  ...                            other components (roles, column-security profiles)
```

## Rules

- **Don't** create `solution.yml` etc. by hand — an incomplete extract (top-level
  YAML without the `solutions/` subfolder) fails `pac solution pack` with a
  misleading "missing Customizations.xml" error. Always let `pac solution clone`
  or Git integration write the full tree.
- The `*.pa.yaml` files under `canvasapps/.../src/` are the **canvas app source
  of truth**. Review those in PRs.
- Do **not** commit built `.zip` outputs or the studio-only `EditorState`
  cache — see `../.gitignore`.

See [`../docs/04-alm-and-toolchain.md`](../docs/04-alm-and-toolchain.md) for the
full build/deploy workflow.

---

*This `.gitkeep`-style README is a placeholder. Once `pac solution clone`
populates the real YAML tree here, this file can stay as folder documentation
or be removed.*
