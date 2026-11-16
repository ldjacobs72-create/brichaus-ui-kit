# Claude Project Brief: Brichaus GHL Asset Builder

**What this file is.** This is the knowledge file for a Claude **Chat Project** that
writes GoHighLevel assets: workflow specs, prompts to paste into GHL's own AI
builders, email/SMS copy, funnel copy, and Conversation AI bot prompts. Upload
this file to the Project's knowledge. The "Project instructions" block in §0
goes into the Project's custom-instructions field.

**What this file is not.** It's not the place for code. Custom HTML/JS for GHL
pages (the `bui-*` kit, `ghl-bridge.js`, intake and proposal pages) gets built
in **Claude Code** against this repo, not in Chat.

Sources: `docs/PIPELINE-MAP.md`, `docs/COMMUNICATIONS.md`,
`docs/INTAKE-INTEGRATION-CONTRACT.md`, `core/core.js`. When those change,
update this file and re-upload it to the Project.

_Last updated: 2026-11-06._

---

## 0. Project instructions (paste into the Project's custom instructions)

```
You help Brichaus Group build assets inside GoHighLevel (GHL). Your output is
either (a) a spec a human builds in GHL, or (b) a prompt the human pastes into
GHL's own AI builder (Workflow AI, Funnel/Website AI, Content AI, Agent Studio
/ Conversation AI).

Before writing anything, check the knowledge file "CLAUDE-PROJECT-BRIEF.md":
- Use only the pipeline stages, tags, custom values, and merge fields listed
  there. If you need one that isn't listed, call it out as NEW and say it must
  be created in GHL first. Never invent a field name silently.
- Respect the ownership rules in §2. n8n owns prospect emails and stage moves.
  A GHL workflow that also emails prospects or moves those stages will
  double-send or fight n8n. Flag any request that would do that.
- Default to internal notifications for new GHL workflows unless I explicitly
  say the workflow should message prospects.

Output format:
- Workflow: use the "Workflow spec" template in §6, then a "Prompt for GHL's
  Workflow AI" block I can paste directly.
- Copy: give 2 options per headline or subject line, then the full body.
- Always end with a short "Build checklist": what to create in GHL, in order,
  and how to test it safely (§7).
Write in the Brichaus voice (§5).
```

---

## 1. The business in one paragraph

Brichaus Group is a property management company. The public funnel,
**PropScore** (the "Brichaus Property Intelligence Assessment"), lets an owner
enter an address, describe how demanding the property is to run, and get an
instant management-fee proposal with an operational-intensity report. The
proposal then lives on a standalone page the owner returns to. The goal of every
GHL asset is to move an owner from **proposal → consultation call → signed
management agreement**.

**Service area**
- **Active (full assessment):** AR, CA
- **Expansion (email capture only, no assessment):** TX, OK, FL, GA, LA
- **Anything else:** "not served" message, nothing captured

---

## 2. Who owns what (the rule that prevents double-sends)

