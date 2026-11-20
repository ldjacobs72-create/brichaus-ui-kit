/* =====================================================================
   HOA PRICING — CONFIG
   ---------------------------------------------------------------------
   This is the ONLY file to edit for a pricing or scope change.
   Logic lives in hoa-pricing.js; layout lives in embed.html / CSS.

   After editing: commit, publish a new release tag (e.g. v1.2.0),
   then bump the @version in the GHL embed. See README.md.
   ===================================================================== */
window.BH_HOA_CONFIG = {

  /* ---- Calculator range ------------------------------------------- */
  units: { min: 4, max: 200, start: 4 },

  /* ---- Monthly fee model (marginal-rate) ---------------------------
     PRICING RULE
       fin  (Accounting & Compliance): per-unit rate STEPS DOWN with
            scale. Each step's rate must be <= the step before it.
       full (Full-Service Management): per-unit rate NEVER steps down.
            Management hours rise with every door. Each step's rate
            must be >= the step before it.
     hoa-pricing.js warns in the browser console if a change breaks
     this rule.

     base   : monthly fee covering the first `cover` units
     cover  : units included in the base
     setup  : one-time onboarding fee (also shown in Schedule of Fees)
     steps  : each unit above `cover` is billed at the rate of the step
              it falls in. `upto` is inclusive. Above the last step's
              `upto`, the calculator shows "By proposal".
     Fees are rounded to the nearest $5.
  -------------------------------------------------------------------- */
  model: {
    fin: {
      base: 315, cover: 10, setup: 750,
      steps: [
        { upto: 40,  rate: 9.50 },
        { upto: 75,  rate: 7.25 },
        { upto: 150, rate: 5.50 },
        { upto: 250, rate: 4.25 }
      ]
    },
    full: {
      base: 650, cover: 10, setup: 1500,
      steps: [
        { upto: 120, rate: 16 }      // flat, no scale discount. 121+ = by proposal
      ]
    }
  },

  /* ---- Schedule of fees (table) ------------------------------------
     fin / full: a number renders as money ($650); text renders as-is.
     The Onboarding row is added automatically from model.*.setup.
  -------------------------------------------------------------------- */
  scheduleOfFees: [
    { service: 'Annual Budget Report — prepared & distributed', ref: '(Civ. Code §5300)', fin: 650,  full: 'Included' },
    { service: 'Annual Policy Statement',                        ref: '(§5310)',           fin: 350,  full: 'Included' },
    { service: 'CPA review coordination when income exceeds $75,000', ref: '(§5305)',      fin: '$250 + CPA', full: '$250 + CPA' },
    { service: 'Reserve study coordination and update cycle',                              fin: '$250 + vendor', full: 'Included + vendor' },
    { service: 'Escrow demand & resale disclosure package',      ref: '(§4525)',           fin: '$375 to seller', full: '$375 to seller' },
    { service: 'Delinquency notice cycle and lien referral, per account',                  fin: 'Agreed with the board', full: 'Included' },
    { service: 'Membership vote or special assessment administration',                     fin: 850,  full: 850 },
    { service: 'Board meeting attendance beyond the included cadence',                     fin: 275,  full: 275 },
    { service: 'Capital project administration, as % of contract value',                   fin: '—',  full: '8%' }
  ],
  onboardingLabel: 'Onboarding: books migration, fund separation, prior-year cleanup',

  /* ---- Responsibility ledger ---------------------------------------
     fin / full: 'bh' = Brichaus, 'bd' = Board.
     fixed: true = non-delegable (gold row). c = statute reference.
  -------------------------------------------------------------------- */
  ledger: [
    { f: 'Assessment billing, collection, and owner ledgers',                 fin: 'bh', full: 'bh' },
    { f: 'Operating and reserve fund accounting, kept separate',              fin: 'bh', full: 'bh' },
    { f: 'Bank reconciliation and monthly financial package', c: '§5500',     fin: 'bh', full: 'bh' },
    { f: 'Accounts payable against board-approved spending',                  fin: 'bh', full: 'bh' },
    { f: 'Annual Budget Report preparation and delivery',     c: '§5300',     fin: 'bh', full: 'bh' },
    { f: 'Annual Policy Statement preparation and delivery',  c: '§5310',     fin: 'bh', full: 'bh' },
    { f: 'Reserve funding disclosure and study coordination', c: '§5550',     fin: 'bh', full: 'bh' },
    { f: 'Delinquency reporting to the board',                                fin: 'bh', full: 'bh' },
    { f: 'Delinquency notices, payment plans, lien referral',                 fin: 'bd', full: 'bh' },
    { f: 'Escrow demands and resale disclosure packages',     c: '§4525',     fin: 'bh', full: 'bh' },
    { f: 'Tax return and CPA review coordination',            c: '§5305',     fin: 'bh', full: 'bh' },
    { f: 'Vendor contracting and insurance certificate tracking',             fin: 'bd', full: 'bh' },
    { f: 'Common area inspections and condition reporting',                   fin: 'bd', full: 'bh' },
    { f: 'Maintenance dispatch and work order tracking',                      fin: 'bd', full: 'bh' },
    { f: 'Homeowner inquiries and community notices',                         fin: 'bd', full: 'bh' },
    { f: 'Violation notices and hearing administration',                      fin: 'bd', full: 'bh' },
    { f: 'Architectural application intake and tracking',                    fin: 'bd', full: 'bh' },
    { f: 'Meeting notice, agenda preparation, and minutes',                   fin: 'bd', full: 'bh' },
    { f: 'Budget adoption, assessment setting, policy decisions', fixed: true, fin: 'bd', full: 'bd' },
    { f: 'Contract award, litigation, and fiduciary judgment',    fixed: true, fin: 'bd', full: 'bd' }
  ]
};
