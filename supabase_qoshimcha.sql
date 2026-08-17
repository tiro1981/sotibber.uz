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

-- ---------------------------------------------------------------
-- 4) MAHSULOT RASMLARI — bittadan 5 tagacha (galereya)
--
--   Avval `products.image_url` (bitta rasm) ishlatilardi. Endi
--   `image_urls` massivi qo'shildi — sotuvchi 5 tagacha rasm yuklaydi.
--   `image_url` birinchi rasm sifatida saqlanib qoladi (eski kod uchun).
-- ---------------------------------------------------------------
alter table public.products
  add column if not exists image_urls text[] not null default '{}';

-- Mahsulot kategoriyasi (bozorda filtrlash uchun)
alter table public.products
  add column if not exists category text;

-- =====================================================================
-- 5) SOTIB BERUVCHI DO'KONI (web-ilova) + BUYURTMALAR
--
--   Sotib beruvchi (affiliate) o'z do'konini ochadi va havolani ijtimoiy
--   tarmoqlarga joylaydi. Xaridor havola orqali kiradi
--   (dashboard/shop.html?s=<shop_slug>), do'kondagi mahsulotlarni ko'radi
--   va buyurtma beradi. Buyurtma MAHSULOT EGASIGA (sotuvchiga) boradi.
-- =====================================================================

-- 5.1) profiles — do'kon manzili (slug) va do'kon nomi
alter table public.profiles
  add column if not exists shop_slug text,
  add column if not exists shop_name text;

create unique index if not exists profiles_shop_slug_key
  on public.profiles (shop_slug) where shop_slug is not null;

-- 5.2) affiliate_products — sotib beruvchi do'koniga qo'shgan mahsulotlar
create table if not exists public.affiliate_products (
  affiliate_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (affiliate_id, product_id)
);
alter table public.affiliate_products enable row level security;

-- Sotib beruvchi o'z do'konini boshqaradi
drop policy if exists "AffProducts: o'zi ko'radi" on public.affiliate_products;
create policy "AffProducts: o'zi ko'radi"
  on public.affiliate_products for select to authenticated using (auth.uid() = affiliate_id);

drop policy if exists "AffProducts: o'zi qo'shadi" on public.affiliate_products;
create policy "AffProducts: o'zi qo'shadi"
  on public.affiliate_products for insert to authenticated with check (auth.uid() = affiliate_id);

drop policy if exists "AffProducts: o'zi o'chiradi" on public.affiliate_products;
create policy "AffProducts: o'zi o'chiradi"
  on public.affiliate_products for delete to authenticated using (auth.uid() = affiliate_id);

-- Xaridor (anon) do'kon mahsulotlarini ko'radi — do'kon ommaviy
drop policy if exists "AffProducts: ochiq ko'rish" on public.affiliate_products;
create policy "AffProducts: ochiq ko'rish"
  on public.affiliate_products for select to anon using (true);

-- 5.3) orders — buyurtmalar (xaridor -> sotuvchi, komissiya -> sotib beruvchi)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  seller_id uuid references auth.users(id) on delete set null,
  affiliate_id uuid references auth.users(id) on delete set null,
  product_name text,
  affiliate_name text,
  customer_name text not null,
  customer_phone text not null,
  address text,
  quantity integer not null default 1,
  unit_price numeric not null default 0,
  total numeric not null default 0,
  commission numeric not null default 0,
  payment_method text,
  status text not null default 'Yangi',
  created_at timestamptz not null default now()
);
create index if not exists orders_seller_idx on public.orders (seller_id, created_at desc);
create index if not exists orders_affiliate_idx on public.orders (affiliate_id, created_at desc);
alter table public.orders enable row level security;

-- Xaridor (anon) yoki login qilgan foydalanuvchi buyurtma beradi
drop policy if exists "Orders: xaridor qo'shadi (anon)" on public.orders;
create policy "Orders: xaridor qo'shadi (anon)"
  on public.orders for insert to anon with check (true);

drop policy if exists "Orders: xaridor qo'shadi (auth)" on public.orders;
create policy "Orders: xaridor qo'shadi (auth)"
  on public.orders for insert to authenticated with check (true);

-- Sotuvchi o'z buyurtmalarini ko'radi va holatini yangilaydi
drop policy if exists "Orders: sotuvchi ko'radi" on public.orders;
create policy "Orders: sotuvchi ko'radi"
  on public.orders for select to authenticated using (auth.uid() = seller_id);

drop policy if exists "Orders: sotuvchi yangilaydi" on public.orders;
create policy "Orders: sotuvchi yangilaydi"
  on public.orders for update to authenticated
  using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

-- Sotib beruvchi o'z sotuvlarini ko'radi
drop policy if exists "Orders: sotib beruvchi ko'radi" on public.orders;
create policy "Orders: sotib beruvchi ko'radi"
  on public.orders for select to authenticated using (auth.uid() = affiliate_id);

-- Admin panel (anon) barcha buyurtmalarni ko'radi
drop policy if exists "Orders: admin ko'radi" on public.orders;
create policy "Orders: admin ko'radi"
  on public.orders for select to anon using (true);

