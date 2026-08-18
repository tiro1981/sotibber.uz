/* =========================================================
   sotibber.uz — Landing page logic
   Vanilla JavaScript (HTML + CSS + JS)
========================================================= */
(function () {
  'use strict';

  /* -------------------- Mobile menu toggle -------------------- */
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
  // Havola bosilganda mobil menyuni yopish
  mobileMenu.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => mobileMenu.classList.add('hidden'))
  );

  /* -------------------- Til tanlash (UZ / RU / EN) --------------------
     Bosilganda menyu ochiladi; til tanlanadi va localStorage'ga saqlanadi
     (dashboard/login bilan bir xil "sotibber_lang" kaliti). Landing matni
     o'zgarmaydi — bu faqat platforma tilini belgilaydi. */
  (function initLang() {
    var KEY = 'sotibber_lang';
    var LABEL = { uz: "O'z", ru: 'Ру', en: 'En' };
    var langBtn = document.getElementById('langBtn');
    var langMenu = document.getElementById('langMenu');
    var langLabel = document.getElementById('langLabel');
    if (!langBtn || !langMenu) return;

    var lang = 'uz';
    try { lang = localStorage.getItem(KEY) || 'uz'; } catch (e) {}
    if (!LABEL[lang]) lang = 'uz';

    function paint() {
      if (langLabel) langLabel.textContent = LABEL[lang];
      document.documentElement.lang = lang;
      langMenu.querySelectorAll('[data-lang]').forEach(function (o) {
        var on = o.dataset.lang === lang;
        o.classList.toggle('bg-white/5', on);
        o.classList.toggle('text-white', on);
        o.classList.toggle('text-slate-200', !on);
      });
    }
    function closeMenu() { langMenu.classList.add('hidden'); langBtn.setAttribute('aria-expanded', 'false'); }

    paint();
    langBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = langMenu.classList.toggle('hidden');
      langBtn.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
    langMenu.querySelectorAll('[data-lang]').forEach(function (o) {
      o.addEventListener('click', function () {
        lang = o.dataset.lang;
        try { localStorage.setItem(KEY, lang); } catch (e) {}
        paint();
        closeMenu();
      });
    });
    document.addEventListener('click', function (e) {
      if (!langMenu.classList.contains('hidden') && !langMenu.contains(e.target) && !langBtn.contains(e.target)) closeMenu();
    });
  })();

  /* -------------------- Auth sahifasiga o'tish --------------------
     Rol (sotuvchi/sotib beruvchi) endi landing'da tanlanmaydi — u
     ro'yxatdan o'tgandan keyin login sahifasida tanlanadi. Shuning uchun
     tugmalar to'g'ridan-to'g'ri login/ro'yxatdan o'tish sahifasiga olib boradi. */
  document.querySelectorAll('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const dest = btn.getAttribute('data-goto') === 'register'
        ? '/dashboard/login.html?tab=register'
        : '/dashboard/login.html';
      window.location.href = dest;
    });
  });

  /* -------------------- "Qanday ishlaydi?" tabs -------------------- */
  const tabBtns = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('[data-panel]');

  function activateTab(name) {
    tabBtns.forEach((b) => {
      const active = b.dataset.tab === name;
      b.classList.toggle('btn-grad', active);
      b.classList.toggle('text-white', active);
      b.classList.toggle('text-slate-400', !active);
    });
    panels.forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== name));
  }

  tabBtns.forEach((b) => b.addEventListener('click', () => activateTab(b.dataset.tab)));
  activateTab('seller'); // boshlang'ich tab

  /* -------------------- FAQ accordion -------------------- */
  document.querySelectorAll('.faq-item').forEach((item) => {
    const trigger = item.querySelector('.faq-trigger');
    const answer = item.querySelector('.faq-answer');
    trigger.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // Bir vaqtda faqat bittasi ochiq bo'lishi uchun boshqalarini yopamiz
      document.querySelectorAll('.faq-item.open').forEach((other) => {
        if (other !== item) {
          other.classList.remove('open');
          other.querySelector('.faq-answer').style.maxHeight = null;
        }
      });
      item.classList.toggle('open', !isOpen);
      answer.style.maxHeight = isOpen ? null : answer.scrollHeight + 'px';
    });
  });

  /* -------------------- Reveal on scroll -------------------- */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
})();
