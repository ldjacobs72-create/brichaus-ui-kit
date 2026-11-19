# Stage 1 launch runbook: master shell + HOA hub

Source plan: *BrichausGroup.com Master SEO and Navigation Architecture*, revised 19 Nov 2026.
Code: `app/site-shell/` (header, footer, styles, behaviour) and `app/site-pages/` (page bodies), release **v1.3.0**.

## What already exists on the live site (checked 19 Nov 2026)

| Item | State | Action |
|---|---|---|
| `/hoa-management` | **Live and indexed**, but built as a stand-alone HOA microsite with its own header and footer | Replace its content with `site-pages/hoa-management.html` (see Blockers) |
| `/thank-you`, `/booking-confirmed` | Live, noindex, push `generate_lead` / `appointment_booked` | Keep. Add inquiry type (step 6) |
| GTM `GTM-WMSLD3VX` → GA4 `G-5T2NDT472J` | Tracks Schedule-a-Conversation clicks, phone taps, email taps and `appointment_booked` | **No tag listens for `generate_lead` yet**; add one (step 6) |
| Contact form on `/connect` | Inline GHL form with business line: HOA / Property Management / Brokerage / Lender / Servicer / Receiver | Reuse on `/contact` |
| Booking widget | `s2N572QXrgVZKGzRCsya` | Reuse on `/contact` |
| `/contact`, `/about`, `/about/larry-jacobs`, `/hoa-management/services-fees` | 404 | Build |

## Blockers to clear before go-live

1. **Office address conflict.** The current `/hoa-management` page shows *16830 Ventura Boulevard, Suite 300*. The new pages use *16501 Ventura Blvd, Suite 400*. Confirm which one matches the Google Business Profile, then use it everywhere (About, Contact, JSON-LD, GBP).
2. **Claims on the current `/hoa-management` page that the new page drops** because they are unverified or wrong: "for two decades… on the board's side of the table" (the confirmed fact is two terms on his own HOA board); "24/7 maintenance coordination"; "annual audit"; "our principals" (plural); "Licensed California property management and accounting services" (DRE licenses brokers; "accounting services" suggests CPA licensing); placeholder social links; a footer with no DRE number; and links to six HOA sub-pages that all return 404, including the dropped `/self-managed-hoa`.
3. **Search baseline (Stage 0 step 2)** is still open. Export it before any redirect goes in. It cannot be recovered afterwards.

## Go-live order (one session)

1. **Release v1.3.0.** Merge branch `stage1-site-shell` → `main`, publish tag `v1.3.0`, then open
   `https://cdn.jsdelivr.net/gh/ldjacobs72-create/brichaus-ui-kit@v1.3.0/app/site-shell/shell.css` to confirm it's live.
2. **Global header and footer.** In the site's global sections, replace the old nav with `site-shell/header.html` and the old footer with `site-shell/footer.html` (Custom HTML elements, section padding 0, full width). This one change removes every sitewide link to `/about-us`, `/connect/larryjacobs` and `/hoa-community-services`.
3. **Build the pages.** Use one Custom HTML element per page body (section padding 0). Enter the title, description and canonical from the comment block at the top of each file into GHL page SEO settings:
   - `/hoa-management`: replace the existing content with `hoa-management.html`. Same path, no redirect.
   - `/hoa-management/services-fees`: `hoa-services-fees.html`
   - `/about`: `about.html`
   - `/about/larry-jacobs`: `about-larry-jacobs.html` (add the headshot, or publish without one; never with a placeholder)
   - `/contact`: duplicate `/connect`, change the path to `contact`, then follow the build notes in `contact.html` (Part A above the calendar, Part B below the form; form redirect `/thank-you`; business line required; **replace the two example.com consent links**)
4. **Blog author.** Rename both HighLevel author records ("Brichaus Media" and "Property Manager") to Larry Jacobs, add photo and bio, and link the bio to `/about/larry-jacobs`.
5. **Redirects.** Add every row of `redirects-stage1.csv` under Settings → Domains & URL Redirects as 301s, on the same day the destination page publishes. Add the www/non-www host redirect in domain settings.
6. **Tracking.**
   - Replace the inline script on `/thank-you` with:
     ```html
     <script>
       window.dataLayer = window.dataLayer || [];
       var t = ''; try { t = sessionStorage.getItem('bh_inquiry_type') || ''; sessionStorage.removeItem('bh_inquiry_type'); } catch (e) {}
       dataLayer.push({ event: 'generate_lead', form_name: 'contact_us', inquiry_type: t || 'unknown' });
     </script>
     ```
     `shell.js` stores the business line when the form is submitted.
   - In GTM: add a Custom Event trigger `generate_lead`, a Data Layer Variable `inquiry_type`, and a GA4 Event tag `generate_lead` (parameters `inquiry_type`, `form_name`). Preview, then publish.
   - In GA4, mark `generate_lead`, `appointment_booked` and `assessment_complete` as key events.
7. **Checks before announcing** (Section 3 of the plan):
   - At 375 px and 768 px: the Menu button opens and closes, Services expands without leaving the page, hub links are visible inside the accordion, the Schedule button is visible at the bottom, and Escape closes the menu.
   - With the keyboard only: Tab through the header, dropdowns open with Enter or Space, the focus outline is visible throughout, and focus stays inside the open mobile menu.
   - Rich Results Test on `/about`, `/about/larry-jacobs`, `/contact` and `/hoa-management` (Breadcrumb, Organization, Person, LocalBusiness).
   - PageSpeed Insights (mobile) on `/hoa-management` and `/contact`.
   - Redirects: test each old path in a private window.
   - GTM Preview: submit the form once per business line and confirm `generate_lead` carries `inquiry_type` in GA4 DebugView.
8. **Search Console.** Use URL Inspection → Request indexing on the five new URLs plus `/hoa-management`.

## Stage-gated links

Menu, footer and cross-link lines marked `STAGE 2` / `STAGE 3` in the HTML are commented out on purpose. Un-comment each one on the day its page publishes. Property Management and Markets point to `/management`, `/residential-management`, `/lender-services` and `/market-areas-served` until their Stage 3 rebuild.

## Noted for later stages

- The live Market Updates category is `/insights/category/market_updates` (underscore). The plan says `market-updates`. Either keep the underscore slug or add a 301 in Stage 3.
- `/residential-management` canonicalises to `/` and isn't in the sitemap. This is consistent with the Stage 3 plan; no action now.
- Both `/terms-and-conditions` and `/terms-and-conditions-page` return 200 with the same content. Keep one and 301 the other.
