/* =====================================================================
   BRICHAUS SITE SHELL — BEHAVIOUR
   The menu works as plain links without this file. This script adds:
     - desktop dropdowns (click, hover, Escape, click-outside)
     - mobile menu button + accordions, focus kept inside while open
     - aria-current on the link for the current page
     - remembers the contact form's business line for /thank-you
   Safe to load twice. No dependencies.
   ===================================================================== */
(function () {
  if (window.__bhShell) return;
  window.__bhShell = true;

  var MOBILE = window.matchMedia('(max-width: 1023px)');
  var path = location.pathname.replace(/\/+$/, '') || '/';

  function init() {
    var header = document.querySelector('.bh-header');
    if (header && !header.getAttribute('data-bh-init')) {
      header.setAttribute('data-bh-init', '1');
      initHeader(header);
    }
    initTracking();
  }

  /* ---------------- Header ---------------- */
  function initHeader(header) {
    var nav = header.querySelector('.bh-nav');
    var menuBtn = header.querySelector('.bh-menu-btn');
    var tops = [].slice.call(header.querySelectorAll('button.bh-top[aria-controls]'));
    var hoverTimer, hoverAt = 0;

    function panelOf(btn) { return document.getElementById(btn.getAttribute('aria-controls')); }
    function setOpen(btn, open) {
      btn.setAttribute('aria-expanded', String(open));
      var p = panelOf(btn); if (p) p.setAttribute('data-open', String(open));
    }
    function closeAll(except) { tops.forEach(function (b) { if (b !== except) setOpen(b, false); }); }

    tops.forEach(function (btn) {
      btn.addEventListener('click', function () {
        /* a hover just opened it: a click right after keeps it open */
        if (!MOBILE.matches && Date.now() - hoverAt < 700) { setOpen(btn, true); return; }
        var open = btn.getAttribute('aria-expanded') !== 'true';
        if (!MOBILE.matches) closeAll(btn);
        setOpen(btn, open);
      });
      var li = btn.parentNode;
      li.addEventListener('mouseenter', function () {
        if (MOBILE.matches || !window.matchMedia('(hover: hover)').matches) return;
        clearTimeout(hoverTimer); closeAll(btn);
        if (btn.getAttribute('aria-expanded') !== 'true') hoverAt = Date.now();
        setOpen(btn, true);
      });
      li.addEventListener('mouseleave', function () {
        if (MOBILE.matches || !window.matchMedia('(hover: hover)').matches) return;
        hoverTimer = setTimeout(function () { setOpen(btn, false); }, 180);
      });
      li.addEventListener('focusout', function (e) {
        if (MOBILE.matches) return;
        if (!li.contains(e.relatedTarget)) setOpen(btn, false);
      });
    });

    document.addEventListener('click', function (e) {
      if (!MOBILE.matches && !header.contains(e.target)) closeAll();
    });

    /* Mobile menu */
    function setMenu(open) {
      if (!menuBtn) return;
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.setAttribute('data-open', String(open));
      document.documentElement.classList.toggle('bh-lock', open);
      if (open) { var f = nav.querySelector('a,button'); if (f) f.focus(); }
    }
    if (menuBtn) {
      menuBtn.addEventListener('click', function () {
        setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
      });
    }

    /* Keyboard: Escape closes; Tab stays inside the open mobile menu */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var openTop = tops.filter(function (b) { return b.getAttribute('aria-expanded') === 'true'; })[0];
        if (MOBILE.matches && menuBtn && menuBtn.getAttribute('aria-expanded') === 'true') {
          setMenu(false); menuBtn.focus();
        } else if (openTop) { setOpen(openTop, false); openTop.focus(); }
        return;
      }
      if (e.key === 'Tab' && MOBILE.matches && menuBtn && menuBtn.getAttribute('aria-expanded') === 'true') {
        var items = [menuBtn].concat([].slice.call(nav.querySelectorAll('a,button')).filter(function (el) {
          return el.offsetParent !== null;
        }));
        var first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    /* Reset state when crossing the breakpoint */
    var onChange = function () { closeAll(); setMenu(false); };
    if (MOBILE.addEventListener) MOBILE.addEventListener('change', onChange);
    else if (MOBILE.addListener) MOBILE.addListener(onChange);

    /* aria-current on the current page's link; mark its top-level item */
    [].slice.call(header.querySelectorAll('a[href]')).forEach(function (a) {
      var p = a.getAttribute('href');
      if (!p || p.charAt(0) !== '/') return;
      if ((p.replace(/\/+$/, '') || '/') === path && !a.classList.contains('bh-logo')) {
        a.setAttribute('aria-current', 'page');
        var li = a.closest('.bh-nav > ul > li');
        var top = li && li.querySelector('.bh-top');
        if (top && top !== a) top.setAttribute('aria-current', 'page');
      }
    });
  }

  /* ---------------- Tracking ----------------
     GTM-WMSLD3VX already tracks Schedule a Conversation, tel: and mailto:
     clicks with its own link-click triggers, and /thank-you and
     /booking-confirmed push generate_lead / appointment_booked inline.
     This script only remembers which business line the visitor picked on
     the contact form, so the /thank-you push can carry inquiry_type
     (see docs/stage1/STAGE1-LAUNCH.md for that 3-line snippet).
     The GHL form renders inline on the page, not in an iframe.        */
  function initTracking() {
    if (document.documentElement.getAttribute('data-bh-track')) return;
    document.documentElement.setAttribute('data-bh-track', '1');
    document.addEventListener('submit', remember, true);
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button[type="submit"], .form-builder button, button.btn-submit');
      if (b) remember();
    }, true);
  }
  function remember() {
    var v = '';
    var sel = document.querySelector('.multiselect__single');
    if (sel) v = sel.textContent.trim();
    if (!v) {
      var hidden = document.querySelector('input[name="JX06gcQGN6gFbfrDACmv"]');
      if (hidden && hidden.value) v = hidden.value.trim();
    }
    try { if (v) sessionStorage.setItem('bh_inquiry_type', v); } catch (err) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
