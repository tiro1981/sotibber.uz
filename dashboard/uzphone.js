/* =========================================================
   sotibber.uz — O'zbekiston telefon maydoni
   Barcha type="tel" maydonlarga: +998 avtomatik + 9 raqamgacha
   Format: +998 90 123 45 67
========================================================= */
(function () {
  'use strict';

  // Raqamni O'zbekiston formatiga keltiradi (+998 XX XXX XX XX)
  function formatUzPhone(raw) {
    let d = String(raw == null ? '' : raw).replace(/\D/g, '');
    if (d.indexOf('998') === 0) d = d.slice(3);   // oldingi 998 ni olib tashlaymiz
    d = d.slice(0, 9);                              // +998 dan keyin ko'pi bilan 9 raqam
    let out = '+998';
    if (d.length > 0) out += ' ' + d.slice(0, 2);
    if (d.length > 2) out += ' ' + d.slice(2, 5);
    if (d.length > 5) out += ' ' + d.slice(5, 7);
    if (d.length > 7) out += ' ' + d.slice(7, 9);
    return out;
  }
  // +998 dan keyingi raqamlar soni (validatsiya uchun)
  function uzPhoneDigits(raw) {
    let d = String(raw == null ? '' : raw).replace(/\D/g, '');
    if (d.indexOf('998') === 0) d = d.slice(3);
    return d.slice(0, 9).length;
  }
  function uzPhoneValid(raw) { return uzPhoneDigits(raw) === 9; }

  window.formatUzPhone = formatUzPhone;
  window.uzPhoneDigits = uzPhoneDigits;
  window.uzPhoneValid = uzPhoneValid;

  function isPhone(el) { return el && el.tagName === 'INPUT' && el.type === 'tel'; }

  function init(el) {
    if (el.dataset._uzp) return;
    el.dataset._uzp = '1';
    el.setAttribute('inputmode', 'numeric');
    el.setAttribute('maxlength', '17'); // "+998 90 123 45 67"
    el.value = el.value && el.value.trim() ? formatUzPhone(el.value) : '+998 ';
  }

  // Jonli formatlash + fokusda +998 ni ta'minlash (delegatsiya orqali — dinamik formalar uchun ham)
  document.addEventListener('input', function (e) {
    if (isPhone(e.target)) e.target.value = formatUzPhone(e.target.value);
  });
  document.addEventListener('focusin', function (e) {
    if (isPhone(e.target) && (!e.target.value || !e.target.value.trim())) e.target.value = '+998 ';
  });
  // "+998 " dan orqaga o'chirishga yo'l qo'ymaymiz (prefiks saqlanadi)
  document.addEventListener('keydown', function (e) {
    if (!isPhone(e.target)) return;
    if ((e.key === 'Backspace' || e.key === 'Delete') && uzPhoneDigits(e.target.value) === 0) {
      e.preventDefault();
      e.target.value = '+998 ';
    }
  });

  // Mavjud va keyin qo'shiladigan (modal/forma) tel maydonlarini boshlash
  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('input[type="tel"]').forEach(init);
  }
  function start() {
    scan(document);
    try {
      var mo = new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          m.addedNodes.forEach(function (n) {
            if (n.nodeType !== 1) return;
            if (isPhone(n)) init(n); else scan(n);
          });
        });
      });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch (e) { /* MutationObserver yo'q bo'lsa — jimgina o'tamiz */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
