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
