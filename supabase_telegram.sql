-- =====================================================================
-- sotibber.uz — TELEGRAM ORQALI TELEFON TASDIQLASH (telefon-asosli)
--
-- Bu faylni Supabase Studio -> SQL Editor -> "New query" ichiga to'liq
-- joylab, "RUN" bosing. Qayta ishga tushirish ham xavfsiz (idempotent).
--
-- Oqim:
--   1) Foydalanuvchi @sotibbersmsbot ga /start yuboradi
--   2) Bot "📱 Raqamni yuborish" tugmasini chiqaradi
--   3) Raqam yuborilgach bot 4 xonali kod yaratib, telegram_codes ga yozadi
--      (kalit = raqamning oxirgi 9 xonasi)
--   4) Sayt kodni tg_check_code(ro'yxat_raqami, kod) orqali tekshiradi.
--      Kod shu raqamga bogliq — demak Telegram raqami ro'yxat raqamiga
--      mos kelmasa, kod topilmaydi (mos kelishi avtomatik ta'minlanadi).
-- =====================================================================

-- Eski (token-asosli) versiyani tozalaymiz
drop function if exists public.tg_verify_start(text);
drop function if exists public.tg_verify_status(text);
drop function if exists public.tg_verify_check(text, text);
drop table if exists public.telegram_verifications;

-- ---------------------------------------------------------------
-- JADVAL — har bir raqam uchun oxirgi kod
-- ---------------------------------------------------------------
create table if not exists public.telegram_codes (
  phone       text primary key,          -- raqamning oxirgi 9 xonasi (901234567)
  full_phone  text,                       -- to'liq raqam (998901234567)
  code        text,                        -- 4 xonali kod
  chat_id     bigint,
  tg_username text,
  status      text not null default 'code_sent'
              check (status in ('code_sent', 'verified', 'locked')),
  attempts    int  not null default 0,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '15 minutes')
);

alter table public.telegram_codes enable row level security;
-- Anon/authenticated uchun siyosat bermaymiz — jadvalga faqat SERVICE_ROLE
-- (bot) va quyidagi SECURITY DEFINER funksiya kiradi.

-- ---------------------------------------------------------------
-- tg_check_code — sayt kiritilgan kodni ro'yxat raqami bo'yicha tekshiradi
--   Muvaffaqiyat: {ok:true, phone:'998...'}
--   Xato: {ok:false, reason:'no_code'|'wrong'|'expired'|'locked'}
-- ---------------------------------------------------------------
create or replace function public.tg_check_code(p_phone text, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.telegram_codes%rowtype;
  v_phone text;
begin
  v_phone := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);

  select * into r from public.telegram_codes where phone = v_phone for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_code');
  end if;

  if r.status = 'verified' then
    return jsonb_build_object('ok', true, 'phone', r.full_phone);
  end if;

  if r.expires_at < now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  if r.attempts >= 6 then
    update public.telegram_codes set status = 'locked' where phone = v_phone;
    return jsonb_build_object('ok', false, 'reason', 'locked');
  end if;

  if r.code = regexp_replace(coalesce(p_code, ''), '\D', '', 'g') then
    update public.telegram_codes set status = 'verified' where phone = v_phone;
    return jsonb_build_object('ok', true, 'phone', r.full_phone);
  end if;

  update public.telegram_codes set attempts = attempts + 1 where phone = v_phone;
  return jsonb_build_object('ok', false, 'reason', 'wrong');
end;
$$;

grant execute on function public.tg_check_code(text, text) to anon, authenticated;
