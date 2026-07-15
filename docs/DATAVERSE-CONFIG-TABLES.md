# Dataverse Config / Reference Tables — Copilot Build Prompts

**Purpose.** Move the *business decisions* that are currently hardcoded inside n8n Code
nodes (scoring bands, score→label maps, owner-facing copy, fee-coverage rules, service
area, and scalar constants) into **Dataverse reference tables**. n8n keeps the
orchestration; the *decisions* live in tables you can edit, audit, and reason about —
so a subtle change (a band threshold, a leasing default, a triggering label) is a row
edit with an audit trail, not a buried expression.

**How to use this file.** Each section below has:
1. A **Copilot prompt** — paste it into *Power Apps → Copilot / "Build a table with
   Copilot"* (or Copilot Studio against this environment).
2. A **column spec** — the exact columns/types so you can verify what Copilot builds.
3. **Seed rows** — the current live values, lifted verbatim from the n8n workflows,
   so the tables start out matching today's behavior exactly (no behavior change on
   day one — this is a lift-and-shift of constants).

**Conventions given to Copilot**
- Publisher prefix: use the environment's existing **`cr55d`** publisher so logical
  names match the rest of `new_properties`. (Copilot applies the default publisher
  prefix automatically — confirm it's the `cr55d` one before accepting.)
- **Turn on auditing** for every table here. These are pricing- and copy-bearing
  decisions; auditing is the cheapest possible "don't lose track of what changed and
  who changed it." (Table settings → *Audit changes to its data* = on.)
- Add an **`Active` (Yes/No)** column to every table, defaulting to Yes, so a row can
  be retired without deleting history.
- Set alternate keys where noted — n8n will look rows up by these.

> **Versioning note.** For the pricing-relevant tables (Bands, Fee Coverage Rules, and
> the fee rows in App Config) auditing + an `Active` flag is enough for now. If you
> later want a proposal to record *which* version of the config priced it, add an
> `EffectiveFrom` date column and never edit rows in place — insert a new dated row and
> flip the old one's `Active` to No. Deferred unless you ask for it.

---

## Leading prompt (paste this FIRST, once, to set context)

```
I'm building a set of small reference/configuration tables in this Dataverse
environment for a property-management proposal app. These tables hold business
constants and lookup values that an external automation (n8n) will read at runtime
to score properties and derive management fees — the automation itself lives
elsewhere; these tables only hold the *values it looks up*.

For every table you create in this session:
- Use the existing "cr55d" publisher and its prefix for all table and column names.
- Enable auditing (audit changes to the table's data).
- Add a Yes/No column named "Active" that defaults to Yes.
- Keep the tables in the same solution so I can export them together.
- Prefer Choice (local option set) columns where I list fixed options, and set the
  exact option labels I give you — do not invent extra options.

I'll give you one table at a time: a description, the columns with types, and the
rows to seed. Build the table, then add the seed rows. Confirm the logical names you
assigned so I can wire the automation to them. Ready for the first table.
```

---

## Table 1 — OIA Bands  (`cr55d_oiaband`)

The operational-intensity band a property lands in, from the raw score (product of the
four category scores, range 0.0625 – 16). One row per band. **Source:** `OIA Scoring`
→ `Validate & Calculate Intensity` (the `BANDS[]` array).

### Copilot prompt
```
Create a table named "OIA Band" (plural "OIA Bands"). It classifies a property's
operational-intensity raw score into a named band with an owner-facing definition.
Columns:
- "Band Name" — single line of text — this is the primary name column.
- "Raw Min" — decimal number, 4 decimal places — inclusive lower bound of the raw score.
- "Raw Max" — decimal number, 4 decimal places — inclusive upper bound of the raw score.
- "Definition" — multiple lines of text — the owner-facing description of this band.
- "Sort Order" — whole number — display order, ascending.
Add an alternate key named "Band Name Key" on the Band Name column.
Then add the seed rows I provide.
```

### Column spec
| Column | Type | Notes |
|---|---|---|
| `cr55d_bandname` | Text (primary) | e.g. "Elevated" |
| `cr55d_rawmin` | Decimal (4 dp) | inclusive |
| `cr55d_rawmax` | Decimal (4 dp) | inclusive |
| `cr55d_definition` | Multiline text | owner-facing |
| `cr55d_sortorder` | Whole number | 1..6 |
| `Active` | Yes/No | default Yes |
| *(alt key)* | on `cr55d_bandname` | |

### Seed rows (verbatim from live n8n)
| Sort | Band Name | Raw Min | Raw Max | Definition |
|---|---|---|---|---|
| 1 | Very Low | 0.0625 | 0.49 | The property appears materially less operationally demanding than a typical asset. Management effort is expected to be light across most or all categories. |
| 2 | Low | 0.50 | 0.99 | The property carries below-normal operating intensity. Some management work is still expected, but the overall burden is lighter than a standard baseline property. |
| 3 | Normal | 1.00 | 1.49 | The property falls within a typical operating range. The expected management workload is consistent with ordinary tenant, turnover, maintenance, and compliance demands. |
| 4 | Elevated | 1.50 | 2.99 | The property is expected to require above-normal management attention. One or more categories are likely creating additional operating pressure. |
| 5 | High | 3.00 | 7.99 | The property is expected to require sustained management involvement, with multiple categories contributing to higher workload, coordination, or risk. |
| 6 | Severe | 8.00 | 16.00 | The property appears operationally intensive. Significant management attention is expected across several categories, and the result should be handled carefully by the downstream pricing workflow. |

---

## Table 2 — OIA Score Labels  (`cr55d_oiascorelabel`)

The bijection between a per-category numeric score and its label. Also defines the set
of valid scores. **Source:** `OIA Scoring` → `labelFor()` + `VALID_SCORES`.

### Copilot prompt
```
Create a table named "OIA Score Label" (plural "OIA Score Labels"). It maps a category
score value to its label.
Columns:
- "Label" — single line of text — primary name column (e.g. "High").
- "Score" — decimal number, 2 decimal places — the numeric score (0.5, 1.0, 1.5, 2.0).
- "Sort Order" — whole number.
Add an alternate key named "Score Key" on the Score column.
Then add the seed rows I provide.
```

### Column spec
| Column | Type | Notes |
|---|---|---|
| `cr55d_label` | Text (primary) | |
| `cr55d_score` | Decimal (2 dp) | one of 0.5/1.0/1.5/2.0 |
| `cr55d_sortorder` | Whole number | |
| `Active` | Yes/No | default Yes |
| *(alt key)* | on `cr55d_score` | |

### Seed rows
| Sort | Score | Label |
|---|---|---|
| 1 | 0.5 | Low |
| 2 | 1.0 | Normal |
| 3 | 1.5 | High |
| 4 | 2.0 | Severe |

---

## Table 3 — OIA Evidence Notes  (`cr55d_oiaevidencenote`)

The canned, owner-facing sentence shown for each category at each label (4 categories ×
4 labels = 16 rows). This is **customer copy** — the highest-value thing to get out of
a Code node. **Source:** `OIA Scoring` → `Populate Canned Evidence Notes` (`REFERENCE`).

### Copilot prompt
```
Create a table named "OIA Evidence Note" (plural "OIA Evidence Notes"). It holds the
owner-facing sentence for each combination of assessment category and label.
Columns:
- "Note Key" — single line of text — primary name column, format "category:label"
  (e.g. "tenantFriction:High").
- "Category" — Choice (local) with exactly these options:
  Tenant Friction, Turnover Pressure, Maintenance Burden, Compliance Burden.
- "Label" — Choice (local) with exactly these options: Low, Normal, High, Severe.
- "Note" — multiple lines of text — the owner-facing sentence.
Add an alternate key named "Category Label Key" spanning the Category and Label columns.
Then add the seed rows I provide.
```

### Column spec
| Column | Type | Notes |
|---|---|---|
| `cr55d_notekey` | Text (primary) | `category:label` |
| `cr55d_category` | Choice | Tenant Friction / Turnover Pressure / Maintenance Burden / Compliance Burden |
| `cr55d_label` | Choice | Low / Normal / High / Severe |
| `cr55d_note` | Multiline text | owner-facing |
| `Active` | Yes/No | default Yes |
| *(alt key)* | on (`cr55d_category`, `cr55d_label`) | |

### Seed rows (verbatim)
| Category | Label | Note |
|---|---|---|
| Tenant Friction | Low | Tenant activity is unusually quiet, with rent paid on time and minimal management intervention needed. |
| Tenant Friction | Normal | Tenant communication and day-to-day issues are typical for a property like yours, with occasional routine matters handled through standard practices. |
| Tenant Friction | High | Tenant-related issues are occurring more than expected — repeated complaints, payment follow-up, conflicts, or lease-enforcement needs beyond the ordinary. |
| Tenant Friction | Severe | Tenant activity is materially disruptive relative to a typical property — active evictions, legal disputes, serious violations, or persistent conflict. |
| Turnover Pressure | Low | Turnover is unusually low — tenants are staying long-term, vacancies are rare, and leasing effort is minimal. |
| Turnover Pressure | Normal | Unit turnover is occurring at a typical pace for this property type and market, handled through ordinary leasing activity. |
| Turnover Pressure | High | Turnover on this property is running higher than typical, requiring more frequent leasing, marketing, and rent-ready turnaround than a standard property in this market. |
| Turnover Pressure | Severe | Turnover is a major operating problem here — multiple vacancies, chronic churn, or prolonged difficulty re-leasing units. |
| Maintenance Burden | Low | Maintenance needs are unusually light — the property is in strong condition and service calls are rare. |
| Maintenance Burden | Normal | Maintenance needs are routine for a property of this age, size, and condition — ordinary service calls and upkeep. |
| Maintenance Burden | High | Maintenance demand is running above normal — recurring repairs, aging systems, and more frequent vendor coordination than a typical property. |
| Maintenance Burden | Severe | Maintenance represents a major operating burden — serious deferred maintenance, safety issues, major system failures, or a large repair backlog. |
| Compliance Burden | Low | Compliance and administrative requirements are unusually simple — no special rules, added filings, or elevated compliance tasks. |
| Compliance Burden | Normal | Compliance and administrative requirements are typical for this jurisdiction and property type — standard notices and recordkeeping, with no unusual filings or oversight expected. |
| Compliance Burden | High | Compliance work is running above normal — rent-control tracking, recurring inspections, registration requirements, or HOA coordination beyond the ordinary. |
| Compliance Burden | Severe | Compliance and regulatory exposure here is significant — active code enforcement, lawsuits, complex local restrictions, or unresolved notices. |

---

## Table 4 — Fee Coverage Rules  (`cr55d_feecoveragerule`)

Which protections/coverages switch **on** based on the OIA label, and from which
category. This is the n8n half of the pricing decision (the *weights* live in Power
Automate). **Source:** Main Pipeline `Store Proposal` scenario derivation.

### Copilot prompt
```
Create a table named "Fee Coverage Rule" (plural "Fee Coverage Rules"). Each row says
that a named coverage turns on when a given OIA category lands on one of the listed
labels.
Columns:
- "Coverage" — single line of text — primary name column (e.g. "eviction").
- "Source Category" — Choice (local): Tenant Friction, Turnover Pressure,
  Maintenance Burden, Compliance Burden.
- "Trigger Labels" — single line of text — comma-separated labels that switch this
  coverage on (e.g. "High,Severe").
- "Description" — multiple lines of text.
Add an alternate key named "Coverage Key" on the Coverage column.
Then add the seed rows I provide.
```

### Column spec
| Column | Type | Notes |
|---|---|---|
| `cr55d_coverage` | Text (primary) | eviction / leasePlacement / inspection |
| `cr55d_sourcecategory` | Choice | which OIA category drives it |
| `cr55d_triggerlabels` | Text | CSV of labels, e.g. `High,Severe` |
| `cr55d_description` | Multiline text | |
| `Active` | Yes/No | default Yes |
| *(alt key)* | on `cr55d_coverage` | |

### Seed rows (verbatim from live derivation)
| Coverage | Source Category | Trigger Labels | Description |
|---|---|---|---|
| eviction | Tenant Friction | High,Severe | Eviction protection included when tenant friction is High or Severe. |
| leasePlacement | Turnover Pressure | Severe | Lease-placement coverage included when turnover pressure is Severe. |
| inspection | Maintenance Burden | High,Severe | Annual inspection included when maintenance burden is High or Severe. |

> **Not in this table (baselines, not derived):** `pet` = off by default and
> `leasing` = 50% by default. Those live in App Config (Table 6) because they're
> scalar defaults, not label-driven rules.

---

## Table 5 — Service Area  (`cr55d_servicearea`)

State-level service gating: which states are actively served, which are expansion-capture,
and which are not served. **Source:** front-end + routing service-area gate.

### Copilot prompt
```
Create a table named "Service Area" (plural "Service Areas"). One row per US state we
have a policy for.
Columns:
- "State Code" — single line of text, max length 2 — primary name column (e.g. "AR").
- "State Name" — single line of text.
- "Status" — Choice (local) with exactly these options: Active, Expansion, Not Served.
Add an alternate key named "State Code Key" on the State Code column.
Then add the seed rows I provide. For any US state not in my seed list, we treat it as
Not Served by default, so you do not need to create rows for those.
```

### Column spec
| Column | Type | Notes |
|---|---|---|
| `cr55d_statecode` | Text (2) (primary) | |
| `cr55d_statename` | Text | |
| `cr55d_status` | Choice | Active / Expansion / Not Served |
| `Active` | Yes/No | default Yes |
| *(alt key)* | on `cr55d_statecode` | |

### Seed rows
| State Code | State Name | Status |
|---|---|---|
| AR | Arkansas | Active |
| CA | California | Active |
| TX | Texas | Expansion |
| OK | Oklahoma | Expansion |
| FL | Florida | Expansion |
| GA | Georgia | Expansion |
| LA | Louisiana | Expansion |

> Everything else falls through to **Not Served** (handled by the automation's default,
> so no rows needed).

---

## Table 6 — App Config  (`cr55d_appconfig`)

Key/value store for the scalar constants scattered across the workflows — freshness TTL,
fee baselines, thresholds, and lists. One row per setting. **Sources:** noted per row.

### Copilot prompt
```
Create a table named "App Config" (plural "App Configs"). It's a simple key/value
settings store.
Columns:
- "Config Key" — single line of text — primary name column (e.g. "leasingFeePctDefault").
- "Value" — single line of text — the value as text.
- "Data Type" — Choice (local) with exactly these options: number, boolean, string, csv.
- "Notes" — multiple lines of text.
Add an alternate key named "Config Key Key" on the Config Key column.
Then add the seed rows I provide.
```

### Column spec
| Column | Type | Notes |
|---|---|---|
| `cr55d_configkey` | Text (primary) | |
| `cr55d_value` | Text | stored as text; automation casts per Data Type |
| `cr55d_datatype` | Choice | number / boolean / string / csv |
| `cr55d_notes` | Multiline text | |
| `Active` | Yes/No | default Yes |
| *(alt key)* | on `cr55d_configkey` | |

### Seed rows
| Config Key | Value | Data Type | Notes |
|---|---|---|---|
| leasingFeePctDefault | 50 | number | Default leasing fee % of one month's rent for a new property (Normalize Intake baseline). |
| petCoverageDefault | false | boolean | Pet protection off by default (baseline, not label-derived). |
| setupFeeCeilingUsd | 250 | number | One-time setup fee ceiling for new owners ("not more than $250"). |
| proposalFreshnessMonths | 3 | number | Proposal / RentCast JSON considered stale after this many months (routing freshness). |
| mfMinSampleListings | 5 | number | Minimum listings before a multifamily unit type anchors the market range (Generate MF Report). |
| emailUnverifiedStatuses | invalid,catch-all,unknown,spamtrap,abuse,do_not_mail | csv | ZeroBounce statuses that mark an email unverified (Classify Email Status). |

---

## Seed data

Import-ready CSVs live in [`docs/dataverse-seed/`](./dataverse-seed/), one per table:
`oiaband.csv`, `oiascorelabel.csv`, `oiaevidencenote.csv`, `feecoveragerule.csv`,
`servicearea.csv`, `appconfig.csv`. All fields are quoted (the definitions/notes contain
commas and em dashes). Load them via **Table → Import → Import data from Excel/CSV**, or
paste the rows to Copilot after the table exists. They carry the exact live values, so the
tables start out matching current behavior.

---

## Review checklist (verify each table Copilot built)

For each table, confirm:

- [ ] **Logical names** use the `cr55d_` prefix and match the column specs above (Copilot
  echoes the names it assigned — the automation wires to these exact strings).
- [ ] **Choice options** are exactly as listed, with no extras Copilot invented, and the
  **labels match** the CSV values character-for-character (categories, labels, statuses,
  data types). A mismatched choice label silently breaks the lookup.
- [ ] **Decimal precision**: OIA Band `Raw Min/Max` = 4 dp (so `0.0625` isn't rounded to
  `0.06`); Score = 2 dp.
- [ ] **Alternate keys** exist and are on the columns noted (Band Name; Score; Category+Label;
  Coverage; State Code; Config Key). These are what the automation queries by.
- [ ] **Auditing is on** and every table has the **`Active` Yes/No** column defaulting to Yes.
- [ ] **Seed rows** loaded completely — spot-check Table 3's 16 evidence notes for dropped
  long text, and confirm `appconfig.emailUnverifiedStatuses` kept all six comma-separated
  values in one cell.

---

## Redundancy: Dataverse-only, never the workflow  *(owner decision, 2026-07-15)*

**The n8n workflow must NOT keep the constants as a hardcoded fallback.** A hidden literal
copy is exactly the drift problem we're removing — it becomes the "real" logic nobody
remembers editing. The source of truth is Dataverse, and so is the backup.

**Two-tier, both in Dataverse:**

1. **Primary** — the six config tables above (editable source of truth).
2. **Backup** — a **`cr55d_configsnapshot`** table that mirrors the primary tables and is
   populated *from them* by a scheduled Power Automate flow (Dataverse → Dataverse, never a
   hand-typed value). One row per config table: `Snapshot Key` (which table),
   `Snapshot Json` (the whole table serialized), `Taken At`, `Active`. The flow reads each
   primary table on a cadence (e.g. nightly, or on-change) and upserts its row, so the
   snapshot is always the last-known-good Dataverse state.

**n8n read order at the top of a flow:** primary table → on empty/error, the matching
`cr55d_configsnapshot` blob → **on both failing, fail closed** (do not run on guessed
values): mark the submission for retry / human review rather than misprice it. For a
pricing pipeline, holding is safer than silently running stale logic.

> **Optional soft layer (still Dataverse-sourced, zero literals):** cache the last
> successful Dataverse read in n8n static data and use it on a transient read failure. It's
> a cached *Dataverse* value, not a hand-authored constant — so it honors "Dataverse only."
> Without a cache hit, still fail closed.

**Consequence to accept:** on a total Dataverse outage, scoring/fee-derivation **pauses**
(fail-closed) instead of running on embedded defaults. That's the deliberate trade for a
single, non-drifting source of truth.

### `cr55d_configsnapshot` — Copilot prompt

```
Create a table named "Config Snapshot" (plural "Config Snapshots"). It stores a serialized
backup copy of each configuration table, refreshed automatically from the live tables.
Columns:
- "Snapshot Key" — single line of text — primary name column — the name of the config
  table this row backs up (e.g. "oiaband").
- "Snapshot Json" — multiple lines of text (max length 1048576) — the full table contents
  serialized as JSON.
- "Taken At" — date and time — when this snapshot was captured.
Add an alternate key named "Snapshot Key Key" on the Snapshot Key column.
Do not add seed rows — a scheduled flow populates this table.
```

### Wiring sequence

1. Build the six tables + `cr55d_configsnapshot`, seed the six from the CSVs.
2. Build the **snapshot refresh** Power Automate flow (reads each primary table → upserts
   its `cr55d_configsnapshot` row). Run it once so backups exist before n8n depends on them.
3. **Pilot on OIA Bands + Score Labels:** one Dataverse GET at the top of `OIA Scoring`,
   with the primary → snapshot → fail-closed order above. Delete the hardcoded `BANDS[]`
   and `labelFor` literals from the Code node in the same change.
4. Once proven, move Tables 3–6 the same way and strip their literals too.
