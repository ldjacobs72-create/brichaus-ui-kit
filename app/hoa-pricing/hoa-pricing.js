/* =====================================================================
   HOA PRICING — LOGIC
   Reads window.BH_HOA_CONFIG (config.js). Do not put prices here.
   Requires the markup in embed.html. Safe to load twice.
   ===================================================================== */
(function () {
  function init() {
    var root = document.querySelector('.bh-hoa');
    if (!root || root.getAttribute('data-bh-init')) return;
    var CFG = window.BH_HOA_CONFIG;
    if (!CFG) { console.error('[bh-hoa] config.js must load before hoa-pricing.js'); return; }
    root.setAttribute('data-bh-init', '1');

    var MODEL = CFG.model;
    var money = function (n) { return '$' + n.toLocaleString('en-US'); };
    function el(tag, cls, text) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    }

    /* ---- Responsibility ledger ---------------------------------- */
    var ledger = root.querySelector('#bh-ledger');
    var rows = CFG.ledger.map(function (item) {
      var d = el('div', 'lrow' + (item.fixed ? ' fixed' : ''));
      var fn = el('span', 'fn', item.f);
      if (item.c) fn.appendChild(el('span', 'code', item.c));
      var m1 = el('span', 'marks'), bd = el('span', 'mark bdm');
      var m2 = el('span', 'marks'), bh = el('span', 'mark bhm');
      var tag = el('span', 'tag');
      m1.appendChild(bd); m2.appendChild(bh);
      d.appendChild(fn); d.appendChild(m1); d.appendChild(m2); d.appendChild(tag);
      ledger.appendChild(d);
      return { bd: bd, bh: bh, tag: tag, data: item };
    });

    var track = 'fin';
    function paintLedger() {
      rows.forEach(function (r) {
        var who = r.data[track];
        r.bd.classList.toggle('on', who === 'bd');
        r.bh.classList.toggle('on', who === 'bh');
        r.tag.textContent = who === 'bh' ? 'Brichaus' : 'Board';
        r.tag.className = 'tag ' + who;
      });
    }

    /* ---- Schedule of fees table --------------------------------- */
    var feeBody = root.querySelector('#bh-fees');
    if (feeBody) {
      var cell = function (v) { return typeof v === 'number' ? money(v) : v; };
      CFG.scheduleOfFees.concat([{
        service: CFG.onboardingLabel, fin: MODEL.fin.setup, full: MODEL.full.setup
      }]).forEach(function (r) {
        var tr = el('tr');
        var svc = el('td', 'svc', r.service);
        if (r.ref) { svc.appendChild(document.createTextNode(' ')); svc.appendChild(el('span', 'ref', r.ref)); }
        var a = el('td', 'n', cell(r.fin));  a.setAttribute('data-label', 'Track One');
        var b = el('td', 'n', cell(r.full)); b.setAttribute('data-label', 'Track Two');
        tr.appendChild(svc); tr.appendChild(a); tr.appendChild(b);
        feeBody.appendChild(tr);
      });
    }

    /* ---- Marginal-rate pricing -----------------------------------
       Base covers the first `cover` units. Every unit above is billed
       at the rate for the step it falls in. Continuous: no boundary
       jumps, and the fee never decreases as units increase.
    ---------------------------------------------------------------- */
    function price(t, u) {
      var m = MODEL[t];
      if (u > m.steps[m.steps.length - 1].upto) return { fee: null, rate: 'Above published rates', setup: m.setup };
      var fee = m.base, prev = m.cover, marginal = 0, bandFrom = 0, bandTo = 0;
      for (var i = 0; i < m.steps.length; i++) {
        var s = m.steps[i];
        if (u > prev) {
          fee += (Math.min(u, s.upto) - prev) * s.rate;
          if (u <= s.upto) { marginal = s.rate; bandFrom = prev + 1; bandTo = s.upto; }
          prev = s.upto;
        }
      }
      fee = Math.round(fee / 5) * 5;
      var rate = marginal
        ? (t === 'fin' ? 'Base $' + m.base : 'Minimum $' + m.base) + ' · $' + String(marginal.toFixed(2)).replace(/\.00$/, '') + ' per unit for units ' + bandFrom + '\u2013' + bandTo
        : (t === 'fin' ? 'Base rate' : 'Account minimum') + ' · covers the first ' + m.cover + ' units';
      return { fee: fee, rate: rate, setup: m.setup };
    }
    window.BH_HOA_PRICE = price; // exposed for testing in the browser console

    /* ---- Calculator UI ------------------------------------------ */
    var slider = root.querySelector('#bh-units');
    slider.min = CFG.units.min; slider.max = CFG.units.max; slider.value = CFG.units.start;
    var range = root.querySelector('#bh-range');
    if (range) range.textContent = CFG.units.min + ' — ' + CFG.units.max + ' units · larger communities by proposal';

    var cards = {};
    root.querySelectorAll('.ct').forEach(function (c) { cards[c.dataset.t] = c; });

    function paintCalc() {
      var u = +slider.value, p = {};
      root.querySelector('#bh-u').textContent = u;
      root.querySelector('#bh-scope').textContent = track === 'fin'
        ? 'Board retains operations, vendors, enforcement, and owner communication.'
        : 'Brichaus carries operations end to end. The board retains all governance authority.';

      ['fin', 'full'].forEach(function (t) {
        var q = price(t, u); p[t] = q; var c = cards[t];
        c.setAttribute('aria-selected', String(t === track));
        if (q.fee === null) {
          c.querySelector('[data-f="fee"]').textContent = 'By proposal';
          c.querySelector('[data-f="meta"]').textContent = '';
        } else {
          c.querySelector('[data-f="fee"]').textContent = money(q.fee);
          c.querySelector('[data-f="meta"]').textContent = (u <= MODEL[t].cover)
            ? 'Account minimum applies · ' + money(q.fee * 12) + ' annual'
            : '$' + (q.fee / u).toFixed(2) + ' per door · ' + money(q.fee * 12) + ' annual';
        }
        c.querySelector('[data-f="rate"]').textContent = q.rate;
        c.querySelector('[data-f="setup"]').textContent = 'Onboarding ' + money(q.setup);
      });

      var d = root.querySelector('#bh-delta');
      if (p.fin.fee === null || p.full.fee === null) { d.textContent = ''; }
      else {
        var diff = p.full.fee - p.fin.fee;
        d.innerHTML = 'At ' + u + ' units, full service costs <b>' + money(diff) +
          '</b> more per month &mdash; ' + money(diff * 12) + ' a year.';
      }
    }
    slider.addEventListener('input', paintCalc);
    function nudge(dlt) {
      slider.value = Math.min(+slider.max, Math.max(+slider.min, +slider.value + dlt));
      paintCalc();
    }
    root.querySelector('#bh-minus').addEventListener('click', function () { nudge(-1); });
    root.querySelector('#bh-plus').addEventListener('click', function () { nudge(1); });

    function setTrack(t) {
      track = t;
      root.querySelectorAll('.track').forEach(function (b) {
        b.setAttribute('aria-selected', String(b.dataset.t === t));
      });
      paintLedger(); paintCalc();
    }
    root.querySelectorAll('.track,.ct').forEach(function (btn) {
      btn.addEventListener('click', function () { setTrack(btn.dataset.t); });
    });

    paintLedger(); paintCalc();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
