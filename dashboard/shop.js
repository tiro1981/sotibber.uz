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
  const shopNoParam = (params.get('id') || '').trim();     // 0001, 0002 ...
  const shopNo = shopNoParam ? parseInt(shopNoParam, 10) : null;

  let shop = null;        // { id, name, phone }
  let settings = {};      // sayt sozlamalari (messenjer havolalari)
  let products = [];      // [{ product_id, name, description, price, commission, seller_id, images, image, stock }]
  let view = 'home';

  // localStorage kalitlari (savat/buyurtma do'kon bo'yicha; manzil/mijoz umumiy)
  const K = { cart: () => `sotibber_cart_${shop ? shop.id : 'x'}`, orders: () => `sotibber_orders_${shop ? shop.id : 'x'}`, cust: 'sotibber_customer', addr: 'sotibber_addresses' };
  const readLS = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } };
  const writeLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  const getCart = () => readLS(K.cart(), []);
  const setCart = (c) => { writeLS(K.cart(), c); updateCartBadge(); };
  const getCustomer = () => readLS(K.cust, { name: '', phone: '' });
  const getMyOrders = () => readLS(K.orders(), []);
  const getAddresses = () => readLS(K.addr, []);
  const setAddresses = (a) => writeLS(K.addr, a);

  // Mehmon (mijoz) identifikatori — do'kon egasi bilan yozishuv uchun
  function guestId() {
    try {
      let g = localStorage.getItem('sotibber_guest_id');
      if (!g) { g = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem('sotibber_guest_id', g); }
      return g;
    } catch (e) { return 'g-anon'; }
  }
  function chatTarget() { return shop ? (shop.sellerId || shop.id) : 'x'; }
  function chatConvId() { return 'g:' + guestId() + '__' + chatTarget(); }
  let chatMsgs = [];
  let chatPollTimer = null;
  let chatFile = null;

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
    if (!shopNo && !slug && !affId) return renderNoShop();
    if (shopNoParam && (shopNo == null || isNaN(shopNo))) return renderNoShop();

    // Do'kon egasini topamiz (raqam / slug / affiliate_id orqali)
    let owner = null;
    try {
      let q = sb.from('profiles').select('id, full_name, phone, shop_name, shop_slug, shop_no');
      if (shopNo != null && !isNaN(shopNo)) q = q.eq('shop_no', shopNo);
      else if (slug) q = q.eq('shop_slug', slug);
      else q = q.eq('id', affId);
      const { data } = await q.maybeSingle();
      owner = data;
    } catch (e) { console.error('Do\'kon egasi:', e); }

    if (!owner) return renderNoShop();
    shop = { id: owner.id, name: owner.shop_name || (owner.full_name ? owner.full_name + ' do\'koni' : 'Do\'kon'), phone: owner.phone || '' };
    $('#shopName').textContent = shop.name;
    document.title = `${shop.name} — sotibber.uz`;

    // Sayt sozlamalari (messenjer havolalari) — "Sotuvchi bilan aloqa" uchun
    try {
      const { data } = await sb.from('site_settings').select('*');
      settings = {};
      (data || []).forEach((r) => { settings[r.key] = r.value || ''; });
    } catch (e) { settings = {}; }

    // Do'kondagi mahsulotlar — embed o'rniga ikki bosqichli so'rov (ishonchliroq)
    try {
      const { data: apRows, error: apErr } = await sb
        .from('affiliate_products')
        .select('product_id, archived')
        .eq('affiliate_id', owner.id);
      if (apErr) throw apErr;
      // Arxivlangan mahsulotlar do'konda ko'rinmaydi
      const ids = (apRows || []).filter((r) => !r.archived).map((r) => r.product_id).filter(Boolean);
      if (!ids.length) {
        products = [];
      } else {
        const { data: prods, error: pErr } = await sb.from('products').select('*').in('id', ids);
        if (pErr) throw pErr;
        // Skladda bori ko'rinadi; faqat rad etilgan/tugagan yashiriladi.
        const HIDDEN = ['Rad etilgan', 'Rad etildi', 'Tugagan', 'Tugadi'];
        products = (prods || [])
          .map(mapProduct)
          .filter((p) => p.product_id && p.stock > 0 && HIDDEN.indexOf(p.status) === -1);
      }
    } catch (e) {
      console.error('Do\'kon mahsulotlari:', e);
      products = [];
    }

    // Xabar KIMGA boradi: mahsulot egasi (sotuvchi). Do'kondagi mahsulotlar
    // sotuvchisi. Bo'lmasa — do'kon egasiga (zaxira variant).
    shop.sellerId = (products.find((p) => p.seller_id) || {}).seller_id || shop.id;

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
        <div class="flex items-center justify-between">
          <h2 class="font-display text-lg font-bold text-white">Mahsulotlar</h2>
          ${products.length ? `<span class="text-xs font-medium text-slate-500">${products.length} ta</span>` : ''}
        </div>
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
    const addrs = getAddresses();
    const addrSection = addrs.length ? `
      <div class="space-y-2">
        ${addrs.map((a, i) => `
          <button type="button" data-pick-addr="${i}" class="flex w-full items-start gap-2.5 rounded-xl border ${i === 0 ? 'border-violet-400/60 bg-violet-500/10' : 'border-white/10'} bg-white/5 px-3.5 py-3 text-left text-sm">
            <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9">${menuIco.pin}</svg>
            <span class="min-w-0 whitespace-pre-wrap break-words text-slate-200">${esc(a.text)}</span>
          </button>`).join('')}
        <button type="button" data-pick-addr="new" class="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-left text-sm text-slate-300">
          <svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
          Boshqa manzil kiritish
        </button>
        <div id="coNewAddr" class="hidden pt-1">${addressFormHtml('co')}</div>
      </div>` : `
      <div>${addressFormHtml('co')}</div>`;

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
          <div><span class="text-sm font-semibold text-slate-200">Yetkazib berish manzili</span>
            <div class="mt-1.5">${addrSection}</div></div>
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
    const pay = ($('input[name="pay"]:checked') || {}).value || 'Naqd';

    // Yetkazib berish manzilini aniqlaymiz (saqlangan yoki yangi)
    let address = '';
    const addrs = getAddresses();
    if (addrs.length) {
      const picked = $$('[data-pick-addr]').find((el) => el.classList.contains('border-violet-400/60'));
      const val = picked ? picked.dataset.pickAddr : '0';
      if (val === 'new') {
        address = readAddressForm('co');
        if (address) { addrs.push({ id: Date.now(), text: address }); setAddresses(addrs); }
      } else {
        address = ((addrs[Number(val)] || {}).text) || '';
      }
    } else {
      address = readAddressForm('co');
      if (address) setAddresses([{ id: Date.now(), text: address }]);
    }

    if (!name || !phone || !address) { toast('Ism, telefon va to\'liq manzilni (viloyat, tuman, uy) kiriting'); return; }

    // Mijoz ma'lumotini keyingi safar uchun saqlaymiz
    writeLS(K.cust, { name, phone });

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

  const menuIco = {
    user: '<path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>',
    pin: '<path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"/><circle cx="12" cy="11" r="2.5"/>',
    chat: '<path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l.8-4.2A7.9 7.9 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>',
    store: '<path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 11a1 1 0 01-1 1H5a1 1 0 01-1-1L5 9z"/>',
  };
  function menuRow(open, ic, title, sub, tint) {
    return `
      <button data-open="${open}" class="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/5">
        <span class="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl ${tint}"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9">${ic}</svg></span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-semibold text-white">${title}</span>
          <span class="block truncate text-xs text-slate-500">${sub}</span>
        </span>
        <svg class="h-5 w-5 flex-shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
      </button>`;
  }

  function renderProfile() {
    const c = getCustomer();
    const addrs = getAddresses();
    const initial = (c.name || 'M').trim().charAt(0).toUpperCase();
    $('#shopRoot').innerHTML = `
      <div class="animate-fadeUp space-y-4">
        <h2 class="font-display text-lg font-bold text-white">Profil</h2>

        <div class="glass flex items-center gap-3 rounded-2xl p-4">
          <span class="grid h-14 w-14 flex-shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-brand to-violet-deep text-xl font-bold text-white">${esc(initial)}</span>
          <div class="min-w-0">
            <p class="truncate font-display text-lg font-bold text-white">${c.name ? esc(c.name) : 'Mehmon'}</p>
            <p class="truncate text-sm text-slate-400">${c.phone ? esc(c.phone) : "Telefon qo'shilmagan"}</p>
          </div>
        </div>

        <div class="glass divide-y divide-white/5 overflow-hidden rounded-2xl">
          ${menuRow('info', menuIco.user, "Mening ma'lumotlarim", 'Ism va telefon', 'bg-violet-500/15 text-violet-300')}
          ${menuRow('addresses', menuIco.pin, 'Mening manzillarim', addrs.length ? `${addrs.length} ta manzil saqlangan` : "Manzil qo'shish", 'bg-emerald-500/15 text-emerald-300')}
          ${menuRow('contact', menuIco.chat, 'Sotuvchi bilan aloqa', "Savol yoki buyurtma bo'yicha", 'bg-sky-500/15 text-sky-300')}
          ${menuRow('about', menuIco.store, "Do'kon haqida", esc(shop.name), 'bg-amber-500/15 text-amber-300')}
        </div>

        <a href="/" class="glass block rounded-2xl px-4 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-white/5">sotibber.uz platformasi</a>
      </div>`;
  }

  /* ---- Profil: ma'lumotlarni tahrirlash ---- */
  function infoModal() {
    const c = getCustomer();
    openModal(`
      <div>
        <div class="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 class="font-display text-lg font-bold text-white">Mening ma'lumotlarim</h3>
          <button type="button" data-close class="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-white/10"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <form id="infoForm" class="space-y-3 p-5">
          <label class="block"><span class="text-xs font-semibold text-slate-300">Ism</span>
            <input id="ifName" value="${esc(c.name)}" placeholder="Ism Familiya" class="fld mt-1 w-full rounded-xl px-3.5 py-2.5 text-sm outline-none" /></label>
          <label class="block"><span class="text-xs font-semibold text-slate-300">Telefon</span>
            <input id="ifPhone" type="tel" value="${esc(c.phone)}" placeholder="+998 90 123 45 67" class="fld mt-1 w-full rounded-xl px-3.5 py-2.5 text-sm outline-none" /></label>
          <button type="submit" class="btn-grad w-full rounded-xl py-2.5 text-sm font-bold text-white transition active:scale-95">Saqlash</button>
        </form>
      </div>`);
    $('#infoForm').addEventListener('submit', (e) => {
      e.preventDefault();
      writeLS(K.cust, { name: $('#ifName').value.trim(), phone: $('#ifPhone').value.trim() });
      closeModal(); renderProfile(); toast('Saqlandi ✓');
    });
  }

  /* ---- Profil: manzillar (qo'shish/o'chirish) ---- */
  /* ---- O'zbekiston hududlari (viloyat -> tuman/shahar) ---- */
  const REGIONS = {
    "Toshkent shahri": ["Bektemir", "Chilonzor", "Mirobod", "Mirzo Ulug'bek", "Olmazor", "Sergeli", "Shayxontohur", "Uchtepa", "Yakkasaroy", "Yashnobod", "Yunusobod", "Yangihayot"],
    "Toshkent viloyati": ["Angren", "Bekobod", "Bo'ka", "Bo'stonliq", "Chinoz", "Chirchiq", "Nurafshon", "Ohangaron", "Olmaliq", "Oqqo'rg'on", "O'rtachirchiq", "Parkent", "Piskent", "Qibray", "Quyichirchiq", "Yangiyo'l", "Yuqorichirchiq", "Zangiota"],
    "Andijon": ["Andijon shahri", "Xonobod", "Andijon tumani", "Asaka", "Baliqchi", "Buloqboshi", "Bo'z", "Izboskan", "Jalaquduq", "Marhamat", "Oltinko'l", "Paxtaobod", "Qo'rg'ontepa", "Shahrixon", "Ulug'nor", "Xo'jaobod"],
    "Farg'ona": ["Farg'ona shahri", "Marg'ilon", "Qo'qon", "Quvasoy", "Beshariq", "Bog'dod", "Buvayda", "Dang'ara", "Farg'ona tumani", "Furqat", "Oltiariq", "O'zbekiston", "Qo'shtepa", "Quva", "Rishton", "So'x", "Toshloq", "Uchko'prik", "Yozyovon"],
    "Namangan": ["Namangan shahri", "Chortoq", "Chust", "Kosonsoy", "Mingbuloq", "Namangan tumani", "Norin", "Pop", "To'raqo'rg'on", "Uchqo'rg'on", "Uychi", "Yangiqo'rg'on", "Davlatobod"],
    "Samarqand": ["Samarqand shahri", "Kattaqo'rg'on shahri", "Bulung'ur", "Ishtixon", "Jomboy", "Kattaqo'rg'on tumani", "Narpay", "Nurobod", "Oqdaryo", "Pastdarg'om", "Paxtachi", "Payariq", "Qo'shrabot", "Samarqand tumani", "Toyloq", "Urgut"],
    "Buxoro": ["Buxoro shahri", "Kogon shahri", "Buxoro tumani", "G'ijduvon", "Jondor", "Kogon tumani", "Olot", "Peshku", "Qorako'l", "Qorovulbozor", "Romitan", "Shofirkon", "Vobkent"],
    "Xorazm": ["Urganch shahri", "Xiva shahri", "Bog'ot", "Gurlan", "Hazorasp", "Xonqa", "Qo'shko'pir", "Shovot", "Urganch tumani", "Xiva tumani", "Yangiariq", "Yangibozor", "Tuproqqal'a"],
    "Qashqadaryo": ["Qarshi shahri", "Shahrisabz shahri", "Chiroqchi", "Dehqonobod", "G'uzor", "Kasbi", "Kitob", "Koson", "Mirishkor", "Muborak", "Nishon", "Qamashi", "Qarshi tumani", "Shahrisabz tumani", "Yakkabog'", "Ko'kdala"],
    "Surxondaryo": ["Termiz shahri", "Angor", "Bandixon", "Boysun", "Denov", "Jarqo'rg'on", "Muzrabot", "Oltinsoy", "Qiziriq", "Qumqo'rg'on", "Sariosiyo", "Sherobod", "Sho'rchi", "Termiz tumani", "Uzun"],
    "Jizzax": ["Jizzax shahri", "Arnasoy", "Baxmal", "Do'stlik", "Forish", "G'allaorol", "Sharof Rashidov", "Mirzacho'l", "Paxtakor", "Yangiobod", "Zafarobod", "Zarbdor", "Zomin"],
    "Sirdaryo": ["Guliston shahri", "Yangiyer", "Shirin", "Boyovut", "Guliston tumani", "Mirzaobod", "Oqoltin", "Sardoba", "Sayxunobod", "Sirdaryo tumani", "Xovos"],
    "Navoiy": ["Navoiy shahri", "Zarafshon shahri", "Karmana", "Konimex", "Navbahor", "Nurota", "Qiziltepa", "Tomdi", "Uchquduq", "Xatirchi"],
    "Qoraqalpog'iston": ["Nukus shahri", "Amudaryo", "Beruniy", "Chimboy", "Ellikqal'a", "Kegeyli", "Mo'ynoq", "Nukus tumani", "Qanliko'l", "Qo'ng'irot", "Qorao'zak", "Shumanay", "Taxtako'pir", "To'rtko'l", "Xo'jayli", "Bo'zatov"],
  };

  // Tuzilmali manzil forma (viloyat/tuman tanlash + qolganini qo'lda)
  function addressFormHtml(p) {
    const regions = Object.keys(REGIONS);
    return `
      <div class="addr-form grid grid-cols-1 gap-2.5">
        <select id="${p}Viloyat" class="addr-viloyat fld w-full rounded-xl px-3.5 py-2.5 text-sm outline-none">
          <option value="" class="bg-ink-800">Viloyatni tanlang</option>
          ${regions.map((r) => `<option class="bg-ink-800" value="${esc(r)}">${esc(r)}</option>`).join('')}
        </select>
        <select id="${p}Tuman" class="addr-tuman fld w-full rounded-xl px-3.5 py-2.5 text-sm outline-none" disabled>
          <option value="" class="bg-ink-800">Avval viloyatni tanlang</option>
        </select>
        <input id="${p}Mahalla" placeholder="Mahalla / ko'cha nomi" class="fld w-full rounded-xl px-3.5 py-2.5 text-sm outline-none" />
        <div class="grid grid-cols-3 gap-2">
          <input id="${p}Uy" inputmode="text" placeholder="Uy №" class="fld rounded-xl px-3 py-2.5 text-sm outline-none" />
          <input id="${p}Padez" inputmode="numeric" placeholder="Padez" class="fld rounded-xl px-3 py-2.5 text-sm outline-none" />
          <input id="${p}Kvartira" inputmode="numeric" placeholder="Kvartira" class="fld rounded-xl px-3 py-2.5 text-sm outline-none" />
        </div>
      </div>`;
  }

  // Formani o'qib, bitta manzil satriga aylantiramiz (viloyat/tuman/uy majburiy)
  function readAddressForm(p) {
    const g = (id) => { const el = $('#' + p + id); return el ? el.value.trim() : ''; };
    const v = g('Viloyat'), t = g('Tuman'), m = g('Mahalla'), u = g('Uy'), pd = g('Padez'), k = g('Kvartira');
    if (!v || !t || !m || !u) return null;
    let s = v + ', ' + t + ', ' + m + ', ' + u + '-uy';
    if (pd) s += ', ' + pd + '-padez';
    if (k) s += ', ' + k + '-kvartira';
    return s;
  }

  function addressesModal() {
    const addrs = getAddresses();
    const list = addrs.length ? addrs.map((a, i) => `
      <div class="flex items-start gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
        <svg class="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9">${menuIco.pin}</svg>
        <p class="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm text-slate-200">${esc(a.text)}</p>
        <button data-del-addr="${i}" class="flex-shrink-0 text-xs font-medium text-rose-400 hover:underline">O'chirish</button>
      </div>`).join('') : `<p class="rounded-xl bg-white/5 px-4 py-6 text-center text-sm text-slate-500 ring-1 ring-white/10">Hali manzil qo'shilmagan</p>`;
    openModal(`
      <div>
        <div class="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 class="font-display text-lg font-bold text-white">Mening manzillarim</h3>
          <button type="button" data-close class="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-white/10"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <div class="space-y-3 p-5">
          <div id="addrList" class="space-y-2">${list}</div>
          <form id="addrForm" class="space-y-2.5 border-t border-white/10 pt-4">
            <span class="text-sm font-semibold text-slate-200">Yangi manzil qo'shish</span>
            ${addressFormHtml('addr')}
            <button type="submit" class="btn-grad w-full rounded-xl py-2.5 text-sm font-bold text-white transition active:scale-95">＋ Manzil qo'shish</button>
          </form>
        </div>
      </div>`);
    $('#addrForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const text = readAddressForm('addr');
      if (!text) { toast('Viloyat, tuman, mahalla va uy raqamini kiriting'); return; }
      const a = getAddresses(); a.push({ id: Date.now(), text }); setAddresses(a);
      addressesModal(); toast('Manzil qo\'shildi ✓');
    });
    $$('[data-del-addr]').forEach((b) => b.addEventListener('click', () => {
      const a = getAddresses(); a.splice(Number(b.dataset.delAddr), 1); setAddresses(a); addressesModal();
    }));
  }

  /* ---- Profil: sotuvchi bilan aloqa ---- */
  function contactModal() {
    const phone = shop.phone;
    const telHref = phone ? 'tel:' + phone.replace(/[^0-9+]/g, '') : '';
    const tgPhone = phone ? 'https://t.me/' + phone.replace(/[^0-9]/g, '') : '';
    const rows = [];
    if (phone) {
      rows.push(`<a href="${esc(telHref)}" class="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10 transition hover:bg-white/10">
        <span class="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg></span>
        <span class="min-w-0"><span class="block text-sm font-semibold text-white">Qo'ng'iroq qilish</span><span class="block truncate text-xs text-slate-400">${esc(phone)}</span></span></a>`);
      rows.push(`<a href="${esc(tgPhone)}" target="_blank" rel="noopener" class="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10 transition hover:bg-white/10">
        <span class="grid h-10 w-10 place-items-center rounded-xl bg-sky-500/15 text-sky-300"><svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.3 18.5 20c-.2 1.1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.7 13.6 1.9 12c-1-.3-1-1 .2-1.5l18.2-7c.9-.3 1.6.2 1.6 1.8Z"/></svg></span>
        <span class="min-w-0"><span class="block text-sm font-semibold text-white">Telegram</span><span class="block truncate text-xs text-slate-400">Xabar yozish</span></span></a>`);
    }
    if (settings.telegram) rows.push(contactLink('Telegram (platforma)', settings.telegram, 'bg-sky-500/15 text-sky-300', '<path d="M21.9 4.3 18.5 20c-.2 1.1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.7 13.6 1.9 12c-1-.3-1-1 .2-1.5l18.2-7c.9-.3 1.6.2 1.6 1.8Z"/>', true));
    if (settings.instagram) rows.push(contactLink('Instagram', settings.instagram, 'bg-pink-500/15 text-pink-300', '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.2"/>', true));

    const contactRows = rows.length ? rows.join('') : '';
    openModal(`
      <div>
        <div class="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 class="font-display text-lg font-bold text-white">Sotuvchi bilan aloqa</h3>
          <button type="button" data-close class="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-white/10"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <div class="space-y-2.5 p-5">
          <button type="button" data-open-chat class="flex w-full items-center gap-3 rounded-xl bg-gradient-to-br from-violet-brand to-violet-deep px-4 py-3 text-left transition hover:opacity-90">
            <span class="grid h-10 w-10 place-items-center rounded-xl bg-white/20 text-white"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l.8-4.2A7.9 7.9 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg></span>
            <span class="min-w-0"><span class="block text-sm font-bold text-white">Xabar yozish</span><span class="block truncate text-xs text-violet-100">Rasm/video yuborishingiz ham mumkin</span></span>
          </button>
          ${contactRows}
        </div>
      </div>`);
  }

  /* ---- Do'kon egasi bilan yozishuv (mehmon) ---- */
  function openChatModal() {
    openModal(`
      <div class="flex h-[70vh] max-h-[560px] flex-col">
        <div class="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div class="flex items-center gap-2.5">
            <span class="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-brand to-violet-deep text-xs font-bold text-white">${esc((shop.name || 'D').slice(0, 1).toUpperCase())}</span>
            <div><h3 class="font-display text-base font-bold text-white">${esc(shop.name)}</h3><p class="text-[11px] text-slate-500">Yozishuv</p></div>
          </div>
          <button type="button" data-close class="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-white/10"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <div id="cThread" class="flex-1 space-y-2.5 overflow-y-auto bg-black/20 p-4 text-sm"></div>
        <form id="cForm" class="border-t border-white/10 p-3">
          <div id="cFilePrev" class="hidden mb-2 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300 ring-1 ring-white/10"></div>
          <div class="flex items-center gap-2">
            <input type="file" id="cFile" class="hidden" accept="image/*,video/*,.pdf" />
            <button type="button" id="cAttach" class="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10" title="Rasm / video / fayl"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9"><path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg></button>
            <input id="cInput" type="text" autocomplete="off" placeholder="Xabar yozing..." class="fld flex-1 rounded-xl px-3.5 py-2.5 text-sm outline-none" />
            <button type="submit" class="btn-grad grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white"><svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg></button>
          </div>
        </form>
      </div>`, 'max-w-md');
    loadChat();
    chatPollTimer = setInterval(loadChat, 10000);
  }

  function chatAttachHtml(m) {
    if (!m.attachment_url) return '';
    const u = esc(m.attachment_url);
    if (m.attachment_type === 'image') return `<a href="${u}" target="_blank" rel="noopener"><img src="${u}" class="mt-1.5 max-h-48 rounded-lg" alt="" /></a>`;
    if (m.attachment_type === 'video') return `<video controls src="${u}" class="mt-1.5 max-h-48 w-full rounded-lg"></video>`;
    return `<a href="${u}" target="_blank" rel="noopener" class="mt-1.5 inline-block rounded-lg bg-black/25 px-3 py-2 text-xs font-medium text-white">${esc(m.attachment_name || 'Fayl')}</a>`;
  }

  function renderChatThread() {
    const box = $('#cThread');
    if (!box) return;
    box.innerHTML = chatMsgs.map((m) => {
      const mine = !m.sender_id; // mehmon xabari
      return `
        <div class="flex ${mine ? 'justify-end' : 'justify-start'}">
          <div class="max-w-[82%] rounded-2xl px-3.5 py-2 ${mine ? 'bg-gradient-to-br from-violet-brand to-violet-deep text-white' : 'bg-white/8 text-slate-100 ring-1 ring-white/10'}">
            ${m.body ? `<p class="whitespace-pre-wrap break-words">${esc(m.body)}</p>` : ''}
            ${chatAttachHtml(m)}
          </div>
        </div>`;
    }).join('') || '<p class="mt-6 text-center text-xs text-slate-400">Savolingizni yozing — do\'kon egasi javob beradi.</p>';
    box.scrollTop = box.scrollHeight;
  }

  async function loadChat() {
    if (!shop) return;
    try {
      const { data, error } = await sb.from('messages').select('*').eq('conversation_id', chatConvId()).order('created_at', { ascending: true });
      if (error) throw error;
      chatMsgs = data || [];
    } catch (e) { console.warn('Yozishuv:', e); return; }
    renderChatThread();
  }

  async function uploadChatFile(file) {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const path = `${guestId()}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await sb.storage.from('message-files').upload(path, file);
    if (error) throw error;
    const { data } = sb.storage.from('message-files').getPublicUrl(path);
    const type = file.type.indexOf('image/') === 0 ? 'image' : file.type.indexOf('video/') === 0 ? 'video' : 'file';
    return { url: data && data.publicUrl, type, name: file.name };
  }

  function renderCFilePrev() {
    const prev = $('#cFilePrev');
    if (!prev) return;
    if (!chatFile) { prev.classList.add('hidden'); prev.innerHTML = ''; return; }
    prev.classList.remove('hidden');
    prev.innerHTML = `<span class="min-w-0 flex-1 truncate">📎 ${esc(chatFile.name)}</span><button type="button" data-cfile-remove class="text-rose-400 hover:underline">olib tashlash</button>`;
  }

  async function sendChat(form) {
    if (!shop) return;
    const body = $('#cInput').value.trim();
    if (!body && !chatFile) return;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    let att = null;
    if (chatFile) {
      try { att = await uploadChatFile(chatFile); }
      catch (e) { console.error(e); toast(/bucket|not found/i.test(e.message || '') ? "Fayl bucket topilmadi — SQL'ni ishga tushiring" : 'Faylni yuklab bo\'lmadi'); btn.disabled = false; return; }
    }
    const c = getCustomer();
    const row = {
      conversation_id: chatConvId(),
      sender_id: null,
      sender_name: c.name || 'Mijoz',
      recipient_id: chatTarget(),
      recipient_name: shop.name,
      guest_id: guestId(),
      body: body || null,
      attachment_url: att ? att.url : null,
      attachment_type: att ? att.type : null,
      attachment_name: att ? att.name : null,
      read_by_recipient: false,
    };
    const { data, error } = await sb.from('messages').insert(row).select().single();
    btn.disabled = false;
    if (error) {
      console.error('Xabar:', error);
      toast(/messages|does not exist|schema cache/i.test(error.message || '') ? "Xabarlar jadvali topilmadi — SQL'ni ishga tushiring" : 'Xatolik: yuborilmadi');
      return;
    }
    if (!chatMsgs.some((x) => x.id === data.id)) chatMsgs.push(data);
    chatFile = null;
    $('#cInput').value = '';
    renderCFilePrev();
    renderChatThread();
  }
  function contactLink(label, href, tint, icon, fill) {
    return `<a href="${esc(href)}" target="_blank" rel="noopener" class="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10 transition hover:bg-white/10">
      <span class="grid h-10 w-10 place-items-center rounded-xl ${tint}"><svg class="h-5 w-5" viewBox="0 0 24 24" ${fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.9"'}>${icon}</svg></span>
      <span class="min-w-0"><span class="block text-sm font-semibold text-white">${label}</span><span class="block truncate text-xs text-slate-400">Ochish</span></span></a>`;
  }

  /* ---- Profil: do'kon haqida ---- */
  function aboutModal() {
    openModal(`
      <div class="p-6 text-center">
        <span class="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-brand to-violet-deep text-white"><svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">${menuIco.store}</svg></span>
        <h3 class="mt-4 font-display text-xl font-bold text-white">${esc(shop.name)}</h3>
        <p class="mt-1 text-sm text-slate-400">Bu do'kon sotibber.uz platformasida ishlaydi. Buyurtmalar xavfsiz qabul qilinadi va tez yetkaziladi.</p>
        <button type="button" data-close class="mt-6 w-full rounded-xl bg-white/10 py-3 text-sm font-bold text-white hover:bg-white/15">Yopish</button>
      </div>`);
  }

  /* ---------------- Modal ---------------- */
  function closeModal() {
    if (chatPollTimer) { clearInterval(chatPollTimer); chatPollTimer = null; }
    chatFile = null;
    $('#modalRoot').innerHTML = '';
    document.body.style.overflow = '';
  }
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
      const ico = b.querySelector('.nav-ico');
      const lbl = b.querySelector('.nav-lbl');
      if (ico) {
        ico.classList.toggle('bg-violet-500/20', active);
        ico.classList.toggle('text-violet-200', active);
        ico.classList.toggle('text-slate-400', !active);
        ico.classList.toggle('scale-105', active);
      }
      if (lbl) {
        lbl.classList.toggle('text-violet-300', active);
        lbl.classList.toggle('text-slate-500', !active);
      }
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

    const openBtn = t.closest('[data-open]');
    if (openBtn) {
      const m = openBtn.dataset.open;
      if (m === 'info') return infoModal();
      if (m === 'addresses') return addressesModal();
      if (m === 'contact') return contactModal();
      if (m === 'about') return aboutModal();
    }

    const pick = t.closest('[data-pick-addr]');
    if (pick) {
      $$('[data-pick-addr]').forEach((el) => {
        const on = el === pick;
        el.classList.toggle('border-violet-400/60', on);
        el.classList.toggle('bg-violet-500/10', on);
        el.classList.toggle('border-white/10', !on);
      });
      const newBox = $('#coNewAddr');
      if (newBox) newBox.classList.toggle('hidden', pick.dataset.pickAddr !== 'new');
      return;
    }

    const det = t.closest('[data-detail]');
    if (det) return detailModal(Number(det.dataset.detail));

    const add = t.closest('[data-add]');
    if (add) return addToCart(Number(add.dataset.add));

    const addClose = t.closest('[data-add-close]');
    if (addClose) { addToCart(Number(addClose.dataset.addClose)); closeModal(); return; }

    const closeGo = t.closest('[data-close-go]');
    if (closeGo) { closeModal(); return go(closeGo.dataset.closeGo); }

    const oChat = t.closest('[data-open-chat]');
    if (oChat) return openChatModal();
    const cAtt = t.closest('#cAttach');
    if (cAtt) { const cf = $('#cFile'); if (cf) cf.click(); return; }
    const cfr = t.closest('[data-cfile-remove]');
    if (cfr) { chatFile = null; renderCFilePrev(); return; }

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

  // Viloyat tanlanganda — tumanlar ro'yxatini to'ldiramiz
  document.addEventListener('change', (e) => {
    const vs = e.target.closest('.addr-viloyat');
    if (!vs) return;
    const form = vs.closest('.addr-form');
    const ts = form && form.querySelector('.addr-tuman');
    if (!ts) return;
    const list = REGIONS[vs.value] || [];
    ts.innerHTML = '<option value="" class="bg-ink-800">' + (list.length ? 'Tumanni tanlang' : 'Avval viloyatni tanlang') + '</option>'
      + list.map((d) => `<option class="bg-ink-800" value="${esc(d)}">${esc(d)}</option>`).join('');
    ts.disabled = !list.length;
  });

  // Yozishuv: fayl tanlash va yuborish
  document.addEventListener('change', (e) => {
    const cf = e.target.closest('#cFile');
    if (!cf) return;
    const f = cf.files && cf.files[0];
    if (f) {
      if (f.size > 25 * 1024 * 1024) { toast('Fayl 25MB dan oshmasligi kerak'); cf.value = ''; return; }
      chatFile = f; renderCFilePrev();
    }
    cf.value = '';
  });
  document.addEventListener('submit', (e) => {
    const cform = e.target.closest('#cForm');
    if (cform) { e.preventDefault(); sendChat(cform); }
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  /* ---------------- Boshlash ---------------- */
  loadShop();
})();
