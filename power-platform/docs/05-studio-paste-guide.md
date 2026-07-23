# Studio paste guide — instantiating the generated screens

A do-this-then-that for the **Power Apps Studio** session that turns the
`*.pa.yaml` in
[`../solution/canvasapps/bh_propertyops/src/`](../solution/canvasapps/bh_propertyops/src/)
into a running app. This is the browser part of "Option 1" from the src README —
it **cannot** be done in VS Code (no canvas designer / code-view paste there).

Budget ~15 minutes. Keep this repo open in VS Code beside the browser so you can
copy the YAML blocks.

## Before you start

- [ ] Studio is on the environment at **`org985aea18.crm.dynamics.com`** (the one
      with your 29 property rows), not a personal env.
- [ ] You can see the **`BrichausPropertyOps`** solution (from runbook Phase 2).

## Step 1 — Create the app shell

1. **Solutions → `BrichausPropertyOps` → New → App → Canvas app.** Choose
   **Tablet** format. Name it `Brichaus Property Ops`.
2. **App settings → General → turn ON the Power Fx formula bar.** This is what
   enables **Code view** (right-click a control/screen → *View/Paste code*).

## Step 2 — Add the data source (name it `Properties`)

1. **Data → Add data → Dataverse → `new_property`.**
2. The data source will be named `new_property`. The YAML refers to it as
   **`Properties`**. Either:
   - rename the data source to `Properties`, **or**
   - do a find-replace of `Properties` → `new_property` in the YAML before pasting.
   Pick one and be consistent.

## Step 3 — Create the three screens + App wiring

1. Add three **blank** screens; rename them exactly:
   `scrProperties`, `scrPropertyDetail`, `scrAddProperty`.
2. Select the **App** object → **OnStart** → paste the `=Set(...)` block from
   `App.pa.yaml`. Set **App.StartScreen** to `scrProperties`.
   - Then right-click the App node → **Run OnStart** once, so the `gbl*` color
     variables exist while you build.

## Step 4 — Paste each screen's controls

For each of `scrProperties`, `scrPropertyDetail`, `scrAddProperty`:

1. Open the `.pa.yaml`, copy everything **under that screen's `Children:`** (the
   list of controls — you don't need the `Screens:`/`Properties:` wrapper).
2. In Studio, select the target screen in the tree → right-click → **Paste** (or
   Ctrl+V). Studio parses the YAML, **validates it**, and creates the controls.
3. If paste is rejected, read the error — it names the control/property. See
   troubleshooting below.

> Tip: paste `scrProperties` first and confirm the gallery lists your properties
> before doing the other two. That proves the data source alias + choice labels
> in one shot.

## Step 5 — Sanity check, then save

- List shows 29 rows; status pills colored; unit-count blank rows show "—".
- Open a row → detail shows scores/fees (fees as %), edit a toggle → **Save** →
  reopen: change persisted, and the `is*` bits match the status (check in the
  table or a test query).
- **Save + Publish** the app. (Publish is required before Git integration or
  before `pac canvas download` will see your changes.)

## Step 6 — Bring the Studio result back into source

Studio may normalize the YAML (Variant/version, property order). Capture that as
the real source of truth:

```bash
# in VS Code terminal, env already selected (docs/00 Phase 6)
pac canvas download --name "Brichaus Property Ops" \
  --extract-to-directory ./power-platform/solution/canvasapps/bh_propertyops
git add power-platform/solution/canvasapps && git commit -m "Canvas app: Studio-normalized pa.yaml" && git push
```

---

## Troubleshooting paste errors

| Symptom | Cause | Fix |
|---|---|---|
| "Name isn't valid / unknown `Properties`" | Data source not added or not aliased `Properties` | Step 2 |
| Choice `.Value` shows blank; status pill empty | This column surfaces choices differently in your env | Use the **numeric-value fallback** below |
| Dropdown won't accept `Choices(Properties.cr55d_...)` | Data source name mismatch | Match the alias (Step 2) |
| Toggle Save writes blank | You have a **modern** Toggle (`.Checked`, not `.Value`) | Change `togX.Value` → `togX.Checked` in the Save `Patch` |
| Blue underline on the gallery `Items` | Delegation warning (non-delegable `.Value` filter) | **Benign at your scale.** Fix only if the table exceeds ~2000 rows (see below) |
| "Control name already exists" | A leftover default control shares a name | Delete the default control or rename before pasting |

### Numeric-value fallback for choices

If `.Value` doesn't return the label in your environment, address choices by their
underlying integer value instead. Management status values: **Managed = 4,
Prospect = 2, Pending = 875920001, Lost = 1**.

- **Read/compare** (pill text/color, list filter): replace
  `cr55d_managementstatus.Value = "Managed"` with a value test —
  `Value(cr55d_managementstatus) = 4` *(if your build exposes the numeric via
  `Value()`)*, or fall back to the option-set global
  `cr55d_managementstatus = 'Management Status (Properties)'.Managed`.
- **Write** (Save / Mark Lost): replace `drp.Selected` /
  `LookUp(Choices(...), Value="Lost")` with the option-set global,
  e.g. `cr55d_managementstatus: 'Management Status (Properties)'.Lost`.

Confirm the exact option-set global name in Studio IntelliSense (type
`cr55d_managementstatus =` and it will offer `'…'.Managed`).

### Delegable status filter (only if the table gets large)

The generated list filter uses `cr55d_managementstatus.Value = drpStatus.Selected.Value`,
which is **not delegable**. Fine for tens–hundreds of rows. If you ever cross the
delegation limit, swap that one predicate for the delegable option-set form:

```powerapps
drpStatus.Selected.Value = "All" ||
cr55d_managementstatus = Switch(
    drpStatus.Selected.Value,
    "Prospect", 'Management Status (Properties)'.Prospect,
    "Pending",  'Management Status (Properties)'.Pending,
    "Managed",  'Management Status (Properties)'.Managed,
    "Lost",     'Management Status (Properties)'.Lost
)
```

## If you hit something not in this table

Copy the exact Studio error text and send it over — most paste failures are a
one-line control-name or choice-label fix, and the YAML can be corrected in the
repo in one pass.
