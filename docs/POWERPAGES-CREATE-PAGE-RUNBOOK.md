# Power Pages — get the Create-New-Proposal page live (beginner runbook)

Goal: one **authenticated, staff-only** page in Power Pages that hosts the
`create-new-proposal` widget, so a staff member can create a claimable proposal from a real
web address instead of curl. This is the "just the Create page" MVP — the smallest thing
that teaches the whole Power Pages stack once.

Grounded in current Microsoft Learn docs (2026-07). Links at the bottom.

---

## The one big simplification

The Create widget posts to your **n8n webhooks** (`ghl-site-selected`,
`internal-proposal-create`) and n8n does the Dataverse write with its own credential. The
page **never reads or writes Dataverse through Power Pages.** So for this page you can
**skip the hardest part of Power Pages** — table permissions and web roles. All you need is:

1. a site (staff-only by default),
2. your HTML as a **web template**,
3. a **page template** that renders it,
4. a **web page** that shows it,
5. a **CSP** that allows the widget's scripts, and
6. the **Google Maps key** filled in.

That's the whole checklist. Table permissions come later, only when you build the Manage/
Edit screens that read Dataverse directly.

---

## Before you start

- You need the **Maker/Owner** role in the `org985aea18` environment (the one with
  `new_properties`). If you can open https://make.powerpages.microsoft.com and see/create
  sites there, you're set.
- Have the widget file open: `powerpages/web-templates/create-new-proposal.html` (you'll
  paste its contents).
- Have a **Google Maps JS API key** ready (the same one the funnel uses is fine).

---

## Part A — Maker portal (get it live)

### A1. Create the site (skip if you already have one)

