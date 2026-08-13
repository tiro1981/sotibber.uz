/* =========================================================
   sotibber.uz — Dashboard logic
   Vanilla JavaScript (HTML + CSS + JS)
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
    const uzs = (n) => n.toLocaleString('ru-RU').replace(/,/g, ' ');

    // Status badge — maps Uzbek statuses to consistent colors.
    // Green = success, Blue = in-progress/transit, Amber = pending, Red = canceled, Gray = neutral.
    function badge(status) {
      const map = {
        // success
        'Yetkazildi': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        'Sotuvda': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        'Bajarildi': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        'Chiqarishga tayyor': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        // in-transit / progress
        "Yo'lda": 'bg-blue-50 text-blue-700 ring-blue-200',
        'Yuborildi': 'bg-blue-50 text-blue-700 ring-blue-200',
        // pending
        'Yangi': 'bg-amber-50 text-amber-700 ring-amber-200',
        'Kutilmoqda': 'bg-amber-50 text-amber-700 ring-amber-200',
        'Moderatsiyada': 'bg-amber-50 text-amber-700 ring-amber-200',
        // danger
        'Rad etildi': 'bg-rose-50 text-rose-700 ring-rose-200',
        'Tugagan': 'bg-slate-100 text-slate-500 ring-slate-200',
      };
      const cls = map[status] || 'bg-slate-100 text-slate-600 ring-slate-200';
      return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${cls}">${status}</span>`;
    }

    function toast(msg) {
      const t = $('#toast');
      $('#toastMsg').textContent = msg;
      t.classList.remove('hidden');
      t.firstElementChild.classList.add('animate-fadeUp');
      clearTimeout(toast._t);
      toast._t = setTimeout(() => t.classList.add('hidden'), 2600);
    }

    /* =========================================================
       DATA
       Backend/API ulanguncha bu massivlar bo'sh boshlanadi —
       real hisob ochilgach yoki server ulanganda shu yerga
       haqiqiy ma'lumotlar keladi.
    ========================================================= */
    // Supabase'dan (dashboard/app-init.js orqali) oldindan yuklab qo'yilgan
    // ma'lumotlar bo'lsa, o'sha bilan boshlaymiz — bo'lmasa bo'sh massiv.
    const merchantProducts = Array.isArray(window.__SOTIBBER_PRODUCTS) ? window.__SOTIBBER_PRODUCTS : [];

    const merchantOrders = [];

    const merchantTx = [];

    // Barcha sotuvchilarning sklad mavjud mahsulotlari — app-init.js orqali
    // Supabase'dan oldindan yuklanadi (dashboard/index.html ochilganda).
    let marketProducts = Array.isArray(window.__SOTIBBER_MARKET_PRODUCTS) ? window.__SOTIBBER_MARKET_PRODUCTS : [];

    const agentLinks = [];

    const agentSales = [];

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
    };

    function navIcon(path) {
      return `<svg class="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9">${path}</svg>`;
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
          { id: 'sales', title: 'Mening sotuvlarim', icon: icon.chart },
          { id: 'wallet', title: 'Hamyon', icon: icon.wallet },
        ],
      },
    };

    /* =========================================================
       SHARED UI PARTIALS
    ========================================================= */
    // Summary/stat card
    function statCard({ label, value, sub, accent = 'indigo', badgeText, trend, icon: ic }) {
      const accents = {
        indigo: 'from-indigo-brand to-indigo-deep',
        emerald: 'from-emerald-brand to-teal-500',
        blue: 'from-blue-500 to-indigo-500',
        amber: 'from-amber-500 to-orange-500',
      };
      return `
      <div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
        <div class="flex items-start justify-between">
          <div class="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${accents[accent]} text-white shadow-lg">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">${ic}</svg>
          </div>
          ${badgeText ? badge(badgeText) : (trend ? `<span class="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600"><svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/></svg>${trend}</span>` : '')}
        </div>
        <p class="mt-4 text-sm font-medium text-slate-500">${label}</p>
        <p class="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">${value}</p>
        ${sub ? `<p class="mt-1 text-xs text-slate-400">${sub}</p>` : ''}
      </div>`;
    }

    // Bar chart (pure Tailwind/CSS)
    function barChart() {
      const bars = chartData.map((c) => `
        <div class="group flex h-full flex-1 flex-col items-center justify-end gap-2">
          <div class="relative w-full max-w-[38px] rounded-t-lg bg-gradient-to-t from-indigo-brand to-emerald-brand transition-all duration-500 hover:opacity-90" style="height:${c.v}%">
            <span class="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">${uzs(c.v * 12000)}</span>
          </div>
          <span class="text-xs font-medium text-slate-400">${c.d}</span>
        </div>`).join('');
      return `<div class="flex h-48 items-end gap-2 sm:gap-4">${bars}</div>`;
    }

    // Page section wrapper
    function card(inner, extra = '') {
      return `<div class="rounded-2xl border border-slate-100 bg-white shadow-sm ${extra}">${inner}</div>`;
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
            ${statCard({ label: 'Jami buyurtmalar', value: '0', accent: 'indigo', icon: icon.cart })}
            ${statCard({ label: 'Muvaffaqiyatli sotuvlar', value: '0%', sub: '0 ta yetkazildi', accent: 'emerald', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>' })}
          </div>

          <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <!-- Chart -->
            ${card(`
              <div class="p-5 sm:p-6">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-base font-bold text-slate-900">Sotuvlar dinamikasi</h3>
                    <p class="text-sm text-slate-500">So'nggi 7 kun</p>
                  </div>
                </div>
                <div class="mt-6">${barChart()}</div>
              </div>`, 'lg:col-span-2')}

            <!-- Activity feed -->
            ${card(`
              <div class="p-5 sm:p-6">
                <h3 class="text-base font-bold text-slate-900">So'nggi harakatlar</h3>
                <div class="mt-6 flex flex-col items-center justify-center py-6 text-center">
                  <span class="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-400">
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </span>
                  <p class="mt-3 text-sm font-medium text-slate-500">Hali harakatlar yo'q</p>
                  <p class="mt-1 text-xs text-slate-400">Birinchi buyurtma yoki tranzaksiya shu yerda ko'rinadi</p>
                </div>
              </div>`)}
          </div>
        </div>`,

      products: () => `
        <div class="view-enter space-y-5">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-lg font-bold text-slate-900">Mahsulotlar (Sklad)</h2>
              <p class="text-sm text-slate-500">Jami ${merchantProducts.length} ta mahsulot</p>
            </div>
            <button data-action="add-product" class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-deep active:scale-95">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
              Yangi mahsulot qo'shish
            </button>
          </div>

          <!-- Product cards grid -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            ${merchantProducts.map((p) => `
              <div class="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <div class="relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br ${p.color}">
                  ${p.image
                    ? `<img src="${p.image}" alt="${p.name}" class="h-full w-full object-cover" />`
                    : `<svg class="h-14 w-14 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.4">${icon.box}</svg>`}
                  <div class="absolute right-3 top-3">${badge(p.status)}</div>
                </div>
                <div class="p-4">
                  <h3 class="truncate font-bold text-slate-900">${p.name}</h3>
                  <div class="mt-2 flex items-center justify-between">
                    <span class="text-lg font-extrabold text-slate-900">${uzs(p.price)} <span class="text-xs font-medium text-slate-400">so'm</span></span>
                    <span class="text-xs font-medium text-slate-500">Sklad: <b class="${p.stock === 0 ? 'text-rose-500' : 'text-slate-700'}">${p.stock}</b></span>
                  </div>
                  <div class="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2">
                    <span class="text-xs font-medium text-emerald-700">Komissiya</span>
                    <span class="text-sm font-bold text-emerald-700">${p.commission}% (${uzs(Math.round(p.price * p.commission / 100))} so'm)</span>
                  </div>
                  <div class="mt-3 flex gap-2">
                    <button class="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">Tahrirlash</button>
                    <button class="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">Statistika</button>
                  </div>
                </div>
              </div>`).join('') || `
              <div class="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center">
                <span class="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">${icon.box}</svg>
                </span>
                <p class="mt-3 text-sm font-semibold text-slate-600">Hali mahsulot qo'shilmagan</p>
                <p class="mt-1 max-w-xs text-xs text-slate-400">Birinchi mahsulotingizni qo'shish uchun yuqoridagi tugmani bosing</p>
              </div>`}
          </div>
        </div>`,

      orders: () => {
        const tabs = ['Barchasi', 'Yangi', "Yo'lda", 'Yetkazildi', 'Rad etildi'];
        return `
        <div class="view-enter space-y-5" id="ordersView">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Buyurtmalar</h2>
            <p class="text-sm text-slate-500">Barcha buyurtmalarni boshqaring</p>
          </div>

          <!-- Filter tabs -->
          <div class="flex flex-wrap gap-2 overflow-x-auto">
            ${tabs.map((t, i) => `<button data-order-tab="${t}" class="order-tab whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${i === 0 ? 'bg-indigo-brand text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}">${t}</button>`).join('')}
          </div>

          <!-- Table -->
          ${card(`
            <div class="overflow-x-auto">
              <table class="w-full min-w-[820px] text-left text-sm">
                <thead class="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
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
                <tbody id="ordersBody" class="divide-y divide-slate-50"></tbody>
              </table>
            </div>`)}
        </div>`;
      },

      finance: () => `
        <div class="view-enter space-y-6">
          <h2 class="text-lg font-bold text-slate-900">Moliya</h2>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <!-- Balance card -->
            <div class="rounded-2xl bg-gradient-to-br from-indigo-deep via-indigo-brand to-emerald-brand p-6 text-white shadow-xl lg:col-span-2">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-sm text-indigo-100">Umumiy balans</p>
                  <p class="mt-1 text-3xl font-extrabold sm:text-4xl">${uzs(0)} <span class="text-lg font-semibold text-indigo-200">so'm</span></p>
                </div>
              </div>
              <div class="mt-6 flex flex-wrap items-center gap-3">
                <button data-action="withdraw" class="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-indigo-brand shadow-lg transition hover:bg-slate-50 active:scale-95">
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v8m0 0l-3-3m3 3l3-3M4 6h16M4 6v12a2 2 0 002 2h12a2 2 0 002-2V6"/></svg>
                  Pul chiqarish
                </button>
                <div class="text-sm text-indigo-100">Escrow: <b class="text-white">${uzs(0)} so'm</b></div>
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
            <div class="border-b border-slate-100 px-5 py-4">
              <h3 class="font-bold text-slate-900">Tranzaksiyalar tarixi</h3>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[640px] text-left text-sm">
                <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="px-5 py-3 font-semibold">Sana</th>
                    <th class="px-5 py-3 font-semibold">Tranzaksiya ID</th>
                    <th class="px-5 py-3 font-semibold">Turi</th>
                    <th class="px-5 py-3 font-semibold">Summa</th>
                    <th class="px-5 py-3 font-semibold">Holat</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                  ${merchantTx.map((t) => `
                    <tr class="transition hover:bg-slate-50">
                      <td class="px-5 py-3.5 text-slate-500">${t.date}</td>
                      <td class="px-5 py-3.5 font-mono text-xs text-slate-600">${t.id}</td>
                      <td class="px-5 py-3.5">
                        <span class="inline-flex items-center gap-1.5 font-medium ${t.type === 'in' ? 'text-emerald-600' : 'text-slate-600'}">
                          <span class="grid h-6 w-6 place-items-center rounded-full ${t.type === 'in' ? 'bg-emerald-50' : 'bg-slate-100'}">
                            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="${t.type === 'in' ? 'M12 5v14m0 0l-6-6m6 6l6-6' : 'M12 19V5m0 0l-6 6m6-6l6 6'}"/></svg>
                          </span>
                          ${t.type === 'in' ? 'Sotuvdan' : 'Yechish'}
                        </span>
                      </td>
                      <td class="px-5 py-3.5 font-bold ${t.type === 'in' ? 'text-emerald-600' : 'text-slate-900'}">${t.type === 'in' ? '+' : '−'}${uzs(t.amount)} so'm</td>
                      <td class="px-5 py-3.5">${badge(t.status)}</td>
                    </tr>`).join('') || `<tr><td colspan="5" class="px-5 py-10 text-center text-slate-400">Hali tranzaksiya yo'q</td></tr>`}
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
            <div class="rounded-2xl bg-gradient-to-br from-emerald-brand to-teal-500 p-5 text-white shadow-lg">
              <p class="text-sm text-emerald-50">Mening balansim</p>
              <p class="mt-1 text-3xl font-extrabold">${uzs(0)} <span class="text-base font-semibold text-emerald-100">so'm</span></p>
              <button data-action="wallet-withdraw" class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold backdrop-blur transition hover:bg-white/25">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v8m0 0l-3-3m3 3l3-3"/></svg>
                Pul chiqarish
              </button>
            </div>
            ${statCard({ label: 'Kutilayotgan komissiya', value: uzs(0) + ' so\'m', sub: "Yo'ldagi buyurtmalardan", accent: 'blue', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>' })}
            ${statCard({ label: 'Jami sotilgan mahsulotlar', value: '0 ta', accent: 'indigo', icon: icon.box })}
          </div>

          <!-- Referral performance -->
          ${card(`
            <div class="p-5 sm:p-6">
              <div class="flex items-center justify-between">
                <h3 class="text-base font-bold text-slate-900">Referal havolalar samaradorligi</h3>
                <span class="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-brand">Bu oy</span>
              </div>
              <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div class="rounded-xl bg-slate-50 p-4">
                  <div class="flex items-center gap-2 text-slate-500"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/></svg><span class="text-xs font-medium">Bosishlar (Clicks)</span></div>
                  <p class="mt-2 text-2xl font-extrabold text-slate-900">0</p>
                </div>
                <div class="rounded-xl bg-slate-50 p-4">
                  <div class="flex items-center gap-2 text-slate-500"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span class="text-xs font-medium">Konversiyalar</span></div>
                  <p class="mt-2 text-2xl font-extrabold text-slate-900">0 <span class="text-sm font-semibold text-slate-400">(0%)</span></p>
                </div>
                <div class="rounded-xl bg-emerald-50 p-4">
                  <div class="flex items-center gap-2 text-emerald-600"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2"/></svg><span class="text-xs font-medium">Ishlangan komissiya</span></div>
                  <p class="mt-2 text-2xl font-extrabold text-emerald-700">${uzs(0)} so'm</p>
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
              <h2 class="text-lg font-bold text-slate-900">Mahsulotlar bozori</h2>
              <p class="text-sm text-slate-500">Sotish uchun mahsulot tanlang va daromad qiling</p>
            </div>
            <div class="relative">
              <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"/></svg>
              <input type="text" placeholder="Mahsulot qidirish..." class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-brand focus:ring-2 focus:ring-indigo-100 sm:w-64" />
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            ${marketProducts.map((p, i) => `
              <div class="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <div class="flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br ${p.color}">
                  ${p.image
                    ? `<img src="${p.image}" alt="${p.name}" class="h-full w-full object-cover" />`
                    : `<svg class="h-14 w-14 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.4">${icon.box}</svg>`}
                </div>
                <div class="p-4">
                  <h3 class="truncate font-bold text-slate-900">${p.name}</h3>
                  <p class="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">${icon.store}</svg>${p.merchant}
                  </p>
                  <p class="mt-2 text-lg font-extrabold text-slate-900">${uzs(p.price)} <span class="text-xs font-medium text-slate-400">so'm</span></p>
                  <div class="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-center">
                    <span class="text-sm font-medium text-emerald-700">Komissiya: </span>
                    <span class="text-base font-extrabold text-emerald-700">${uzs(p.commission)} so'm</span>
                  </div>
                  <button data-start-selling="${i}" class="mt-3 w-full rounded-xl bg-indigo-brand py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-deep active:scale-95">
                    Sotishni boshlash
                  </button>
                </div>
              </div>`).join('') || `
              <div class="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center">
                <span class="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">${icon.store}</svg>
                </span>
                <p class="mt-3 text-sm font-semibold text-slate-600">Bozorda hali mahsulot yo'q</p>
                <p class="mt-1 max-w-xs text-xs text-slate-400">Sotuvchilar mahsulot qo'shishi bilan shu yerda paydo bo'ladi</p>
              </div>`}
          </div>
        </div>`;
      },

      // "Mening do'konim" — agentning shaxsiy web-ilova do'koni.
      // Xaridor havola (sotibber.uz/shop/...) orqali kirganda shu do'konni
      // ko'radi va to'g'ridan-to'g'ri "Sotib olish" orqali buyurtma beradi.
      shop: () => {
        const shopUrl = 'sotibber.uz/shop/mening-dokonim';
        const totalSales = agentLinks.reduce((s, l) => s + l.sales, 0);
        const totalClicks = agentLinks.reduce((s, l) => s + l.clicks, 0);
        return `
        <div class="view-enter space-y-6">
          <!-- Do'kon sarlavhasi + havola -->
          <div class="rounded-2xl bg-gradient-to-br from-indigo-deep via-indigo-brand to-emerald-brand p-6 text-white shadow-xl">
            <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div class="flex items-center gap-3">
                <span class="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-white/15">
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">${icon.shop}</svg>
                </span>
                <div>
                  <h2 class="text-xl font-extrabold">Mening do'konim</h2>
                  <p class="text-sm text-indigo-100">Shaxsiy web-ilova do'koningiz</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <div class="flex-1 truncate rounded-xl bg-white/15 px-3.5 py-2.5 font-mono text-sm md:w-56">${shopUrl}</div>
                <button data-copy="${shopUrl}" class="flex-shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-brand transition hover:bg-slate-50">Nusxalash</button>
                <a href="${'https://' + shopUrl}" target="_blank" rel="noopener" class="hidden flex-shrink-0 items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/25 sm:inline-flex">
                  Ochish
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                </a>
              </div>
            </div>
            <!-- mini statistika -->
            <div class="mt-5 grid grid-cols-3 gap-3 text-center">
              <div class="rounded-xl bg-white/10 p-3"><p class="text-lg font-extrabold">${agentLinks.length}</p><p class="text-[11px] text-indigo-100">Mahsulot</p></div>
              <div class="rounded-xl bg-white/10 p-3"><p class="text-lg font-extrabold">${totalClicks}</p><p class="text-[11px] text-indigo-100">Tashriflar</p></div>
              <div class="rounded-xl bg-white/10 p-3"><p class="text-lg font-extrabold">${totalSales}</p><p class="text-[11px] text-indigo-100">Sotuvlar</p></div>
            </div>
          </div>

          <!-- Xaridor nima ko'rishini tushuntiruvchi banner -->
          <div class="flex items-start gap-2.5 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700 ring-1 ring-blue-100">
            <svg class="mt-0.5 h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>Xaridor havola orqali kirganda quyidagi do'koningizni ko'radi va <b>"Sotib olish"</b> tugmasi orqali to'g'ridan-to'g'ri buyurtma beradi. Har bir sotuvdan komissiyangiz hisobingizga tushadi.</span>
          </div>

          <!-- Do'kon vitrinasi -->
          <div>
            <h3 class="mb-3 font-bold text-slate-900">Do'kondagi mahsulotlar</h3>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              ${agentLinks.map((l, i) => `
                <div class="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div class="flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-100 to-emerald-50">
                    ${l.image
                      ? `<img src="${l.image}" alt="${l.product}" class="h-full w-full object-cover" />`
                      : `<svg class="h-14 w-14 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.4">${icon.box}</svg>`}
                  </div>
                  <div class="p-4">
                    <h4 class="truncate font-bold text-slate-900">${l.product}</h4>
                    <p class="mt-2 text-lg font-extrabold text-slate-900">${uzs(l.price)} <span class="text-xs font-medium text-slate-400">so'm</span></p>
                    <div class="mt-2 flex items-center justify-between text-xs">
                      <span class="rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700">Ulush: ${uzs(l.commission)} so'm</span>
                      <span class="text-slate-400">${l.sales} ta sotilgan</span>
                    </div>
                    <div class="mt-3 flex gap-2">
                      <button data-buy="${i}" class="flex-1 rounded-xl bg-emerald-brand py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:opacity-90 active:scale-95">
                        Sotib olish
                      </button>
                      <button data-copy="${shopUrl}/${l.slug}" class="grid w-11 flex-shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-brand transition hover:bg-indigo-100" title="Mahsulot havolasini nusxalash">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                      </button>
                    </div>
                  </div>
                </div>`).join('') || `
              <div class="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center">
                <span class="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">${icon.shop}</svg>
                </span>
                <p class="mt-3 text-sm font-semibold text-slate-600">Do'koningizda hali mahsulot yo'q</p>
                <p class="mt-1 max-w-xs text-xs text-slate-400">"Mahsulotlar bozori"dan mahsulot tanlab, "Sotishni boshlash" tugmasini bosing</p>
              </div>`}
            </div>
          </div>
        </div>`;
      },

      sales: () => {
        const tabs = ['Barchasi', "Yo'lda", 'Yetkazildi', 'Rad etildi'];
        return `
        <div class="view-enter space-y-5" id="salesView">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Mening sotuvlarim</h2>
            <p class="text-sm text-slate-500">Havolalaringiz orqali qilingan buyurtmalar</p>
          </div>
          <div class="flex flex-wrap gap-2">
            ${tabs.map((t, i) => `<button data-sales-tab="${t}" class="sales-tab whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${i === 0 ? 'bg-emerald-brand text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}">${t}</button>`).join('')}
          </div>
          ${card(`
            <div class="overflow-x-auto">
              <table class="w-full min-w-[680px] text-left text-sm">
                <thead class="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th class="px-5 py-3 font-semibold">Buyurtma ID</th>
                    <th class="px-5 py-3 font-semibold">Mahsulot</th>
                    <th class="px-5 py-3 font-semibold">Sana</th>
                    <th class="px-5 py-3 font-semibold">Mijoz</th>
                    <th class="px-5 py-3 font-semibold">Holat</th>
                    <th class="px-5 py-3 font-semibold">Ishlangan komissiya</th>
                  </tr>
                </thead>
                <tbody id="salesBody" class="divide-y divide-slate-50"></tbody>
              </table>
            </div>`)}
        </div>`;
      },

      wallet: () => `
        <div class="view-enter space-y-6">
          <h2 class="text-lg font-bold text-slate-900">Hamyon</h2>

          <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <!-- Balance + payout -->
            <div class="space-y-4 lg:col-span-2">
              <div class="rounded-2xl bg-gradient-to-br from-emerald-brand to-teal-600 p-6 text-white shadow-xl">
                <p class="text-sm text-emerald-50">Mavjud balans</p>
                <p class="mt-1 text-3xl font-extrabold sm:text-4xl">${uzs(0)} <span class="text-lg font-semibold text-emerald-100">so'm</span></p>
                <button data-action="wallet-withdraw" class="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-emerald-700 shadow-lg transition hover:bg-emerald-50 active:scale-95">
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v8m0 0l-3-3m3 3l3-3M4 6h16"/></svg>
                  Pul chiqarish
                </button>
              </div>

              <!-- Withdrawal history -->
              ${card(`
                <div class="border-b border-slate-100 px-5 py-4">
                  <h3 class="font-bold text-slate-900">Yechib olishlar tarixi</h3>
                  <p class="text-xs text-slate-500">Har bir yechishda 1% platforma komissiyasi ushlanadi</p>
                </div>
                <div class="overflow-x-auto">
                  <table class="w-full min-w-[520px] text-left text-sm">
                    <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th class="px-5 py-3 font-semibold">Sana</th>
                        <th class="px-5 py-3 font-semibold">Karta</th>
                        <th class="px-5 py-3 font-semibold">Summa</th>
                        <th class="px-5 py-3 font-semibold">Komissiya (1%)</th>
                        <th class="px-5 py-3 font-semibold">Holat</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                      ${[].map((w) => `
                        <tr class="transition hover:bg-slate-50">
                          <td class="px-5 py-3.5 text-slate-500">${w.date}</td>
                          <td class="px-5 py-3.5 font-medium text-slate-700">${w.card}</td>
                          <td class="px-5 py-3.5 font-bold text-slate-900">${uzs(w.amount)} so'm</td>
                          <td class="px-5 py-3.5 text-rose-500">−${uzs(Math.round(w.amount * 0.01))} so'm</td>
                          <td class="px-5 py-3.5">${badge(w.status)}</td>
                        </tr>`).join('') || `<tr><td colspan="5" class="px-5 py-10 text-center text-slate-400">Hali yechib olish tarixi yo'q</td></tr>`}
                    </tbody>
                  </table>
                </div>`)}
            </div>

            <!-- Saved cards -->
            <div class="space-y-4">
              <h3 class="font-bold text-slate-900">Mening kartalarim</h3>
              <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center">
                <span class="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-400">
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">${icon.wallet}</svg>
                </span>
                <p class="mt-3 text-sm font-semibold text-slate-600">Hali karta qo'shilmagan</p>
                <p class="mt-1 max-w-[200px] text-xs text-slate-400">Pul chiqarish uchun karta qo'shing</p>
              </div>
              <button data-action="add-card" class="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-4 text-sm font-semibold text-slate-500 transition hover:border-indigo-brand hover:text-indigo-brand">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
                Yangi karta qo'shish
              </button>
            </div>
          </div>
        </div>`,
    };

    const VIEWS = { seller: sellerViews, affiliate: affiliateViews };

    /* =========================================================
       ORDER / SALES TABLE RENDERERS (filterable)
    ========================================================= */
    function renderOrdersBody(filter = 'Barchasi') {
      const body = $('#ordersBody');
      if (!body) return;
      const rows = merchantOrders.filter((o) => filter === 'Barchasi' || o.status === filter);
      body.innerHTML = rows.map((o) => `
        <tr class="transition hover:bg-slate-50">
          <td class="px-4 py-3.5 font-mono text-xs font-semibold text-indigo-brand">${o.id}</td>
          <td class="px-4 py-3.5 font-medium text-slate-800">${o.product}</td>
          <td class="px-4 py-3.5 text-slate-500">${o.phone}</td>
          <td class="px-4 py-3.5 text-slate-600">${o.agent}</td>
          <td class="px-4 py-3.5 font-semibold text-emerald-600">${uzs(o.commission)}</td>
          <td class="px-4 py-3.5 font-bold text-slate-900">${uzs(o.total)}</td>
          <td class="px-4 py-3.5 text-slate-500">${o.date}</td>
          <td class="px-4 py-3.5">${badge(o.status)}</td>
          <td class="px-4 py-3.5">
            <div class="flex justify-end gap-1.5">
              ${o.status === 'Yangi' ? `<button data-mark-shipped="${o.id}" class="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100">Yuborildi</button>` : ''}
              <button data-order-details="${o.id}" class="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200">Tafsilotlar</button>
            </div>
          </td>
        </tr>`).join('') || `<tr><td colspan="9" class="px-4 py-10 text-center text-slate-400">Bu holatda buyurtmalar yo'q</td></tr>`;
    }

    function renderSalesBody(filter = 'Barchasi') {
      const body = $('#salesBody');
      if (!body) return;
      const rows = agentSales.filter((s) => filter === 'Barchasi' || s.status === filter);
      body.innerHTML = rows.map((s) => `
        <tr class="transition hover:bg-slate-50">
          <td class="px-5 py-3.5 font-mono text-xs font-semibold text-indigo-brand">${s.id}</td>
          <td class="px-5 py-3.5 font-medium text-slate-800">${s.product}</td>
          <td class="px-5 py-3.5 text-slate-500">${s.date}</td>
          <td class="px-5 py-3.5"><span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500" title="Maxfiylik uchun yashirilgan">${s.customer}</span></td>
          <td class="px-5 py-3.5">${badge(s.status)}</td>
          <td class="px-5 py-3.5 font-bold ${s.commission > 0 ? 'text-emerald-600' : 'text-slate-400'}">${s.commission > 0 ? uzs(s.commission) + " so'm" : '—'}</td>
        </tr>`).join('') || `<tr><td colspan="6" class="px-5 py-10 text-center text-slate-400">Buyurtmalar yo'q</td></tr>`;
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
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div data-close class="absolute inset-0 animate-fadeIn bg-slate-900/60 backdrop-blur-sm"></div>
          <div class="relative w-full ${size} animate-fadeUp rounded-3xl bg-white shadow-2xl">${html}</div>
        </div>`;
      document.body.style.overflow = 'hidden';
      root.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeModal));
    }

    // Right slide-over drawer
    function openDrawer(html, { size = 'max-w-md' } = {}) {
      const root = $('#modalRoot');
      root.innerHTML = `
        <div class="fixed inset-0 z-50">
          <div data-close class="absolute inset-0 animate-fadeIn bg-slate-900/60 backdrop-blur-sm"></div>
          <div class="absolute right-0 top-0 h-full w-full ${size} animate-slideIn overflow-y-auto bg-white shadow-2xl">${html}</div>
        </div>`;
      document.body.style.overflow = 'hidden';
      root.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeModal));
    }

    /* ---- Add Product drawer (merchant) ---- */
    function addProductDrawer() {
      openDrawer(`
        <form id="productForm" class="flex min-h-full flex-col">
          <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 class="text-lg font-bold text-slate-900">Yangi mahsulot qo'shish</h3>
            <button type="button" data-close class="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="flex-1 space-y-5 p-6">
            <!-- Image upload -->
            <label id="imageDropZone" for="productImageInput" class="flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 py-8 text-center transition hover:border-indigo-brand hover:bg-indigo-50/30">
              <input type="file" id="productImageInput" accept="image/png,image/jpeg" class="hidden" />
              <div id="imageDropContent">
                <svg class="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.6-4.6a2 2 0 012.8 0L16 16m-2-2l1.6-1.6a2 2 0 012.8 0L20 14M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z"/><circle cx="9" cy="10" r="1.5"/></svg>
                <p class="mt-2 text-sm font-medium text-slate-500">Rasm yuklash uchun bosing</p>
                <p class="text-xs text-slate-400">PNG, JPG (max 5MB)</p>
              </div>
            </label>

            <label class="block">
              <span class="text-sm font-semibold text-slate-700">Mahsulot nomi</span>
              <input required id="productNameInput" type="text" placeholder="Masalan: AirPods Pro 2" class="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-brand focus:ring-2 focus:ring-indigo-100" />
            </label>

            <label class="block">
              <span class="text-sm font-semibold text-slate-700">Tavsifi</span>
              <textarea id="productDescInput" rows="3" placeholder="Mahsulot haqida qisqacha ma'lumot..." class="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-brand focus:ring-2 focus:ring-indigo-100"></textarea>
            </label>

            <div class="grid grid-cols-2 gap-4">
              <label class="block">
                <span class="text-sm font-semibold text-slate-700">Narxi (so'm)</span>
                <input required id="priceInput" type="number" value="150000" min="0" class="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-brand focus:ring-2 focus:ring-indigo-100" />
              </label>
              <label class="block">
                <span class="text-sm font-semibold text-slate-700">Sklad soni</span>
                <input required id="stockInput" type="number" value="10" min="0" class="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-brand focus:ring-2 focus:ring-indigo-100" />
              </label>
            </div>

            <!-- Commission slider with computed UZS -->
            <div class="rounded-2xl bg-slate-50 p-4">
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-slate-700">Komissiya ulushi</span>
                <span class="rounded-lg bg-white px-2.5 py-1 text-sm font-bold text-indigo-brand"><span id="commPct">15</span>%</span>
              </div>
              <input id="commSlider" type="range" min="0" max="50" value="15" class="mt-3 w-full cursor-pointer" />
              <div class="mt-2 flex items-center justify-between text-xs">
                <span class="text-slate-400">0%</span>
                <span class="rounded-lg bg-emerald-50 px-3 py-1 font-bold text-emerald-700">Agent oladi: <span id="commUzs">22 500</span> so'm</span>
                <span class="text-slate-400">50%</span>
              </div>
            </div>
          </div>

          <div class="sticky bottom-0 flex gap-3 border-t border-slate-100 bg-white p-6">
            <button type="button" data-close class="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Bekor qilish</button>
            <button type="submit" class="flex-1 rounded-xl bg-indigo-brand py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-deep">Saqlash</button>
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

      // ---- Rasm yuklash (image upload) ----
      const dropZone = $('#imageDropZone');
      const dropContent = $('#imageDropContent');
      const imageInput = $('#productImageInput');
      const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
      let productImageDataUrl = null;
      let productImageFile = null;

      function showImageError(msg) {
        toast(msg);
        imageInput.value = '';
      }

      function renderImagePreview(dataUrl, fileName) {
        dropContent.innerHTML = `
          <img src="${dataUrl}" alt="Mahsulot rasmi" class="mx-auto h-28 w-28 rounded-xl border border-slate-200 object-cover shadow-sm" />
          <p class="mt-2 max-w-[220px] truncate text-xs font-semibold text-slate-600">${fileName}</p>
          <p class="mt-0.5 text-xs font-semibold text-indigo-brand">Almashtirish uchun bosing</p>
          <button type="button" id="removeImageBtn" class="mt-1 text-xs font-medium text-rose-500 hover:underline">Olib tashlash</button>
        `;
        // "Olib tashlash" tugmasi label'ning fayl tanlash click'ini ishga tushirmasligi kerak
        $('#removeImageBtn')?.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          resetImageDropzone();
        });
      }

      function resetImageDropzone() {
        productImageDataUrl = null;
        productImageFile = null;
        imageInput.value = '';
        dropContent.innerHTML = `
          <svg class="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.6-4.6a2 2 0 012.8 0L16 16m-2-2l1.6-1.6a2 2 0 012.8 0L20 14M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z"/><circle cx="9" cy="10" r="1.5"/></svg>
          <p class="mt-2 text-sm font-medium text-slate-500">Rasm yuklash uchun bosing</p>
          <p class="text-xs text-slate-400">PNG, JPG (max 5MB)</p>
        `;
      }

      function handleImageFile(file) {
        if (!file) return;
        if (!['image/png', 'image/jpeg'].includes(file.type)) {
          return showImageError("Faqat PNG yoki JPG formatidagi rasm yuklang");
        }
        if (file.size > MAX_IMAGE_BYTES) {
          return showImageError("Rasm hajmi 5MB dan oshmasligi kerak");
        }
        productImageFile = file;
        const reader = new FileReader();
        reader.onload = () => {
          productImageDataUrl = reader.result;
          renderImagePreview(productImageDataUrl, file.name);
        };
        reader.onerror = () => showImageError("Rasmni o'qib bo'lmadi, qayta urinib ko'ring");
        reader.readAsDataURL(file);
      }

      imageInput.addEventListener('change', () => handleImageFile(imageInput.files && imageInput.files[0]));

      // Drag & drop
      ['dragover', 'dragenter'].forEach((evt) => dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropZone.classList.add('border-indigo-brand', 'bg-indigo-50/30');
      }));
      ['dragleave', 'drop'].forEach((evt) => dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-indigo-brand', 'bg-indigo-50/30');
      }));
      dropZone.addEventListener('drop', (e) => {
        const file = e.dataTransfer?.files && e.dataTransfer.files[0];
        if (file) handleImageFile(file);
      });

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
          'from-indigo-100 to-indigo-50',
          'from-emerald-100 to-teal-50',
          'from-amber-100 to-orange-50',
          'from-rose-100 to-pink-50',
          'from-purple-100 to-fuchsia-50',
          'from-sky-100 to-cyan-50',
        ];
        const color = palette[Math.floor(Math.random() * palette.length)];

        try {
          let imageUrl = null;
          if (productImageFile) {
            try {
              const ext = (productImageFile.name.split('.').pop() || 'jpg').toLowerCase();
              const path = `${user.id}/${Date.now()}.${ext}`;
              const { error: upErr } = await window.sb.storage.from('product-images').upload(path, productImageFile);
              if (upErr) throw upErr;
              const { data: pub } = window.sb.storage.from('product-images').getPublicUrl(path);
              imageUrl = pub && pub.publicUrl ? pub.publicUrl : null;
            } catch (imgErr) {
              // Rasm yuklab bo'lmadi (masalan, "product-images" bucket sozlanmagan) —
              // mahsulotni rasm-siz baribir saqlaymiz, faqat ogohlantiramiz.
              console.warn('Rasmni yuklab bo\'lmadi, mahsulot rasm-siz saqlanadi:', imgErr);
              toast('Rasmni yuklab bo\'lmadi — mahsulot rasm-siz saqlanadi');
            }
          }

          const { data, error } = await window.sb
            .from('products')
            .insert({
              seller_id: user.id,
              name,
              description: $('#productDescInput').value.trim(),
              price: priceVal,
              stock: stockVal,
              commission: commissionVal,
              status: 'Moderatsiyada',
              image_url: imageUrl,
              color,
            })
            .select()
            .single();
          if (error) throw error;

          merchantProducts.unshift({
            id: data.id,
            name: data.name,
            price: Number(data.price),
            stock: data.stock,
            commission: Number(data.commission),
            status: data.status,
            color: data.color,
            image: data.image_url,
          });

          closeModal();
          toast('Mahsulot moderatsiyaga yuborildi ✓');
          // Mahsulotlar sahifasi ochiq bo'lsa, ro'yxatni darhol yangilaymiz
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
    function withdrawModal(theme = 'indigo') {
      const accent = theme === 'emerald' ? 'emerald-brand' : 'indigo-brand';
      openModal(`
        <form id="withdrawForm">
          <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 class="text-lg font-bold text-slate-900">Pul chiqarish</h3>
            <button type="button" data-close class="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="space-y-4 p-6">
            <label class="block">
              <span class="text-sm font-semibold text-slate-700">Kartani tanlang</span>
              <select class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-${accent} focus:ring-2 focus:ring-indigo-100">
                <option>Uzcard •• 4821</option>
                <option>Humo •• 9037</option>
                <option>+ Yangi karta qo'shish</option>
              </select>
            </label>
            <label class="block">
              <span class="text-sm font-semibold text-slate-700">Chiqarish summasi (so'm)</span>
              <input id="wAmount" type="number" value="1000000" min="10000" step="10000" class="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-lg font-bold outline-none focus:border-${accent} focus:ring-2 focus:ring-indigo-100" />
            </label>

            <!-- Fee breakdown -->
            <div class="space-y-2 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
              <div class="flex items-center gap-2 text-amber-700">
                <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                <span class="text-xs font-semibold">1% platforma komissiyasi ushlab qolinadi</span>
              </div>
              <div class="flex justify-between text-sm"><span class="text-slate-500">Summa</span><span id="wGross" class="font-semibold text-slate-700">1 000 000 so'm</span></div>
              <div class="flex justify-between text-sm"><span class="text-slate-500">Komissiya (1%)</span><span id="wFee" class="font-semibold text-rose-500">−10 000 so'm</span></div>
              <div class="flex justify-between border-t border-amber-200 pt-2 text-sm"><span class="font-semibold text-slate-700">Qo'lga tegadigan</span><span id="wNet" class="font-extrabold text-emerald-600">990 000 so'm</span></div>
            </div>
          </div>
          <div class="flex gap-3 border-t border-slate-100 p-6">
            <button type="button" data-close class="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Bekor qilish</button>
            <button type="submit" class="flex-1 rounded-xl bg-${accent} py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90">Tasdiqlash</button>
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
          <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 class="text-lg font-bold text-slate-900">Yangi karta qo'shish</h3>
            <button type="button" data-close class="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="space-y-4 p-6">
            <label class="block">
              <span class="text-sm font-semibold text-slate-700">Karta raqami</span>
              <input required inputmode="numeric" placeholder="8600 0000 0000 0000" maxlength="19" class="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-sm outline-none focus:border-indigo-brand focus:ring-2 focus:ring-indigo-100" />
            </label>
            <div class="grid grid-cols-2 gap-4">
              <label class="block">
                <span class="text-sm font-semibold text-slate-700">Amal qilish muddati</span>
                <input required placeholder="MM/YY" maxlength="5" class="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-brand focus:ring-2 focus:ring-indigo-100" />
              </label>
              <label class="block">
                <span class="text-sm font-semibold text-slate-700">Karta turi</span>
                <select class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-brand focus:ring-2 focus:ring-indigo-100">
                  <option>Uzcard</option><option>Humo</option>
                </select>
              </label>
            </div>
            <p class="flex items-center gap-1.5 text-xs text-slate-400">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              Ma'lumotlaringiz shifrlangan holda saqlanadi
            </p>
          </div>
          <div class="flex gap-3 border-t border-slate-100 p-6">
            <button type="button" data-close class="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Bekor qilish</button>
            <button type="submit" class="flex-1 rounded-xl bg-indigo-brand py-3 text-sm font-bold text-white shadow-lg transition hover:bg-indigo-deep">Kartani saqlash</button>
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
          <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h3 class="text-lg font-bold text-slate-900">Buyurtma ${o.id}</h3>
              <p class="text-xs text-slate-500">${o.date}</p>
            </div>
            <button type="button" data-close class="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="space-y-4 p-6">
            <div class="flex items-center justify-between">
              <span class="text-sm text-slate-500">Holat</span>${badge(o.status)}
            </div>
            <div class="space-y-3 rounded-2xl bg-slate-50 p-4 text-sm">
              <div class="flex justify-between"><span class="text-slate-500">Mahsulot</span><span class="font-semibold text-slate-800">${o.product}</span></div>
              <div class="flex justify-between"><span class="text-slate-500">Mijoz telefoni</span><span class="font-medium text-slate-700">${o.phone}</span></div>
              <div class="flex justify-between"><span class="text-slate-500">Sotib beruvchi (agent)</span><span class="font-medium text-slate-700">${o.agent}</span></div>
              <div class="flex justify-between border-t border-slate-200 pt-3"><span class="text-slate-500">Umumiy summa</span><span class="font-bold text-slate-900">${uzs(o.total)} so'm</span></div>
              <div class="flex justify-between"><span class="text-slate-500">Agent komissiyasi</span><span class="font-bold text-emerald-600">${uzs(o.commission)} so'm</span></div>
              <div class="flex justify-between"><span class="text-slate-500">Sizning foydangiz</span><span class="font-bold text-indigo-brand">${uzs(o.total - o.commission)} so'm</span></div>
            </div>
          </div>
          <div class="flex gap-3 border-t border-slate-100 p-6">
            <button type="button" data-close class="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Yopish</button>
            ${o.status === 'Yangi' ? `<button data-mark-shipped="${o.id}" class="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-blue-700">Yuborildi deb belgilash</button>` : ''}
          </div>
        </div>
      `);
    }

    /* ---- Start selling success modal (affiliate) ---- */
    function startSellingModal(idx) {
      const p = marketProducts[idx];
      const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 8) + (100 + idx);
      const link = `sotibber.uz/shop/mening-dokonim/${slug}`;
      // Mahsulotni "Mening do'konim"ga qo'shamiz (agar avval qo'shilmagan bo'lsa)
      if (!agentLinks.some((l) => l.product === p.name)) {
        agentLinks.push({
          product: p.name,
          price: p.price,
          commission: p.commission,
          clicks: 0,
          sales: 0,
          slug,
          image: p.image,
        });
      }
      openModal(`
        <div>
          <div class="flex flex-col items-center px-6 pt-8 text-center">
            <span class="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
            </span>
            <h3 class="mt-4 text-xl font-extrabold text-slate-900">Havola tayyor! 🎉</h3>
            <p class="mt-1 text-sm text-slate-500">"${p.name}" endi sizning shaxsiy do'koningizda. Havolani ijtimoiy tarmoqlarga joylang.</p>
          </div>
          <div class="p-6">
            <span class="text-sm font-semibold text-slate-700">Shaxsiy do'kon linki</span>
            <div class="mt-1.5 flex items-center gap-2">
              <div class="flex-1 truncate rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-sm text-slate-700">${link}</div>
              <button data-copy="${link}" class="flex-shrink-0 rounded-xl bg-indigo-brand px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-deep">Nusxalash</button>
            </div>

            <div class="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
              <span class="text-sm font-medium text-emerald-700">Har bir sotuvdan olasiz</span>
              <span class="text-base font-extrabold text-emerald-700">${uzs(p.commission)} so'm</span>
            </div>

            <p class="mt-5 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Tezkor ulashish</p>
            <div class="mt-3 flex justify-center gap-3">
              <a href="#" class="grid h-12 w-12 place-items-center rounded-2xl bg-sky-100 text-sky-600 transition hover:scale-105" aria-label="Telegram"><svg class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.3 18.5 20c-.2 1.1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.7 13.6 1.9 12c-1-.3-1-1 .2-1.5l18.2-7c.9-.3 1.6.2 1.6 1.8Z"/></svg></a>
              <a href="#" class="grid h-12 w-12 place-items-center rounded-2xl bg-pink-100 text-pink-600 transition hover:scale-105" aria-label="Instagram"><svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a>
              <a href="#" class="grid h-12 w-12 place-items-center rounded-2xl bg-slate-200 text-slate-800 transition hover:scale-105" aria-label="TikTok"><svg class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M16 3c.3 2.5 1.7 4 4 4.2v2.8c-1.3.1-2.7-.2-4-1v6.2c0 4-2.9 6.3-6.3 5.7-3-.5-4.8-3.5-4-6.5.6-2.4 2.8-4 5.3-3.8v2.9c-.5-.1-1-.1-1.5 0-1.3.4-2 1.7-1.5 3 .5 1.2 1.9 1.7 3.1 1.1.9-.4 1.4-1.3 1.4-2.3V3h3Z"/></svg></a>
            </div>
          </div>
          <div class="border-t border-slate-100 p-6">
            <button type="button" data-close class="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800">Yopish</button>
          </div>
        </div>
      `);
    }

    /* ---- Sotib olish (xaridorning web-ilova do'konidagi buyurtma oynasi) ---- */
    function buyProductModal(idx) {
      const p = agentLinks[idx];
      openModal(`
        <form id="buyForm">
          <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h3 class="text-lg font-bold text-slate-900">Buyurtma berish</h3>
              <p class="text-xs text-slate-500">Xavfsiz to'lov</p>
            </div>
            <button type="button" data-close class="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="space-y-4 p-6">
            <!-- Mahsulot ko'rinishi -->
            <div class="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
              <span class="grid h-14 w-14 flex-shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-100 to-emerald-50">
                ${p.image
                  ? `<img src="${p.image}" alt="${p.product}" class="h-full w-full object-cover" />`
                  : `<svg class="h-7 w-7 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">${icon.box}</svg>`}
              </span>
              <div class="min-w-0">
                <p class="truncate font-bold text-slate-900">${p.product}</p>
                <p class="text-sm font-extrabold text-slate-900">${uzs(p.price)} <span class="text-xs font-medium text-slate-400">so'm / dona</span></p>
              </div>
            </div>

            <!-- Miqdor -->
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-slate-700">Miqdori</span>
              <div class="flex items-center gap-2">
                <button type="button" id="qtyMinus" class="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-lg font-bold text-slate-600 hover:bg-slate-50">−</button>
                <input id="qty" type="number" value="1" min="1" max="99" class="w-14 rounded-lg border border-slate-200 py-2 text-center text-sm font-bold outline-none focus:border-emerald-brand focus:ring-2 focus:ring-emerald-100" />
                <button type="button" id="qtyPlus" class="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-lg font-bold text-slate-600 hover:bg-slate-50">+</button>
              </div>
            </div>

            <!-- Xaridor ma'lumotlari -->
            <label class="block">
              <span class="text-sm font-semibold text-slate-700">Ismingiz</span>
              <input required type="text" placeholder="Ism Familiya" class="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-brand focus:ring-2 focus:ring-emerald-100" />
            </label>
            <label class="block">
              <span class="text-sm font-semibold text-slate-700">Telefon raqamingiz</span>
              <input required type="tel" inputmode="tel" placeholder="+998 90 123 45 67" class="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-brand focus:ring-2 focus:ring-emerald-100" />
            </label>
            <label class="block">
              <span class="text-sm font-semibold text-slate-700">Yetkazib berish manzili</span>
              <textarea required rows="2" placeholder="Viloyat, tuman, ko'cha, uy..." class="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-brand focus:ring-2 focus:ring-emerald-100"></textarea>
            </label>

            <!-- To'lov usuli -->
            <div>
              <span class="text-sm font-semibold text-slate-700">To'lov usuli</span>
              <div class="mt-1.5 grid grid-cols-2 gap-2">
                <label class="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm has-[:checked]:border-emerald-brand has-[:checked]:bg-emerald-50">
                  <input type="radio" name="pay" value="cash" checked class="accent-emerald-600" /> Yetkazib berilganda naqd
                </label>
                <label class="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm has-[:checked]:border-emerald-brand has-[:checked]:bg-emerald-50">
                  <input type="radio" name="pay" value="card" class="accent-emerald-600" /> Karta orqali
                </label>
              </div>
            </div>

            <!-- Jami -->
            <div class="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3">
              <span class="text-sm font-semibold text-emerald-700">Jami to'lov</span>
              <span id="buyTotal" class="text-xl font-extrabold text-emerald-700">${uzs(p.price)} so'm</span>
            </div>
          </div>
          <div class="flex gap-3 border-t border-slate-100 p-6">
            <button type="button" data-close class="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Bekor qilish</button>
            <button type="submit" class="flex-1 rounded-xl bg-emerald-brand py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:opacity-90">Buyurtmani tasdiqlash</button>
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
          <span class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
          </span>
          <h3 class="mt-4 text-xl font-extrabold text-slate-900">Buyurtmangiz qabul qilindi! 🎉</h3>
          <p class="mt-1 text-sm text-slate-500">Operatorlarimiz tez orada siz bilan bog'lanadi.</p>
          <div class="mt-5 space-y-2 rounded-2xl bg-slate-50 p-4 text-left text-sm">
            <div class="flex justify-between"><span class="text-slate-500">Buyurtma raqami</span><span class="font-mono font-bold text-indigo-brand">${orderId}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Mahsulot</span><span class="font-semibold text-slate-800">${p.product}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Miqdori</span><span class="font-semibold text-slate-800">${n} dona</span></div>
            <div class="flex justify-between border-t border-slate-200 pt-2"><span class="text-slate-500">Jami</span><span class="font-extrabold text-emerald-600">${uzs(p.price * n)} so'm</span></div>
          </div>
          <button type="button" data-close class="mt-6 w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800">Yopish</button>
        </div>
      `);
    }

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
      $('#sidebarNav').innerHTML = conf.items.map((it) => {
        const active = it.id === state.view;
        return `<button data-view="${it.id}" class="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${active ? 'bg-white/10 text-white shadow-inner' : 'text-indigo-200 hover:bg-white/5 hover:text-white'}">
          ${navIcon(it.icon)}<span>${it.title}</span>
          ${active ? '<span class="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400"></span>' : ''}
        </button>`;
      }).join('');
    }

    function renderView() {
      const conf = NAV[state.panel];
      const item = conf.items.find((i) => i.id === state.view) || conf.items[0];
      state.view = item.id;
      $('#viewTitle').textContent = item.title;
      $('#viewRoot').innerHTML = VIEWS[state.panel][state.view]();
      // Post-render hooks for filterable tables
      if (state.panel === 'seller' && state.view === 'orders') renderOrdersBody('Barchasi');
      if (state.panel === 'affiliate' && state.view === 'sales') renderSalesBody('Barchasi');
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
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); $('#profileMenu').classList.add('hidden'); } });

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
        if (a === 'withdraw') return withdrawModal('indigo');
        if (a === 'wallet-withdraw') return withdrawModal('emerald');
        if (a === 'add-card') return addCardModal();
      }

      // Orders: filter tabs
      const ot = t.closest('[data-order-tab]');
      if (ot) {
        $$('.order-tab').forEach((b) => {
          const on = b === ot;
          b.className = `order-tab whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${on ? 'bg-indigo-brand text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`;
        });
        return renderOrdersBody(ot.dataset.orderTab);
      }

      // Sales: filter tabs
      const st = t.closest('[data-sales-tab]');
      if (st) {
        $$('.sales-tab').forEach((b) => {
          const on = b === st;
          b.className = `sales-tab whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${on ? 'bg-emerald-brand text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`;
        });
        return renderSalesBody(st.dataset.salesTab);
      }

      // Order details + mark shipped
      const od = t.closest('[data-order-details]');
      if (od) return orderDetailsModal(od.dataset.orderDetails);

      const ms = t.closest('[data-mark-shipped]');
      if (ms) {
        const order = merchantOrders.find((o) => o.id === ms.dataset.markShipped);
        if (order) order.status = "Yo'lda";
        closeModal();
        renderOrdersBody($('.order-tab.bg-indigo-brand')?.dataset.orderTab || 'Barchasi');
        return toast('Buyurtma "Yo\'lda" deb belgilandi ✓');
      }

      // Start selling (affiliate marketplace)
      const ss = t.closest('[data-start-selling]');
      if (ss) return startSellingModal(Number(ss.dataset.startSelling));

      // "Sotib olish" — do'kondagi mahsulotni xarid qilish oynasi
      const buy = t.closest('[data-buy]');
      if (buy) return buyProductModal(Number(buy.dataset.buy));

      // Copy link buttons
      const cp = t.closest('[data-copy]');
      if (cp) {
        const text = cp.dataset.copy;
        navigator.clipboard?.writeText(text).catch(() => {});
        toast('Havola nusxalandi ✓');
        return;
      }
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
    renderSidebar();
    renderView();
  })();
