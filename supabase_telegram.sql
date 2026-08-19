-- =====================================================================
-- sotibber.uz — TELEGRAM ORQALI TELEFON TASDIQLASH
--
-- Bu faylni Supabase Studio -> SQL Editor -> "New query" ichiga to'liq
-- joylab, "RUN" bosing. Qayta ishga tushirish ham xavfsiz (idempotent).
--
-- Nima qiladi:
--   1) telegram_verifications jadvali — tasdiqlash sessiyalari
--   2) tg_verify_start(p_phone)  — sayt tasdiqlash boshlaydi, token qaytaradi.
--        p_phone = ro'yxatda kiritilgan raqam (bot shu bilan solishtiradi).
--   3) tg_verify_status(token) — sayt holatni tekshiradi
--   4) tg_verify_check(token,code) — sayt kiritilgan 4 xonali kodni tekshiradi
--
-- Bot (Python) SERVICE_ROLE kaliti bilan yozadi (RLS chetlab o'tiladi).
-- =====================================================================

-- ---------------------------------------------------------------
-- 1) JADVAL
-- ---------------------------------------------------------------
create table if not exists public.telegram_verifications (
  token          text primary key,
  code           text,                 -- 4 xonali kod (matn — old nol saqlanadi)
  phone          text,                 -- Telegram kontaktidan kelgan haqiqiy raqam
  expected_phone text,                 -- ro'yxatda kiritilgan raqam (solishtirish uchun)
  chat_id        bigint,               -- Telegram chat id
  tg_username    text,
  tg_first_name  text,
  status         text not null default 'pending',
  attempts       int  not null default 0,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null default (now() + interval '15 minutes')
);

-- Eski jadval bo'lsa — yangi ustunni qo'shamiz (idempotent)
alter table public.telegram_verifications
  add column if not exists expected_phone text;

-- status qiymatlari: pending -> code_sent -> verified / locked / phone_mismatch
alter table public.telegram_verifications
  drop constraint if exists telegram_verifications_status_check;
alter table public.telegram_verifications
  add constraint telegram_verifications_status_check
  check (status in ('pending', 'code_sent', 'verified', 'locked', 'phone_mismatch'));

create index if not exists tg_verif_chat_idx
  on public.telegram_verifications (chat_id, created_at desc);

alter table public.telegram_verifications enable row level security;
-- Anon/authenticated uchun siyosat bermaymiz — faqat SERVICE_ROLE (bot) va
-- quyidagi SECURITY DEFINER funksiyalar kiradi.

-- ---------------------------------------------------------------
-- 2) tg_verify_start — sayt yangi tasdiqlash sessiyasini ochadi
--    p_phone: ro'yxatda kiritilgan raqam (bot shu bilan solishtiradi).
--    Yangi token qaytaradi -> https://t.me/<BOT>?start=<token>
-- ---------------------------------------------------------------
create or replace function public.tg_verify_start(p_phone text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_phone text;
begin
  delete from public.telegram_verifications
    where expires_at < now() - interval '1 hour';

  v_token := substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 20);
  v_phone := nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '');

  insert into public.telegram_verifications (token, status, expected_phone)
    values (v_token, 'pending', v_phone);

  return v_token;
end;
$$;

-- ---------------------------------------------------------------
-- 3) tg_verify_status — sayt holatni bilib turadi (polling)
--    'pending' | 'code_sent' | 'verified' | 'locked' | 'phone_mismatch'
--    | 'expired' | 'unknown'
-- ---------------------------------------------------------------
create or replace function public.tg_verify_status(p_token text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.telegram_verifications%rowtype;
begin
  select * into r from public.telegram_verifications where token = p_token;
  if not found then
    return 'unknown';
  end if;
  if r.status not in ('verified') and r.expires_at < now() then
    return 'expired';
  end if;
  return r.status;
end;
$$;

-- ---------------------------------------------------------------
-- 4) tg_verify_check — sayt kiritilgan kodni tekshiradi
--    Muvaffaqiyat: jsonb {ok:true, phone:'998...'}
--    Xato: {ok:false, reason:'wrong'|'expired'|'locked'|'unknown'|'no_code'|'phone_mismatch'}
-- ---------------------------------------------------------------
create or replace function public.tg_verify_check(p_token text, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.telegram_verifications%rowtype;
begin
  select * into r from public.telegram_verifications
    where token = p_token
    for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'unknown');
  end if;

  if r.status = 'verified' then
    return jsonb_build_object('ok', true, 'phone', r.phone);
  end if;

  if r.expires_at < now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  if r.status = 'phone_mismatch' then
    return jsonb_build_object('ok', false, 'reason', 'phone_mismatch');
  end if;

  if r.attempts >= 6 then
    update public.telegram_verifications set status = 'locked' where token = p_token;
    return jsonb_build_object('ok', false, 'reason', 'locked');
  end if;

  if r.code is null or r.status <> 'code_sent' then
    return jsonb_build_object('ok', false, 'reason', 'no_code');
  end if;

  if r.code = regexp_replace(coalesce(p_code, ''), '\D', '', 'g') then
    update public.telegram_verifications set status = 'verified' where token = p_token;
    return jsonb_build_object('ok', true, 'phone', r.phone);
  end if;

  update public.telegram_verifications
    set attempts = attempts + 1
    where token = p_token;
  return jsonb_build_object('ok', false, 'reason', 'wrong');
end;
$$;

-- ---------------------------------------------------------------
-- 5) RUXSATLAR — saytdagi anon kalit shu funksiyalarni chaqira oladi
-- ---------------------------------------------------------------
grant execute on function public.tg_verify_start(text)        to anon, authenticated;
grant execute on function public.tg_verify_status(text)       to anon, authenticated;
grant execute on function public.tg_verify_check(text, text)  to anon, authenticated;