1. Go to **https://make.powerpages.microsoft.com**.
2. Top-left environment picker → choose the **`org985aea18`** environment (NOT the Default
   environment — that's shared tenant-wide).
3. **Start with a template** → pick **Blank page** (we're supplying our own HTML) → **Choose
   this template**.
4. Name it e.g. **BRICHAUS Staff Tools**, accept the web address, **Done**. Provisioning
   takes a few minutes.

> New sites are **internal-only** until you flip visibility to public. Internal = only
> people in your org (signed in with their work account) can reach it. That's exactly the
> staff gate we want, so **leave visibility as-is** — no identity-provider setup needed for
> the MVP.

### A2. Open the management app

In the design studio, click the **`…` (More items)** menu → **Portal Management** (it may be
labeled **Power Pages Management** if your site uses the enhanced data model — either is
correct). This app is where web templates / page templates / web pages live.

### A3. Create the Web Template (your HTML)

1. In the management app left nav, under **Content** → **Web Templates** → **New**.
2. Fill in:
   - **Name:** `Create New Proposal`
   - **Website:** select your site (click the field, press Enter, pick it).
   - **Source:** paste the **entire contents** of
     `powerpages/web-templates/create-new-proposal.html`.
   - **MIME Type:** `text/html`
3. **Before saving**, edit two things directly in the pasted Source:
   - Find `GOOGLE_MAPS_KEY: ''` and put your key in the quotes:
     `GOOGLE_MAPS_KEY: 'AIza...'`. (A Maps *browser* key is public by design — it's
     protected by the referrer restriction in step A7, not by secrecy.)
   - Nothing else needs changing — `INTERNAL_CREATE_URL` / `SITE_ROUTING_URL` already point
     at your live n8n webhooks and `DRY_RUN` is already `false`.
4. **Save**.

### A4. Create the Page Template (renders the template)

1. Left nav → **Website** → **Page Templates** → **New**.
2. Fill in:
   - **Name:** `Create New Proposal`
   - **Website:** your site.
   - **Type:** **Web Template**
   - **Web Template:** `Create New Proposal` (the one from A3).
   - **Use Website Header and Footer:** **UNCHECK this.** ⚠️ Important — our file is a
     *complete* HTML document (its own `<!doctype html>…</html>`), so it must render the
     whole response, not sit inside the site's header/footer.
   - **Is Default:** unchecked.
3. **Save**.

### A5. Create the Web Page (the URL staff visit)

1. Left nav → **Content** → **Web Pages** → **New**.
2. Fill in:
   - **Name:** `Create Proposal`
   - **Website:** your site.
   - **Parent Page:** `Home`
   - **Partial URL:** `create-proposal`  ← this becomes `/create-proposal`
   - **Page Template:** `Create New Proposal` (from A4).
   - **Publishing State:** `Published`
3. **Save**.

### A6. Sync

Back in the **design studio**, click **Sync** (top bar). This pulls the management-app
records into the site. Then **Preview → Desktop**.

### A7. Point the page at itself in Google (the one external step)

The Maps key must allow the site's domain, or autocomplete stays silent (Google drops the
request). In **Google Cloud Console → APIs & Services → Credentials → your Maps key →
Application restrictions → HTTP referrers**, add your Power Pages domain, e.g.:

```
https://brichaus-staff-tools.powerappsportals.com/*
```

(Use the actual domain from your browser's address bar on the preview. If you later add a
custom domain, add that too.) A domain-restricted key that doesn't list this origin is the
#1 reason the box "does nothing."

### A8. Add the CSP so the widget's scripts are allowed

The widget loads scripts from jsDelivr (the `bui-*` components) and Google Maps, fonts from
Google, and calls your n8n webhooks. Power Pages' default CSP blocks those until you
allowlist them.

1. Management app → **Site Settings** → find or **New** the setting named
   **`HTTP/Content-Security-Policy`**, Website = your site.
2. Set the **Value** to:

```
script-src 'self' 'unsafe-inline' content.powerapps.com content.powerapps.us content.appsplatform.us content.powerapps.cn https://cdn.jsdelivr.net https://maps.googleapis.com https://maps.gstatic.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https:;
font-src 'self' https://fonts.gstatic.com data:;
img-src 'self' data: https:;
connect-src 'self' https://brichaus.app.n8n.cloud https://maps.googleapis.com https://maps.gstatic.com;
```

3. **Save**, then **Sync** in the design studio.

> `'unsafe-inline'` in `script-src` is here because the widget uses inline `<script>` blocks
> and this is an **internal, trusted-code** page. If you'd rather not, the alternative is to
> temporarily **clear** the CSP value (disables CSP) while testing — fine for an internal
> site — and tighten later. Watch the browser **Console (F12)** for `CSP` violation lines;
> each one names a domain to add.

### A9. Test it

Open the page (Preview → Desktop, or the live URL). You'll be asked to sign in with your
work account (that's the staff gate). Then:

1. Type a real in-area address → **autocomplete should now drop suggestions.**
2. Pick one → the widget pulls facts, you set scores/coverages → **Generate**.
3. It calls `internal-proposal-create` and returns the proposal URL.

⚠️ `DRY_RUN` is off — this makes **real** writes (real fee call + a real no-contact
Dataverse record). Use a throwaway `TEST_…`-style address, and remember the n8n app-user
can't hard-delete, so clean test records from the maker portal afterward.

---

## Part B — Code deploy (pac CLI), for versioning/redeploy later

Once it works in the portal, you can round-trip the site as files so changes are
repeatable. This does **not** replace Part A the first time — it manages the same records as
code afterward.

Prereqs: install the **Power Platform CLI** (`pac`) — VS Code extension "Power Platform
Tools" or the standalone CLI, version **1.32+** (so `pac pages` and `--modelVersion 2`
work).

```bash
# 1. Authenticate to your environment
pac auth create --name BRICHAUS --url https://org985aea18.crm.dynamics.com

# 2. Find the site's WebSiteId + confirm it's the enhanced data model (model 2)
pac pages list -v

# 3. Download the site as files
pac pages download --path ./powerpages/site --webSiteId <WEBSITE_ID> --modelVersion 2

# 4. Edit the web-template source file that appears under the downloaded tree
#    (…/web-templates/create-new-proposal/…source.html). Paste updates from
#    powerpages/web-templates/create-new-proposal.html into it.

# 5. Upload just the changes back
pac pages upload --path ./powerpages/site/<downloaded-site-folder> --modelVersion 2
```

Notes:
- After `download`, the exact filenames appear on disk — the web template's Source lands in
  its own `.html` file you can diff/commit. Keep the canonical copy in
  `powerpages/web-templates/create-new-proposal.html` and copy it into the tree before
  upload (or symlink your edits).
- `pac pages upload` within the **same** environment does a **delta** (only changed files).
  Cross-environment uploads are always full — use `--forceUploadAll` if state drifts.
- The CLI moves **site configuration**, not Dataverse schema. Your `new_properties` table
  and the config tables already exist, so nothing schema-related is needed here.

---

## What you did NOT have to do (and when you will)

- **Table permissions / web roles** — not needed: the page talks to n8n, not Dataverse.
  You'll add these when you build **Manage/Edit** (a list + edit form that read
  `new_properties` directly). That's `powerpages/config/site-config.md` §3–§5.
- **Identity providers (Entra External ID)** — not needed: internal visibility gates to
  staff via their work accounts. External/owner login is the later owner-portal phase.

---

## Troubleshooting

| Symptom | Cause → fix |
|---|---|
| Autocomplete does nothing | Maps key doesn't allow this domain (A7), or key not filled in the Source (A3). Check Console for a `maps.googleapis.com` referrer/`RefererNotAllowed` error. |
| Page shows site header/footer or looks doubled | Page Template still has **Use Website Header and Footer** checked (A4) — uncheck it. |
| Blank page / components unstyled | CSP blocking jsDelivr. Check Console for `CSP` lines; confirm `https://cdn.jsdelivr.net` is in `script-src` (A8), then **Sync**. |
| "Generate" does nothing / network error | CSP `connect-src` missing `https://brichaus.app.n8n.cloud` (A8). |
| Changes don't show | You didn't **Sync** after editing in the management app (A6). |
| Asked to sign in and can't | You're not in the org / not assigned to the environment. That's the internal-only gate working. |

---

## Reference (Microsoft Learn)

- Create a site — https://learn.microsoft.com/power-pages/getting-started/create-manage
- Web templates & custom page layouts — https://learn.microsoft.com/power-pages/configure/custom-page-layouts
- Page templates — https://learn.microsoft.com/power-pages/configure/page-templates
- Content Security Policy — https://learn.microsoft.com/power-pages/security/manage-content-security-policy
- pac pages CLI — https://learn.microsoft.com/power-platform/developer/cli/reference/pages
- Enhanced data model — https://learn.microsoft.com/power-pages/admin/enhanced-data-model
