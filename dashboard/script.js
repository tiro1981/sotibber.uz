/* =========================================================
   sotibber.uz — Dashboard logic
   Vanilla JavaScript (HTML + CSS + JS)
   To'q "glass" mavzu — login/qonish sahifasi bilan bir xil.
   Panel (Sotuvchi / Sotib beruvchi) qo'nish sahifasidan
   ?panel= parametri orqali tanlanadi.
========================================================= */
  (function () {
    'use strict';

    /* =========================================================
       HELPERS
    ========================================================= */
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    // Format an integer as UZS with thousands separators
    const uzs = (n) => (Number(n) || 0).toLocaleString('ru-RU').replace(/,/g, ' ');

    // Xavfsiz HTML — foydalanuvchi kiritgan matnni ekranga chiqarishda
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // Status badge — maps Uzbek statuses to consistent colors (to'q mavzu).
    function badge(status) {
      const map = {
        // success
        'Yetkazildi': 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
        'Sotuvda': 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
        'Faol': 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
        'Bajarildi': 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
        'Chiqarishga tayyor': 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
        // in-transit / progress
        "Yo'lda": 'bg-blue-500/15 text-blue-300 ring-blue-500/30',
        'Yuborildi': 'bg-blue-500/15 text-blue-300 ring-blue-500/30',
        // pending
        'Yangi': 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
        'Kutilmoqda': 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
        'Moderatsiyada': 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
        // danger
        'Rad etildi': 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
        'Rad etilgan': 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
        'Tugagan': 'bg-white/10 text-slate-300 ring-white/15',
      };
      const cls = map[status] || 'bg-white/10 text-slate-300 ring-white/15';
      return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${cls}">${esc(status)}</span>`;
    }

    function toast(msg) {
      const el = $('#toast');
      $('#toastMsg').textContent = msg;
      el.classList.remove('hidden');
      el.firstElementChild.classList.add('animate-fadeUp');
      clearTimeout(toast._t);
      toast._t = setTimeout(() => el.classList.add('hidden'), 2600);
    }

    /* =========================================================
       TIL (i18n) — uz / ru / en. Faqat shu lug'atdagi satrlar
       tarjima qilinadi; qolganlari o'zbekcha qoladi.
    ========================================================= */
    let LANG = 'uz';
    try { LANG = localStorage.getItem('sotibber_lang') || 'uz'; } catch (e) {}
    const DICT = {
      ru: {
        'Bosh sahifa': 'Главная', 'Mahsulotlar': 'Товары', 'Buyurtmalar': 'Заказы', 'Sotib beruvchilar': 'Продавцы',
        'Xabarlar': 'Сообщения', 'Moliya': 'Финансы', 'Mahsulotlar bozori': 'Рынок товаров', "Mening do'konim": 'Мой магазин',
        'Messenjer': 'Мессенджер', 'Mening sotuvlarim': 'Мои продажи', 'Hamyon': 'Кошелёк',
        'Profilim': 'Мой профиль', 'Sozlamalar': 'Настройки', 'Chiqish': 'Выход', 'Bildirishnomalar': 'Уведомления',
        "Bildirishnoma yo'q": 'Нет уведомлений', 'Til': 'Язык', "Do'kon ID": 'ID магазина', 'Ism familiya': 'Имя и фамилия',
        'Telefon': 'Телефон', 'Email': 'Email', 'Saqlash': 'Сохранить', 'Bekor qilish': 'Отмена', 'Yopish': 'Закрыть',
        "Parolni o'zgartirish": 'Смена пароля', 'Yangi parol': 'Новый пароль', 'Parolni tasdiqlang': 'Подтвердите пароль',
        'Yangilash': 'Обновить', "O'zbekcha": 'Узбекский', 'Ruscha': 'Русский', 'Inglizcha': 'Английский',
      },
      en: {
        'Bosh sahifa': 'Home', 'Mahsulotlar': 'Products', 'Buyurtmalar': 'Orders', 'Sotib beruvchilar': 'Resellers',
        'Xabarlar': 'Messages', 'Moliya': 'Finance', 'Mahsulotlar bozori': 'Marketplace', "Mening do'konim": 'My shop',
        'Messenjer': 'Messenger', 'Mening sotuvlarim': 'My sales', 'Hamyon': 'Wallet',
        'Profilim': 'My profile', 'Sozlamalar': 'Settings', 'Chiqish': 'Log out', 'Bildirishnomalar': 'Notifications',
        "Bildirishnoma yo'q": 'No notifications', 'Til': 'Language', "Do'kon ID": 'Shop ID', 'Ism familiya': 'Full name',
        'Telefon': 'Phone', 'Email': 'Email', 'Saqlash': 'Save', 'Bekor qilish': 'Cancel', 'Yopish': 'Close',
        "Parolni o'zgartirish": 'Change password', 'Yangi parol': 'New password', 'Parolni tasdiqlang': 'Confirm password',
        'Yangilash': 'Update', "O'zbekcha": 'Uzbek', 'Ruscha': 'Russian', 'Inglizcha': 'English',
      },
    };
    function t(s) { return (LANG !== 'uz' && DICT[LANG] && DICT[LANG][s]) || s; }
    function applyI18n() { $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); }); }

    /* =========================================================
       DATA
       Backend/API ulanguncha bu massivlar bo'sh boshlanadi —
       real hisob ochilgach yoki server ulanganda shu yerga
       haqiqiy ma'lumotlar keladi.
    ========================================================= */
    // Supabase'dan (dashboard/app-init.js orqali) oldindan yuklab qo'yilgan
    // ma'lumotlar bo'lsa, o'sha bilan boshlaymiz — bo'lmasa bo'sh massiv.
    const merchantProducts = Array.isArray(window.__SOTIBBER_PRODUCTS) ? window.__SOTIBBER_PRODUCTS : [];

    // Sotuvchining buyurtmalari — app-init.js orqali orders jadvalidan yuklanadi
    const merchantOrders = Array.isArray(window.__SOTIBBER_ORDERS) ? window.__SOTIBBER_ORDERS : [];

    const merchantTx = [];

    // Barcha sotuvchilarning sklad mavjud mahsulotlari — app-init.js orqali
    // Supabase'dan oldindan yuklanadi (dashboard/index.html ochilganda).
    let marketProducts = Array.isArray(window.__SOTIBBER_MARKET_PRODUCTS) ? window.__SOTIBBER_MARKET_PRODUCTS : [];

    // Sotib beruvchining do'konidagi mahsulotlar (affiliate_products)
    const agentLinks = Array.isArray(window.__SOTIBBER_AGENT_LINKS) ? window.__SOTIBBER_AGENT_LINKS : [];

    // Sotib beruvchining sotuvlari (orders)
    const agentSales = Array.isArray(window.__SOTIBBER_SALES) ? window.__SOTIBBER_SALES : [];

    // Sotuvchi: mahsulotlarimni kim do'koniga qo'shgan (sotib beruvchilar)
    const myResellers = Array.isArray(window.__SOTIBBER_MY_RESELLERS) ? window.__SOTIBBER_MY_RESELLERS : [];

    // Mahsulot kategoriyalari
    const CATEGORIES = ['Elektronika', 'Kiyim-kechak', 'Poyabzal', "Go'zallik", "Uy-ro'zg'or", 'Oziq-ovqat', 'Bolalar', 'Sport', 'Aksessuar', 'Boshqa'];
    let marketQuery = '';
    let marketCategory = 'Barchasi';
    let messengerSel = 'instagram';   // Messenjer bo'limida tanlangan platforma

    // Do'kon tartib raqamini 4 xonali qilib formatlaymiz (1 -> 0001)
    function shopIdStr(no) { return (no == null || no === '') ? '' : String(no).padStart(4, '0'); }

    // Do'kon havolasi. Raqam (shop_no) bo'lsa — shop.html?id=0001 (afzal),
    // bo'lmasa eski slug bilan (shop.html?s=<slug>).
    function shopUrls() {
      const profile = window.__SOTIBBER_PROFILE || {};
      const id = shopIdStr(profile.shop_no);
      const slug = profile.shop_slug || '';
      let param = '';
      if (id) param = 'id=' + id;
      else if (slug) param = 's=' + encodeURIComponent(slug);
      if (!param) return { slug: '', id: '', full: '', display: '' };
      const full = new URL('shop.html?' + param, window.location.href).href;
      const display = full.replace(/^https?:\/\//, '');
      return { slug, id, full, display };
    }

    // Ism/matndan do'kon "slug"i (lotin harf + raqam)
    function slugify(s) {
      const map = { 'ш': 'sh', 'ч': 'ch', 'ў': 'o', 'ғ': 'g', 'қ': 'q', 'ҳ': 'h', 'я': 'ya', 'ю': 'yu', 'ъ': '', 'ь': '', 'ё': 'yo', 'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'x', 'ц': 'ts', 'э': 'e', "'": '', 'ʻ': '', '`': '' };
      return String(s || '').toLowerCase().split('').map((c) => (map[c] !== undefined ? map[c] : c)).join('')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'dokon';
    }

    // Do'kon havolasini talab bo'yicha yaratamiz (profiles.shop_slug)
    async function createShopLink(btn) {
      const user = window.__SOTIBBER_USER;
      if (!user || !window.sb) { toast('Tizimga qayta kiring'); return; }
      const profile = window.__SOTIBBER_PROFILE || {};
      const base = slugify(profile.full_name || (user.email || '').split('@')[0] || 'dokon');
      const shopName = profile.shop_name || (profile.full_name ? profile.full_name + " do'koni" : "Mening do'konim");
      if (btn) { btn.disabled = true; btn.textContent = 'Yaratilmoqda...'; }

      // 1) Avval do'kon raqamini olishga urinamiz (assign_shop_no RPC)
      try {
        const { data, error } = await window.sb.rpc('assign_shop_no');
        if (!error && data != null) {
          window.__SOTIBBER_PROFILE = Object.assign({}, profile, { shop_no: data });
          toast('Do\'kon havolasi tayyor ✓');
          renderView();
          return;
        }
      } catch (e) { /* funksiya yo'q bo'lishi mumkin — slug bilan davom etamiz */ }

      // 2) Fallback: slug (eski usul)
      for (let i = 0; i < 4; i++) {
        const candidate = base + '-' + Math.random().toString(36).slice(2, 6);
        const { data, error } = await window.sb.from('profiles')
          .upsert({ id: user.id, shop_slug: candidate, shop_name: shopName }, { onConflict: 'id' })
          .select().single();
        if (!error) {
          window.__SOTIBBER_PROFILE = Object.assign({}, profile, data);
          toast('Do\'kon havolasi tayyor ✓');
          renderView();
          return;
        }
        // Ustun yo'q — SQL ishga tushirilmagan
        if (/shop_slug|column .* does not exist|schema cache/i.test(error.message || '')) {
          toast("Supabase'da SQL ishga tushiring — profiles jadvalida 'shop_slug' ustuni yo'q");
          break;
        }
        // Band slug — qayta urinamiz
        if (!/duplicate|unique|23505/i.test(error.message || '')) {
          console.error('Havola yaratish:', error);
          toast('Xatolik: ' + (error.message || 'havola yaratilmadi'));
          break;
        }
      }
      if (btn) { btn.disabled = false; btn.textContent = 'Havolani yaratish'; }
    }

    // Simple 7-day sales chart data (relative heights in %)
    const chartData = [
      { d: 'Du', v: 0 }, { d: 'Se', v: 0 }, { d: 'Ch', v: 0 }, { d: 'Pa', v: 0 },
      { d: 'Ju', v: 0 }, { d: 'Sh', v: 0 }, { d: 'Ya', v: 0 },
    ];

    /* =========================================================
       ICONS (inline SVG strings)
    ========================================================= */
    const icon = {
      home: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10"/>',
      box: '<path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>',
      cart: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 4.6A1 1 0 005.6 19H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>',
      wallet: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M3 10a2 2 0 012-2h14a2 2 0 012 2m-18 0v8a2 2 0 002 2h14a2 2 0 002-2v-8M17 15h.01"/>',
      store: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 9l1-5h16l1 5M3 9v11a1 1 0 001 1h16a1 1 0 001-1V9M3 9h18M9 21v-6h6v6"/>',
      link: '<path stroke-linecap="round" stroke-linejoin="round" d="M13.83 10.17a4 4 0 00-5.66 0l-4 4a4 4 0 105.66 5.66l1.1-1.1m-.76-4.9a4 4 0 005.66 0l4-4a4 4 0 00-5.66-5.66l-1.1 1.1"/>',
      chart: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 3v18h18M7 15l3-4 3 3 5-7"/>',
      shop: '<path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 11a1 1 0 01-1 1H5a1 1 0 01-1-1L5 9z"/>',
      chat: '<path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l.8-4.2A7.9 7.9 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>',
      insta: '<rect x="3" y="3" width="18" height="18" rx="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none"/>',
      telegram: '<path stroke-linecap="round" stroke-linejoin="round" d="M21.5 4.5l-19 7.2 5.4 1.9 2 6 2.9-3.4 4.6 3.3zM7.9 13.6L18 6.5"/>',
      facebook: '<path stroke-linecap="round" stroke-linejoin="round" d="M15 3h-2.5A3.5 3.5 0 009 6.5V9H6.5v3H9v9h3v-9h2.5l.5-3H12V6.5a.5.5 0 01.5-.5H15z"/>',
      tiktok: '<path stroke-linecap="round" stroke-linejoin="round" d="M14 4c.3 2.8 2.2 4.7 5 5v3c-1.9 0-3.6-.6-5-1.7V15a5.5 5.5 0 11-5.5-5.5c.35 0 .7.03 1 .09v3.1a2.5 2.5 0 101.5 2.31V4z"/>',
      youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.5 9.3l5 2.7-5 2.7z" fill="currentColor" stroke="none"/>',
      users: '<path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z"/>',
    };

    function navIcon(path) {
      return `<svg class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9">${path}</svg>`;
    }

    // Placeholder rasm (rasm bo'lmaganda) — to'q mavzu uchun
    function imgPlaceholder(size = 'h-14 w-14') {
      return `<svg class="${size} text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3">${icon.box}</svg>`;
    }

    /* =========================================================
       NAVIGATION CONFIG (per panel)
    ========================================================= */
    const NAV = {
      seller: {
        label: 'Sotuvchi Paneli',
        role: 'Sotuvchi',
        items: [
          { id: 'dashboard', title: 'Bosh sahifa', icon: icon.home },
          { id: 'products', title: 'Mahsulotlar', icon: icon.box },
          { id: 'orders', title: 'Buyurtmalar', icon: icon.cart },
          { id: 'resellers', title: 'Sotib beruvchilar', icon: icon.users },
          { id: 'messages', title: 'Xabarlar', icon: icon.chat },
          { id: 'finance', title: 'Moliya', icon: icon.wallet },
        ],
      },
      affiliate: {
        label: 'Sotib beruvchi Paneli',
        role: 'Sotib beruvchi',
        items: [
          { id: 'dashboard', title: 'Bosh sahifa', icon: icon.home },
          { id: 'market', title: 'Mahsulotlar bozori', icon: icon.store },
          { id: 'shop', title: "Mening do'konim", icon: icon.shop },
          { id: 'messenger', title: 'Messenjer', icon: icon.insta },
          { id: 'messages', title: 'Xabarlar', icon: icon.chat },
          { id: 'sales', title: 'Mening sotuvlarim', icon: icon.chart },
          { id: 'wallet', title: 'Hamyon', icon: icon.wallet },
        ],
      },
    };

    /* =========================================================
       SHARED UI PARTIALS
    ========================================================= */
    // Summary/stat card
    function statCard({ label, value, sub, accent = 'violet', badgeText, trend, icon: ic }) {
      const accents = {
        violet: 'from-violet-brand to-violet-deep',
        indigo: 'from-violet-brand to-violet-deep',
        emerald: 'from-emerald-500 to-teal-500',
        blue: 'from-blue-500 to-indigo-500',
        amber: 'from-amber-500 to-orange-500',
      };
      return `
      <div class="glass glass-hover rounded-2xl p-5 transition">
        <div class="flex items-start justify-between">
          <div class="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${accents[accent] || accents.violet} text-white shadow-lg shadow-violet-500/20">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">${ic}</svg>
          </div>
          ${badgeText ? badge(badgeText) : (trend ? `<span class="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-300"><svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>${trend}</span>` : '')}
        </div>
        <p class="mt-4 text-sm font-medium text-slate-400">${label}</p>
        <p class="font-display mt-1 text-2xl font-bold tracking-tight text-white">${value}</p>
        ${sub ? `<p class="mt-1 text-xs text-slate-500">${sub}</p>` : ''}
      </div>`;
    }

    // Bar chart (pure Tailwind/CSS)
    function barChart() {
      const bars = chartData.map((c) => `
        <div class="group flex h-full flex-1 flex-col items-center justify-end gap-2">
          <div class="relative w-full max-w-[38px] rounded-t-lg bg-gradient-to-t from-violet-brand to-emerald-400 transition-all duration-500 hover:opacity-90" style="height:${c.v}%">
            <span class="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">${uzs(c.v * 12000)}</span>
          </div>
          <span class="text-xs font-medium text-slate-500">${c.d}</span>
        </div>`).join('');
      return `<div class="flex h-48 items-end gap-2 sm:gap-4">${bars}</div>`;
    }

    // Page section wrapper (glass)
    function card(inner, extra = '') {
      return `<div class="glass rounded-2xl ${extra}">${inner}</div>`;
    }

    // Mahsulot kartasi rasm blogi — bir xil ko'rinishli, chiroyli.
    // images: massiv (0..5). count-badge bir nechta rasm bo'lsa ko'rsatiladi.
    // Kartadagi rasm(lar). Bir nechta bo'lsa — suriladigan (swipe) lenta:
    // barcha rasmlar chapga-o'ngga surib ko'riladi.
    function productMedia(images, name, ratio = 'aspect-[4/3]') {
      const list = Array.isArray(images) ? images.filter(Boolean) : [];
      if (!list.length) {
        return `<div class="relative ${ratio} w-full overflow-hidden bg-gradient-to-br from-white/10 to-white/[0.02]"><div class="grid h-full w-full place-items-center">${imgPlaceholder('h-16 w-16')}</div></div>`;
      }
      if (list.length === 1) {
        return `<div class="relative ${ratio} w-full overflow-hidden bg-gradient-to-br from-white/10 to-white/[0.02]"><img src="${esc(list[0])}" alt="${esc(name)}" loading="lazy" class="h-full w-full object-cover" /></div>`;
      }
      return `
        <div class="relative ${ratio} w-full overflow-hidden bg-black/20">
          <div class="no-scrollbar flex h-full w-full snap-x snap-mandatory overflow-x-auto">
            ${list.map((src) => `<img src="${esc(src)}" alt="${esc(name)}" loading="lazy" class="h-full w-full flex-shrink-0 snap-center object-cover" />`).join('')}
          </div>
          <span class="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg bg-black/55 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z"/></svg>${list.length}
          </span>
        </div>`;
    }

    /* =========================================================
       MERCHANT VIEWS
    ========================================================= */
    const sellerViews = {
      dashboard: () => `
        <div class="view-enter space-y-6">
          <!-- Summary cards -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            ${statCard({ label: 'Umumiy balans', value: uzs(0) + ' so\'m', accent: 'emerald', icon: icon.wallet })}
            ${statCard({ label: 'Muzlatilgan balans (Escrow)', value: uzs(0) + ' so\'m', sub: 'Yetkazilgach ochiladi', accent: 'blue', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>' })}
            ${statCard({ label: 'Jami buyurtmalar', value: '0', accent: 'violet', icon: icon.cart })}
            ${statCard({ label: 'Muvaffaqiyatli sotuvlar', value: '0%', sub: '0 ta yetkazildi', accent: 'emerald', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>' })}
          </div>

          <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <!-- Chart -->
            ${card(`
              <div class="p-5 sm:p-6">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="font-display text-base font-bold text-white">Sotuvlar dinamikasi</h3>
                    <p class="text-sm text-slate-400">So'nggi 7 kun</p>
                  </div>
                </div>
                <div class="mt-6">${barChart()}</div>
              </div>`, 'lg:col-span-2')}

            <!-- Activity feed -->
            ${card(`
              <div class="p-5 sm:p-6">
                <h3 class="font-display text-base font-bold text-white">So'nggi harakatlar</h3>
                <div class="mt-6 flex flex-col items-center justify-center py-6 text-center">
                  <span class="grid h-11 w-11 place-items-center rounded-full bg-white/5 text-slate-400">
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </span>
                  <p class="mt-3 text-sm font-medium text-slate-400">Hali harakatlar yo'q</p>
                  <p class="mt-1 text-xs text-slate-500">Birinchi buyurtma yoki tranzaksiya shu yerda ko'rinadi</p>
                </div>
              </div>`)}
          </div>
        </div>`,

      products: () => `
        <div class="view-enter space-y-5">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="font-display text-lg font-bold text-white">Mahsulotlar (Sklad)</h2>
              <p class="text-sm text-slate-400">Jami ${merchantProducts.length} ta mahsulot</p>
            </div>
            <button data-action="add-product" class="btn-grad inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition active:scale-95">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
              Yangi mahsulot qo'shish
            </button>
          </div>

          <!-- Product cards grid -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            ${merchantProducts.map((p, i) => `
              <div class="glass glass-hover group overflow-hidden rounded-2xl transition hover:-translate-y-0.5">
                <div class="relative">
                  ${productMedia(p.images, p.name)}
                  <div class="absolute right-3 top-3 z-10">${badge(p.status)}</div>
                </div>
                <div class="p-4">
                  <button data-product-detail="${i}" class="block w-full truncate text-left font-bold text-white hover:text-violet-300">${esc(p.name)}</button>
                  <div class="mt-2 flex items-center justify-between">
                    <span class="font-display text-lg font-bold text-white">${uzs(p.price)} <span class="text-xs font-medium text-slate-500">so'm</span></span>
                    <span class="text-xs font-medium text-slate-400">Sklad: <b class="${p.stock === 0 ? 'text-rose-400' : 'text-slate-200'}">${p.stock}</b></span>
                  </div>
                  <div class="mt-3 flex items-center justify-between rounded-xl bg-emerald-500/10 px-3 py-2 ring-1 ring-emerald-500/20">
                    <span class="text-xs font-medium text-emerald-300">Komissiya</span>
                    <span class="text-sm font-bold text-emerald-300">${p.commission}% (${uzs(Math.round(p.price * p.commission / 100))} so'm)</span>
                  </div>
                  <div class="mt-3 flex gap-2">
                    <button data-product-detail="${i}" class="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10">Ko'rish</button>
                    <button class="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10">Statistika</button>
                  </div>
                </div>
              </div>`).join('') || `
              <div class="glass col-span-full flex flex-col items-center justify-center rounded-2xl border-dashed py-14 text-center">
                <span class="grid h-12 w-12 place-items-center rounded-full bg-white/5 text-slate-400">
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">${icon.box}</svg>
                </span>
                <p class="mt-3 text-sm font-semibold text-slate-300">Hali mahsulot qo'shilmagan</p>
                <p class="mt-1 max-w-xs text-xs text-slate-500">Birinchi mahsulotingizni qo'shish uchun yuqoridagi tugmani bosing</p>
              </div>`}
          </div>
        </div>`,

      orders: () => {
        const tabs = ['Barchasi', 'Yangi', "Yo'lda", 'Yetkazildi', 'Rad etildi'];
        return `
        <div class="view-enter space-y-5" id="ordersView">
          <div>
            <h2 class="font-display text-lg font-bold text-white">Buyurtmalar</h2>
            <p class="text-sm text-slate-400">Barcha buyurtmalarni boshqaring</p>
          </div>

          <!-- Filter tabs -->
          <div class="flex flex-wrap gap-2 overflow-x-auto">
            ${tabs.map((t, i) => `<button data-order-tab="${t}" class="order-tab whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${i === 0 ? 'btn-grad text-white' : 'bg-white/5 text-slate-300 ring-1 ring-white/10 hover:bg-white/10'}">${t}</button>`).join('')}
          </div>

          <!-- Table -->
          ${card(`
            <div class="overflow-x-auto">
              <table class="w-full min-w-[820px] text-left text-sm">
                <thead class="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="px-4 py-3 font-semibold">Buyurtma ID</th>
                    <th class="px-4 py-3 font-semibold">Mahsulot</th>
                    <th class="px-4 py-3 font-semibold">Mijoz tel.</th>
                    <th class="px-4 py-3 font-semibold">Agent</th>
                    <th class="px-4 py-3 font-semibold">Komissiya</th>
                    <th class="px-4 py-3 font-semibold">Summa</th>
                    <th class="px-4 py-3 font-semibold">Sana</th>
                    <th class="px-4 py-3 font-semibold">Holat</th>
                    <th class="px-4 py-3 text-right font-semibold">Amallar</th>
                  </tr>
                </thead>
                <tbody id="ordersBody" class="divide-y divide-white/5"></tbody>
              </table>
            </div>`)}
        </div>`;
      },

      finance: () => `
        <div class="view-enter space-y-6">
          <h2 class="font-display text-lg font-bold text-white">Moliya</h2>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <!-- Balance card -->
            <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-deep via-violet-brand to-emerald-500 p-6 text-white shadow-xl shadow-violet-500/20 lg:col-span-2">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-sm text-violet-100">Umumiy balans</p>
                  <p class="font-display mt-1 text-3xl font-bold sm:text-4xl">${uzs(0)} <span class="text-lg font-semibold text-violet-200">so'm</span></p>
                </div>
              </div>
              <div class="mt-6 flex flex-wrap items-center gap-3">
                <button data-action="withdraw" class="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-violet-brand shadow-lg transition hover:bg-slate-100 active:scale-95">
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v8m0 0l-3-3m3 3l3-3M4 6h16M4 6v12a2 2 0 002 2h12a2 2 0 002-2V6"/></svg>
                  Pul chiqarish
                </button>
                <div class="text-sm text-violet-100">Escrow: <b class="text-white">${uzs(0)} so'm</b></div>
              </div>
            </div>

            <!-- Quick stats -->
            <div class="grid grid-cols-2 gap-4 lg:grid-cols-1">
              ${statCard({ label: 'Bu oy tushum', value: uzs(0), accent: 'emerald', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2"/>' })}
              ${statCard({ label: 'Bu oy yechilgan', value: uzs(0), sub: '0 ta operatsiya', accent: 'blue', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4m0 0l6-6m-6 6l6 6"/>' })}
            </div>
          </div>

          <!-- Transactions -->
          ${card(`
            <div class="border-b border-white/10 px-5 py-4">
              <h3 class="font-display font-bold text-white">Tranzaksiyalar tarixi</h3>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[640px] text-left text-sm">
                <thead class="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="px-5 py-3 font-semibold">Sana</th>
                    <th class="px-5 py-3 font-semibold">Tranzaksiya ID</th>
                    <th class="px-5 py-3 font-semibold">Turi</th>
                    <th class="px-5 py-3 font-semibold">Summa</th>
                    <th class="px-5 py-3 font-semibold">Holat</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5">
                  ${merchantTx.map((t) => `
                    <tr class="transition hover:bg-white/5">
                      <td class="px-5 py-3.5 text-slate-400">${t.date}</td>
                      <td class="px-5 py-3.5 font-mono text-xs text-slate-300">${t.id}</td>
                      <td class="px-5 py-3.5">
                        <span class="inline-flex items-center gap-1.5 font-medium ${t.type === 'in' ? 'text-emerald-300' : 'text-slate-300'}">
                          <span class="grid h-6 w-6 place-items-center rounded-full ${t.type === 'in' ? 'bg-emerald-500/15' : 'bg-white/10'}">
                            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="${t.type === 'in' ? 'M12 5v14m0 0l-6-6m6 6l6-6' : 'M12 19V5m0 0l-6 6m6-6l6 6'}"/></svg>
                          </span>
                          ${t.type === 'in' ? 'Sotuvdan' : 'Yechish'}
                        </span>
                      </td>
                      <td class="px-5 py-3.5 font-bold ${t.type === 'in' ? 'text-emerald-300' : 'text-white'}">${t.type === 'in' ? '+' : '−'}${uzs(t.amount)} so'm</td>
                      <td class="px-5 py-3.5">${badge(t.status)}</td>
                    </tr>`).join('') || `<tr><td colspan="5" class="px-5 py-10 text-center text-slate-500">Hali tranzaksiya yo'q</td></tr>`}
                </tbody>
              </table>
            </div>`)}
        </div>`,
    };

    /* =========================================================
       AFFILIATE VIEWS
    ========================================================= */
    const affiliateViews = {
      dashboard: () => `
        <div class="view-enter space-y-6">
          <!-- Summary cards -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div class="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-5 text-white shadow-lg shadow-emerald-500/20">
              <p class="text-sm text-emerald-50">Mening balansim</p>
              <p class="font-display mt-1 text-3xl font-bold">${uzs(0)} <span class="text-base font-semibold text-emerald-100">so'm</span></p>
              <button data-action="wallet-withdraw" class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold backdrop-blur transition hover:bg-white/25">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v8m0 0l-3-3m3 3l3-3"/></svg>
                Pul chiqarish
              </button>
            </div>
            ${statCard({ label: 'Kutilayotgan komissiya', value: uzs(0) + ' so\'m', sub: "Yo'ldagi buyurtmalardan", accent: 'blue', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>' })}
            ${statCard({ label: 'Jami sotilgan mahsulotlar', value: '0 ta', accent: 'violet', icon: icon.box })}
          </div>

          <!-- Referral performance -->
          ${card(`
            <div class="p-5 sm:p-6">
              <div class="flex items-center justify-between">
                <h3 class="font-display text-base font-bold text-white">Referal havolalar samaradorligi</h3>
                <span class="rounded-lg bg-violet-500/15 px-3 py-1 text-xs font-bold text-violet-300">Bu oy</span>
              </div>
              <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div class="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                  <div class="flex items-center gap-2 text-slate-400"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/></svg><span class="text-xs font-medium">Bosishlar (Clicks)</span></div>
                  <p class="font-display mt-2 text-2xl font-bold text-white">0</p>
                </div>
                <div class="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                  <div class="flex items-center gap-2 text-slate-400"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span class="text-xs font-medium">Konversiyalar</span></div>
                  <p class="font-display mt-2 text-2xl font-bold text-white">0 <span class="text-sm font-semibold text-slate-500">(0%)</span></p>
                </div>
                <div class="rounded-xl bg-emerald-500/10 p-4 ring-1 ring-emerald-500/20">
                  <div class="flex items-center gap-2 text-emerald-300"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2"/></svg><span class="text-xs font-medium">Ishlangan komissiya</span></div>
                  <p class="font-display mt-2 text-2xl font-bold text-emerald-300">${uzs(0)} so'm</p>
                </div>
              </div>
            </div>`)}
        </div>`,

      market: () => {
        // marketProducts — barcha sotuvchilarning sklad mavjud mahsulotlari,
        // dashboard ochilganda app-init.js orqali Supabase'dan oldindan
        // yuklab qo'yiladi (window.__SOTIBBER_MARKET_PRODUCTS).
        return `
        <div class="view-enter space-y-5">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="font-display text-lg font-bold text-white">Mahsulotlar bozori</h2>
              <p class="text-sm text-slate-400">Sotish uchun mahsulot tanlang va daromad qiling</p>
            </div>
            <div class="relative">
              <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"/></svg>
              <input id="marketSearch" type="text" placeholder="Mahsulot qidirish..." class="fld w-full rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none sm:w-64" />
            </div>
          </div>

          <!-- Kategoriya filtri -->
          <div id="marketCats" class="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            ${['Barchasi'].concat(CATEGORIES).map((c) => `<button data-market-cat="${esc(c)}" class="market-cat whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition ${c === marketCategory ? 'btn-grad text-white' : 'bg-white/5 text-slate-300 ring-1 ring-white/10 hover:bg-white/10'}">${esc(c)}</button>`).join('')}
          </div>

          <div id="marketGrid" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"></div>
        </div>`;
      },

      // "Mening do'konim" — agentning shaxsiy web-ilova do'koni.
      shop: () => {
        const su = shopUrls();
        const shopLink = su.full;
        const shopDisplay = su.display || "Havola tayyorlanmoqda...";
        const activeLinks = agentLinks.filter((l) => !l.archived);
        const archivedLinks = agentLinks.filter((l) => l.archived);
        const totalSales = agentLinks.reduce((s, l) => s + l.sales, 0);
        // Do'kondagi mahsulot kartasi (boshqaruv: arxivlash / olib tashlash)
        const shopCard = (l, archived) => `
          <div class="glass overflow-hidden rounded-2xl ${archived ? 'opacity-70' : 'glass-hover transition hover:-translate-y-0.5'}">
            ${productMedia(l.images, l.product)}
            <div class="p-4">
              <button data-shop-detail="${agentLinks.indexOf(l)}" class="block w-full truncate text-left font-bold text-white hover:text-violet-300">${esc(l.product)}</button>
              <p class="font-display mt-2 text-lg font-bold text-white">${uzs(l.price)} <span class="text-xs font-medium text-slate-500">so'm</span></p>
              <div class="mt-2 flex items-center justify-between text-xs">
                <span class="rounded-full bg-emerald-500/15 px-2.5 py-1 font-bold text-emerald-300">Ulush: ${uzs(l.commission)} so'm</span>
                <span class="rounded-full bg-white/10 px-2.5 py-1 font-semibold text-slate-200">${l.sales} ta sotilgan</span>
              </div>
              <div class="mt-3 flex gap-2">
                ${archived ? `
                  <button data-shop-unarchive="${l.product_id}" class="flex-1 rounded-xl bg-white/10 py-2.5 text-sm font-bold text-white transition hover:bg-white/15">Qaytarish</button>
                  <button data-shop-remove="${l.product_id}" class="rounded-xl bg-rose-500/15 px-3 text-sm font-semibold text-rose-300 ring-1 ring-rose-500/25 transition hover:bg-rose-500/25">O'chirish</button>
                ` : `
                  <button data-shop-archive="${l.product_id}" class="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10">Arxivlash</button>
                  <button data-copy="${esc(shopLink)}" class="grid w-11 flex-shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-300 transition hover:bg-violet-500/25" title="Do'kon havolasini nusxalash">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                  </button>
                  <button data-shop-remove="${l.product_id}" title="Do'kondan olib tashlash" class="grid w-11 flex-shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20 transition hover:bg-rose-500/20">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                `}
              </div>
            </div>
          </div>`;
        return `
        <div class="view-enter space-y-6">
          <!-- Do'kon sarlavhasi + havola -->
          <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-deep via-violet-brand to-emerald-500 p-6 text-white shadow-xl shadow-violet-500/20">
            <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div class="flex items-center gap-3">
                <span class="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-white/15">
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">${icon.shop}</svg>
                </span>
                <div>
                  <h2 class="font-display text-xl font-bold">Mening do'konim</h2>
                  <p class="text-sm text-violet-100">Shaxsiy web-ilova do'koningiz${su.id ? ` · Do'kon ID: <b class="font-mono text-white">#${su.id}</b>` : ''}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                ${shopLink ? `
                <div class="flex-1 truncate rounded-xl bg-white/15 px-3.5 py-2.5 font-mono text-sm md:w-56">${esc(shopDisplay)}</div>
                <button data-copy="${esc(shopLink)}" class="flex-shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-violet-brand transition hover:bg-slate-100">Nusxalash</button>
                <a href="${esc(shopLink)}" target="_blank" rel="noopener" class="flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/25">
                  Ochish
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                </a>` : `
                <button data-action="create-shop-link" class="flex-shrink-0 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-violet-brand transition hover:bg-slate-100">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.83 10.17a4 4 0 00-5.66 0l-4 4a4 4 0 105.66 5.66l1.1-1.1m-.76-4.9a4 4 0 005.66 0l4-4a4 4 0 00-5.66-5.66l-1.1 1.1"/></svg>
                  Havolani yaratish
                </button>`}
              </div>
            </div>
            <!-- mini statistika -->
            <div class="mt-5 grid grid-cols-3 gap-3 text-center">
              <div class="rounded-xl bg-white/10 p-3"><p class="font-display text-lg font-bold">${activeLinks.length}</p><p class="text-[11px] text-violet-100">Faol mahsulot</p></div>
              <div class="rounded-xl bg-white/10 p-3"><p class="font-display text-lg font-bold">${totalSales}</p><p class="text-[11px] text-violet-100">Sotuvlar</p></div>
              <div class="rounded-xl bg-white/10 p-3"><p class="font-display text-lg font-bold">${archivedLinks.length}</p><p class="text-[11px] text-violet-100">Arxivda</p></div>
            </div>
          </div>

          <!-- Xaridor nima ko'rishini tushuntiruvchi banner -->
          <div class="flex items-start gap-2.5 rounded-xl bg-blue-500/10 px-4 py-3 text-sm text-blue-200 ring-1 ring-blue-500/20">
            <svg class="mt-0.5 h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>Bu yerda do'koningizga qo'shgan mahsulotlarni boshqarasiz: har birining nechta sotilganini ko'rasiz, kerakmasini <b>arxivlaysiz</b> yoki <b>do'kondan olib tashlaysiz</b>. Faol mahsulotlar web-ilova do'koningizda ko'rinadi.</span>
          </div>

          <!-- Faol mahsulotlar -->
          <div>
            <h3 class="font-display mb-3 font-bold text-white">Do'kondagi mahsulotlar</h3>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              ${activeLinks.map((l) => shopCard(l, false)).join('') || `
              <div class="glass col-span-full flex flex-col items-center justify-center rounded-2xl border-dashed py-14 text-center">
                <span class="grid h-12 w-12 place-items-center rounded-full bg-white/5 text-slate-400">
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">${icon.shop}</svg>
                </span>
                <p class="mt-3 text-sm font-semibold text-slate-300">Do'koningizda hali mahsulot yo'q</p>
                <p class="mt-1 max-w-xs text-xs text-slate-500">"Mahsulotlar bozori"dan mahsulot tanlab, "Sotishni boshlash" tugmasini bosing</p>
              </div>`}
            </div>
          </div>

          <!-- Arxivlangan mahsulotlar -->
          ${archivedLinks.length ? `
          <div>
            <h3 class="font-display mb-3 flex items-center gap-2 font-bold text-white">Arxivlangan <span class="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-slate-300">${archivedLinks.length}</span></h3>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              ${archivedLinks.map((l) => shopCard(l, true)).join('')}
            </div>
          </div>` : ''}
        </div>`;
      },

      sales: () => {
        const tabs = ['Barchasi', "Yo'lda", 'Yetkazildi', 'Rad etildi'];
        return `
        <div class="view-enter space-y-5" id="salesView">
          <div>
            <h2 class="font-display text-lg font-bold text-white">Mening sotuvlarim</h2>
            <p class="text-sm text-slate-400">Havolalaringiz orqali qilingan buyurtmalar</p>
          </div>
          <div class="flex flex-wrap gap-2">
            ${tabs.map((t, i) => `<button data-sales-tab="${t}" class="sales-tab whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${i === 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white' : 'bg-white/5 text-slate-300 ring-1 ring-white/10 hover:bg-white/10'}">${t}</button>`).join('')}
          </div>
          ${card(`
            <div class="overflow-x-auto">
              <table class="w-full min-w-[680px] text-left text-sm">
                <thead class="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="px-5 py-3 font-semibold">Buyurtma ID</th>
                    <th class="px-5 py-3 font-semibold">Mahsulot</th>
                    <th class="px-5 py-3 font-semibold">Sana</th>
                    <th class="px-5 py-3 font-semibold">Mijoz</th>
                    <th class="px-5 py-3 font-semibold">Holat</th>
                    <th class="px-5 py-3 font-semibold">Ishlangan komissiya</th>
                  </tr>
                </thead>
                <tbody id="salesBody" class="divide-y divide-white/5"></tbody>
              </table>
            </div>`)}
        </div>`;
      },

      wallet: () => `
        <div class="view-enter space-y-6">
          <h2 class="font-display text-lg font-bold text-white">Hamyon</h2>

          <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <!-- Balance + payout -->
            <div class="space-y-4 lg:col-span-2">
              <div class="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-xl shadow-emerald-500/20">
                <p class="text-sm text-emerald-50">Mavjud balans</p>
                <p class="font-display mt-1 text-3xl font-bold sm:text-4xl">${uzs(0)} <span class="text-lg font-semibold text-emerald-100">so'm</span></p>
                <button data-action="wallet-withdraw" class="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-emerald-700 shadow-lg transition hover:bg-emerald-50 active:scale-95">
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v8m0 0l-3-3m3 3l3-3M4 6h16"/></svg>
                  Pul chiqarish
                </button>
              </div>

              <!-- Withdrawal history -->
              ${card(`
                <div class="border-b border-white/10 px-5 py-4">
                  <h3 class="font-display font-bold text-white">Yechib olishlar tarixi</h3>
                  <p class="text-xs text-slate-400">Har bir yechishda 1% platforma komissiyasi ushlanadi</p>
                </div>
                <div class="overflow-x-auto">
                  <table class="w-full min-w-[520px] text-left text-sm">
                    <thead class="text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th class="px-5 py-3 font-semibold">Sana</th>
                        <th class="px-5 py-3 font-semibold">Karta</th>
                        <th class="px-5 py-3 font-semibold">Summa</th>
                        <th class="px-5 py-3 font-semibold">Komissiya (1%)</th>
                        <th class="px-5 py-3 font-semibold">Holat</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-white/5">
                      ${[].map((w) => `
                        <tr class="transition hover:bg-white/5">
                          <td class="px-5 py-3.5 text-slate-400">${w.date}</td>
                          <td class="px-5 py-3.5 font-medium text-slate-200">${w.card}</td>
                          <td class="px-5 py-3.5 font-bold text-white">${uzs(w.amount)} so'm</td>
                          <td class="px-5 py-3.5 text-rose-400">−${uzs(Math.round(w.amount * 0.01))} so'm</td>
                          <td class="px-5 py-3.5">${badge(w.status)}</td>
                        </tr>`).join('') || `<tr><td colspan="5" class="px-5 py-10 text-center text-slate-500">Hali yechib olish tarixi yo'q</td></tr>`}
                    </tbody>
                  </table>
                </div>`)}
            </div>

            <!-- Saved cards -->
            <div class="space-y-4">
              <h3 class="font-display font-bold text-white">Mening kartalarim</h3>
              <div class="glass flex flex-col items-center justify-center rounded-2xl border-dashed py-10 text-center">
                <span class="grid h-11 w-11 place-items-center rounded-full bg-white/5 text-slate-400">
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">${icon.wallet}</svg>
                </span>
                <p class="mt-3 text-sm font-semibold text-slate-300">Hali karta qo'shilmagan</p>
                <p class="mt-1 max-w-[200px] text-xs text-slate-500">Pul chiqarish uchun karta qo'shing</p>
              </div>
              <button data-action="add-card" class="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 py-4 text-sm font-semibold text-slate-400 transition hover:border-violet-400/60 hover:text-violet-300">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
                Yangi karta qo'shish
              </button>
            </div>
          </div>
        </div>`,
    };

    const VIEWS = { seller: sellerViews, affiliate: affiliateViews };

    /* =========================================================
       MARKET GRID (filterable — qidiruv bilan)
    ========================================================= */
    function marketCard(p, i) {
      return `
        <div class="glass glass-hover group overflow-hidden rounded-2xl transition hover:-translate-y-0.5">
          ${productMedia(p.images, p.name)}
          <div class="p-4">
            <button data-market-detail="${i}" class="block w-full truncate text-left font-bold text-white hover:text-violet-300">${esc(p.name)}</button>
            <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span class="flex items-center gap-1"><svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">${icon.store}</svg>${esc(p.merchant)}</span>
              ${p.category ? `<span class="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-slate-300">${esc(p.category)}</span>` : ''}
            </div>
            <p class="font-display mt-2 text-lg font-bold text-white">${uzs(p.price)} <span class="text-xs font-medium text-slate-500">so'm</span></p>
            <div class="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-center ring-1 ring-emerald-500/20">
              <span class="text-sm font-medium text-emerald-300">Komissiya: </span>
              <span class="font-display text-base font-bold text-emerald-300">${uzs(p.commission)} so'm</span>
            </div>
            <div class="mt-3 flex gap-2">
              <button data-start-selling="${i}" class="btn-grad flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition active:scale-95">
                Sotishni boshlash
              </button>
              <button data-msg-seller="${i}" title="Sotuvchi bilan xabarlashish" class="grid w-11 flex-shrink-0 place-items-center rounded-xl bg-white/5 text-slate-200 ring-1 ring-white/10 transition hover:bg-white/10">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9">${icon.chat}</svg>
              </button>
            </div>
            <button data-market-detail="${i}" class="mt-2 w-full rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10">Batafsil ma'lumot</button>
          </div>
        </div>`;
    }

    function renderMarketGrid() {
      const grid = $('#marketGrid');
      if (!grid) return;
      const q = marketQuery.trim().toLowerCase();
      const cat = marketCategory;
      const rows = marketProducts
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => (!q || (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q))
          && (cat === 'Barchasi' || (p.category || '') === cat));
      const filtering = q || cat !== 'Barchasi';
      grid.innerHTML = rows.map(({ p, i }) => marketCard(p, i)).join('') || `
        <div class="glass col-span-full flex flex-col items-center justify-center rounded-2xl border-dashed py-14 text-center">
          <span class="grid h-12 w-12 place-items-center rounded-full bg-white/5 text-slate-400">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">${icon.store}</svg>
          </span>
          <p class="mt-3 text-sm font-semibold text-slate-300">${filtering ? 'Hech narsa topilmadi' : "Bozorda hali mahsulot yo'q"}</p>
          <p class="mt-1 max-w-xs text-xs text-slate-500">${filtering ? 'Boshqa kategoriya yoki kalit so\'z bilan qidirib ko\'ring' : "Sotuvchilar mahsulot qo'shishi bilan shu yerda paydo bo'ladi"}</p>
        </div>`;
    }

    /* =========================================================
       ORDER / SALES TABLE RENDERERS (filterable)
    ========================================================= */
    function renderOrdersBody(filter = 'Barchasi') {
      const body = $('#ordersBody');
      if (!body) return;
      const rows = merchantOrders.filter((o) => filter === 'Barchasi' || o.status === filter);
      body.innerHTML = rows.map((o) => `
        <tr class="transition hover:bg-white/5">
          <td class="px-4 py-3.5 font-mono text-xs font-semibold text-violet-300">${o.id}</td>
          <td class="px-4 py-3.5 font-medium text-slate-100">${esc(o.product)}</td>
          <td class="px-4 py-3.5 text-slate-400">${esc(o.phone)}</td>
          <td class="px-4 py-3.5 text-slate-300">${esc(o.agent)}</td>
          <td class="px-4 py-3.5 font-semibold text-emerald-300">${uzs(o.commission)}</td>
          <td class="px-4 py-3.5 font-bold text-white">${uzs(o.total)}</td>
          <td class="px-4 py-3.5 text-slate-400">${o.date}</td>
          <td class="px-4 py-3.5">${badge(o.status)}</td>
          <td class="px-4 py-3.5">
            <div class="flex justify-end gap-1.5">
              ${o.status === 'Yangi' ? `<button data-mark-shipped="${o.id}" class="rounded-lg bg-blue-500/15 px-2.5 py-1.5 text-xs font-semibold text-blue-300 ring-1 ring-blue-500/25 transition hover:bg-blue-500/25">Yuborildi</button>` : ''}
              <button data-order-details="${o.id}" class="rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 ring-1 ring-white/10 transition hover:bg-white/10">Tafsilotlar</button>
            </div>
          </td>
        </tr>`).join('') || `<tr><td colspan="9" class="px-4 py-10 text-center text-slate-500">Bu holatda buyurtmalar yo'q</td></tr>`;
    }

    function renderSalesBody(filter = 'Barchasi') {
      const body = $('#salesBody');
      if (!body) return;
      const rows = agentSales.filter((s) => filter === 'Barchasi' || s.status === filter);
      body.innerHTML = rows.map((s) => `
        <tr class="transition hover:bg-white/5">
          <td class="px-5 py-3.5 font-mono text-xs font-semibold text-violet-300">${s.id}</td>
          <td class="px-5 py-3.5 font-medium text-slate-100">${esc(s.product)}</td>
          <td class="px-5 py-3.5 text-slate-400">${s.date}</td>
          <td class="px-5 py-3.5"><span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-slate-300" title="Maxfiylik uchun yashirilgan">${esc(s.customer)}</span></td>
          <td class="px-5 py-3.5">${badge(s.status)}</td>
          <td class="px-5 py-3.5 font-bold ${s.commission > 0 ? 'text-emerald-300' : 'text-slate-500'}">${s.commission > 0 ? uzs(s.commission) + " so'm" : '—'}</td>
        </tr>`).join('') || `<tr><td colspan="6" class="px-5 py-10 text-center text-slate-500">Buyurtmalar yo'q</td></tr>`;
    }

    /* =========================================================
       MODAL / DRAWER SYSTEM
    ========================================================= */
    function closeModal() {
      const root = $('#modalRoot');
      root.innerHTML = '';
      document.body.style.overflow = '';
    }

    // Centered modal
    function openModal(html, { size = 'max-w-md' } = {}) {
      const root = $('#modalRoot');
      root.innerHTML = `
        <div class="fixed inset-0 z-[75] flex items-center justify-center p-4">
          <div data-close class="absolute inset-0 animate-fadeIn bg-black/70 backdrop-blur-sm"></div>
          <div class="glass relative max-h-[92vh] w-full ${size} animate-fadeUp overflow-y-auto rounded-3xl text-slate-200 shadow-2xl">${html}</div>
        </div>`;
      document.body.style.overflow = 'hidden';
      root.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeModal));
    }

    // Right slide-over drawer
    function openDrawer(html, { size = 'max-w-md' } = {}) {
      const root = $('#modalRoot');
      root.innerHTML = `
        <div class="fixed inset-0 z-[75]">
          <div data-close class="absolute inset-0 animate-fadeIn bg-black/70 backdrop-blur-sm"></div>
          <div class="glass absolute right-0 top-0 h-full w-full ${size} animate-slideIn overflow-y-auto text-slate-200 shadow-2xl">${html}</div>
        </div>`;
      document.body.style.overflow = 'hidden';
      root.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeModal));
    }

    /* =========================================================
       PRODUCT DETAIL MODAL (rasm galereyasi + ma'lumot)
       kind: 'market' | 'seller' | 'shop'
    ========================================================= */
    function normalizeProduct(kind, idx) {
      if (kind === 'market') {
        const p = marketProducts[idx];
        if (!p) return null;
        return {
          name: p.name,
          description: p.description,
          category: p.category || '',
          price: p.price,
          images: p.images || [],
          badgeLine: `<span class="inline-flex items-center gap-1 text-xs text-slate-400"><svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">${icon.store}</svg>${esc(p.merchant || 'Sotuvchi')}</span>`,
          commissionText: `${uzs(p.commission)} so'm`,
          action: { label: 'Sotishni boshlash', attr: `data-start-selling="${idx}"`, cls: 'btn-grad' },
        };
      }
      if (kind === 'shop') {
        const l = agentLinks[idx];
        if (!l) return null;
        return {
          name: l.product,
          description: l.description || '',
          category: l.category || '',
          price: l.price,
          images: l.images || [],
          badgeLine: '',
          commissionText: `${uzs(l.commission)} so'm`,
          action: null,
        };
      }
      // seller
      const p = merchantProducts[idx];
      if (!p) return null;
      return {
        name: p.name,
        description: p.description,
        category: p.category || '',
        price: p.price,
        images: p.images || [],
        badgeLine: `<span class="inline-flex items-center gap-2 text-xs text-slate-400">${badge(p.status)}<span>Sklad: <b class="text-slate-200">${p.stock}</b></span></span>`,
        commissionText: `${p.commission}% (${uzs(Math.round(p.price * p.commission / 100))} so'm)`,
        action: null,
      };
    }

    function productDetailModal(kind, idx) {
      const p = normalizeProduct(kind, idx);
      if (!p) return;
      const imgs = (p.images || []).filter(Boolean);
      const hasImgs = imgs.length > 0;

      const mainImg = hasImgs
        ? `<img id="pdMainImg" src="${esc(imgs[0])}" alt="${esc(p.name)}" class="h-full w-full object-contain" />`
        : `<div class="grid h-full w-full place-items-center">${imgPlaceholder('h-20 w-20')}</div>`;

      const thumbs = imgs.length > 1
        ? `<div class="mt-3 flex flex-wrap gap-2">
            ${imgs.map((src, i) => `
              <button type="button" data-pd-thumb="${esc(src)}" class="pd-thumb h-14 w-14 overflow-hidden rounded-lg ring-2 transition ${i === 0 ? 'ring-violet-400' : 'ring-white/10 hover:ring-white/30'}">
                <img src="${esc(src)}" alt="" class="h-full w-full object-cover" />
              </button>`).join('')}
          </div>`
        : '';

      openModal(`
        <div>
          <div class="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h3 class="font-display text-lg font-bold text-white">Mahsulot ma'lumoti</h3>
            <button type="button" data-close class="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-white/10">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="space-y-4 p-6">
            <!-- Galereya -->
            <div class="overflow-hidden rounded-2xl bg-black/30 ring-1 ring-white/10">
              <div class="aspect-square w-full">${mainImg}</div>
            </div>
            ${thumbs}

            <!-- Ma'lumot -->
            <div>
              <h4 class="font-display text-xl font-bold text-white">${esc(p.name)}</h4>
              <div class="mt-1.5 flex flex-wrap items-center gap-2">
                ${p.badgeLine || ''}
                ${p.category ? `<span class="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">${esc(p.category)}</span>` : ''}
              </div>
              <p class="font-display mt-3 text-2xl font-bold text-white">${uzs(p.price)} <span class="text-sm font-medium text-slate-500">so'm</span></p>
            </div>

            <div class="flex items-center justify-between rounded-xl bg-emerald-500/10 px-4 py-3 ring-1 ring-emerald-500/20">
              <span class="text-sm font-medium text-emerald-300">Komissiya</span>
              <span class="font-display text-base font-bold text-emerald-300">${p.commissionText}</span>
            </div>

            <div>
              <p class="text-sm font-semibold text-slate-300">Tavsifi</p>
              <p class="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-400">${p.description ? esc(p.description) : "Mahsulot uchun tavsif kiritilmagan."}</p>
            </div>
          </div>
          ${p.action ? `
          <div class="sticky bottom-0 flex gap-3 border-t border-white/10 bg-ink-900/60 p-6 backdrop-blur">
            ${kind === 'market' && marketProducts[idx] && marketProducts[idx].seller_id ? `<button type="button" data-msg-seller="${idx}" title="Sotuvchi bilan xabarlashish" class="grid w-12 flex-shrink-0 place-items-center rounded-xl bg-white/5 text-slate-200 ring-1 ring-white/10 transition hover:bg-white/10"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9">${icon.chat}</svg></button>` : ''}
            <button type="button" data-close class="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">Yopish</button>
            <button type="button" ${p.action.attr} class="${p.action.cls} flex-1 rounded-xl py-3 text-sm font-bold text-white transition active:scale-95">${p.action.label}</button>
          </div>` : `
          <div class="border-t border-white/10 p-6">
            <button type="button" data-close class="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">Yopish</button>
          </div>`}
        </div>
      `, { size: 'max-w-lg' });

      // Thumbnail almashtirish
      const main = $('#pdMainImg');
      $$('.pd-thumb').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (main) main.src = btn.dataset.pdThumb;
          $$('.pd-thumb').forEach((b) => {
            const on = b === btn;
            b.classList.toggle('ring-violet-400', on);
            b.classList.toggle('ring-white/10', !on);
          });
        });
      });
    }

    /* ---- Add Product drawer (merchant) — 5 tagacha rasm ---- */
    function addProductDrawer() {
      openDrawer(`
        <form id="productForm" class="flex min-h-full flex-col">
          <div class="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h3 class="font-display text-lg font-bold text-white">Yangi mahsulot qo'shish</h3>
            <button type="button" data-close class="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-white/10">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="flex-1 space-y-5 p-6">
            <!-- Ko'p rasm yuklash (5 tagacha) -->
            <div>
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-slate-200">Mahsulot rasmlari</span>
                <span id="imageCount" class="text-xs font-medium text-slate-500">0 / 5</span>
              </div>
              <input type="file" id="productImageInput" accept="image/png,image/jpeg,image/webp" multiple class="hidden" />
              <div id="imageGrid" class="mt-2 grid grid-cols-3 gap-2.5 sm:grid-cols-4"></div>
              <p class="mt-1.5 text-xs text-slate-500">PNG, JPG yoki WEBP · har biri max 5MB · birinchi rasm asosiy bo'ladi</p>
            </div>

            <label class="block">
              <span class="text-sm font-semibold text-slate-200">Mahsulot nomi</span>
              <input required id="productNameInput" type="text" placeholder="Masalan: AirPods Pro 2" class="fld mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm outline-none" />
            </label>

            <label class="block">
              <span class="text-sm font-semibold text-slate-200">Tavsifi</span>
              <textarea id="productDescInput" rows="3" placeholder="Mahsulot haqida qisqacha ma'lumot..." class="fld mt-1.5 w-full resize-none rounded-xl px-3.5 py-2.5 text-sm outline-none"></textarea>
            </label>

            <label class="block">
              <span class="text-sm font-semibold text-slate-200">Kategoriya</span>
              <select id="productCatInput" class="fld mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm outline-none">
                ${CATEGORIES.map((c) => `<option class="bg-ink-800" value="${esc(c)}">${esc(c)}</option>`).join('')}
              </select>
            </label>

            <div class="grid grid-cols-2 gap-4">
              <label class="block">
                <span class="text-sm font-semibold text-slate-200">Narxi (so'm)</span>
                <input required id="priceInput" type="number" value="150000" min="0" class="fld mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm outline-none" />
              </label>
              <label class="block">
                <span class="text-sm font-semibold text-slate-200">Sklad soni</span>
                <input required id="stockInput" type="number" value="10" min="0" class="fld mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm outline-none" />
              </label>
            </div>

            <!-- Commission slider with computed UZS -->
            <div class="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-slate-200">Komissiya ulushi</span>
                <span class="rounded-lg bg-white/10 px-2.5 py-1 text-sm font-bold text-violet-300"><span id="commPct">15</span>%</span>
              </div>
              <input id="commSlider" type="range" min="0" max="50" value="15" class="mt-3 w-full cursor-pointer" />
              <div class="mt-2 flex items-center justify-between text-xs">
                <span class="text-slate-500">0%</span>
                <span class="rounded-lg bg-emerald-500/15 px-3 py-1 font-bold text-emerald-300">Agent oladi: <span id="commUzs">22 500</span> so'm</span>
                <span class="text-slate-500">50%</span>
              </div>
            </div>
          </div>

          <div class="sticky bottom-0 flex gap-3 border-t border-white/10 bg-ink-900/60 p-6 backdrop-blur">
            <button type="button" data-close class="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">Bekor qilish</button>
            <button type="submit" class="btn-grad flex-1 rounded-xl py-3 text-sm font-bold text-white transition">Saqlash</button>
          </div>
        </form>
      `, { size: 'max-w-lg' });

      // Live commission computation
      const slider = $('#commSlider'), pct = $('#commPct'), uzsEl = $('#commUzs'), price = $('#priceInput');
      const recompute = () => {
        pct.textContent = slider.value;
        uzsEl.textContent = uzs(Math.round((Number(price.value) || 0) * slider.value / 100));
      };
      slider.addEventListener('input', recompute);
      price.addEventListener('input', recompute);

      // ---- Ko'p rasm yuklash (up to 5 images) ----
      const MAX_IMAGES = 5;
      const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
      const imageInput = $('#productImageInput');
      const imageGrid = $('#imageGrid');
      const imageCount = $('#imageCount');
      // productImages: [{ file, dataUrl }]
      const productImages = [];

      function renderImageGrid() {
        const tiles = productImages.map((img, i) => `
          <div class="group relative aspect-square overflow-hidden rounded-xl ring-1 ring-white/10">
            <img src="${img.dataUrl}" alt="Rasm ${i + 1}" class="h-full w-full object-cover" />
            ${i === 0 ? '<span class="absolute left-1 top-1 rounded bg-violet-brand px-1.5 py-0.5 text-[9px] font-bold text-white">Asosiy</span>' : ''}
            <button type="button" data-remove-image="${i}" class="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100" aria-label="O'chirish">
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>`).join('');
        const addTile = productImages.length < MAX_IMAGES
          ? `<button type="button" id="addImageTile" class="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-white/15 text-slate-500 transition hover:border-violet-400/60 hover:text-violet-300">
              <span class="flex flex-col items-center gap-1">
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
                <span class="text-[10px] font-semibold">Rasm</span>
              </span>
            </button>`
          : '';
        imageGrid.innerHTML = tiles + addTile;
        imageCount.textContent = `${productImages.length} / ${MAX_IMAGES}`;

        $('#addImageTile')?.addEventListener('click', () => imageInput.click());
        $$('[data-remove-image]', imageGrid).forEach((btn) => {
          btn.addEventListener('click', () => {
            productImages.splice(Number(btn.dataset.removeImage), 1);
            renderImageGrid();
          });
        });
      }

      function handleFiles(fileList) {
        const files = Array.from(fileList || []);
        for (const file of files) {
          if (productImages.length >= MAX_IMAGES) { toast(`Ko'pi bilan ${MAX_IMAGES} ta rasm yuklash mumkin`); break; }
          if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { toast('Faqat PNG, JPG yoki WEBP rasm yuklang'); continue; }
          if (file.size > MAX_IMAGE_BYTES) { toast(`"${file.name}" — rasm hajmi 5MB dan oshmasligi kerak`); continue; }
          const reader = new FileReader();
          reader.onload = () => { productImages.push({ file, dataUrl: reader.result }); renderImageGrid(); };
          reader.onerror = () => toast("Rasmni o'qib bo'lmadi, qayta urinib ko'ring");
          reader.readAsDataURL(file);
        }
      }

      imageInput.addEventListener('change', () => { handleFiles(imageInput.files); imageInput.value = ''; });
      renderImageGrid();

      $('#productForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = $('#productNameInput').value.trim();
        const priceVal = Number(price.value) || 0;
        const stockVal = Math.max(0, Number($('#stockInput').value) || 0);
        const commissionVal = Number(slider.value) || 0;
        if (!name || priceVal <= 0) {
          toast("Mahsulot nomi va narxini to'g'ri kiriting");
          return;
        }
        const user = window.__SOTIBBER_USER;
        if (!user || !window.sb) {
          toast('Tizimga kirilmagan. Sahifani yangilab, qayta kiring.');
          return;
        }

        const submitBtn = $('#productForm button[type="submit"]');
        submitBtn.disabled = true;
        const origBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Saqlanmoqda...';

        const palette = [
          'from-violet-500/25 to-indigo-500/10',
          'from-emerald-500/25 to-teal-500/10',
          'from-amber-500/25 to-orange-500/10',
          'from-rose-500/25 to-pink-500/10',
          'from-fuchsia-500/25 to-purple-500/10',
          'from-sky-500/25 to-cyan-500/10',
        ];
        const color = palette[Math.floor(Math.random() * palette.length)];

        try {
          // Har bir rasmni Supabase storage'ga yuklaymiz
          const imageUrls = [];
          for (const img of productImages) {
            try {
              const ext = (img.file.name.split('.').pop() || 'jpg').toLowerCase();
              const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
              const { error: upErr } = await window.sb.storage.from('product-images').upload(path, img.file);
              if (upErr) throw upErr;
              const { data: pub } = window.sb.storage.from('product-images').getPublicUrl(path);
              if (pub && pub.publicUrl) imageUrls.push(pub.publicUrl);
            } catch (imgErr) {
              console.warn('Rasmni yuklab bo\'lmadi:', imgErr);
              toast('Ba\'zi rasmlarni yuklab bo\'lmadi — mahsulot mavjud rasmlar bilan saqlanadi');
            }
          }
          const imageUrl = imageUrls[0] || null;

          const catVal = ($('#productCatInput') && $('#productCatInput').value) || 'Boshqa';
          const basePayload = {
            seller_id: user.id,
            name,
            description: $('#productDescInput').value.trim(),
            category: catVal,
            price: priceVal,
            stock: stockVal,
            commission: commissionVal,
            status: 'Moderatsiyada',
            image_url: imageUrl,
            color,
          };
          let { data, error } = await window.sb
            .from('products')
            .insert({ ...basePayload, image_urls: imageUrls })
            .select()
            .single();
          // `image_urls` yoki `category` ustuni hali qo'shilmagan bo'lsa
          // (migratsiya ishga tushirilmagan) — ularsiz baribir saqlaymiz.
          if (error && /image_urls|category|column .* does not exist|schema cache/i.test(error.message || '')) {
            console.warn("Yangi ustun topilmadi — supabase_qoshimcha.sql'ni ishga tushiring. Mahsulot soddalashtirilgan holda saqlanadi.");
            const noExtra = { seller_id: user.id, name, description: basePayload.description, price: priceVal, stock: stockVal, commission: commissionVal, status: 'Moderatsiyada', image_url: imageUrl, color };
            ({ data, error } = await window.sb.from('products').insert(noExtra).select().single());
          }
          if (error) throw error;

          merchantProducts.unshift({
            id: data.id,
            name: data.name,
            description: data.description || '',
            category: data.category || catVal,
            price: Number(data.price),
            stock: data.stock,
            commission: Number(data.commission),
            status: data.status,
            color: data.color,
            images: imageUrls,
            image: imageUrl,
          });

          closeModal();
          toast('Mahsulot moderatsiyaga yuborildi ✓');
          if (state.panel === 'seller' && state.view === 'products') renderView();
        } catch (err) {
          console.error('Mahsulotni saqlashda xatolik:', err);
          const detail = (err && (err.message || err.error_description || err.hint)) || '';
          toast(detail
            ? `Xatolik: ${detail}`
            : "Xatolik: mahsulotni saqlab bo'lmadi. Qayta urinib ko'ring");
          submitBtn.disabled = false;
          submitBtn.textContent = origBtnText;
        }
      });
    }

    /* ---- Withdraw modal (shared, fee = 1%) ---- */
    function withdrawModal(theme = 'violet') {
      const accentBtn = theme === 'emerald' ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : 'btn-grad';
      openModal(`
        <form id="withdrawForm">
          <div class="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h3 class="font-display text-lg font-bold text-white">Pul chiqarish</h3>
            <button type="button" data-close class="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-white/10">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="space-y-4 p-6">
            <label class="block">
              <span class="text-sm font-semibold text-slate-200">Kartani tanlang</span>
              <select class="fld mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm outline-none">
                <option class="bg-ink-800">Uzcard •• 4821</option>
                <option class="bg-ink-800">Humo •• 9037</option>
                <option class="bg-ink-800">+ Yangi karta qo'shish</option>
              </select>
            </label>
            <label class="block">
              <span class="text-sm font-semibold text-slate-200">Chiqarish summasi (so'm)</span>
              <input id="wAmount" type="number" value="1000000" min="10000" step="10000" class="fld mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-lg font-bold outline-none" />
            </label>

            <!-- Fee breakdown -->
            <div class="space-y-2 rounded-2xl bg-amber-500/10 p-4 ring-1 ring-amber-500/20">
              <div class="flex items-center gap-2 text-amber-300">
                <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                <span class="text-xs font-semibold">1% platforma komissiyasi ushlab qolinadi</span>
              </div>
              <div class="flex justify-between text-sm"><span class="text-slate-400">Summa</span><span id="wGross" class="font-semibold text-slate-200">1 000 000 so'm</span></div>
              <div class="flex justify-between text-sm"><span class="text-slate-400">Komissiya (1%)</span><span id="wFee" class="font-semibold text-rose-400">−10 000 so'm</span></div>
              <div class="flex justify-between border-t border-amber-500/20 pt-2 text-sm"><span class="font-semibold text-slate-200">Qo'lga tegadigan</span><span id="wNet" class="font-bold text-emerald-300">990 000 so'm</span></div>
            </div>
          </div>
          <div class="flex gap-3 border-t border-white/10 p-6">
            <button type="button" data-close class="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">Bekor qilish</button>
            <button type="submit" class="${accentBtn} flex-1 rounded-xl py-3 text-sm font-bold text-white transition active:scale-95">Tasdiqlash</button>
          </div>
        </form>
      `);
      const amount = $('#wAmount');
      const recompute = () => {
        const v = Number(amount.value) || 0;
        const fee = Math.round(v * 0.01);
        $('#wGross').textContent = uzs(v) + " so'm";
        $('#wFee').textContent = '−' + uzs(fee) + " so'm";
        $('#wNet').textContent = uzs(v - fee) + " so'm";
      };
      amount.addEventListener('input', recompute);
      $('#withdrawForm').addEventListener('submit', (e) => {
        e.preventDefault();
        closeModal();
        toast("Pul chiqarish so'rovi qabul qilindi ✓");
      });
    }

    /* ---- Add card modal ---- */
    function addCardModal() {
      openModal(`
        <form id="cardForm">
          <div class="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h3 class="font-display text-lg font-bold text-white">Yangi karta qo'shish</h3>
            <button type="button" data-close class="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-white/10">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="space-y-4 p-6">
            <label class="block">
              <span class="text-sm font-semibold text-slate-200">Karta raqami</span>
              <input required inputmode="numeric" placeholder="8600 0000 0000 0000" maxlength="19" class="fld mt-1.5 w-full rounded-xl px-3.5 py-2.5 font-mono text-sm outline-none" />
            </label>
            <div class="grid grid-cols-2 gap-4">
              <label class="block">
                <span class="text-sm font-semibold text-slate-200">Amal qilish muddati</span>
                <input required placeholder="MM/YY" maxlength="5" class="fld mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm outline-none" />
              </label>
              <label class="block">
                <span class="text-sm font-semibold text-slate-200">Karta turi</span>
                <select class="fld mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm outline-none">
                  <option class="bg-ink-800">Uzcard</option><option class="bg-ink-800">Humo</option>
                </select>
              </label>
            </div>
            <p class="flex items-center gap-1.5 text-xs text-slate-500">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              Ma'lumotlaringiz shifrlangan holda saqlanadi
            </p>
          </div>
          <div class="flex gap-3 border-t border-white/10 p-6">
            <button type="button" data-close class="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">Bekor qilish</button>
            <button type="submit" class="btn-grad flex-1 rounded-xl py-3 text-sm font-bold text-white transition">Kartani saqlash</button>
          </div>
        </form>
      `);
      $('#cardForm').addEventListener('submit', (e) => { e.preventDefault(); closeModal(); toast('Karta muvaffaqiyatli qo\'shildi ✓'); });
    }

    /* ---- Order details modal (merchant) ---- */
    function orderDetailsModal(id) {
      const o = merchantOrders.find((x) => x.id === id);
      if (!o) return;
      openModal(`
        <div>
          <div class="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <div>
              <h3 class="font-display text-lg font-bold text-white">Buyurtma ${o.id}</h3>
              <p class="text-xs text-slate-400">${o.date}</p>
            </div>
            <button type="button" data-close class="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-white/10">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="space-y-4 p-6">
            <div class="flex items-center justify-between">
              <span class="text-sm text-slate-400">Holat</span>${badge(o.status)}
            </div>
            <div class="space-y-3 rounded-2xl bg-white/5 p-4 text-sm ring-1 ring-white/10">
              <div class="flex justify-between"><span class="text-slate-400">Mahsulot</span><span class="font-semibold text-slate-100">${esc(o.product)}</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Mijoz telefoni</span><span class="font-medium text-slate-200">${esc(o.phone)}</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Sotib beruvchi (agent)</span><span class="font-medium text-slate-200">${esc(o.agent)}</span></div>
              <div class="flex justify-between border-t border-white/10 pt-3"><span class="text-slate-400">Umumiy summa</span><span class="font-bold text-white">${uzs(o.total)} so'm</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Agent komissiyasi</span><span class="font-bold text-emerald-300">${uzs(o.commission)} so'm</span></div>
              <div class="flex justify-between"><span class="text-slate-400">Sizning foydangiz</span><span class="font-bold text-violet-300">${uzs(o.total - o.commission)} so'm</span></div>
            </div>
          </div>
          <div class="flex gap-3 border-t border-white/10 p-6">
            <button type="button" data-close class="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">Yopish</button>
            ${o.status === 'Yangi' ? `<button data-mark-shipped="${o.id}" class="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-blue-700">Yuborildi deb belgilash</button>` : ''}
          </div>
        </div>
      `);
    }

    /* ---- Start selling success modal (affiliate) ---- */
    async function startSellingModal(idx) {
      const p = marketProducts[idx];
      if (!p) return;
      const su = shopUrls();
      const link = su.full || "Do'kon havolasi tayyorlanmoqda...";
      const user = window.__SOTIBBER_USER;
      const already = agentLinks.some((l) => l.product_id === p.id);

      // Supabase'ga (affiliate_products) yozamiz — do'kon web-ilovasida shu orqali
      // ko'rinadi. Yozuvni KUTAMIZ; muvaffaqiyatsiz bo'lsa — aniq xato beramiz.
      if (!already && user && window.sb && p.id) {
        const { error } = await window.sb.from('affiliate_products')
          .insert({ affiliate_id: user.id, product_id: p.id });
        if (error && !/duplicate|unique|23505/i.test(error.message || '')) {
          console.error('Do\'konga qo\'shishda xatolik:', error);
          if (/affiliate_products|does not exist|schema cache|find the table/i.test(error.message || '')) {
            toast("Do'kon jadvali topilmadi — Supabase'da supabase_qoshimcha.sql'ni ishga tushiring");
          } else {
            toast('Xatolik: ' + (error.message || 'do\'konga qo\'shib bo\'lmadi'));
          }
          return; // muvaffaqiyatsiz — do'konга qo'shilmadi, modalni ko'rsatmaymiz
        }
      }

      if (!already) {
        agentLinks.push({
          product_id: p.id,
          product: p.name,
          description: p.description,
          category: p.category || '',
          price: p.price,
          commission: p.commission,
          clicks: 0,
          sales: 0,
          slug: '',
          images: p.images || [],
          image: p.image,
        });
        // Do'kon sahifasi ochiq bo'lsa — ro'yxatni darhol yangilaymiz
        if (state.panel === 'affiliate' && state.view === 'shop') renderView();
      }
      openModal(`
        <div>
          <div class="flex flex-col items-center px-6 pt-8 text-center">
            <span class="grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
              <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
            </span>
            <h3 class="font-display mt-4 text-xl font-bold text-white">Havola tayyor! 🎉</h3>
            <p class="mt-1 text-sm text-slate-400">"${esc(p.name)}" endi sizning shaxsiy do'koningizda. Havolani ijtimoiy tarmoqlarga joylang.</p>
          </div>
          <div class="p-6">
            <span class="text-sm font-semibold text-slate-200">Shaxsiy do'kon linki</span>
            <div class="mt-1.5 flex items-center gap-2">
              <div class="flex-1 truncate rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 font-mono text-sm text-slate-200">${link}</div>
              <button data-copy="${link}" class="btn-grad flex-shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold text-white">Nusxalash</button>
            </div>

            <div class="mt-3 flex items-center justify-between rounded-xl bg-emerald-500/10 px-4 py-3 ring-1 ring-emerald-500/20">
              <span class="text-sm font-medium text-emerald-300">Har bir sotuvdan olasiz</span>
              <span class="font-display text-base font-bold text-emerald-300">${uzs(p.commission)} so'm</span>
            </div>

            <p class="mt-5 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Tezkor ulashish</p>
            <div class="mt-3 flex justify-center gap-3">
              <a href="#" class="grid h-12 w-12 place-items-center rounded-2xl bg-sky-500/15 text-sky-300 transition hover:scale-105" aria-label="Telegram"><svg class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.3 18.5 20c-.2 1.1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.7 13.6 1.9 12c-1-.3-1-1 .2-1.5l18.2-7c.9-.3 1.6.2 1.6 1.8Z"/></svg></a>
              <a href="#" class="grid h-12 w-12 place-items-center rounded-2xl bg-pink-500/15 text-pink-300 transition hover:scale-105" aria-label="Instagram"><svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a>
            </div>
          </div>
          <div class="border-t border-white/10 p-6">
            <button type="button" data-close class="w-full rounded-xl bg-white/10 py-3 text-sm font-bold text-white transition hover:bg-white/15">Yopish</button>
          </div>
        </div>
      `);
    }

    /* ---- Sotib olish (xaridorning web-ilova do'konidagi buyurtma oynasi) ---- */
    function buyProductModal(idx) {
      const p = agentLinks[idx];
      if (!p) return;
      openModal(`
        <form id="buyForm">
          <div class="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <div>
              <h3 class="font-display text-lg font-bold text-white">Buyurtma berish</h3>
              <p class="text-xs text-slate-400">Xavfsiz to'lov</p>
            </div>
            <button type="button" data-close class="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-white/10">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="space-y-4 p-6">
            <!-- Mahsulot ko'rinishi -->
            <div class="flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
              <span class="grid h-14 w-14 flex-shrink-0 place-items-center overflow-hidden rounded-xl bg-white/10">
                ${p.image
                  ? `<img src="${esc(p.image)}" alt="${esc(p.product)}" class="h-full w-full object-cover" />`
                  : imgPlaceholder('h-7 w-7')}
              </span>
              <div class="min-w-0">
                <p class="truncate font-bold text-white">${esc(p.product)}</p>
                <p class="text-sm font-bold text-white">${uzs(p.price)} <span class="text-xs font-medium text-slate-500">so'm / dona</span></p>
              </div>
            </div>

            <!-- Miqdor -->
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-slate-200">Miqdori</span>
              <div class="flex items-center gap-2">
                <button type="button" id="qtyMinus" class="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-lg font-bold text-slate-200 hover:bg-white/10">−</button>
                <input id="qty" type="number" value="1" min="1" max="99" class="fld w-14 rounded-lg py-2 text-center text-sm font-bold outline-none" />
                <button type="button" id="qtyPlus" class="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-lg font-bold text-slate-200 hover:bg-white/10">+</button>
              </div>
            </div>

            <!-- Xaridor ma'lumotlari -->
            <label class="block">
              <span class="text-sm font-semibold text-slate-200">Ismingiz</span>
              <input required type="text" placeholder="Ism Familiya" class="fld mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm outline-none" />
            </label>
            <label class="block">
              <span class="text-sm font-semibold text-slate-200">Telefon raqamingiz</span>
              <input required type="tel" inputmode="tel" placeholder="+998 90 123 45 67" class="fld mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm outline-none" />
            </label>
            <label class="block">
              <span class="text-sm font-semibold text-slate-200">Yetkazib berish manzili</span>
              <textarea required rows="2" placeholder="Viloyat, tuman, ko'cha, uy..." class="fld mt-1.5 w-full resize-none rounded-xl px-3.5 py-2.5 text-sm outline-none"></textarea>
            </label>

            <!-- To'lov usuli -->
            <div>
              <span class="text-sm font-semibold text-slate-200">To'lov usuli</span>
              <div class="mt-1.5 grid grid-cols-2 gap-2">
                <label class="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-200 has-[:checked]:border-emerald-400/60 has-[:checked]:bg-emerald-500/15">
                  <input type="radio" name="pay" value="cash" checked /> Yetkazib berilganda naqd
                </label>
                <label class="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-200 has-[:checked]:border-emerald-400/60 has-[:checked]:bg-emerald-500/15">
                  <input type="radio" name="pay" value="card" /> Karta orqali
                </label>
              </div>
            </div>

            <!-- Jami -->
            <div class="flex items-center justify-between rounded-2xl bg-emerald-500/10 px-4 py-3 ring-1 ring-emerald-500/20">
              <span class="text-sm font-semibold text-emerald-300">Jami to'lov</span>
              <span id="buyTotal" class="font-display text-xl font-bold text-emerald-300">${uzs(p.price)} so'm</span>
            </div>
          </div>
          <div class="flex gap-3 border-t border-white/10 p-6">
            <button type="button" data-close class="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">Bekor qilish</button>
            <button type="submit" class="flex-1 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:opacity-90">Buyurtmani tasdiqlash</button>
          </div>
        </form>
      `, { size: 'max-w-md' });

      // Miqdor va jami summani hisoblash
      const qty = $('#qty');
      const recompute = () => {
        let n = Math.max(1, Math.min(99, Number(qty.value) || 1));
        qty.value = n;
        $('#buyTotal').textContent = uzs(p.price * n) + " so'm";
      };
      $('#qtyMinus').addEventListener('click', () => { qty.value = Math.max(1, (Number(qty.value) || 1) - 1); recompute(); });
      $('#qtyPlus').addEventListener('click', () => { qty.value = Math.min(99, (Number(qty.value) || 1) + 1); recompute(); });
      qty.addEventListener('input', recompute);

      // Buyurtma tasdiqlanganda muvaffaqiyat oynasini ko'rsatamiz
      $('#buyForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const n = Math.max(1, Math.min(99, Number(qty.value) || 1));
        orderSuccessModal(p, n);
      });
    }

    /* ---- Buyurtma muvaffaqiyatli qabul qilindi ---- */
    function orderSuccessModal(p, n) {
      const orderId = '#' + (10250 + Math.floor(Math.random() * 90));
      openModal(`
        <div class="p-6 text-center">
          <span class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
            <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
          </span>
          <h3 class="font-display mt-4 text-xl font-bold text-white">Buyurtmangiz qabul qilindi! 🎉</h3>
          <p class="mt-1 text-sm text-slate-400">Operatorlarimiz tez orada siz bilan bog'lanadi.</p>
          <div class="mt-5 space-y-2 rounded-2xl bg-white/5 p-4 text-left text-sm ring-1 ring-white/10">
            <div class="flex justify-between"><span class="text-slate-400">Buyurtma raqami</span><span class="font-mono font-bold text-violet-300">${orderId}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Mahsulot</span><span class="font-semibold text-slate-100">${esc(p.product)}</span></div>
            <div class="flex justify-between"><span class="text-slate-400">Miqdori</span><span class="font-semibold text-slate-100">${n} dona</span></div>
            <div class="flex justify-between border-t border-white/10 pt-2"><span class="text-slate-400">Jami</span><span class="font-bold text-emerald-300">${uzs(p.price * n)} so'm</span></div>
          </div>
          <button type="button" data-close class="mt-6 w-full rounded-xl bg-white/10 py-3 text-sm font-bold text-white transition hover:bg-white/15">Yopish</button>
        </div>
      `);
    }

    /* =========================================================
       XABARLAR (messaging) — sotuvchi ↔ sotib beruvchi
    ========================================================= */
    const ME = (window.__SOTIBBER_USER || {}).id || null;
    let messages = Array.isArray(window.__SOTIBBER_MESSAGES) ? window.__SOTIBBER_MESSAGES : [];
    let chatSel = null;       // tanlangan suhbat (conversation_id)
    let chatDraft = null;     // yangi suhbat (hali xabar yo'q): { conversation_id, other, product_id }
    let chatFile = null;      // biriktiriladigan fayl
    let chatPoll = null;

    function myName() {
      const p = window.__SOTIBBER_PROFILE || {}, u = window.__SOTIBBER_USER || {};
      return p.full_name || u.email || 'Men';
    }
    function userConvId(otherId) { return 'u:' + [ME, otherId].sort().join('__'); }

    // Bir xabar bo'yicha "qarshi tomon" (men bo'lmagan ishtirokchi)
    function otherParty(m) {
      if (m.sender_id === ME) return { id: m.recipient_id || null, guest: m.recipient_id ? null : (m.guest_id || null), name: m.recipient_name || (m.guest_id ? 'Mehmon' : 'Foydalanuvchi') };
      return { id: m.sender_id || null, guest: m.sender_id ? null : (m.guest_id || null), name: m.sender_name || (m.guest_id ? 'Mehmon' : 'Foydalanuvchi') };
    }

    function groupConversations() {
      const map = {};
      messages.forEach((m) => {
        const cid = m.conversation_id;
        if (!map[cid]) map[cid] = { conversation_id: cid, msgs: [], other: otherParty(m), unread: 0 };
        map[cid].msgs.push(m);
        if (m.sender_id !== ME) map[cid].other = otherParty(m); // qarshi tomon ismini aniqroq olamiz
        if (m.recipient_id === ME && !m.read_by_recipient) map[cid].unread++;
      });
      const arr = Object.keys(map).map((k) => { const c = map[k]; c.last = c.msgs[c.msgs.length - 1]; return c; });
      if (chatDraft && !map[chatDraft.conversation_id]) {
        arr.push({ conversation_id: chatDraft.conversation_id, msgs: [], other: chatDraft.other, unread: 0, last: null, draft: true });
      }
      arr.sort((a, b) => new Date(b.last ? b.last.created_at : 0) - new Date(a.last ? a.last.created_at : 0));
      return arr;
    }

    function unreadTotal() { return messages.filter((m) => m.recipient_id === ME && !m.read_by_recipient).length; }

    function timeStr(ts) {
      if (!ts) return '';
      const d = new Date(ts);
      return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }

    // Suhbat oynasi (ikkala panel uchun bir xil)
    function messagesView() {
      return `
        <div class="view-enter">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 class="font-display text-lg font-bold text-white">Xabarlar</h2>
              <p class="text-sm text-slate-400">Sotuvchi va sotib beruvchilar bilan yozishing</p>
            </div>
            <button data-msg-refresh class="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Yangilash
            </button>
          </div>
          <div class="grid gap-4 lg:grid-cols-[300px_1fr]">
            <div id="convList" class="glass rounded-2xl p-2 lg:max-h-[calc(100vh-13rem)] lg:overflow-y-auto"></div>
            <div id="chatPanel" class="glass flex min-h-[60vh] flex-col rounded-2xl lg:h-[calc(100vh-13rem)]"></div>
          </div>
        </div>`;
    }

    function renderConvList() {
      const box = $('#convList');
      if (!box) return;
      const convs = groupConversations();
      box.innerHTML = convs.map((c) => {
        const active = c.conversation_id === chatSel;
        const preview = c.last ? ((c.last.sender_id === ME ? 'Siz: ' : '') + (c.last.body || (c.last.attachment_type === 'image' ? '📷 Rasm' : c.last.attachment_type === 'video' ? '🎬 Video' : '📎 Fayl'))) : 'Yangi suhbat';
        return `
          <button data-open-conv="${esc(c.conversation_id)}" class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? 'bg-violet-500/15 ring-1 ring-violet-400/40' : 'hover:bg-white/5'}">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-brand to-violet-deep text-sm font-bold text-white">${esc((c.other.name || 'F').slice(0, 1).toUpperCase())}</span>
            <span class="min-w-0 flex-1">
              <span class="flex items-center justify-between gap-2">
                <span class="truncate text-sm font-semibold text-white">${esc(c.other.name || 'Foydalanuvchi')}</span>
                ${c.unread ? `<span class="shrink-0 rounded-full bg-rose-500/25 px-1.5 text-[10px] font-bold text-rose-200">${c.unread}</span>` : ''}
              </span>
              <span class="block truncate text-xs text-slate-400">${esc(preview)}</span>
            </span>
          </button>`;
      }).join('') || '<p class="px-3 py-8 text-center text-sm text-slate-500">Hali suhbatlar yo\'q</p>';
    }

    function attachHtml(m) {
      if (!m.attachment_url) return '';
      const u = esc(m.attachment_url);
      if (m.attachment_type === 'image') return `<a href="${u}" target="_blank" rel="noopener"><img src="${u}" alt="" class="mt-1.5 max-h-56 rounded-lg" /></a>`;
      if (m.attachment_type === 'video') return `<video controls src="${u}" class="mt-1.5 max-h-56 w-full rounded-lg"></video>`;
      return `<a href="${u}" target="_blank" rel="noopener" class="mt-1.5 inline-flex items-center gap-2 rounded-lg bg-black/25 px-3 py-2 text-xs font-medium text-white hover:bg-black/40"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>${esc(m.attachment_name || 'Fayl')}</a>`;
    }

    function renderThreadPanel() {
      const panel = $('#chatPanel');
      if (!panel) return;
      const conv = groupConversations().find((c) => c.conversation_id === chatSel);
      if (!chatSel || !conv) {
        panel.innerHTML = `<div class="flex flex-1 items-center justify-center p-10 text-center text-sm text-slate-500">Chapdan suhbatni tanlang yoki bozordan "Sotuvchi bilan xabarlashish" orqali boshlang.</div>`;
        return;
      }
      const thread = (conv.msgs || []).map((m) => {
        const mine = m.sender_id === ME;
        return `
          <div class="flex ${mine ? 'justify-end' : 'justify-start'}">
            <div class="max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'bg-gradient-to-br from-violet-brand to-violet-deep text-white' : 'bg-gradient-to-br from-emerald-500 to-green-600 text-white ring-1 ring-emerald-400/20'}">
              ${m.body ? `<p class="whitespace-pre-wrap break-words">${esc(m.body)}</p>` : ''}
              ${attachHtml(m)}
              <p class="mt-1 text-[10px] ${mine ? 'text-white/60' : 'text-white/70'}">${timeStr(m.created_at)}</p>
            </div>
          </div>`;
      }).join('') || '<p class="py-8 text-center text-sm text-slate-500">Birinchi xabarni yozing</p>';

      // Qayta chizishdan oldin yozilayotgan matn/fokus/kursorni saqlab qolamiz
      // (poll har 12s panelni yangilaganda yozayotgan xabar yo'qolmasin)
      const prevInp = $('#msgInput');
      const keepInput = (prevInp && renderThreadPanel._conv === chatSel) ? {
        value: prevInp.value,
        start: prevInp.selectionStart,
        end: prevInp.selectionEnd,
        focused: document.activeElement === prevInp,
      } : null;

      panel.innerHTML = `
        <div class="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <span class="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-brand to-violet-deep text-xs font-bold text-white">${esc((conv.other.name || 'F').slice(0, 1).toUpperCase())}</span>
          <div><p class="text-sm font-semibold text-white">${esc(conv.other.name || 'Foydalanuvchi')}</p><p class="text-[11px] text-slate-500">${conv.other.guest ? 'Web-ilova mijozi' : 'Foydalanuvchi'}</p></div>
        </div>
        <div id="chatThread" class="flex-1 space-y-2.5 overflow-y-auto p-4">${thread}</div>
        <form id="msgForm" class="border-t border-white/10 p-3">
          <div id="msgFilePrev" class="hidden mb-2 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300 ring-1 ring-white/10"></div>
          <div class="flex items-center gap-2">
            <input type="file" id="msgFile" class="hidden" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip" />
            <button type="button" id="msgAttach" class="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10" title="Rasm / video / fayl">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9"><path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
            </button>
            <input id="msgInput" type="text" autocomplete="off" placeholder="Xabar yozing..." class="fld flex-1 rounded-xl px-3.5 py-2.5 text-sm outline-none" />
            <button type="submit" class="btn-grad grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg></button>
          </div>
        </form>`;

      renderThreadPanel._conv = chatSel;
      if (keepInput) {
        const inp = $('#msgInput');
        if (inp) {
          inp.value = keepInput.value;
          if (keepInput.focused) {
            inp.focus();
            try { inp.setSelectionRange(keepInput.start, keepInput.end); } catch (_) {}
          }
        }
      }

      const t = $('#chatThread');
      if (t) t.scrollTop = t.scrollHeight;
      renderMsgFilePrev();
      markConversationRead(conv);
    }

    function renderMsgFilePrev() {
      const prev = $('#msgFilePrev');
      if (!prev) return;
      if (!chatFile) { prev.classList.add('hidden'); prev.innerHTML = ''; return; }
      prev.classList.remove('hidden');
      prev.innerHTML = `<svg class="h-4 w-4 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9"><path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg><span class="min-w-0 flex-1 truncate">${esc(chatFile.name)}</span><button type="button" data-msg-file-remove class="text-rose-400 hover:underline">olib tashlash</button>`;
    }

    async function markConversationRead(conv) {
      const ids = (conv.msgs || []).filter((m) => m.recipient_id === ME && !m.read_by_recipient).map((m) => m.id);
      if (!ids.length) return;
      messages.forEach((m) => { if (ids.indexOf(m.id) !== -1) m.read_by_recipient = true; });
      renderConvList(); renderSidebar();
      try { await window.sb.from('messages').update({ read_by_recipient: true }).in('id', ids); } catch (e) { console.warn(e); }
    }

    async function uploadMessageFile(file) {
      const user = window.__SOTIBBER_USER;
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      const path = `${(user && user.id) || 'guest'}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error } = await window.sb.storage.from('message-files').upload(path, file);
      if (error) throw error;
      const { data } = window.sb.storage.from('message-files').getPublicUrl(path);
      const type = file.type.indexOf('image/') === 0 ? 'image' : file.type.indexOf('video/') === 0 ? 'video' : 'file';
      return { url: data && data.publicUrl, type, name: file.name };
    }

    async function sendCurrentMessage(form) {
      const user = window.__SOTIBBER_USER;
      if (!user || !window.sb) { toast('Tizimga qayta kiring'); return; }
      const conv = groupConversations().find((c) => c.conversation_id === chatSel);
      if (!conv) return;
      const body = $('#msgInput').value.trim();
      if (!body && !chatFile) return;

      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;

      let att = null;
      if (chatFile) {
        try { att = await uploadMessageFile(chatFile); }
        catch (e) {
          console.error('Fayl yuklash:', e);
          toast(/bucket|not found|does not exist/i.test(e.message || '') ? "Fayl bucket topilmadi — SQL'ni ishga tushiring" : 'Faylni yuklab bo\'lmadi');
          btn.disabled = false; return;
        }
      }

      const row = {
        conversation_id: conv.conversation_id,
        sender_id: user.id,
        sender_name: myName(),
        recipient_id: conv.other.id || null,
        recipient_name: conv.other.name || null,
        guest_id: conv.other.guest || null,
        body: body || null,
        attachment_url: att ? att.url : null,
        attachment_type: att ? att.type : null,
        attachment_name: att ? att.name : null,
        product_id: (chatDraft && chatDraft.conversation_id === conv.conversation_id) ? (chatDraft.product_id || null) : null,
        read_by_recipient: false,
      };
      const { data, error } = await window.sb.from('messages').insert(row).select().single();
      btn.disabled = false;
      if (error) {
        console.error('Xabar yuborish:', error);
        toast(/messages|does not exist|schema cache|find the table/i.test(error.message || '') ? "Xabarlar jadvali topilmadi — SQL'ni ishga tushiring" : 'Xatolik: ' + (error.message || 'yuborilmadi'));
        return;
      }
      if (!messages.some((x) => x.id === data.id)) messages.push(data);
      chatDraft = null;
      chatFile = null;
      $('#msgInput').value = '';
      renderConvList(); renderThreadPanel();
    }

    // Bozordan sotuvchi bilan suhbat boshlash
    function messageSeller(marketIdx) {
      const p = marketProducts[marketIdx];
      if (!p || !p.seller_id) { toast('Sotuvchi topilmadi'); return; }
      if (p.seller_id === ME) { toast('Bu mahsulot o\'zingizniki'); return; }
      const cid = userConvId(p.seller_id);
      chatDraft = { conversation_id: cid, other: { id: p.seller_id, guest: null, name: 'Sotuvchi' }, product_id: p.id };
      chatSel = cid;
      closeModal();
      go('messages');
    }

    function initMessagesView() {
      chatFile = null;
      renderConvList();
      renderThreadPanel();
      if (chatPoll) clearInterval(chatPoll);
      chatPoll = setInterval(reloadMessages, 12000);
    }

    async function reloadMessages() {
      const user = window.__SOTIBBER_USER;
      if (!user || !window.sb) return;
      try {
        const { data, error } = await window.sb.from('messages').select('*')
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order('created_at', { ascending: true });
        if (error) throw error;
        messages = data || [];
      } catch (e) { console.warn('Xabarlarni yangilash:', e); return; }
      // Xabarlar to'plami o'zgarmagan bo'lsa, qayta chizmaymiz — aks holda
      // har 12s panel yangilanib, yozilayotgan matn/fokus va scroll buziladi
      const sig = messages.map((m) => m.id + (m.read_by_recipient ? '1' : '0')).join(',');
      if (sig === reloadMessages._sig) return;
      reloadMessages._sig = sig;
      if (state.view === 'messages') { renderConvList(); renderThreadPanel(); }
      renderSidebar();
    }

    /* =========================================================
       MESSENJER (sotib beruvchi) — Instagram ulash + statistika
    ========================================================= */
    // Ulanadigan ijtimoiy tarmoq / messenjerlar
    const MSGR_PLATFORMS = [
      { key: 'instagram', name: 'Instagram', ic: 'insta',    grad: 'from-pink-500 to-fuchsia-500', base: 'https://instagram.com/', at: true,  ph: 'username yoki havola' },
      { key: 'telegram',  name: 'Telegram',  ic: 'telegram', grad: 'from-sky-400 to-blue-500',     base: 'https://t.me/',         at: true,  ph: 'kanal yoki havola' },
      { key: 'facebook',  name: 'Facebook',  ic: 'facebook', grad: 'from-blue-500 to-blue-700',    base: 'https://facebook.com/', at: false, ph: 'sahifa yoki havola' },
      { key: 'tiktok',    name: 'TikTok',    ic: 'tiktok',   grad: 'from-neutral-700 to-black',    base: 'https://tiktok.com/@',  at: true,  ph: 'username yoki havola' },
      { key: 'youtube',   name: 'YouTube',   ic: 'youtube',  grad: 'from-red-500 to-red-600',      base: 'https://youtube.com/@', at: true,  ph: 'kanal yoki havola' },
    ];
    function msgrPlatform(key) { return MSGR_PLATFORMS.find((p) => p.key === key) || MSGR_PLATFORMS[0]; }
    function msgrHref(p, val) {
      if (!val) return '#';
      if (/^https?:/i.test(val)) return val;
      return p.base + String(val).replace(/^@/, '');
    }
    // Profil socials (yangi) + eski instagram ustunini birlashtiradi
    function currentSocials() {
      const profile = window.__SOTIBBER_PROFILE || {};
      const s = Object.assign({}, profile.socials || {});
      if (profile.instagram && !s.instagram) s.instagram = profile.instagram;
      return s;
    }

    function messengerView() {
      const socials = currentSocials();
      const sel = msgrPlatform(messengerSel);
      const activeCount = agentLinks.filter((l) => !l.archived).length;
      const totalSold = agentLinks.reduce((s, l) => s + l.sales, 0);
      const totalCommission = agentSales.reduce((s, o) => s + (Number(o.commission) || 0), 0);
      const ordersCount = agentSales.length;
      const igStat = (label, value, ic, tint) => `
        <div class="glass rounded-2xl p-5">
          <span class="grid h-10 w-10 place-items-center rounded-xl ${tint}"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">${ic}</svg></span>
          <p class="font-display mt-3 text-2xl font-bold text-white">${value}</p>
          <p class="mt-0.5 text-xs text-slate-400">${label}</p>
        </div>`;

      // Ulangan platformalar — to'rt burchak (kvadrat) plitkalar, yonma-yon
      const tiles = MSGR_PLATFORMS.filter((p) => socials[p.key]).map((p) => {
        const val = socials[p.key];
        const label = (p.at ? '@' : '') + String(val).replace(/^@/, '').replace(/^https?:\/\/[^/]+\/?/i, '');
        return `
          <div class="relative">
            <a href="${esc(msgrHref(p, val))}" target="_blank" rel="noopener" title="${p.name}: ${esc(val)}"
               class="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br ${p.grad} p-3 text-white shadow-lg ring-1 ring-white/10 transition hover:scale-[1.03]">
              <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">${icon[p.ic]}</svg>
              <span class="max-w-full truncate text-[11px] font-semibold">${esc(label) || p.name}</span>
            </a>
            <button type="button" data-social-remove="${p.key}" title="O'chirish"
              class="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-rose-500 text-white shadow ring-2 ring-black/50 transition hover:bg-rose-600">
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </div>`;
      }).join('');

      // Platforma tanlash chiplari
      const chips = MSGR_PLATFORMS.map((p) => {
        const on = p.key === messengerSel;
        return `<button type="button" data-msgr-sel="${p.key}"
          class="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${on ? 'bg-gradient-to-br ' + p.grad + ' text-white shadow' : 'bg-white/5 text-slate-300 ring-1 ring-white/10 hover:bg-white/10'}">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">${icon[p.ic]}</svg>${p.name}</button>`;
      }).join('');

      const existing = socials[sel.key] || '';

      return `
        <div class="view-enter space-y-6">
          <div>
            <h2 class="font-display text-lg font-bold text-white">Messenjer</h2>
            <p class="text-sm text-slate-400">Ijtimoiy tarmoq va messenjerlaringizni ulang</p>
          </div>

          <!-- Ulangan platformalar -->
          <div class="glass rounded-2xl p-6">
            <h3 class="font-display mb-4 font-bold text-white">Ulangan tarmoqlar</h3>
            ${tiles
              ? `<div class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">${tiles}</div>`
              : `<p class="rounded-xl border border-dashed border-white/10 bg-white/5 py-8 text-center text-sm text-slate-500">Hali tarmoq ulanmagan — quyidan tanlab qo'shing</p>`}
          </div>

          <!-- Yangi qo'shish -->
          <div class="glass rounded-2xl p-6">
            <h3 class="font-display mb-3 font-bold text-white">Yangi qo'shish</h3>
            <div class="flex flex-wrap gap-2">${chips}</div>
            <form id="msgrForm" class="mt-4 flex flex-col gap-2 sm:flex-row">
              <div class="relative flex-1">
                ${sel.at ? '<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">@</span>' : ''}
                <input id="msgrInput" type="text" value="${esc(String(existing).replace(/^@/, ''))}" placeholder="${sel.name} — ${sel.ph}" class="fld w-full rounded-xl py-2.5 ${sel.at ? 'pl-7' : 'pl-3'} pr-3 text-sm outline-none" />
              </div>
              <button type="submit" class="btn-grad rounded-xl px-5 py-2.5 text-sm font-bold text-white transition active:scale-95">${existing ? 'Yangilash' : "Qo'shish"}</button>
            </form>
            <p class="mt-2 text-xs text-slate-500">${sel.name} uchun username yoki to'liq havola kiriting.</p>
          </div>

          <!-- Statistika -->
          <div>
            <h3 class="font-display mb-3 font-bold text-white">Statistika</h3>
            <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
              ${igStat('Faol mahsulot', activeCount, icon.box, 'bg-violet-500/15 text-violet-300')}
              ${igStat('Buyurtmalar', ordersCount, icon.cart, 'bg-blue-500/15 text-blue-300')}
              ${igStat('Sotilgan', totalSold + ' ta', '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>', 'bg-emerald-500/15 text-emerald-300')}
              ${igStat('Ishlangan komissiya', uzs(totalCommission) + " so'm", icon.wallet, 'bg-amber-500/15 text-amber-300')}
            </div>
          </div>
        </div>`;
    }

    /* =========================================================
       SOTIB BERUVCHILAR (sotuvchi) — mahsulotimni kim do'koniga qo'shgan
    ========================================================= */
    function resellersView() {
      const byAff = {};
      myResellers.forEach((r) => {
        if (!byAff[r.affiliate_id]) byAff[r.affiliate_id] = { name: r.name, instagram: r.instagram, shop_no: r.shop_no, items: [] };
        byAff[r.affiliate_id].items.push(r);
      });
      const groups = Object.keys(byAff).map((k) => byAff[k]);
      const totalSold = myResellers.reduce((s, r) => s + r.sold, 0);

      const igHref = (ig) => /^https?:/.test(ig) ? ig : 'https://instagram.com/' + ig.replace(/^@/, '');
      const shopHref = (no) => no != null ? new URL('shop.html?id=' + String(no).padStart(4, '0'), window.location.href).href : '';

      const cards = groups.map((g) => `
        <div class="glass rounded-2xl p-5">
          <div class="flex items-center gap-3">
            <span class="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-brand to-violet-deep text-sm font-bold text-white">${esc((g.name || 'S').slice(0, 1).toUpperCase())}</span>
            <div class="min-w-0 flex-1">
              <p class="truncate font-bold text-white">${esc(g.name)}</p>
              <p class="text-xs text-slate-400">${g.items.length} ta mahsulot · ${g.items.reduce((s, r) => s + r.sold, 0)} ta sotgan</p>
            </div>
            <div class="flex flex-shrink-0 gap-1.5">
              ${g.instagram ? `<a href="${esc(igHref(g.instagram))}" target="_blank" rel="noopener" title="Instagram" class="grid h-9 w-9 place-items-center rounded-lg bg-pink-500/15 text-pink-300 hover:bg-pink-500/25"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">${icon.insta}</svg></a>` : ''}
              ${g.shop_no != null ? `<a href="${esc(shopHref(g.shop_no))}" target="_blank" rel="noopener" title="Do'konni ochish" class="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-slate-200 ring-1 ring-white/10 hover:bg-white/10"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">${icon.shop}</svg></a>` : ''}
            </div>
          </div>
          <div class="mt-3 space-y-1.5">
            ${g.items.map((r) => `<div class="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10">
              <span class="min-w-0 flex-1 truncate text-slate-200">${esc(r.product_name)}${r.archived ? ' <span class="text-xs text-slate-500">(arxiv)</span>' : ''}</span>
              <span class="flex-shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300">${r.sold} ta sotilgan</span>
            </div>`).join('')}
          </div>
        </div>`).join('');

      return `
        <div class="view-enter space-y-5">
          <div>
            <h2 class="font-display text-lg font-bold text-white">Sotib beruvchilar</h2>
            <p class="text-sm text-slate-400">Mahsulotlaringizni do'koniga qo'shgan sotib beruvchilar</p>
          </div>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
            ${[['Sotib beruvchilar', groups.length], ['Jami qo\'shilgan', myResellers.length + ' ta'], ['Ular sotgan', totalSold + ' ta']].map(([l, v]) => `
              <div class="glass rounded-2xl p-4 text-center"><p class="font-display text-2xl font-bold text-white">${v}</p><p class="mt-0.5 text-xs text-slate-400">${l}</p></div>`).join('')}
          </div>
          ${groups.length ? `<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">${cards}</div>` : `
            <div class="glass flex flex-col items-center justify-center rounded-2xl border-dashed py-14 text-center">
              <span class="grid h-12 w-12 place-items-center rounded-full bg-white/5 text-slate-400"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">${icon.users}</svg></span>
              <p class="mt-3 text-sm font-semibold text-slate-300">Hali hech kim mahsulotingizni qo'shmagan</p>
              <p class="mt-1 max-w-xs text-xs text-slate-500">Sotib beruvchilar bozordan mahsulotingizni "Sotishni boshlash" bilan do'koniga qo'shsa, shu yerda ko'rinadi</p>
            </div>`}
        </div>`;
    }

    // Bitta platformani saqlash/o'chirish — profiles.socials (jsonb) ichida
    async function persistSocials(socials) {
      const user = window.__SOTIBBER_USER;
      if (!user || !window.sb) { toast('Tizimga qayta kiring'); return false; }
      // Eski kod (sotib beruvchilar/do'kon) instagram ustunini o'qiydi — sinxron saqlaymiz
      const row = { id: user.id, socials, instagram: socials.instagram || '' };
      const { error } = await window.sb.from('profiles').upsert(row, { onConflict: 'id' });
      if (error) {
        console.error('Socials:', error);
        toast(/socials|column .* does not exist|schema cache/i.test(error.message || '')
          ? "'socials' ustuni yo'q — supabase_qoshimcha.sql'ni ishga tushiring"
          : 'Xatolik: ' + (error.message || ''));
        return false;
      }
      window.__SOTIBBER_PROFILE = Object.assign({}, window.__SOTIBBER_PROFILE || {}, { socials, instagram: socials.instagram || '' });
      return true;
    }

    async function saveSocial(form) {
      const p = msgrPlatform(messengerSel);
      const val = form.querySelector('#msgrInput').value.trim();
      const btn = form.querySelector('button[type="submit"]');
      if (!val) { toast('Username yoki havola kiriting'); return; }
      btn.disabled = true;
      const socials = currentSocials();
      socials[p.key] = val;
      const ok = await persistSocials(socials);
      btn.disabled = false;
      if (!ok) return;
      toast(p.name + ' saqlandi ✓');
      renderView();
    }

    async function removeSocial(key) {
      const p = msgrPlatform(key);
      const socials = currentSocials();
      delete socials[key];
      if (!(await persistSocials(socials))) return;
      toast(p.name + " o'chirildi");
      renderView();
    }

    async function archiveShopProduct(productId, archived) {
      const user = window.__SOTIBBER_USER;
      if (!user || !window.sb) return;
      const link = agentLinks.find((l) => l.product_id === productId);
      if (link) link.archived = archived;
      if (state.view === 'shop') renderView();
      const { error } = await window.sb.from('affiliate_products').update({ archived }).eq('affiliate_id', user.id).eq('product_id', productId);
      if (error) {
        console.error('Arxivlash:', error);
        toast(/archived|column .* does not exist|schema cache/i.test(error.message || '') ? "'archived' ustuni yo'q — supabase_qoshimcha.sql'ni ishga tushiring" : 'Xatolik yuz berdi');
      } else toast(archived ? 'Arxivlandi ✓' : 'Qaytarildi ✓');
    }

    async function removeShopProduct(productId) {
      const user = window.__SOTIBBER_USER;
      if (!user || !window.sb) return;
      if (!confirm("Mahsulotni do'kondan olib tashlaysizmi?")) return;
      const idx = agentLinks.findIndex((l) => l.product_id === productId);
      if (idx >= 0) agentLinks.splice(idx, 1);
      if (state.view === 'shop') renderView();
      const { error } = await window.sb.from('affiliate_products').delete().eq('affiliate_id', user.id).eq('product_id', productId);
      if (error) { console.error('Olib tashlash:', error); toast('Xatolik: olib tashlab bo\'lmadi'); }
      else toast("Do'kondan olib tashlandi ✓");
    }

    // Ko'rinishlarni ikkala panelga bog'laymiz
    sellerViews.messages = messagesView;
    affiliateViews.messages = messagesView;
    sellerViews.resellers = resellersView;
    affiliateViews.messenger = messengerView;

    /* =========================================================
       APP STATE + ROUTER
    ========================================================= */
    // Panel qo'nish sahifasidan (landing) tanlanadi. Uch manbadan o'qiymiz:
    //   1) URL query:  dashboard/index.html?panel=affiliate
    //   2) URL hash:   dashboard/index.html#affiliate
    //   3) localStorage: sotibber_panel
    // Hech biri bo'lmasa, standart holatda "seller" (Sotuvchi) ochiladi.
    function initialPanel() {
      let p = new URLSearchParams(window.location.search).get('panel');
      if (!p) {
        const h = (window.location.hash || '').replace('#', '').replace('panel=', '');
        if (h) p = h;
      }
      if (!p) {
        try { p = localStorage.getItem('sotibber_panel'); } catch (e) {}
      }
      return p === 'affiliate' ? 'affiliate' : 'seller';
    }
    const state = { panel: initialPanel(), view: 'dashboard' };

    function renderSidebar() {
      const conf = NAV[state.panel];
      $('#panelLabel').textContent = conf.label;
      $('#profileRole').textContent = conf.label;
      const unread = unreadTotal();
      $('#sidebarNav').innerHTML = conf.items.map((it) => {
        const active = it.id === state.view;
        const badge = (it.id === 'messages' && unread > 0)
          ? `<span class="ml-auto rounded-full bg-rose-500/25 px-2 py-0.5 text-[11px] font-bold text-rose-200">${unread}</span>`
          : (active ? '<span class="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400"></span>' : '');
        return `<button data-view="${it.id}" class="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${active ? 'bg-gradient-to-r from-violet-brand/40 to-violet-deep/25 text-white shadow-inner ring-1 ring-violet-400/30' : 'text-slate-300 hover:bg-white/5 hover:text-white'}">
          ${navIcon(it.icon)}<span>${t(it.title)}</span>
          ${badge}
        </button>`;
      }).join('');
    }

    function renderView() {
      const conf = NAV[state.panel];
      const item = conf.items.find((i) => i.id === state.view) || conf.items[0];
      state.view = item.id;
      // Suhbat "poll"ini boshqa ko'rinishga o'tganda to'xtatamiz
      if (state.view !== 'messages' && chatPoll) { clearInterval(chatPoll); chatPoll = null; }
      $('#viewTitle').textContent = t(item.title);
      $('#viewRoot').innerHTML = VIEWS[state.panel][state.view]();
      // Post-render hooks for filterable tables / grids
      if (state.panel === 'seller' && state.view === 'orders') renderOrdersBody('Barchasi');
      if (state.panel === 'affiliate' && state.view === 'sales') renderSalesBody('Barchasi');
      if (state.panel === 'affiliate' && state.view === 'market') { marketQuery = ''; renderMarketGrid(); }
      if (state.view === 'messages') initMessagesView();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function go(view) { state.view = view; renderSidebar(); renderView(); closeMobileSidebar(); }

    /* =========================================================
       SIDEBAR (mobile) + HEADER interactions
    ========================================================= */
    function openMobileSidebar() {
      $('#sidebar').classList.remove('-translate-x-full');
      $('#sidebarOverlay').classList.remove('hidden');
    }
    function closeMobileSidebar() {
      $('#sidebar').classList.add('-translate-x-full');
      $('#sidebarOverlay').classList.add('hidden');
    }
    $('#openSidebar').addEventListener('click', openMobileSidebar);
    $('#sidebarOverlay').addEventListener('click', closeMobileSidebar);

    // Profile dropdown
    $('#profileBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      $('#profileMenu').classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#profileBtn') && !e.target.closest('#profileMenu')) {
        $('#profileMenu').classList.add('hidden');
      }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); $('#profileMenu').classList.add('hidden'); $('#notifMenu')?.classList.add('hidden'); } });

    /* =========================================================
       BILDIRISHNOMALAR (bell)
    ========================================================= */
    let notifications = Array.isArray(window.__SOTIBBER_NOTIFICATIONS) ? window.__SOTIBBER_NOTIFICATIONS : [];
    function relevantNotifs() { return notifications.filter((n) => n.audience === 'all' || n.audience === state.panel); }
    function notifSeen() { try { return localStorage.getItem('sotibber_notif_seen') || ''; } catch (e) { return ''; } }
    function updateNotifDot() {
      const last = notifSeen();
      const has = relevantNotifs().some((n) => !last || new Date(n.created_at) > new Date(last));
      const dot = $('#notifDot'); if (dot) dot.classList.toggle('hidden', !has);
    }
    function renderNotifList() {
      const box = $('#notifList'); if (!box) return;
      box.innerHTML = relevantNotifs().map((n) => `
        <div class="rounded-xl px-3 py-2.5 transition hover:bg-white/5">
          ${n.title ? `<p class="text-sm font-semibold text-white">${esc(n.title)}</p>` : ''}
          <p class="whitespace-pre-wrap break-words text-sm text-slate-300">${esc(n.body)}</p>
          <p class="mt-1 text-[11px] text-slate-500">${new Date(n.created_at).toLocaleString('ru-RU')}</p>
        </div>`).join('') || `<p class="px-3 py-8 text-center text-sm text-slate-500">${t("Bildirishnoma yo'q")}</p>`;
    }
    $('#notifBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = $('#notifMenu');
      const willOpen = menu.classList.contains('hidden');
      $('#profileMenu').classList.add('hidden');
      menu.classList.toggle('hidden');
      if (willOpen) {
        renderNotifList();
        try { localStorage.setItem('sotibber_notif_seen', new Date().toISOString()); } catch (e2) {}
        updateNotifDot();
      }
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#notifBtn') && !e.target.closest('#notifMenu')) $('#notifMenu')?.classList.add('hidden');
    });

    /* =========================================================
       MAVZU (dark / light)
    ========================================================= */
    const SUN_ICON = '<circle cx="12" cy="12" r="4"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"/>';
    const MOON_ICON = '<path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
    function isLightTheme() { return document.documentElement.getAttribute('data-theme') === 'light'; }
    function setThemeIcon() {
      const ic = $('#themeIcon');
      if (ic) ic.innerHTML = isLightTheme() ? MOON_ICON : SUN_ICON; // yorug'da -> oyni ko'rsatamiz (bosilsa to'q)
    }
    function toggleTheme() {
      const goLight = !isLightTheme();
      if (goLight) document.documentElement.setAttribute('data-theme', 'light');
      else document.documentElement.removeAttribute('data-theme');
      try { localStorage.setItem('sotibber_theme', goLight ? 'light' : 'dark'); } catch (e) {}
      setThemeIcon();
    }
    $('#themeToggle')?.addEventListener('click', toggleTheme);
    setThemeIcon();

    /* =========================================================
       PROFIL oynasi (Profilim)
    ========================================================= */
    function profileModal() {
      $('#profileMenu').classList.add('hidden');
      const profile = window.__SOTIBBER_PROFILE || {};
      const user = window.__SOTIBBER_USER || {};
      const id = (profile.shop_no != null) ? String(profile.shop_no).padStart(4, '0') : '—';
      openModal(`
        <form id="profileForm">
          <div class="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h3 class="font-display text-lg font-bold text-white">${t('Profilim')}</h3>
            <button type="button" data-close class="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-white/10"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
          </div>
          <div class="space-y-4 p-6">
            <div class="flex items-center gap-4">
              <span class="grid h-16 w-16 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-brand to-violet-deep text-white"><svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg></span>
              <div>
                <p class="text-xs text-slate-400">${t("Do'kon ID")}</p>
                <p class="font-display text-2xl font-bold text-white">#${id}</p>
                <p class="text-[11px] text-slate-500">O'zgarmas raqam</p>
              </div>
            </div>
            <label class="block"><span class="text-sm font-semibold text-slate-200">${t('Ism familiya')}</span>
              <input id="pfFullName" value="${esc(profile.full_name || '')}" placeholder="Ism Familiya" class="fld mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm outline-none" /></label>
            <label class="block"><span class="text-sm font-semibold text-slate-200">${t('Telefon')}</span>
              <input id="pfPhoneInp" type="tel" value="${esc(profile.phone || '')}" placeholder="+998 90 123 45 67" class="fld mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm outline-none" /></label>
            <label class="block"><span class="text-sm font-semibold text-slate-200">${t('Email')}</span>
              <input value="${esc(user.email || '')}" disabled class="fld mt-1.5 w-full cursor-not-allowed rounded-xl px-3.5 py-2.5 text-sm text-slate-400 opacity-70 outline-none" /></label>
          </div>
          <div class="flex gap-3 border-t border-white/10 p-6">
            <button type="button" data-close class="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">${t('Bekor qilish')}</button>
            <button type="submit" class="btn-grad flex-1 rounded-xl py-3 text-sm font-bold text-white transition">${t('Saqlash')}</button>
          </div>
        </form>
      `);
      $('#profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const user2 = window.__SOTIBBER_USER;
        if (!user2 || !window.sb) { toast('Tizimga qayta kiring'); return; }
        const full_name = $('#pfFullName').value.trim();
        const phone = $('#pfPhoneInp').value.trim();
        const btn = $('#profileForm button[type="submit"]'); btn.disabled = true;
        const { error } = await window.sb.from('profiles').upsert({ id: user2.id, full_name, phone }, { onConflict: 'id' });
        btn.disabled = false;
        if (error) { console.error('Profil:', error); toast('Xatolik: ' + (error.message || 'saqlanmadi')); return; }
        window.__SOTIBBER_PROFILE = Object.assign({}, window.__SOTIBBER_PROFILE || {}, { full_name, phone });
        $('#profileName').textContent = full_name || (user2.email || 'Foydalanuvchi');
        $('#profileNameFull').textContent = full_name || (user2.email || 'Foydalanuvchi');
        $('#profilePhone').textContent = phone || user2.email || '';
        closeModal();
        toast('Profil saqlandi ✓');
      });
    }

    /* =========================================================
       SOZLAMALAR (parol + til)
    ========================================================= */
    function setLang(lang) {
      LANG = lang;
      try { localStorage.setItem('sotibber_lang', lang); } catch (e) {}
      applyI18n();
      renderSidebar();
      const conf = NAV[state.panel];
      const item = conf.items.find((i) => i.id === state.view) || conf.items[0];
      if ($('#viewTitle')) $('#viewTitle').textContent = t(item.title);
      if ($('#notifTitle')) $('#notifTitle').textContent = t('Bildirishnomalar');
      settingsModal();
    }
    function settingsModal() {
      $('#profileMenu').classList.add('hidden');
      const langs = [['uz', "O'zbekcha", '🇺🇿'], ['ru', 'Ruscha', '🇷🇺'], ['en', 'Inglizcha', '🇬🇧']];
      openModal(`
        <div>
          <div class="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h3 class="font-display text-lg font-bold text-white">${t('Sozlamalar')}</h3>
            <button type="button" data-close class="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-white/10"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
          </div>
          <div class="space-y-5 p-6">
            <div>
              <p class="text-sm font-semibold text-slate-200">${t('Til')}</p>
              <div class="mt-2 grid grid-cols-3 gap-2">
                ${langs.map(([code, label, flag]) => `<button type="button" data-lang="${code}" class="rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${LANG === code ? 'border-violet-400/60 bg-violet-500/15 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}">${flag} ${t(label)}</button>`).join('')}
              </div>
            </div>
            <form id="pwForm" class="space-y-3 border-t border-white/10 pt-5">
              <p class="text-sm font-semibold text-slate-200">${t("Parolni o'zgartirish")}</p>
              <input id="pw1" type="password" required minlength="6" placeholder="${t('Yangi parol')}" class="fld w-full rounded-xl px-3.5 py-2.5 text-sm outline-none" />
              <input id="pw2" type="password" required minlength="6" placeholder="${t('Parolni tasdiqlang')}" class="fld w-full rounded-xl px-3.5 py-2.5 text-sm outline-none" />
              <button type="submit" class="btn-grad w-full rounded-xl py-2.5 text-sm font-bold text-white transition">${t('Yangilash')}</button>
            </form>
          </div>
          <div class="border-t border-white/10 p-6">
            <button type="button" data-close class="w-full rounded-xl bg-white/10 py-3 text-sm font-bold text-white transition hover:bg-white/15">${t('Yopish')}</button>
          </div>
        </div>
      `);
      $$('[data-lang]', $('#modalRoot')).forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
      $('#pwForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!window.sb) { toast('Tizimga qayta kiring'); return; }
        const p1 = $('#pw1').value, p2 = $('#pw2').value;
        if (p1.length < 6) { toast('Parol kamida 6 belgi bo\'lishi kerak'); return; }
        if (p1 !== p2) { toast('Parollar mos emas'); return; }
        const btn = $('#pwForm button[type="submit"]'); btn.disabled = true;
        const { error } = await window.sb.auth.updateUser({ password: p1 });
        btn.disabled = false;
        if (error) { console.error('Parol:', error); toast('Xatolik: ' + (error.message || 'yangilanmadi')); return; }
        $('#pwForm').reset();
        toast('Parol yangilandi ✓');
      });
    }

    $('#profileLink')?.addEventListener('click', (e) => { e.preventDefault(); profileModal(); });
    $('#settingsLink')?.addEventListener('click', (e) => { e.preventDefault(); settingsModal(); });

    /* =========================================================
       GLOBAL EVENT DELEGATION
    ========================================================= */
    document.addEventListener('click', (e) => {
      const t = e.target;

      // Sidebar nav
      const nav = t.closest('[data-view]');
      if (nav) return go(nav.dataset.view);

      // Generic actions
      const act = t.closest('[data-action]');
      if (act) {
        const a = act.dataset.action;
        if (a === 'add-product') return addProductDrawer();
        if (a === 'create-shop-link') return createShopLink(act);
        if (a === 'withdraw') return withdrawModal('violet');
        if (a === 'wallet-withdraw') return withdrawModal('emerald');
        if (a === 'add-card') return addCardModal();
      }

      // Product detail modals
      const pd = t.closest('[data-product-detail]');
      if (pd) return productDetailModal('seller', Number(pd.dataset.productDetail));
      const md = t.closest('[data-market-detail]');
      if (md) return productDetailModal('market', Number(md.dataset.marketDetail));
      const shd = t.closest('[data-shop-detail]');
      if (shd) return productDetailModal('shop', Number(shd.dataset.shopDetail));

      // Xabarlar
      const oc = t.closest('[data-open-conv]');
      if (oc) { chatSel = oc.dataset.openConv; if (chatDraft && chatDraft.conversation_id !== chatSel) chatDraft = null; renderConvList(); renderThreadPanel(); return; }
      const mr = t.closest('[data-msg-refresh]');
      if (mr) { toast('Yangilanmoqda...'); reloadMessages(); return; }
      const ma = t.closest('#msgAttach');
      if (ma) { const f = $('#msgFile'); if (f) f.click(); return; }
      const mfr = t.closest('[data-msg-file-remove]');
      if (mfr) { chatFile = null; renderMsgFilePrev(); return; }
      const msell = t.closest('[data-msg-seller]');
      if (msell) return messageSeller(Number(msell.dataset.msgSeller));

      // Do'kon boshqaruvi (arxivlash / qaytarish / olib tashlash)
      const sArch = t.closest('[data-shop-archive]');
      if (sArch) return archiveShopProduct(sArch.dataset.shopArchive, true);
      const sUnarch = t.closest('[data-shop-unarchive]');
      if (sUnarch) return archiveShopProduct(sUnarch.dataset.shopUnarchive, false);
      const sRem = t.closest('[data-shop-remove]');
      if (sRem) return removeShopProduct(sRem.dataset.shopRemove);

      // Bozor kategoriya filtri
      const mcat = t.closest('[data-market-cat]');
      if (mcat) {
        marketCategory = mcat.dataset.marketCat;
        $$('.market-cat').forEach((b) => {
          const on = b.dataset.marketCat === marketCategory;
          b.className = `market-cat whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition ${on ? 'btn-grad text-white' : 'bg-white/5 text-slate-300 ring-1 ring-white/10 hover:bg-white/10'}`;
        });
        return renderMarketGrid();
      }

      // Orders: filter tabs
      const ot = t.closest('[data-order-tab]');
      if (ot) {
        $$('.order-tab').forEach((b) => {
          const on = b === ot;
          b.className = `order-tab whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${on ? 'btn-grad text-white' : 'bg-white/5 text-slate-300 ring-1 ring-white/10 hover:bg-white/10'}`;
        });
        return renderOrdersBody(ot.dataset.orderTab);
      }

      // Sales: filter tabs
      const st = t.closest('[data-sales-tab]');
      if (st) {
        $$('.sales-tab').forEach((b) => {
          const on = b === st;
          b.className = `sales-tab whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${on ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white' : 'bg-white/5 text-slate-300 ring-1 ring-white/10 hover:bg-white/10'}`;
        });
        return renderSalesBody(st.dataset.salesTab);
      }

      // Order details + mark shipped
      const od = t.closest('[data-order-details]');
      if (od) return orderDetailsModal(od.dataset.orderDetails);

      const ms = t.closest('[data-mark-shipped]');
      if (ms) {
        const order = merchantOrders.find((o) => o.id === ms.dataset.markShipped);
        if (order) {
          order.status = "Yo'lda";
          // Supabase'da holatni yangilaymiz
          if (order.dbId && window.sb) {
            window.sb.from('orders').update({ status: "Yo'lda" }).eq('id', order.dbId)
              .then(({ error }) => { if (error) console.warn('Holatni yangilashda xatolik:', error); });
          }
        }
        closeModal();
        renderOrdersBody($('.order-tab.btn-grad')?.dataset.orderTab || 'Barchasi');
        return toast('Buyurtma "Yo\'lda" deb belgilandi ✓');
      }

      // Start selling (affiliate marketplace)
      const ss = t.closest('[data-start-selling]');
      if (ss) { closeModal(); return startSellingModal(Number(ss.dataset.startSelling)); }

      // "Sotib olish" — do'kondagi mahsulotni xarid qilish oynasi
      const buy = t.closest('[data-buy]');
      if (buy) { closeModal(); return buyProductModal(Number(buy.dataset.buy)); }

      // Messenjer: platforma tanlash + plitkani o'chirish
      const msel = t.closest('[data-msgr-sel]');
      if (msel) { messengerSel = msel.dataset.msgrSel; return renderView(); }
      const srem = t.closest('[data-social-remove]');
      if (srem) return removeSocial(srem.dataset.socialRemove);

      // Copy link buttons
      const cp = t.closest('[data-copy]');
      if (cp) {
        const text = cp.dataset.copy;
        navigator.clipboard?.writeText(text).catch(() => {});
        toast('Havola nusxalandi ✓');
        return;
      }
    });

    // Bozor qidiruvi (input)
    document.addEventListener('input', (e) => {
      const search = e.target.closest('#marketSearch');
      if (search) { marketQuery = search.value; renderMarketGrid(); }
    });

    // Xabar fayli tanlanganda
    document.addEventListener('change', (e) => {
      const mf = e.target.closest('#msgFile');
      if (!mf) return;
      const f = mf.files && mf.files[0];
      if (f) {
        if (f.size > 25 * 1024 * 1024) { toast('Fayl hajmi 25MB dan oshmasligi kerak'); mf.value = ''; return; }
        chatFile = f;
        renderMsgFilePrev();
      }
      mf.value = '';
    });

    // Xabar yuborish + Instagram saqlash formalari
    document.addEventListener('submit', (e) => {
      const mform = e.target.closest('#msgForm');
      if (mform) { e.preventDefault(); sendCurrentMessage(mform); return; }
      const mgf = e.target.closest('#msgrForm');
      if (mgf) { e.preventDefault(); saveSocial(mgf); }
    });

    /* =========================================================
       PROFIL (haqiqiy Supabase foydalanuvchisi)
    ========================================================= */
    (function initProfile() {
      const user = window.__SOTIBBER_USER;
      const profile = window.__SOTIBBER_PROFILE;
      const displayName = (profile && profile.full_name) || (user && user.email) || 'Foydalanuvchi';
      const displayPhone = (profile && profile.phone) || '';
      $('#profileName').textContent = displayName;
      $('#profileNameFull').textContent = displayName;
      $('#profilePhone').textContent = displayPhone || (user ? user.email : "Telefon raqami qo'shilmagan");
    })();

    $('#logoutBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      window.SotibberAuth?.signOut();
    });

    /* =========================================================
       INIT
    ========================================================= */
    applyI18n();
    if ($('#notifTitle')) $('#notifTitle').textContent = t('Bildirishnomalar');
    updateNotifDot();
    renderSidebar();
    renderView();
  })();
