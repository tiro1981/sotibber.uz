/* =========================================================
   sotibber.uz — Landing page logic
   Vanilla JavaScript (HTML + CSS + JS)
========================================================= */
(function () {
  'use strict';

  // Dashboardga o'tish: tanlangan rolga qarab panelni ochadi.
  // 'seller'  -> Sotuvchi paneli
  // 'affiliate' -> Sotib beruvchi paneli
  function goToDashboard(role) {
    // Tanlangan rolni bir necha usulda uzatamiz (turli muhitlarda ishlashi uchun):
    // 1) URL query (?panel=), 2) hash (#role), 3) localStorage.
    try { localStorage.setItem('sotibber_panel', role); } catch (e) {}
    window.location.href = '../dashboard/index.html?panel=' + encodeURIComponent(role) + '#' + role;
  }

  /* -------------------- Mobile menu toggle -------------------- */
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
  // Havola bosilganda mobil menyuni yopish
  mobileMenu.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => mobileMenu.classList.add('hidden'))
  );

  /* -------------------- Role selection modal -------------------- */
  const modal = document.getElementById('roleModal');
  let lastFocused = null;

  function openModal() {
    lastFocused = document.activeElement;
    modal.classList.remove('hidden-modal');
    document.body.style.overflow = 'hidden'; // scrollni bloklash
  }

  function closeModal() {
    modal.classList.add('hidden-modal');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  // [data-open-modal] tugmalari:
  //  - agar data-role bo'lsa (masalan hero tugmalari) -> to'g'ridan-to'g'ri o'sha panelga o'tadi
  //  - aks holda (Kirish / Ro'yxatdan o'tish) -> rol tanlash oynasini ochadi
  document.querySelectorAll('[data-open-modal]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const role = btn.getAttribute('data-role');
      if (role) {
        goToDashboard(role);
      } else {
        openModal();
      }
    });
  });

  // Yopish (backdrop + yopish tugmasi)
  document.querySelectorAll('[data-close-modal]').forEach((el) =>
    el.addEventListener('click', closeModal)
  );

  // Escape bosilganda yopish
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden-modal')) closeModal();
  });

  // Oyna ichida rol tanlash -> tegishli panelga o'tkazadi
  document.querySelectorAll('[data-role-choice]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const role = el.getAttribute('data-role-choice'); // 'seller' | 'affiliate'
      goToDashboard(role);
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
