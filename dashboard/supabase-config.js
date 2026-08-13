/* =========================================================
   sotibber.uz — Supabase konfiguratsiyasi

   MUHIM: pastdagi SUPABASE_URL qiymatini o'zingizning Supabase
   loyihangizdan oling:
     Supabase Studio -> Project Settings -> API -> Project URL

   SUPABASE_ANON_KEY — "anon / publishable" kalit (sb_publishable_... yoki
   eski loyihalarda uzun JWT ko'rinishida bo'ladi). Faqat shu turdagi
   kalitni frontend kodiga qo'yish xavfsiz.

   DIQQAT: "service_role" / "secret" kalitni HECH QACHON bu faylga yoki
   boshqa frontend kodiga qo'ymang — u butun bazaga to'liq (RLS'siz)
   kirish huquqini beradi.
========================================================= */
window.SUPABASE_URL = 'https://YOUR-PROJECT-REF.supabase.co'; // <-- shu yerga Project URL
window.SUPABASE_ANON_KEY = 'sb_publishable_mbzdhYUNTLoHltofwOmQVg_1BbAZXWs';

window.sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
