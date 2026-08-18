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

  /* -------------------- Til tanlash + tarjima (UZ / RU / EN) --------------------
     Bosilganda menyu ochiladi; til tanlanadi, localStorage'ga saqlanadi
     (dashboard/login bilan bir xil "sotibber_lang" kaliti) va butun landing
     matni tanlangan tilda ko'rsatiladi. [data-i18n] = textContent,
     [data-i18n-html] = innerHTML (ichida <span>/<br> bo'lgan sarlavhalar). */
  var I18N = {
    nav_how:       { uz: 'Qanday ishlaydi?', ru: 'Как это работает?', en: 'How it works?' },
    nav_features:  { uz: 'Imkoniyatlar', ru: 'Возможности', en: 'Features' },
    nav_process:   { uz: 'Jarayon', ru: 'Процесс', en: 'Process' },
    nav_login:     { uz: 'Kirish', ru: 'Вход', en: 'Log in' },

    hero_badge:    { uz: "O'zbekistondagi #1 dropshipping platformasi", ru: 'Платформа дропшиппинга №1 в Узбекистане', en: "Uzbekistan's #1 dropshipping platform" },
    hero_title:    {
      uz: 'Sarmoyasiz biznesni<br class="hidden sm:block" /><span class="text-grad-violet">daromadga aylantiring.</span>',
      ru: 'Бизнес без вложений<br class="hidden sm:block" /><span class="text-grad-violet">превратите в доход.</span>',
      en: 'Turn a no-investment business<br class="hidden sm:block" /><span class="text-grad-violet">into income.</span>',
    },
    hero_sub:      {
      uz: "Sotuvchilar mahsulotini yuklaydi, sotib beruvchilar esa ijtimoiy tarmoqlarda (Telegram, Instagram, TikTok) sotib, har bir buyurtmadan ulush oladi.",
      ru: 'Продавцы загружают товары, а реселлеры продают их в соцсетях (Telegram, Instagram, TikTok) и получают долю с каждого заказа.',
      en: 'Sellers upload products, and resellers sell them on social media (Telegram, Instagram, TikTok), earning a share from every order.',
    },
    hero_start:    { uz: 'Boshlash', ru: 'Начать', en: 'Get started' },
    hero_login:    { uz: 'Hisobga kirish', ru: 'Войти в аккаунт', en: 'Log in' },

    mock_panel:    { uz: 'Boshqaruv paneli', ru: 'Панель управления', en: 'Dashboard' },
    mock_new:      { uz: 'Yangi', ru: 'Новое', en: 'New' },
    mock_income:   { uz: 'Bu oy daromad', ru: 'Доход за месяц', en: "This month's income" },
    mock_balance:  { uz: 'Joriy balans', ru: 'Текущий баланс', en: 'Current balance' },
    mock_withdraw: { uz: 'Yechib olish', ru: 'Вывести', en: 'Withdraw' },
    mock_active:   { uz: 'Faol buyurtmalar', ru: 'Активные заказы', en: 'Active orders' },
    mock_p1:       { uz: 'Krossovka', ru: 'Кроссовки', en: 'Sneakers' },
    mock_p2:       { uz: 'Soatlar', ru: 'Часы', en: 'Watches' },
    mock_p3:       { uz: 'Sumka', ru: 'Сумка', en: 'Bag' },

    logos_title:   { uz: 'Ilhomlantiruvchi natijalar', ru: 'Впечатляющие результаты', en: 'Inspiring results' },
    logos_sub:     { uz: 'Startaplardan yirik bizneslargacha ishonch bilan tanlaydi', ru: 'От стартапов до крупного бизнеса — выбирают с доверием', en: 'Trusted by startups to large businesses' },

    feat_badge:    { uz: 'Imkoniyatlar', ru: 'Возможности', en: 'Features' },
    feat_title:    {
      uz: 'Savdoni <span class="text-grad-violet">soddalashtiruvchi</span> kuchli vositalar',
      ru: 'Мощные инструменты, <span class="text-grad-violet">упрощающие</span> торговлю',
      en: 'Powerful tools that <span class="text-grad-violet">simplify</span> selling',
    },
    feat_sub:      { uz: 'Platformamiz mahsuldorligingizni oshiradi va kundalik ishingizni yengillashtiradi.', ru: 'Наша платформа повышает продуктивность и облегчает ежедневную работу.', en: 'Our platform boosts your productivity and eases your daily work.' },
    feat1_title:   { uz: 'Nol sarmoya bilan boshlash', ru: 'Старт без вложений', en: 'Start with zero investment' },
    feat1_desc:    { uz: "Sotib beruvchilar uchun mutlaqo bepul. Ombor, tovar yoki boshlang'ich kapital talab qilinmaydi — faqat telefoningiz kifoya.", ru: 'Полностью бесплатно для реселлеров. Не нужны склад, товар или стартовый капитал — достаточно телефона.', en: 'Completely free for resellers. No warehouse, inventory, or startup capital needed — just your phone.' },
    feat2_title:   { uz: 'Tayyor havolalar', ru: 'Готовые ссылки', en: 'Ready-made links' },
    feat2_desc:    { uz: "Telegram va Instagram uchun tayyor linklar. Xaridor bossa — to'g'ridan-to'g'ri shaxsiy do'koningizga o'tadi.", ru: 'Готовые ссылки для Telegram и Instagram. Покупатель нажимает — и попадает прямо в ваш магазин.', en: 'Ready links for Telegram and Instagram. When a buyer clicks, they go straight to your personal store.' },
    feat2_link1:   { uz: 'Link yaratish', ru: 'Создать ссылку', en: 'Create link' },
    feat2_link2:   { uz: "Do'kon topish", ru: 'Найти магазин', en: 'Find store' },
    feat2_link3:   { uz: 'Ulashildi', ru: 'Поделились', en: 'Shared' },
    feat3_q:       { uz: "Mahsulot qaysi turkumga mo'ljallangan?", ru: 'К какой категории относится товар?', en: 'Which category is the product for?' },
    feat3_cat1:    { uz: 'Kiyim', ru: 'Одежда', en: 'Clothing' },
    feat3_cat2:    { uz: 'Texnika', ru: 'Техника', en: 'Electronics' },
    feat3_cat3:    { uz: 'Aksessuar', ru: 'Аксессуары', en: 'Accessories' },
    feat3_title:   { uz: 'Mahsulotni bir zumda yuklang', ru: 'Загрузите товар в один миг', en: 'Upload a product in an instant' },
    feat3_desc:    { uz: "Rasm, tavsif, narx va komissiya — hammasi bir joyda. Bir necha soniyada do'koningiz onlaynda.", ru: 'Фото, описание, цена и комиссия — всё в одном месте. Ваш магазин онлайн за секунды.', en: 'Photo, description, price and commission — all in one place. Your store is online in seconds.' },
    feat4_b1:      { uz: 'Buyurtma tasdiqlandi', ru: 'Заказ подтверждён', en: 'Order confirmed' },
    feat4_b2:      { uz: "Balans to'ldirildi ✓", ru: 'Баланс пополнен ✓', en: 'Balance topped up ✓' },
    feat4_title:   { uz: "Ishonchli to'lovlar", ru: 'Надёжные выплаты', en: 'Reliable payments' },
    feat4_desc:    { uz: "Muvaffaqiyatli buyurtmadan so'ng pullar darhol balansingizda aks etadi. Xavfsiz va shaffof hisob-kitob.", ru: 'После успешного заказа деньги сразу отражаются на балансе. Безопасные и прозрачные расчёты.', en: 'After a successful order, funds appear on your balance instantly. Safe and transparent settlements.' },

    how_title:     { uz: 'Qanday ishlaydi?', ru: 'Как это работает?', en: 'How it works?' },
    how_sub:       { uz: "Ikkala tomon uchun ham oddiy va foydali. O'zingizga mos rolni tanlang.", ru: 'Просто и выгодно для обеих сторон. Выберите подходящую роль.', en: 'Simple and beneficial for both sides. Choose the role that fits you.' },
    how_tab_seller:{ uz: 'Sotuvchilar uchun', ru: 'Для продавцов', en: 'For sellers' },
    how_tab_aff:   { uz: 'Sotib beruvchilar uchun', ru: 'Для реселлеров', en: 'For resellers' },
    seller1_title: { uz: 'Mahsulotni yuklang', ru: 'Загрузите товар', en: 'Upload a product' },
    seller1_desc:  { uz: "Mahsulotingizni yuklang va narxini belgilang. Rasm, tavsif va zaxira — hammasi bir joyda.", ru: 'Загрузите товар и укажите цену. Фото, описание и остаток — всё в одном месте.', en: 'Upload your product and set the price. Photo, description and stock — all in one place.' },
    seller2_title: { uz: 'Komissiyani belgilang', ru: 'Задайте комиссию', en: 'Set the commission' },
    seller2_desc:  { uz: "Sotib beruvchilar uchun komissiya foizini belgilang. Yuqori foiz — ko'proq agent.", ru: 'Установите процент комиссии для реселлеров. Выше процент — больше агентов.', en: 'Set the commission percentage for resellers. Higher percentage — more agents.' },
    seller3_title: { uz: 'Daromadni oling', ru: 'Получайте доход', en: 'Earn income' },
    seller3_desc:  { uz: 'Buyurtmalarni qabul qiling va daromadni oling. Yuzlab agent siz uchun sotadi.', ru: 'Принимайте заказы и получайте доход. Сотни агентов продают за вас.', en: 'Accept orders and earn. Hundreds of agents sell for you.' },
    aff1_title:    { uz: 'Buyurtmani tanlang', ru: 'Выберите товар', en: 'Choose an order' },
    aff1_desc:     { uz: "O'zingizga yoqqan mahsulot buyurtmasini tanlang. Minglab mahsulot mavjud.", ru: 'Выберите понравившийся товар. Доступны тысячи товаров.', en: 'Pick a product you like. Thousands of products available.' },
    aff2_title:    { uz: 'Linkni ulashing', ru: 'Поделитесь ссылкой', en: 'Share the link' },
    aff2_desc:     { uz: "Sizga ochib berilgan shaxsiy do'kon linkini oling va ijtimoiy tarmoqlarga joylang.", ru: 'Получите персональную ссылку на магазин и разместите её в соцсетях.', en: 'Get your personal store link and post it on social media.' },
    aff3_title:    { uz: 'Ulushni oling', ru: 'Получайте долю', en: 'Get your share' },
    aff3_desc:     { uz: 'Har bir sotilgan mahsulotdan kafolatlangan ulushingizni hisobingizga oling.', ru: 'Получайте гарантированную долю с каждого проданного товара на свой счёт.', en: 'Receive your guaranteed share from every sold product to your account.' },

    proc_badge:    { uz: 'Ish jarayoni', ru: 'Рабочий процесс', en: 'Workflow' },
    proc_title:    {
      uz: 'Boshlash <span class="text-grad-violet">3 ta oddiy qadamda</span>',
      ru: 'Начните <span class="text-grad-violet">за 3 простых шага</span>',
      en: 'Get started <span class="text-grad-violet">in 3 simple steps</span>',
    },
    proc_sub:      { uz: "Ro'yxatdan o'tishdan birinchi daromadgacha — atigi bir necha daqiqa.", ru: 'От регистрации до первого дохода — всего несколько минут.', en: 'From sign-up to your first income — just a few minutes.' },
    proc_step1:    { uz: 'Qadam 01', ru: 'Шаг 01', en: 'Step 01' },
    proc_step2:    { uz: 'Qadam 02', ru: 'Шаг 02', en: 'Step 02' },
    proc_step3:    { uz: 'Qadam 03', ru: 'Шаг 03', en: 'Step 03' },
    proc1_title:   { uz: "Ro'yxatdan o'ting", ru: 'Зарегистрируйтесь', en: 'Sign up' },
    proc1_desc:    { uz: 'Bir daqiqada hisob oching — sotuvchi yoki sotib beruvchi rolini tanlang.', ru: 'Создайте аккаунт за минуту — выберите роль продавца или реселлера.', en: 'Create an account in a minute — choose the seller or reseller role.' },
    proc2_title:   { uz: 'Mahsulot yuklang yoki tanlang', ru: 'Загрузите или выберите товар', en: 'Upload or choose a product' },
    proc2_desc:    { uz: 'Sotuvchilar tovarini joylaydi, sotib beruvchilar tayyor mahsulotni tanlaydi.', ru: 'Продавцы размещают товар, реселлеры выбирают готовый.', en: 'Sellers list their goods, resellers pick ready-made products.' },
    proc3_title:   { uz: 'Soting va daromad oling', ru: 'Продавайте и зарабатывайте', en: 'Sell and earn' },
    proc3_desc:    { uz: 'Ijtimoiy tarmoqlarda ulashing, har bir buyurtmadan ulushingizni balansga oling.', ru: 'Делитесь в соцсетях и получайте долю с каждого заказа на баланс.', en: 'Share on social media and get your share from every order to your balance.' },

    faq_title:     { uz: "Ko'p beriladigan savollar", ru: 'Часто задаваемые вопросы', en: 'Frequently asked questions' },
    faq_sub:       { uz: 'Savollaringizga tez javoblar.', ru: 'Быстрые ответы на ваши вопросы.', en: 'Quick answers to your questions.' },
    faq1_q:        { uz: "Sotibber.uz saytidan pul chiqarish qanday bo'ladi?", ru: 'Как вывести деньги с Sotibber.uz?', en: 'How do I withdraw money from Sotibber.uz?' },
    faq1_a:        { uz: "Siz sotgan mahsulotingizdan kelgan daromadni bank kartangizga atigi 1% komissiya bilan osongina yechib olasiz. Jarayon bir necha daqiqa davom etadi.", ru: 'Доход с проданного товара легко выводится на банковскую карту с комиссией всего 1%. Процесс занимает несколько минут.', en: 'You can easily withdraw earnings from your sold products to your bank card with only a 1% fee. The process takes a few minutes.' },
    faq2_q:        { uz: "Mahsulot nosoz yoki razmeri noto'g'ri bo'lsa nima bo'ladi?", ru: 'Что если товар бракованный или не того размера?', en: 'What if a product is defective or the wrong size?' },
    faq2_a:        { uz: "Xaridor sotuvchi bilan to'g'ridan-to'g'ri bog'lanadi yoki platformamizning arbitraj tizimi orqali muammo adolatli hal qilinadi. Agentning obro'siga ziyon yetmaydi.", ru: 'Покупатель связывается с продавцом напрямую, либо вопрос решается справедливо через нашу систему арбитража. Репутация агента не страдает.', en: "The buyer contacts the seller directly, or the issue is resolved fairly through our arbitration system. The agent's reputation is not harmed." },

    cta_title:     { uz: 'Bugun boshlang — ertaga daromad oling', ru: 'Начните сегодня — зарабатывайте завтра', en: 'Start today — earn tomorrow' },
    cta_sub:       { uz: "Ro'yxatdan o'tish bepul. Bir necha daqiqada birinchi do'koningizni oching.", ru: 'Регистрация бесплатна. Откройте первый магазин за несколько минут.', en: 'Sign-up is free. Open your first store in a few minutes.' },
    cta_btn:       { uz: "Ro'yxatdan o'tish", ru: 'Зарегистрироваться', en: 'Sign up' },

    foot_tagline:  { uz: 'Sarmoyasiz biznes va cheksiz sotuvlar platformasi.', ru: 'Платформа бизнеса без вложений и безграничных продаж.', en: 'A platform for no-investment business and unlimited sales.' },
    foot_follow:   { uz: 'Bizni kuzatib boring', ru: 'Следите за нами', en: 'Follow us' },
    foot_rights:   { uz: '© 2026 sotibber.uz. Barcha huquqlar himoyalangan.', ru: '© 2026 sotibber.uz. Все права защищены.', en: '© 2026 sotibber.uz. All rights reserved.' },
    foot_terms:    { uz: 'Foydalanish shartlari', ru: 'Условия использования', en: 'Terms of use' },
    foot_privacy:  { uz: 'Maxfiylik siyosati', ru: 'Политика конфиденциальности', en: 'Privacy policy' },
  };

  (function initLang() {
    var KEY = 'sotibber_lang';
    var LABEL = { uz: "O'z", ru: 'Ру', en: 'En' };
    var langBtn = document.getElementById('langBtn');
    var langMenu = document.getElementById('langMenu');
    var langLabel = document.getElementById('langLabel');

    var lang = 'uz';
    try { lang = localStorage.getItem(KEY) || 'uz'; } catch (e) {}
    if (!LABEL[lang]) lang = 'uz';

    function applyI18n() {
      document.documentElement.lang = lang;
      document.querySelectorAll('[data-i18n]').forEach(function (el) {
        var k = el.getAttribute('data-i18n');
        if (I18N[k] && I18N[k][lang]) el.textContent = I18N[k][lang];
      });
      document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
        var k = el.getAttribute('data-i18n-html');
        if (I18N[k] && I18N[k][lang]) el.innerHTML = I18N[k][lang];
      });
      if (langLabel) langLabel.textContent = LABEL[lang];
      if (langMenu) langMenu.querySelectorAll('[data-lang]').forEach(function (o) {
        var on = o.dataset.lang === lang;
        o.classList.toggle('bg-white/5', on);
        o.classList.toggle('text-white', on);
        o.classList.toggle('text-slate-200', !on);
      });
    }
    function closeMenu() { if (langMenu) { langMenu.classList.add('hidden'); langBtn.setAttribute('aria-expanded', 'false'); } }

    applyI18n();
    if (langBtn && langMenu) {
      langBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var hidden = langMenu.classList.toggle('hidden');
        langBtn.setAttribute('aria-expanded', hidden ? 'false' : 'true');
      });
      langMenu.querySelectorAll('[data-lang]').forEach(function (o) {
        o.addEventListener('click', function () {
          lang = o.dataset.lang;
          try { localStorage.setItem(KEY, lang); } catch (e) {}
          applyI18n();
          closeMenu();
        });
      });
      document.addEventListener('click', function (e) {
        if (!langMenu.classList.contains('hidden') && !langMenu.contains(e.target) && !langBtn.contains(e.target)) closeMenu();
      });
    }
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
