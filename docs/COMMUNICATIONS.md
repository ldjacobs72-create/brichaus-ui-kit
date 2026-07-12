# PropScore Communications Map

**Who sends what, when, and where to see it.** The single reference for every
message the assessment funnel system can generate — so you never have to guess
whether activity should be showing up in GHL.

_Last updated: 2026-07-11 (post email audit). Update this file whenever a
workflow gains or loses a send._

---

## The one rule

**Every prospect-facing email is sent BY GHL.** n8n never emails through any
other provider (verified by audit: no Gmail/Outlook/SendGrid/SMTP nodes, no
non-GHL mail endpoints anywhere). When n8n "sends" an email, it posts to GHL's
Conversations API — GHL performs the send with the location's sending domain
and compliance settings, and the message appears in the contact's GHL
**Conversations** thread like any other email.

---

## 1. Emails a prospect can receive

### Nurture engine (the ONLY automated email sender today)

n8n workflow **"PropScore: Proposal Nurture Engine"** — runs **hourly**, looks
at every OPEN opportunity in the PropScore Proposals pipeline, and sends at
most ONE email per contact per pass (the highest step that has come due). A
send-ledger (`nurture_log` data table) guarantees no step is ever sent twice.

| Opportunity stage | Step | Sends at (after entering the stage) |
|---|---|---|
| New Proposal | receipt | immediately (first hourly pass) |
| New Proposal | nudge-1 | 24 h |
| New Proposal | nudge-2 | 72 h |
| New Proposal | final-nudge | 168 h (7 days) |
| Re-engaged | resume | 24 h |
| Re-engaged | resume-2 | 96 h |
| Proposal Viewed | questions | 48 h |
| Proposal Viewed | case-study | 120 h |
| Proposal Updated | recap | 24 h |

- Emails include the monthly fee and a **proposal link** to the standalone
  proposal page.
- Stops automatically when the opportunity leaves the first four stages
  (Call Scheduled / Won / Lost) or is closed.
- **Where to see it in GHL**: the contact's Conversations tab (each send
  appears as an outbound email), plus Email Statistics for delivery/bounce.

### Booking / appointment emails (GHL-native)

Confirmations, reminders, and cancellation notices for the embedded
"Schedule Your Consultation" calendar come from **GHL's calendar settings** —
nothing in n8n is involved. If those aren't arriving, check the calendar's
notification settings in GHL, not the workflows.

### Any GHL Workflows you build

Anything you wire in GHL's own Workflow builder (e.g. on tags, stages,
appointment events) sends via GHL as usual. As of this writing the recipes
suggested during the build are **internal notifications** (below), not
prospect emails.

---

## 2. Emails that do NOT exist (yet) — stop looking for these

| Expected message | Status |
|---|---|
| **"We'll email your full proposal shortly"** (promised on the report screen and in the paste copy) | **NOT BUILT.** The Power Automate PDF-generation node in the pipeline is a dead placeholder URL. No proposal PDF email is sent by anything. Either build the PDF+email flow (recommended: PA generates/stores the PDF, GHL sends the email) or soften the funnel copy. |
| Funnel submission confirmation / "thanks for your assessment" email | Never existed. The first email a new prospect gets is the nurture **receipt** (within ~1 hour, via the engine above). |
| Expansion-market lead ("Keep Me Posted") welcome email | Not sent. That capture creates a tagged GHL contact + note only. The `expansion-market` / `expansion-<state>` tags are ready to trigger a GHL Workflow when you want one. |
| Consent confirmation email | Not sent. Consent is recorded as a timestamped note on the contact. |

---

## 3. Non-email activity you WILL see in GHL

| Activity | Source | Trigger |
|---|---|---|
| Contact created/updated | n8n Main Pipeline (contacts/upsert) | every funnel submission with an email |
| Property record created/updated (incl. property type, fee, scores, annual value) | n8n Main Pipeline | every submission |
| Contact ↔ Property association | n8n Main Pipeline | submission (and self-healing on repeats) |
| Opportunity created / stage advanced / value recomputed | n8n Main + Recognition workflows | new proposal, re-engagement, proposal viewed/updated |
| Consent note on the contact | n8n Main Pipeline | first submission of a property with consent |
| Expansion-lead contact + `expansion-market`/`expansion-<state>` tags + note | n8n Recognition workflow | out-of-area email capture |
| Conflict note/task ("couldn't confirm email, left phone") | n8n Recognition workflow | failed email confirmation + phone capture |

**Internal notifications** (to you/your team, only if you implemented the
suggested GHL recipes): Proposal Viewed alert; conflict-tag task; Appointment
Booked → Call Scheduled stage move. These live in GHL's Workflow builder — n8n
doesn't send them.

---

## 4. Power Automate — the two opaque spots

n8n calls two Power Automate flows whose definitions live in your Power
Platform environment (not visible from n8n):

1. **Fee Calc flow** — called live on every submission. Believed to only
   compute the fee. **Verify once in the PA designer that it contains no
   "Send an email" action** — if it did, that mail would bypass GHL.
2. **PDF-generation flow** — the n8n node is a placeholder; nothing is called.
   See section 2.

---

## 5. Testing safely (protect your domain reputation)

**The problem**: any test submission with a made-up email creates a real GHL
contact and an open opportunity — and within the hour the nurture engine sends
a real email to that fake address through your sending domain. Fake addresses
hard-bounce, and hard bounces are the strongest negative signal mailbox
providers track. A handful is survivable; a habit is not.

**Do this instead:**

- **Use a real inbox you own with plus-addressing**: `you+test1@gmail.com`,
  `you+demo-multi@gmail.com`, etc. — all deliver to your inbox, each is a
  distinct GHL contact, zero bounces. (Works with Gmail and most providers.)
- **Immediately after a test**: mark the test opportunity **Lost** (or delete
  the test contact). The engine only emails OPEN opportunities in the first
  four stages — a Lost opp is silent forever.
- **Never use invented domains** (`@test.com`, `@fake.io`, gibberish) — those
  are the bounce generators.
- **Check the damage so far**: GHL → Email Statistics → look at bounce counts
  for the last two weeks; delete any remaining fake-email contacts so their
  remaining nurture steps never fire. If bounce volume was more than a
  handful, pause new nurture sends for a few days of clean traffic.
- Optional hardening (ask Claude to build either): a `no-nurture` suppression
  tag the engine checks before sending, and/or a test-mode flag that routes
  all engine emails to your own address.

---

## 6. Quick answers

- **"A new lead came in — what should GHL show within the hour?"** Contact,
  Property record (typed), association, opportunity in New Proposal, consent
  note, and one **receipt email** in their Conversations thread.
- **"Prospect says they got no proposal email."** Correct — no PDF email
  exists yet (section 2). Their emails are the nurture cadence only.
- **"Who emailed this contact at 3am?"** The hourly nurture engine — check
  `nurture_log` in n8n for the exact step, or the GHL Conversations thread.
- **"I closed the deal — will emails stop?"** Yes. Won/Lost/Call Scheduled
  stages are outside the nurture window.
