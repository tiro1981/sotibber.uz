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

  function mapProductRow(p) {
    const images = productImages(p);
    return {
      id: p.id,
      name: p.name,
      description: p.description || '',
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

    // Profil (ism, telefon)
    let profile = null;
    try {
      const { data } = await sb.from('profiles').select('*').eq('id', user.id).single();
      profile = data;
    } catch (e) { /* profil hali yaratilmagan bo'lishi mumkin */ }
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
          price: Number(p.price),
          stock: p.stock,
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

    await loadScript('script.js');
  })();
})();
