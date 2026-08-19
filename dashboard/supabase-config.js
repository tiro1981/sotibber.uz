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
window.SUPABASE_URL = 'https://fblnctyxbrglclnrixkb.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_mbzdhYUNTLoHltofwOmQVg_1BbAZXWs';

// Telegram tasdiqlash boti — BotFather'dan olingan bot foydalanuvchi nomi
// (@'siz). verify.html shu nomdan deep-link yasaydi: https://t.me/<username>?start=...
// MUHIM: o'z botingiz nomiga almashtiring.
window.TELEGRAM_BOT_USERNAME = 'sotibbersmsbot';

window.sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