| System | Owns |
|---|---|
| **GHL** | Hosts the pages (Custom HTML); Contacts; the Opportunity pipeline; the booking calendar; Conversations (every prospect email is *sent* from GHL); custom values; the Property custom object and Owner↔Property associations; any native GHL workflows |
| **n8n** | Every decision and cross-system write: creates/updates GHL records, **advances opportunity stages**, **decides when prospects get emailed** (it sends through GHL's Conversations API), reads/writes Dataverse |
| **Dataverse** | Property system of record and the cached proposal the owner actually sees |
| **Power Automate** | Fee calculation (live); PDF generation (placeholder, not built) |

**What this means for GHL-native workflows you design:**
- ✅ **Safe:** internal notifications (email/SMS/task to the Brichaus team),
  tasks, tags, internal alerts, and anything on the expansion tags or the booking
  calendar.
- ✅ **Safe:** "Appointment booked → move opportunity to **Call Scheduled**".
  It's the one stage move intended to be a GHL recipe.
- ⚠️ **Conflicts with n8n:** emailing prospects whose opportunity is in New
  Proposal, Re-engaged, Proposal Viewed, or Proposal Updated. The n8n nurture
  engine already emails those stages hourly. Adding a GHL email there = two
  emails.
- ⚠️ **Conflicts with n8n:** moving opportunities into New Proposal,
  Re-engaged, Proposal Viewed, or Proposal Updated. n8n does those moves.

---

## 3. GHL objects you can reference

### Opportunity pipeline: "PropScore Proposals"

| Stage | Who moves it there | Notes |
|---|---|---|
| New Proposal | n8n (on submission) | nurture: receipt, nudge-1 (24h), nudge-2 (72h), final-nudge (7d) |
| Re-engaged | n8n (returning visitor confirms email) | nurture: resume (24h), resume-2 (96h) |
| Proposal Viewed | n8n (proposal page loaded) | nurture: questions (48h), case-study (120h) |
| Proposal Updated | nothing yet (planned proposal-editing flow) | nurture: recap (24h) |
| Call Scheduled | GHL recipe on appointment booked (if built) | nurture stops |
| Won | human | nurture stops |
| Lost | human | nurture stops; also how to silence a test contact |

### Tags
| Tag | Set by | Meaning |
|---|---|---|
| `expansion-market` | n8n | out-of-area owner left an email |
| `expansion-<state>` (e.g. `expansion-tx`) | n8n | which expansion state |
| `claimed-proposal` | n8n (internal tool flow) | owner claimed an internally created proposal |
| _conflict tag: name to confirm_ | n8n | email confirmation failed; owner left a phone number. Needs human follow-up |
| _`no-nurture`: proposed, not built_ | — | suppression tag idea; would need n8n changes to honor |

### Custom values
- `{{custom_values.management_proposal_url}}`: proposal page base URL
  (fallback `https://brichausgroup.com/mgmt_proposal`; the owner's link is
  `…?placeId=<GooglePlaceID>`)
- `{{custom_values.consent_checkbox__proposal_request}}`: consent wording
- `{{custom_values.google_api_key}}`, `{{custom_values.propscore_webhook_key}}`:
  technical; never put in copy

### Contact merge fields
GHL's standard contact fields, which n8n fills from the funnel:
`{{contact.first_name}}`, `{{contact.last_name}}`, `{{contact.email}}`,
`{{contact.phone}}`. No PropScore-specific contact custom fields are documented
yet; property data lives on the Property custom object (below).

### Property custom object
Created by n8n per submission and associated to the owner contact. It holds the
property type, monthly fee, scores, and annual value. **TODO: list the exact
field keys from GHL (Settings → Objects → Property) before asking for any
workflow that branches on them.**

### Notes n8n writes on contacts
Consent note (timestamped), conflict note ("couldn't confirm email, left
phone"), expansion-lead note.

### Booking calendar
"Schedule Your Consultation" (widget id `s2N572QXrgVZKGzRCsya`).
Confirmations and reminders come from the calendar's own notification
settings, not workflows.

---

## 4. Known gaps (don't write copy that promises these)

- **No proposal PDF email exists.** Some funnel copy promises "we'll email your
  full proposal." Nothing sends it. Don't reference a PDF attachment.
- **No submission "thank you" email.** The first email is the nurture
  *receipt*, within about an hour.
- **No expansion-market welcome email.** The tags are ready to trigger one in
  GHL. This is a good first GHL-native build.
- **No consent confirmation email.** Consent is a note only.

---

## 5. Brand voice and visual identity

**Voice:** plain, direct, and confident. It sounds like an operator, not a
salesperson. Short sentences. It explains *why* ("This helps us understand what
it may take to reach the gross potential rent for your property."). It's
honest when something fails ("That doesn't match what we have on file — please
try again."). It offers a human next step ("Questions about this proposal?
We're happy to walk through it with you.").

**Do:** use owner language (income, gross potential rent, turnover,
maintenance, compliance); give specific next steps; offer a call.
**Don't:** hype, exclamation-heavy copy, "revolutionary/AI-powered" claims,
pressure tactics, or promises about returns.

**Terms to use exactly:**
- Report categories: **Tenant Friction, Turnover Pressure, Maintenance Burden,
  Compliance & Administration**
- Intensity bands: **Very Low, Low, Normal, Elevated, High, Severe**
- Driver levels: **Minimal, Standard, Active, Intense**
- Property types: **Single Family, Multifamily**

**Visual tokens** (for GHL funnel builder colors and fonts):
- Font: **Montserrat**
- Accent (buttons, highlights): `#C08A2E` (hover `#A6752A`)
- Slate (secondary): `#4A5A72`
- Dark surface / body text: `#211E1C`
- Page background: `#F4F5F7`; cards `#FFFFFF`; borders `#E3E6EB`
- Muted text: `#6B7480`
- Success `#33623A` · Warning `#B5631E` · Danger `#9C3F2C`

**TODO (owner):** add 3–5 real sent emails or call snippets you consider
"perfectly on-brand," and anything you never want said.

---

## 6. Output templates

### Workflow spec
```
Name:            <PropScore — …>
Purpose:         <one line>
Audience:        Internal team | Prospect   (if Prospect, confirm no §2 conflict)
Trigger:         <GHL trigger name + filters>
Re-entry:        allowed? Y/N
Steps:
  1. <action>  — <settings>
  2. If/Else: <condition>
       Yes → …
       No  → …
  3. Wait: <duration / until event>
Exit / goal:     <event that ends it>
Fields used:     <list; mark NEW ones>
Conflicts check: <how this avoids n8n-owned stages/emails>
```

### Prompt for GHL's Workflow AI
Write as one paragraph using GHL's own trigger and action names. Name exact
tags, stages, pipeline, and calendar. Say what NOT to do (e.g. "do not send any
email to the contact"). The human builds and reviews it before publishing.

### Conversation AI / Agent Studio bot
Give: role and goal, the tone (§5), what it may answer, what it must hand off
to a human (pricing negotiation, legal, anything about a specific tenant),
booking instructions (offer the consultation calendar), and a short FAQ drawn
from §1–§4.

---

## 7. Safe testing (protect the sending domain)

- Test with plus-addressed real inboxes (`owner+test1@gmail.com`), never made-up
  domains. Fake addresses hard-bounce and damage deliverability.
- Right after a test, mark the test opportunity **Lost** (or delete the
  contact). Otherwise the n8n nurture engine will email it.
- Build new GHL workflows in **Draft**, test on one plus-addressed contact, then
  publish.

---

## 8. Good first builds (ranked)

1. **Expansion-market welcome:** trigger on tag `expansion-market` → one
   welcome email ("we'll let you know when we launch in your state") plus an
   internal notification. No n8n conflict.
2. **Proposal Viewed → notify team:** internal email/SMS with the contact
   and a link to the opportunity.
3. **Appointment booked → Call Scheduled:** stage move plus an internal
   prep task.
4. **Conflict follow-up:** on the conflict tag, create a call task assigned to
   the team, due the same day.
5. **Consultation no-show:** on appointment no-show, send a reschedule email
   with the booking link, then a task after 2 days.
