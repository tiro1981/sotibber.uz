/* =========================================================
   sotibber.uz — Dashboard boshlanishi (auth guard + ma'lumot yuklash)

   1) Foydalanuvchi login qilganmi tekshiradi — bo'lmasa login.html'ga
      yo'naltiradi.
   2) Profil va mahsulotlarni Supabase'dan oldindan yuklab, global
      window.__SOTIBBER_* o'zgaruvchilariga joylaydi.
   3) Shundan keyingina asosiy script.js'ni yuklaydi — shu tufayli
      script.js ichida ma'lumotlar allaqachon tayyor bo'ladi.
========================================================= */
(function () {
  'use strict';

  // Asset versiyasi — script.js keshini yangilash uchun. Har deployda oshiring.
  var ASSET_V = '20260819-10';

  // bfcache guard: brauzer "orqaga/oldinga" bilan sahifani keshdan tiklaganda
  // skriptlar qayta ishlamaydi — natijada chiqib bo'lingandan keyin ham eski
  // dashboard ko'rinib qolishi mumkin. Shu holatda sahifani qayta yuklaymiz,
  // shunda quyidagi boot() sessiyani qaytadan tekshiradi (yo'q bo'lsa loginga).
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) window.location.reload();
  });

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

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
  }

  function computeCommissionAmount(price, commissionPct) {
    return Math.round((Number(price) || 0) * (Number(commissionPct) || 0) / 100);
  }

  // Mahsulot rasmlari: yangi `image_urls` massivi bo'lsa o'shani,
  // bo'lmasa eski bitta `image_url`ni ishlatamiz.
  function productImages(p) {
    if (Array.isArray(p.image_urls) && p.image_urls.length) return p.image_urls.filter(Boolean);
    return p.image_url ? [p.image_url] : [];
  }

  // Ism/matndan do'kon uchun "slug" yasaymiz (lotin harflari + raqam)
  function slugify(s) {
    const map = { 'ш': 'sh', 'ч': 'ch', 'ў': 'o', 'ғ': 'g', 'қ': 'q', 'ҳ': 'h', 'я': 'ya', 'ю': 'yu', 'ъ': '', 'ь': '', 'ё': 'yo', 'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'x', 'ц': 'ts', 'э': 'e', "'": '', 'ʻ': '', '`': '' };
    return String(s || '').toLowerCase().split('').map((c) => (map[c] !== undefined ? map[c] : c)).join('')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'dokon';
  }

  // Foydalanuvchida do'kon manzili (shop_slug) yo'q bo'lsa — yaratamiz
  async function ensureShopSlug(sb, user, profile) {
    if (profile && profile.shop_slug) return profile;
    const base = slugify((profile && profile.full_name) || (user.email || '').split('@')[0] || 'dokon');
    const shopName = (profile && profile.shop_name) || ((profile && profile.full_name) ? profile.full_name + " do'koni" : "Mening do'konim");
    for (let attempt = 0; attempt < 4; attempt++) {
      const candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      try {
        // upsert — profil qatori yo'q bo'lsa ham yaratadi/yangilaydi
        const { data, error } = await sb.from('profiles')
          .upsert({ id: user.id, shop_slug: candidate, shop_name: shopName }, { onConflict: 'id' })
          .select().single();
        if (!error) return data;
        // Ustun yo'q (migratsiya ishga tushmagan) — jimgina o'tkazamiz
        if (/shop_slug|column .* does not exist|schema cache/i.test(error.message || '')) {
          console.warn("`shop_slug` ustuni topilmadi — supabase_qoshimcha.sql'ni ishga tushiring.");
          return profile;
        }
        // Slug band bo'lsa — boshqa suffiks bilan qayta urinamiz
        if (!/duplicate|unique|23505/i.test(error.message || '')) { console.warn('shop_slug:', error); return profile; }
      } catch (e) { console.warn('shop_slug:', e); return profile; }
    }
    return profile;
  }

  // Do'kon tartib raqamini ta'minlaymiz (0001, 0002 ...). RPC (assign_shop_no)
  // atomik ravishda keyingi raqamni beradi. Funksiya yo'q bo'lsa — jimgina o'tamiz.
  async function ensureShopNo(sb, profile) {
    if (profile && profile.shop_no != null) return profile;
    try {
      const { data, error } = await sb.rpc('assign_shop_no');
      if (!error && data != null) return Object.assign({}, profile || {}, { shop_no: data });
      if (error) console.warn("assign_shop_no:", error.message || error);
    } catch (e) { console.warn('assign_shop_no:', e); }
    return profile;
  }

  function fmtDate(ts) { return ts ? new Date(ts).toLocaleDateString('ru-RU') : ''; }

  // orders qatorini sotuvchi "Buyurtmalar" jadvali shakliga o'tkazamiz
  function mapOrderRow(o) {
    return {
      id: '#' + String(o.id).slice(0, 6),
      dbId: o.id,
      productId: o.product_id || null,
      product: o.product_name || 'Mahsulot',
      customer: o.customer_name || '',
      phone: o.customer_phone || '',
      address: o.address || '',
      quantity: Number(o.quantity) || 1,
      unitPrice: Number(o.unit_price) || 0,
      payment: o.payment_method || '',
      agent: o.affiliate_name || 'Sotib beruvchi',
      commission: Number(o.commission) || 0,
      total: Number(o.total) || 0,
      date: fmtDate(o.created_at),
      createdAt: o.created_at,
      shippedAt: o.shipped_at || null,
      status: o.status || 'Yangi',
    };
  }

  // orders qatorini sotib beruvchi "Mening sotuvlarim" jadvali shakliga o'tkazamiz
  function mapSaleRow(o) {
    const nm = (o.customer_name || 'M').trim();
    return {
      id: '#' + String(o.id).slice(0, 6),
      product: o.product_name || 'Mahsulot',
      date: fmtDate(o.created_at),
      customer: (nm[0] || 'M').toUpperCase(),
      status: o.status || 'Yangi',
      commission: Number(o.commission) || 0,
    };
  }

  function mapProductRow(p) {
    const images = productImages(p);
    return {
      id: p.id,
      name: p.name,
      description: p.description || '',
      category: p.category || '',
      price: Number(p.price),
      stock: p.stock,
      commission: Number(p.commission),
      status: p.status,
      color: p.color || 'from-violet-500/25 to-indigo-500/10',
      images,
      image: images[0] || null,
    };
  }

  (async function boot() {
    const panel = initialPanel();
    try { localStorage.setItem('sotibber_panel', panel); } catch (e) {}

    const sb = window.sb;
    if (!sb) {
      console.error('Supabase mijozi topilmadi — supabase-config.js to\'g\'ri ulanganmi tekshiring.');
      return;
    }

    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      window.location.href = `login.html?panel=${panel}`;
      return;
    }

    const user = session.user;
    window.__SOTIBBER_USER = user;

    // Profil (ism, telefon, do'kon slug)
    let profile = null;
    try {
      const { data } = await sb.from('profiles').select('*').eq('id', user.id).single();
      profile = data;
    } catch (e) { /* profil hali yaratilmagan bo'lishi mumkin */ }

    // Admin tomonidan bloklangan bo'lsa — tizimdan chiqaramiz
    if (profile && profile.blocked) {
      try { await sb.auth.signOut({ scope: 'local' }); } catch (e) {}
      window.location.replace(`login.html?blocked=1`);
      return;
    }
    // Do'kon manzili (shop_slug) yo'q bo'lsa — yaratamiz
    profile = await ensureShopSlug(sb, user, profile);
    // Do'kon tartib raqami (0001, 0002 ...) — yo'q bo'lsa RPC orqali beriladi
    profile = await ensureShopNo(sb, profile);
    window.__SOTIBBER_PROFILE = profile;

    // Sotuvchining o'z mahsulotlari
    try {
      const { data: myProducts, error } = await sb
        .from('products')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      window.__SOTIBBER_PRODUCTS = (myProducts || []).map(mapProductRow);
    } catch (e) {
      console.error('Mahsulotlarni yuklashda xatolik:', e);
      window.__SOTIBBER_PRODUCTS = [];
    }

    // Bozor — barcha sotuvchilarning sklad mavjud mahsulotlari
    try {
      const { data: marketRows, error } = await sb
        .from('products')
        .select('*')
        .gt('stock', 0)
        .order('created_at', { ascending: false });
      if (error) throw error;
      window.__SOTIBBER_MARKET_PRODUCTS = (marketRows || []).map((p) => {
        const images = productImages(p);
        return {
          id: p.id,
          name: p.name,
          description: p.description || '',
          category: p.category || '',
          price: Number(p.price),
          stock: p.stock,
          seller_id: p.seller_id,
          merchant: 'Sotuvchi',
          commission: computeCommissionAmount(p.price, p.commission),
          commissionPct: Number(p.commission),
          color: p.color || 'from-violet-500/25 to-indigo-500/10',
          images,
          image: images[0] || null,
        };
      });
    } catch (e) {
      console.error('Bozorni yuklashda xatolik:', e);
      window.__SOTIBBER_MARKET_PRODUCTS = [];
    }

    // Sotib beruvchining do'koni — qo'shgan mahsulotlari (affiliate_products).
    // Embed (bog'lam) o'rniga ikki bosqichli so'rov — ishonchliroq.
    try {
      const { data: apRows, error: apErr } = await sb
        .from('affiliate_products')
        .select('product_id, created_at, archived')
        .eq('affiliate_id', user.id)
        .order('created_at', { ascending: false });
      if (apErr) throw apErr;
      const ids = (apRows || []).map((r) => r.product_id).filter(Boolean);
      const prodById = {};
      if (ids.length) {
        const { data: prods, error: pErr } = await sb.from('products').select('*').in('id', ids);
        if (pErr) throw pErr;
        (prods || []).forEach((p) => { prodById[p.id] = p; });
      }
      window.__SOTIBBER_AGENT_LINKS = (apRows || [])
        .map((r) => {
          const p = prodById[r.product_id];
          if (!p) return null;
          const images = productImages(p);
          const commissionPct = Number(p.commission) || 0;
          return {
            product_id: p.id,
            product: p.name,
            description: p.description || '',
            category: p.category || '',
            price: Number(p.price),
            commission: computeCommissionAmount(p.price, commissionPct),
            clicks: 0,
            sales: 0,
            slug: '',
            archived: !!r.archived,
            images,
            image: images[0] || null,
          };
        })
        .filter(Boolean);
    } catch (e) {
      console.error('Do\'kon mahsulotlarini yuklashda xatolik:', e);
      window.__SOTIBBER_AGENT_LINKS = [];
    }

    // Sotuvchining buyurtmalari (orders) — seller_id = men
    try {
      const { data, error } = await sb.from('orders').select('*').eq('seller_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      const rows = data || [];
      // 3 kunlik avto-yetkazish: "Yo'lda" bo'lib 3 kundan oshgan buyurtmalar
      // mijoz tasdiqlamasa, avtomatik "Yetkazildi" bo'ladi.
      const THREE_DAYS = 3 * 864e5;
      const stale = rows.filter((o) => o.status === "Yo'lda" && o.shipped_at && (Date.now() - new Date(o.shipped_at).getTime() > THREE_DAYS));
      if (stale.length) {
        try {
          await sb.from('orders').update({ status: 'Yetkazildi' }).in('id', stale.map((o) => o.id));
          stale.forEach((o) => { o.status = 'Yetkazildi'; });
        } catch (e2) { console.warn('Avto-yetkazishda xatolik:', e2); }
      }
      window.__SOTIBBER_ORDERS = rows.map(mapOrderRow);
    } catch (e) {
      console.error('Buyurtmalarni yuklashda xatolik:', e);
      window.__SOTIBBER_ORDERS = [];
    }

    // Sotib beruvchining sotuvlari (orders) — affiliate_id = men
    try {
      const { data, error } = await sb.from('orders').select('*').eq('affiliate_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      window.__SOTIBBER_SALES = (data || []).map(mapSaleRow);
      // Do'kondagi har bir mahsulot uchun sotuvlar sonini hisoblaymiz
      const links = window.__SOTIBBER_AGENT_LINKS || [];
      (data || []).forEach((o) => {
        const l = links.find((x) => x.product_id === o.product_id);
        if (l) l.sales += Number(o.quantity) || 1;
      });
    } catch (e) {
      console.error('Sotuvlarni yuklashda xatolik:', e);
      window.__SOTIBBER_SALES = [];
    }

    // Sotuvchi: mahsulotlarimni KIM do'koniga qo'shgan (sotib beruvchilar) + sotilgani
    try {
      const myIds = (window.__SOTIBBER_PRODUCTS || []).map((p) => p.id);
      if (myIds.length) {
        const { data: aps } = await sb.from('affiliate_products').select('affiliate_id, product_id, archived, created_at').in('product_id', myIds);
        const affIds = Array.from(new Set((aps || []).map((a) => a.affiliate_id).filter(Boolean)));
        const profById = {};
        if (affIds.length) {
          const { data: profs } = await sb.from('profiles').select('id, full_name, shop_name, shop_no, instagram').in('id', affIds);
          (profs || []).forEach((p) => { profById[p.id] = p; });
        }
        // Sotilgan soni: orders (seller_id = men) bo'yicha affiliate+product kesimida
        const soldMap = {};
        try {
          const { data: ord } = await sb.from('orders').select('affiliate_id, product_id, quantity').eq('seller_id', user.id);
          (ord || []).forEach((o) => { const k = o.affiliate_id + '|' + o.product_id; soldMap[k] = (soldMap[k] || 0) + (Number(o.quantity) || 1); });
        } catch (e) { /* orders yo'q bo'lishi mumkin */ }
        const prodNameById = {};
        (window.__SOTIBBER_PRODUCTS || []).forEach((p) => { prodNameById[p.id] = p.name; });
        window.__SOTIBBER_MY_RESELLERS = (aps || []).map((a) => {
          const pr = profById[a.affiliate_id] || {};
          return {
            affiliate_id: a.affiliate_id,
            product_id: a.product_id,
            product_name: prodNameById[a.product_id] || 'Mahsulot',
            name: pr.shop_name || pr.full_name || 'Sotib beruvchi',
            instagram: pr.instagram || '',
            shop_no: pr.shop_no || null,
            archived: !!a.archived,
            sold: soldMap[a.affiliate_id + '|' + a.product_id] || 0,
          };
        });
      } else {
        window.__SOTIBBER_MY_RESELLERS = [];
      }
    } catch (e) {
      console.error('Sotib beruvchilarni yuklashda xatolik:', e);
      window.__SOTIBBER_MY_RESELLERS = [];
    }

    // Xabarlar — foydalanuvchi ishtirok etgan barcha xabarlar (sender yoki recipient)
    try {
      const { data, error } = await sb
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      window.__SOTIBBER_MESSAGES = data || [];
    } catch (e) {
      console.error('Xabarlarni yuklashda xatolik:', e);
      window.__SOTIBBER_MESSAGES = [];
    }

    // Bildirishnomalar (admin -> foydalanuvchilar)
    try {
      const { data, error } = await sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      window.__SOTIBBER_NOTIFICATIONS = data || [];
    } catch (e) {
      console.error('Bildirishnomalarni yuklashda xatolik:', e);
      window.__SOTIBBER_NOTIFICATIONS = [];
    }

    await loadScript('script.js?v=' + ASSET_V);
  })();
})();
