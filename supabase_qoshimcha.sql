-- =====================================================================
-- sotibber.uz — QO'SHIMCHA imkoniyatlar uchun SQL
--
-- Bu faylni Supabase Studio -> SQL Editor -> "New query" ichiga to'liq
-- joylab, "RUN" bosing. Bir marta ishga tushirish kifoya.
--
-- Nima qo'shadi:
--   1) Admin panel uchun kirish (barcha mahsulot/foydalanuvchini ko'rish,
--      moderatsiya)
--   2) Savol-javob chat (support_messages)
--   3) Messenjer havolalari (site_settings) — footer tugmalari uchun
--
-- DIQQAT (xavfsizlik): admin panel frontend'dagi anon kalit orqali
-- ishlaydi. Quyidagi "anon" siyosatlari anon kalitni bilgan har kimга
-- ma'lumotni o'qish/yozish imkonini beradi. Kichik/sinov loyiha uchun
-- mos. To'liq himoya kerak bo'lsa — alohida admin hisobi + is_admin
-- ustuni bilan cheklash tavsiya etiladi.
-- =====================================================================

-- ---------------------------------------------------------------
-- 1) ADMIN — barcha mahsulot va foydalanuvchilarni ko'rish, moderatsiya
-- ---------------------------------------------------------------
drop policy if exists "Admin: barcha mahsulotlarni ko'rish" on public.products;
create policy "Admin: barcha mahsulotlarni ko'rish"
  on public.products for select to anon using (true);

drop policy if exists "Admin: mahsulotni yangilash" on public.products;
create policy "Admin: mahsulotni yangilash"
  on public.products for update to anon using (true) with check (true);

drop policy if exists "Admin: mahsulotni o'chirish" on public.products;
create policy "Admin: mahsulotni o'chirish"
  on public.products for delete to anon using (true);

drop policy if exists "Admin: barcha profillarni ko'rish" on public.profiles;
create policy "Admin: barcha profillarni ko'rish"
  on public.profiles for select to anon using (true);

-- ---------------------------------------------------------------
-- 2) SAVOL-JAVOB CHAT (support_messages)
-- ---------------------------------------------------------------
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sender text not null check (sender in ('user', 'admin')),
  body text not null,
  read_by_admin boolean not null default false,
  read_by_user boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists support_messages_user_idx on public.support_messages (user_id, created_at);
alter table public.support_messages enable row level security;

drop policy if exists "Support: o'zini ko'rish" on public.support_messages;
create policy "Support: o'zini ko'rish"
  on public.support_messages for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Support: o'zi yozadi" on public.support_messages;
create policy "Support: o'zi yozadi"
  on public.support_messages for insert to authenticated
  with check (auth.uid() = user_id and sender = 'user');

drop policy if exists "Support: o'zi yangilaydi" on public.support_messages;
create policy "Support: o'zi yangilaydi"
  on public.support_messages for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Support: admin ko'radi" on public.support_messages;
create policy "Support: admin ko'radi"
  on public.support_messages for select to anon using (true);

drop policy if exists "Support: admin yozadi" on public.support_messages;
create policy "Support: admin yozadi"
  on public.support_messages for insert to anon with check (true);

drop policy if exists "Support: admin yangilaydi" on public.support_messages;
create policy "Support: admin yangilaydi"
  on public.support_messages for update to anon using (true) with check (true);

-- ---------------------------------------------------------------
-- 3) MESSENJER HAVOLALARI (site_settings)
-- ---------------------------------------------------------------
create table if not exists public.site_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;

drop policy if exists "Settings: ochiq o'qish" on public.site_settings;
create policy "Settings: ochiq o'qish"
  on public.site_settings for select to anon, authenticated using (true);

drop policy if exists "Settings: admin yozadi" on public.site_settings;
create policy "Settings: admin yozadi"
  on public.site_settings for insert to anon with check (true);

drop policy if exists "Settings: admin yangilaydi" on public.site_settings;
create policy "Settings: admin yangilaydi"
  on public.site_settings for update to anon using (true) with check (true);

insert into public.site_settings (key, value) values
  ('telegram', ''), ('instagram', ''), ('youtube', '')
on conflict (key) do nothing;
