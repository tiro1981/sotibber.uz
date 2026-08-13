-- =====================================================================
-- sotibber.uz — Supabase sxema (profiles, products) + xavfsizlik (RLS)
-- Buni Supabase Studio -> SQL Editor -> "New query" ichiga joylab,
-- "RUN" tugmasini bosing. Bir marta ishga tushirish kifoya.
-- =====================================================================

-- ---------------------------------------------------------------
-- 1) PROFILES — har bir foydalanuvchining ismi/telefoni
-- ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles: o'zini ko'rish" on public.profiles;
create policy "Profiles: o'zini ko'rish"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Profiles: o'zini yangilash" on public.profiles;
create policy "Profiles: o'zini yangilash"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Profiles: o'zini qo'shish" on public.profiles;
create policy "Profiles: o'zini qo'shish"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Ro'yxatdan o'tganda "profiles" jadvaliga avtomatik yozuv qo'shadi
-- (email tasdiqlash yoqilgan bo'lsa ham darhol ishlaydi)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- 2) PRODUCTS — sotuvchilar qo'shgan mahsulotlar
-- ---------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  price numeric not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  commission numeric not null default 0 check (commission >= 0 and commission <= 100),
  status text not null default 'Moderatsiyada',
  image_url text,
  color text,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

-- Har qanday login qilgan foydalanuvchi: sklad mavjud mahsulotlarni (bozorda)
-- yoki o'zining barcha mahsulotlarini ko'ra oladi.
drop policy if exists "Products: ko'rish" on public.products;
create policy "Products: ko'rish"
  on public.products for select
  to authenticated
  using (stock > 0 or auth.uid() = seller_id);

drop policy if exists "Products: sotuvchi qo'shadi" on public.products;
create policy "Products: sotuvchi qo'shadi"
  on public.products for insert
  to authenticated
  with check (auth.uid() = seller_id);

drop policy if exists "Products: sotuvchi yangilaydi" on public.products;
create policy "Products: sotuvchi yangilaydi"
  on public.products for update
  to authenticated
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

drop policy if exists "Products: sotuvchi o'chiradi" on public.products;
create policy "Products: sotuvchi o'chiradi"
  on public.products for delete
  to authenticated
  using (auth.uid() = seller_id);

-- ---------------------------------------------------------------
-- 3) STORAGE — mahsulot rasmlari uchun bucket
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "Product images: ochiq o'qish" on storage.objects;
create policy "Product images: ochiq o'qish"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "Product images: login qilgan yuklaydi" on storage.objects;
create policy "Product images: login qilgan yuklaydi"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images');

drop policy if exists "Product images: o'zini o'chiradi" on storage.objects;
create policy "Product images: o'zini o'chiradi"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images' and owner = auth.uid());
