/* =========================================================
   sotibber.uz — Do'kon web-ilovasi (xaridor tomoni)
   dashboard/shop.html?s=<shop_slug>  (yoki ?a=<affiliate_id>)

   Sotib beruvchining do'konini ochadi: mahsulotlar (Asosiy),
   savatcha, buyurtmalar va profil. Buyurtma MAHSULOT EGASIGA
   (sotuvchiga) boradi, komissiya sotib beruvchiga yoziladi.
========================================================= */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const uzs = (n) => (Number(n) || 0).toLocaleString('ru-RU').replace(/,/g, ' ');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sb = window.sb;

  const boxIcon = '<path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>';
  function placeholder(size = 'h-16 w-16') {
    return `<div class="grid h-full w-full place-items-center"><svg class="${size} text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3">${boxIcon}</svg></div>`;
  }

  /* ---------------- Toast ---------------- */
  function toast(msg) {
    $('#toastMsg').textContent = msg;
    const t = $('#toast');
    t.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.add('hidden'), 2400);
  }

  /* ---------------- Holat ---------------- */
  const params = new URLSearchParams(location.search);
  const slug = (params.get('s') || '').trim();
  const affId = (params.get('a') || '').trim();

  let shop = null;        // { id, name }
  let products = [];      // [{ product_id, name, description, price, commission, seller_id, images, image, stock }]
  let view = 'home';

  // localStorage kalitlari (do'kon bo'yicha ajratilgan)
  const K = { cart: () => `sotibber_cart_${shop ? shop.id : 'x'}`, orders: () => `sotibber_orders_${shop ? shop.id : 'x'}`, cust: 'sotibber_customer' };
  const readLS = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } };
  const writeLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  const getCart = () => readLS(K.cart(), []);
  const setCart = (c) => { writeLS(K.cart(), c); updateCartBadge(); };
  const getCustomer = () => readLS(K.cust, { name: '', phone: '', address: '' });
  const getMyOrders = () => readLS(K.orders(), []);

  function cartCount() { return getCart().reduce((s, i) => s + i.qty, 0); }
  function updateCartBadge() {
    const n = cartCount();
    [$('#cartBadge'), $('#cartBadge2')].forEach((el) => {
      if (!el) return;
      if (n > 0) { el.textContent = n; el.classList.remove('hidden'); }
      else el.classList.add('hidden');
    });
  }

  /* ---------------- Ma'lumot yuklash ---------------- */
  function mapProduct(row) {
    const p = row.products || row;
    const imgs = (Array.isArray(p.image_urls) && p.image_urls.length) ? p.image_urls.filter(Boolean) : (p.image_url ? [p.image_url] : []);
    return {
      product_id: p.id,
      name: p.name,
      description: p.description || '',
      price: Number(p.price),
      commission: Number(p.commission) || 0,
      seller_id: p.seller_id,
      stock: p.stock,
      status: p.status,
      images: imgs,
      image: imgs[0] || null,
    };
  }

  async function loadShop() {
    if (!sb) return renderError('Server ulanmagan.');
    if (!slug && !affId) return renderNoShop();

    // Do'kon egasini topamiz (slug yoki affiliate_id orqali)
    let owner = null;
    try {
      let q = sb.from('profiles').select('id, full_name, shop_name, shop_slug');
      q = slug ? q.eq('shop_slug', slug) : q.eq('id', affId);
      const { data } = await q.maybeSingle();
      owner = data;
    } catch (e) { console.error('Do\'kon egasi:', e); }

    if (!owner) return renderNoShop();
    shop = { id: owner.id, name: owner.shop_name || (owner.full_name ? owner.full_name + ' do\'koni' : 'Do\'kon') };
    $('#shopName').textContent = shop.name;
    document.title = `${shop.name} — sotibber.uz`;

    // Do'kondagi mahsulotlar
    try {
      const { data, error } = await sb
        .from('affiliate_products')
        .select('product_id, products(*)')
        .eq('affiliate_id', owner.id);
      if (error) throw error;
      products = (data || [])
        .map(mapProduct)
        .filter((p) => p.product_id && p.stock > 0 && (p.status === 'Faol' || p.status === 'Sotuvda'));
    } catch (e) {
      console.error('Do\'kon mahsulotlari:', e);
      products = [];
    }

    updateCartBadge();
    go('home');
  }

  /* ---------------- Media ---------------- */
  function media(images, name, ratio = 'aspect-[4/3]') {
    const list = (images || []).filter(Boolean);
    const first = list[0];
    return `
      <div class="relative ${ratio} w-full overflow-hidden bg-gradient-to-br from-white/10 to-white/[0.02]">
        ${first ? `<img src="${esc(first)}" alt="${esc(name)}" loading="lazy" class="h-full w-full object-cover" />` : placeholder()}
        ${list.length > 1 ? `<span class="absolute bottom-2 right-2 rounded-lg bg-black/55 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">${list.length} rasm</span>` : ''}
      </div>`;
  }

  /* ---------------- Ko'rinishlar ---------------- */
  function renderError(msg) {
    $('#shopRoot').innerHTML = `<div class="glass mt-6 rounded-2xl p-6 text-center text-sm text-rose-300">${esc(msg)}</div>`;
  }
  function renderNoShop() {
    $('#shopName').textContent = 'Do\'kon topilmadi';
    $('#shopRoot').innerHTML = `
      <div class="glass mt-8 flex flex-col items-center rounded-2xl p-8 text-center">
        <span class="grid h-14 w-14 place-items-center rounded-full bg-white/5 text-slate-400">
          <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 11a1 1 0 01-1 1H5a1 1 0 01-1-1L5 9z"/></svg>
        </span>
        <p class="mt-4 font-display text-lg font-bold text-white">Do'kon topilmadi</p>
        <p class="mt-1 max-w-xs text-sm text-slate-400">Havola noto'g'ri yoki do'kon o'chirilgan bo'lishi mumkin.</p>
        <a href="/" class="mt-5 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/15">sotibber.uz'ga o'tish</a>
      </div>`;
  }

  function renderHome() {
    const grid = products.length ? `
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        ${products.map((p, i) => `
          <div class="glass overflow-hidden rounded-2xl">
            <button data-detail="${i}" class="block w-full text-left">${media(p.images, p.name)}</button>
            <div class="p-3">
              <button data-detail="${i}" class="block w-full truncate text-left text-sm font-semibold text-white hover:text-violet-300">${esc(p.name)}</button>
              <p class="mt-1 font-display text-base font-bold text-white">${uzs(p.price)} <span class="text-[11px] font-medium text-slate-500">so'm</span></p>
              <button data-add="${i}" class="btn-grad mt-2 w-full rounded-lg py-2 text-xs font-bold text-white transition active:scale-95">Savatga</button>
            </div>
          </div>`).join('')}
      </div>` : `
      <div class="glass mt-4 flex flex-col items-center rounded-2xl p-10 text-center">
        <span class="grid h-12 w-12 place-items-center rounded-full bg-white/5 text-slate-400"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">${boxIcon}</svg></span>
        <p class="mt-3 text-sm font-semibold text-slate-300">Do'konda hozircha mahsulot yo'q</p>
        <p class="mt-1 text-xs text-slate-500">Tez orada mahsulotlar qo'shiladi</p>
      </div>`;

    $('#shopRoot').innerHTML = `
      <div class="animate-fadeUp space-y-4">
        <div class="rounded-2xl bg-gradient-to-br from-violet-deep via-violet-brand to-emerald-500 p-5 text-white shadow-xl shadow-violet-500/20">
          <p class="text-xs text-violet-100">Xush kelibsiz</p>
          <h2 class="font-display text-xl font-bold">${esc(shop.name)}</h2>
          <p class="mt-1 text-sm text-violet-100">${products.length} ta mahsulot · xavfsiz buyurtma</p>
        </div>
        <h3 class="font-display font-bold text-white">Mahsulotlar</h3>
        ${grid}
      </div>`;
  }

  function renderCart() {
    const cart = getCart();
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const body = cart.length ? `
      <div class="space-y-3">
        ${cart.map((i, idx) => `
          <div class="glass flex items-center gap-3 rounded-2xl p-3">
            <span class="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-white/10">
              ${i.image ? `<img src="${esc(i.image)}" class="h-full w-full object-cover" alt="" />` : placeholder('h-7 w-7')}
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold text-white">${esc(i.name)}</p>
              <p class="text-sm font-bold text-white">${uzs(i.price)} <span class="text-xs font-medium text-slate-500">so'm</span></p>
              <div class="mt-1.5 flex items-center gap-2">
                <button data-qty="dec" data-i="${idx}" class="grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200">−</button>
                <span class="w-6 text-center text-sm font-bold">${i.qty}</span>
                <button data-qty="inc" data-i="${idx}" class="grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200">+</button>
                <button data-remove="${idx}" class="ml-auto text-xs font-medium text-rose-400 hover:underline">O'chirish</button>
              </div>
            </div>
          </div>`).join('')}
      </div>
      <div class="glass mt-4 rounded-2xl p-4">
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-400">Jami</span>
          <span class="font-display text-xl font-bold text-white">${uzs(total)} so'm</span>
        </div>
        <button data-go="checkout" class="btn-grad mt-4 w-full rounded-xl py-3 text-sm font-bold text-white transition active:scale-95">Buyurtma berish</button>
      </div>` : `
      <div class="glass mt-4 flex flex-col items-center rounded-2xl p-10 text-center">
        <span class="grid h-12 w-12 place-items-center rounded-full bg-white/5 text-slate-400"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5"/></svg></span>
        <p class="mt-3 text-sm font-semibold text-slate-300">Savatcha bo'sh</p>
        <button data-go="home" class="mt-4 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/15">Xarid qilishni boshlash</button>
      </div>`;

    $('#shopRoot').innerHTML = `<div class="animate-fadeUp"><h2 class="mb-3 font-display text-lg font-bold text-white">Savatcha</h2>${body}</div>`;
  }

  function renderCheckout() {
    const cart = getCart();
    if (!cart.length) return go('cart');
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const c = getCustomer();
    $('#shopRoot').innerHTML = `
      <div class="animate-fadeUp">
        <h2 class="mb-3 font-display text-lg font-bold text-white">Buyurtmani rasmiylashtirish</h2>
        <form id="checkoutForm" class="space-y-4">
          <div class="glass rounded-2xl p-4">
            <p class="text-sm font-semibold text-slate-200">Buyurtma tarkibi</p>
            <div class="mt-2 space-y-1.5 text-sm">
              ${cart.map((i) => `<div class="flex justify-between"><span class="text-slate-400">${esc(i.name)} × ${i.qty}</span><span class="font-semibold text-slate-200">${uzs(i.price * i.qty)} so'm</span></div>`).join('')}
              <div class="flex justify-between border-t border-white/10 pt-2"><span class="font-semibold text-slate-200">Jami</span><span class="font-bold text-emerald-300">${uzs(total)} so'm</span></div>
            </div>
          </div>
          <label class="block"><span class="text-sm font-semibold text-slate-200">Ismingiz</span>
            <input required id="coName" value="${esc(c.name)}" placeholder="Ism Familiya" class="fld mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm outline-none" /></label>
          <label class="block"><span class="text-sm font-semibold text-slate-200">Telefon raqamingiz</span>
            <input required id="coPhone" type="tel" inputmode="tel" value="${esc(c.phone)}" placeholder="+998 90 123 45 67" class="fld mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm outline-none" /></label>
          <label class="block"><span class="text-sm font-semibold text-slate-200">Yetkazib berish manzili</span>
            <textarea required id="coAddr" rows="2" placeholder="Viloyat, tuman, ko'cha, uy..." class="fld mt-1.5 w-full resize-none rounded-xl px-3.5 py-2.5 text-sm outline-none">${esc(c.address)}</textarea></label>
          <div>
            <span class="text-sm font-semibold text-slate-200">To'lov usuli</span>
            <div class="mt-1.5 grid grid-cols-2 gap-2">
              <label class="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-200 has-[:checked]:border-emerald-400/60 has-[:checked]:bg-emerald-500/15"><input type="radio" name="pay" value="Naqd" checked /> Yetkazilganda naqd</label>
              <label class="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-200 has-[:checked]:border-emerald-400/60 has-[:checked]:bg-emerald-500/15"><input type="radio" name="pay" value="Karta" /> Karta orqali</label>
            </div>
          </div>
          <div class="flex gap-3 pt-1">
            <button type="button" data-go="cart" class="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10">Orqaga</button>
            <button type="submit" class="btn-grad flex-1 rounded-xl py-3 text-sm font-bold text-white transition active:scale-95">Tasdiqlash (${uzs(total)} so'm)</button>
          </div>
        </form>
      </div>`;

    $('#checkoutForm').addEventListener('submit', submitOrder);
  }

  async function submitOrder(e) {
    e.preventDefault();
    const cart = getCart();
    if (!cart.length) return;
    const name = $('#coName').value.trim();
    const phone = $('#coPhone').value.trim();
    const address = $('#coAddr').value.trim();
    const pay = ($('input[name="pay"]:checked') || {}).value || 'Naqd';
    if (!name || !phone || !address) { toast('Barcha maydonlarni to\'ldiring'); return; }

    // Mijoz ma'lumotini keyingi safar uchun saqlaymiz
    writeLS(K.cust, { name, phone, address });

    const btn = $('#checkoutForm button[type="submit"]');
    btn.disabled = true; const orig = btn.textContent; btn.textContent = 'Yuborilmoqda...';

    // Har bir savatcha qatoriga alohida buyurtma yaratamiz — sotuvchiga boradi
    const rows = cart.map((i) => ({
      product_id: i.product_id,
      seller_id: i.seller_id,
      affiliate_id: shop.id,
      product_name: i.name,
      affiliate_name: shop.name,
      customer_name: name,
      customer_phone: phone,
      address,
      quantity: i.qty,
      unit_price: i.price,
      total: i.price * i.qty,
      commission: Math.round(i.price * (i.commission || 0) / 100) * i.qty,
      payment_method: pay,
      status: 'Yangi',
    }));

    try {
      const { error } = await sb.from('orders').insert(rows);
      if (error) throw error;
    } catch (err) {
      console.error('Buyurtma:', err);
      btn.disabled = false; btn.textContent = orig;
      const missing = /orders|does not exist|schema cache|find the table/i.test(err.message || '');
      toast(missing ? "Buyurtma jadvali topilmadi — supabase_qoshimcha.sql'ni ishga tushiring" : 'Xatolik: ' + (err.message || 'buyurtma yuborilmadi'));
      return;
    }

    // Mahalliy tarixga yozamiz (bu qurilmadagi buyurtmalar)
    const myOrders = getMyOrders();
    const orderNo = '#' + Date.now().toString().slice(-6);
    myOrders.unshift({ orderNo, date: new Date().toISOString(), status: 'Yangi', items: rows.map((r) => ({ name: r.product_name, qty: r.quantity, total: r.total })), total: rows.reduce((s, r) => s + r.total, 0) });
    writeLS(K.orders(), myOrders);

    setCart([]);
    orderSuccessModal(orderNo);
  }

  function renderOrders() {
    const orders = getMyOrders();
    const body = orders.length ? `
      <div class="space-y-3">
        ${orders.map((o) => `
          <div class="glass rounded-2xl p-4">
            <div class="flex items-center justify-between">
              <span class="font-mono text-sm font-bold text-violet-300">${o.orderNo}</span>
              <span class="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/30">${esc(o.status)}</span>
            </div>
            <p class="mt-1 text-xs text-slate-500">${new Date(o.date).toLocaleString('ru-RU')}</p>
            <div class="mt-3 space-y-1 text-sm">
              ${o.items.map((it) => `<div class="flex justify-between"><span class="text-slate-400">${esc(it.name)} × ${it.qty}</span><span class="text-slate-200">${uzs(it.total)} so'm</span></div>`).join('')}
            </div>
            <div class="mt-2 flex justify-between border-t border-white/10 pt-2 text-sm"><span class="font-semibold text-slate-200">Jami</span><span class="font-bold text-emerald-300">${uzs(o.total)} so'm</span></div>
          </div>`).join('')}
      </div>` : `
      <div class="glass mt-4 flex flex-col items-center rounded-2xl p-10 text-center">
        <span class="grid h-12 w-12 place-items-center rounded-full bg-white/5 text-slate-400"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"/></svg></span>
        <p class="mt-3 text-sm font-semibold text-slate-300">Hali buyurtma bermagansiz</p>
        <button data-go="home" class="mt-4 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/15">Mahsulotlarni ko'rish</button>
      </div>`;

    $('#shopRoot').innerHTML = `
      <div class="animate-fadeUp">
        <h2 class="mb-1 font-display text-lg font-bold text-white">Mening buyurtmalarim</h2>
        <p class="mb-3 text-xs text-slate-500">Bu qurilmada berilgan buyurtmalar</p>
        ${body}
      </div>`;
  }

  function renderProfile() {
    const c = getCustomer();
    $('#shopRoot').innerHTML = `
      <div class="animate-fadeUp space-y-4">
        <h2 class="font-display text-lg font-bold text-white">Profil</h2>
        <div class="glass rounded-2xl p-5">
          <p class="text-sm font-semibold text-slate-200">Mening ma'lumotlarim</p>
          <p class="mt-0.5 text-xs text-slate-500">Buyurtma berishda avtomatik to'ldiriladi</p>
          <form id="profileForm" class="mt-4 space-y-3">
            <label class="block"><span class="text-xs font-semibold text-slate-300">Ism</span>
              <input id="pfName" value="${esc(c.name)}" placeholder="Ism Familiya" class="fld mt-1 w-full rounded-xl px-3.5 py-2.5 text-sm outline-none" /></label>
            <label class="block"><span class="text-xs font-semibold text-slate-300">Telefon</span>
              <input id="pfPhone" type="tel" value="${esc(c.phone)}" placeholder="+998 90 123 45 67" class="fld mt-1 w-full rounded-xl px-3.5 py-2.5 text-sm outline-none" /></label>
            <label class="block"><span class="text-xs font-semibold text-slate-300">Manzil</span>
              <textarea id="pfAddr" rows="2" placeholder="Yetkazib berish manzili" class="fld mt-1 w-full resize-none rounded-xl px-3.5 py-2.5 text-sm outline-none">${esc(c.address)}</textarea></label>
            <button type="submit" class="btn-grad w-full rounded-xl py-2.5 text-sm font-bold text-white transition active:scale-95">Saqlash</button>
          </form>
        </div>
        <div class="glass rounded-2xl p-5">
          <p class="text-sm font-semibold text-slate-200">Do'kon haqida</p>
          <div class="mt-3 flex items-center gap-3">
            <span class="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-brand to-violet-deep text-white"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 11a1 1 0 01-1 1H5a1 1 0 01-1-1L5 9z"/></svg></span>
            <div><p class="font-semibold text-white">${esc(shop.name)}</p><p class="text-xs text-slate-500">sotibber.uz do'koni</p></div>
          </div>
          <a href="/" class="mt-4 block rounded-xl bg-white/10 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-white/15">sotibber.uz platformasi</a>
        </div>
      </div>`;

    $('#profileForm').addEventListener('submit', (e) => {
      e.preventDefault();
      writeLS(K.cust, { name: $('#pfName').value.trim(), phone: $('#pfPhone').value.trim(), address: $('#pfAddr').value.trim() });
      toast('Ma\'lumotlar saqlandi ✓');
    });
  }

  /* ---------------- Modal ---------------- */
  function closeModal() { $('#modalRoot').innerHTML = ''; document.body.style.overflow = ''; }
  function openModal(html, size = 'max-w-md') {
    $('#modalRoot').innerHTML = `
      <div class="fixed inset-0 z-[75] flex items-end justify-center p-0 sm:items-center sm:p-4">
        <div data-close class="absolute inset-0 animate-fadeIn bg-black/70 backdrop-blur-sm"></div>
        <div class="glass relative max-h-[92vh] w-full ${size} animate-fadeUp overflow-y-auto rounded-t-3xl text-slate-200 shadow-2xl sm:rounded-3xl">${html}</div>
      </div>`;
    document.body.style.overflow = 'hidden';
    $$('[data-close]', $('#modalRoot')).forEach((el) => el.addEventListener('click', closeModal));
  }

  function detailModal(idx) {
    const p = products[idx];
    if (!p) return;
    const imgs = (p.images || []).filter(Boolean);
    const main = imgs.length ? `<img id="dMain" src="${esc(imgs[0])}" class="h-full w-full object-contain" alt="${esc(p.name)}" />` : placeholder('h-20 w-20');
    const thumbs = imgs.length > 1 ? `<div class="mt-3 flex flex-wrap gap-2">${imgs.map((s, i) => `<button type="button" data-thumb="${esc(s)}" class="d-thumb h-14 w-14 overflow-hidden rounded-lg ring-2 transition ${i === 0 ? 'ring-violet-400' : 'ring-white/10'}"><img src="${esc(s)}" class="h-full w-full object-cover" alt="" /></button>`).join('')}</div>` : '';

    openModal(`
      <div>
        <div class="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 class="font-display text-lg font-bold text-white">Mahsulot</h3>
          <button type="button" data-close class="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-white/10"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <div class="space-y-4 p-5">
          <div class="overflow-hidden rounded-2xl bg-black/30 ring-1 ring-white/10"><div class="aspect-square w-full">${main}</div></div>
          ${thumbs}
          <div>
            <h4 class="font-display text-xl font-bold text-white">${esc(p.name)}</h4>
            <p class="mt-2 font-display text-2xl font-bold text-white">${uzs(p.price)} <span class="text-sm font-medium text-slate-500">so'm</span></p>
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-300">Tavsifi</p>
            <p class="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-400">${p.description ? esc(p.description) : 'Tavsif kiritilmagan.'}</p>
          </div>
        </div>
        <div class="sticky bottom-0 flex gap-3 border-t border-white/10 bg-ink-900/70 p-5 backdrop-blur">
          <button type="button" data-close class="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10">Yopish</button>
          <button type="button" data-add-close="${idx}" class="btn-grad flex-1 rounded-xl py-3 text-sm font-bold text-white transition active:scale-95">Savatga qo'shish</button>
        </div>
      </div>`, 'max-w-lg');

    const m = $('#dMain');
    $$('.d-thumb').forEach((b) => b.addEventListener('click', () => {
      if (m) m.src = b.dataset.thumb;
      $$('.d-thumb').forEach((x) => { const on = x === b; x.classList.toggle('ring-violet-400', on); x.classList.toggle('ring-white/10', !on); });
    }));
  }

  function orderSuccessModal(orderNo) {
    openModal(`
      <div class="p-6 text-center">
        <span class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-300"><svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></span>
        <h3 class="mt-4 font-display text-xl font-bold text-white">Buyurtma qabul qilindi! 🎉</h3>
        <p class="mt-1 text-sm text-slate-400">Buyurtma raqami <b class="font-mono text-violet-300">${orderNo}</b>. Operatorlar tez orada bog'lanadi.</p>
        <button type="button" data-close-go="orders" class="mt-6 w-full rounded-xl bg-white/10 py-3 text-sm font-bold text-white hover:bg-white/15">Buyurtmalarim</button>
      </div>`);
  }

  /* ---------------- Cart amallari ---------------- */
  function addToCart(idx, qty = 1) {
    const p = products[idx];
    if (!p) return;
    const cart = getCart();
    const ex = cart.find((i) => i.product_id === p.product_id);
    if (ex) ex.qty = Math.min(99, ex.qty + qty);
    else cart.push({ product_id: p.product_id, name: p.name, price: p.price, image: p.image, seller_id: p.seller_id, commission: p.commission, qty });
    setCart(cart);
    toast('Savatga qo\'shildi ✓');
  }

  /* ---------------- Router ---------------- */
  const RENDER = { home: renderHome, cart: renderCart, checkout: renderCheckout, orders: renderOrders, profile: renderProfile };
  function paintNav() {
    $$('.nav-tab').forEach((b) => {
      const active = b.dataset.go === view || (view === 'checkout' && b.dataset.go === 'cart');
      b.classList.toggle('text-violet-300', active);
      b.classList.toggle('text-slate-400', !active);
    });
  }
  function go(v) {
    if (!shop && v !== 'home') return;
    view = v;
    (RENDER[v] || renderHome)();
    paintNav();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------------- Hodisalar ---------------- */
  document.addEventListener('click', (e) => {
    const t = e.target;
    const goBtn = t.closest('[data-go]');
    if (goBtn) return go(goBtn.dataset.go);

    const det = t.closest('[data-detail]');
    if (det) return detailModal(Number(det.dataset.detail));

    const add = t.closest('[data-add]');
    if (add) return addToCart(Number(add.dataset.add));

    const addClose = t.closest('[data-add-close]');
    if (addClose) { addToCart(Number(addClose.dataset.addClose)); closeModal(); return; }

    const closeGo = t.closest('[data-close-go]');
    if (closeGo) { closeModal(); return go(closeGo.dataset.closeGo); }

    const rm = t.closest('[data-remove]');
    if (rm) { const c = getCart(); c.splice(Number(rm.dataset.remove), 1); setCart(c); return renderCart(); }

    const q = t.closest('[data-qty]');
    if (q) {
      const c = getCart(); const i = Number(q.dataset.i);
      if (!c[i]) return;
      c[i].qty = q.dataset.qty === 'inc' ? Math.min(99, c[i].qty + 1) : Math.max(1, c[i].qty - 1);
      setCart(c); return renderCart();
    }
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  /* ---------------- Boshlash ---------------- */
  loadShop();
})();