-- =====================================================================
-- 6) DO'KON TARTIB RAQAMI — har bir do'kon 0001, 0002, ... oladi
--
--   Havolaга shu raqam qo'shiladi (shop.html?id=0001) — do'konlar
--   chalkashib ketmaydi. Raqam ketma-ket va takrorlanmas.
-- =====================================================================
create sequence if not exists public.shop_no_seq start 1;

alter table public.profiles
  add column if not exists shop_no integer;

create unique index if not exists profiles_shop_no_key
  on public.profiles (shop_no) where shop_no is not null;

-- Mavjud foydalanuvchilarga raqam beramiz (ro'yxatdan o'tган tartibida)
do $$
declare r record;
begin
  for r in select id from public.profiles where shop_no is null order by created_at loop
    update public.profiles set shop_no = nextval('public.shop_no_seq') where id = r.id;
  end loop;
end $$;

-- Talab bo'yicha (atomik) raqam beruvchi funksiya — frontend chaqiradi
create or replace function public.assign_shop_no()
returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  select shop_no into n from public.profiles where id = auth.uid();
  if n is not null then return n; end if;
  n := nextval('public.shop_no_seq');
  insert into public.profiles (id, shop_no) values (auth.uid(), n)
    on conflict (id) do update set shop_no = coalesce(public.profiles.shop_no, excluded.shop_no);
  select shop_no into n from public.profiles where id = auth.uid();
  return n;
end; $$;

grant execute on function public.assign_shop_no() to authenticated;

-- =====================================================================
-- 7) XABARLAR — sotuvchi ↔ sotib beruvchi (va web-ilova mehmoni)
--
--   Foydalanuvchilar o'zaro yozishadi; matndan tashqari rasm/video/fayl
--   biriktirish mumkin (message-files bucket). Web-ilova mehmoni (anon)
--   do'kon egasiga xabar yozadi va javobini ko'radi (loyihaning mavjud
--   ochiq "anon" modeliga mos).
-- =====================================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null,        -- suhbat kaliti: 'u:<uuid>__<uuid>' yoki 'g:<guest>__<uuid>'
  sender_id uuid references auth.users(id) on delete set null,   -- null = mehmon
  sender_name text,
  recipient_id uuid references auth.users(id) on delete set null,
  recipient_name text,
  guest_id text,                        -- web-ilova mehmoni (localStorage) identifikatori
  body text,
  attachment_url text,
  attachment_type text,                 -- 'image' | 'video' | 'file'
  attachment_name text,
  product_id uuid references public.products(id) on delete set null,
  read_by_recipient boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_convo_idx on public.messages (conversation_id, created_at);
create index if not exists messages_recipient_idx on public.messages (recipient_id, created_at desc);
create index if not exists messages_sender_idx on public.messages (sender_id, created_at desc);
alter table public.messages enable row level security;

-- Login qilgan foydalanuvchi o'zi ishtirok etgan suhbatlarni ko'radi
drop policy if exists "Messages: ishtirokchi ko'radi" on public.messages;
create policy "Messages: ishtirokchi ko'radi" on public.messages for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);
-- Login qilgan foydalanuvchi o'z nomidan yozadi
drop policy if exists "Messages: foydalanuvchi yozadi" on public.messages;
create policy "Messages: foydalanuvchi yozadi" on public.messages for insert to authenticated
  with check (auth.uid() = sender_id);
-- Qabul qiluvchi "o'qildi" belgisini qo'yadi
drop policy if exists "Messages: qabul qiluvchi yangilaydi" on public.messages;
create policy "Messages: qabul qiluvchi yangilaydi" on public.messages for update to authenticated
  using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);
-- Web-ilova mehmoni (anon): yozadi va ko'radi (ochiq model)
drop policy if exists "Messages: mehmon yozadi" on public.messages;
create policy "Messages: mehmon yozadi" on public.messages for insert to anon with check (true);
drop policy if exists "Messages: mehmon ko'radi" on public.messages;
create policy "Messages: mehmon ko'radi" on public.messages for select to anon using (true);
drop policy if exists "Messages: mehmon o'qildi" on public.messages;
create policy "Messages: mehmon o'qildi" on public.messages for update to anon using (true) with check (true);

-- Xabar biriktirmalari uchun storage bucket (rasm/video/fayl)
insert into storage.buckets (id, name, public)
values ('message-files', 'message-files', true) on conflict (id) do nothing;

drop policy if exists "Msg files: ochiq o'qish" on storage.objects;
create policy "Msg files: ochiq o'qish" on storage.objects for select using (bucket_id = 'message-files');
drop policy if exists "Msg files: yuklash (auth)" on storage.objects;
create policy "Msg files: yuklash (auth)" on storage.objects for insert to authenticated with check (bucket_id = 'message-files');
drop policy if exists "Msg files: yuklash (anon)" on storage.objects;
create policy "Msg files: yuklash (anon)" on storage.objects for insert to anon with check (bucket_id = 'message-files');
