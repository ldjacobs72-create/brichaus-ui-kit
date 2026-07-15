# Power Pages — Internal Proposal Tool (site source)

Source for the hybrid Power Pages site (see `docs/INTERNAL-TOOL-PLAN.md` for the full
architecture). **Hybrid** = standard Power Pages components for the management screens
(list + edit form, near-zero build) + one custom **web template** for the create widget
(the piece that must be custom code).

> **New to Power Pages? Start here:** `docs/POWERPAGES-CREATE-PAGE-RUNBOOK.md` — a
> step-by-step, beginner runbook to get the Create-New page live as a staff-only page
> (maker-portal clicks + the `pac` CLI code-deploy path). It skips table permissions/web
> roles because the create page talks to n8n, not Dataverse — the smallest first build.

## Layout

```
powerpages/
├─ README.md                          ← this file (layout + deploy)
├─ config/
│  └─ site-config.md                  ← the declarative half: web roles, table
│                                        permissions, lists, forms, identity, CSP
│                                        (apply in the design studio, or as pac YAML
│                                        once a base site exists to download)
└─ web-templates/
   └─ create-new-proposal.html        ← the custom half: Surface 1 (Create New),
                                        reuses <bui-address-input> + ghl-site-selected
                                        for placeId parity. Real code, works today in
                                        DRY_RUN until the internal wrapper is built.
```

## What is code vs. what is studio config

| Surface | Built as | Lives in |
|---|---|---|
| Proposals list (all) | standard **List** over a `new_properties` view | `config/site-config.md` → studio |
| Proposal edit + Recalculate | standard **Basic Form** + a small action button | `config/site-config.md` → studio |
| **Create New** (address gate + staff inputs) | **custom web template** | `web-templates/create-new-proposal.html` |
| Web roles / table permissions / identity | studio security config | `config/site-config.md` |

## Test the Create widget locally

The address autocomplete needs Google Maps, which can't initialize on a `file://` page
(Google rejects the null referrer). Use the bundled dev server — it serves the widget over
`http://localhost`, injects your Maps key at serve time (never written to the file / never
committed), and serves the `bui-*` components from your local repo:

```bash
node powerpages/dev/serve-widget.js --key AIza...your-maps-key...
#   …then open the http://localhost:8000/ URL it prints
#   --port 8080 to change the port; GOOGLE_MAPS_KEY=… also works instead of --key
```

**One Google-side step:** the Maps key must allow the localhost origin. In Google Cloud
Console → your Maps API key → *Application restrictions → HTTP referrers*, add
`http://localhost:8000/*` (or set the key to **None** while testing). A domain-restricted
key will otherwise silently reject the autocomplete requests and the box stays inert.

`DRY_RUN` is off, so completing the flow makes **real** writes (a real fee call + a
no-contact Dataverse record). Use a disposable `TEST_…` address/placeId; the n8n app-user
can't hard-delete, so clean up test records from the maker portal.

## Deploy (Power Platform CLI)

Prereqs (see `docs/INTERNAL-TOOL-PLAN.md` §"Resources to provision"): environment with
enhanced data model, a Power Pages site, `pac` CLI, and a service principal for
non-interactive runs.

```bash
# authenticate (service principal for an agent / CI)
pac auth create --url https://org985aea18.crm.dynamics.com \
  --applicationId <APP_ID> --clientSecret <SECRET> --tenant <TENANT_ID>

# list sites to get the WebSiteId
pac pages list

# round-trip the site config as code (enhanced data model = modelVersion 2)
pac pages download --path ./powerpages/site --webSiteId <SITE_GUID> --modelVersion 2
#   …edit web templates / config…
pac pages upload   --path ./powerpages/site --modelVersion 2
```

> The `web-templates/create-new-proposal.html` here is authored standalone so it's
> reviewable and testable now. On deploy it becomes a **Web Template** record (with a
> Web Page + Page Template) inside the downloaded `./powerpages/site` tree. Until a base
> site is downloaded, treat `config/site-config.md` as the studio setup checklist.

## Notes

- **Enhanced data model + Bootstrap 5** must be on in the environment (required for new
  sites and modern responsive rendering).
- **CSP**: the create widget loads Google Maps JS + the jsDelivr CDN — allowlist those in
  the site's Content Security Policy (see `config/site-config.md`).
- **Parity rule**: the create widget MUST keep using `<bui-address-input>` (autocomplete)
  and `ghl-site-selected` (canonicalizer). Do not swap in a raw geocode — it can produce a
  different placeId and break online claim.
