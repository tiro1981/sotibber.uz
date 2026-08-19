-- =====================================================================
-- sotibber.uz — TELEGRAM ORQALI TELEFON TASDIQLASH
--
-- Bu faylni Supabase Studio -> SQL Editor -> "New query" ichiga to'liq
-- joylab, "RUN" bosing. Bir marta ishga tushirish kifoya.
--
-- Nima qiladi:
--   1) telegram_verifications jadvali — tasdiqlash sessiyalari
--   2) tg_verify_start()  — sayt yangi tasdiqlash boshlaydi, token qaytaradi
--   3) tg_verify_status() — sayt holatni tekshiradi (kutilyapti / kod yuborilgan)
--   4) tg_verify_check()  — sayt kiritilgan 4 xonali kodni tekshiradi
--
-- Botning o'zi (Edge Function `telegram-bot`) SERVICE_ROLE kaliti bilan
-- yozadi (RLS'ni chetlab o'tadi), shuning uchun bot uchun alohida siyosat
-- shart emas. Sayt esa faqat quyidagi 3 ta RPC orqali ishlaydi.
-- =====================================================================

-- ---------------------------------------------------------------
-- 1) JADVAL
-- ---------------------------------------------------------------
create table if not exists public.telegram_verifications (
  token          text primary key,
  code           text,                 -- 4 xonali kod (matn — old nol saqlanadi)
  phone          text,                 -- Telegram'dan kelgan haqiqiy raqam
  chat_id        bigint,               -- Telegram chat id
  tg_username    text,
  tg_first_name  text,
  status         text not null default 'pending'
                 check (status in ('pending', 'code_sent', 'verified', 'locked')),
  attempts       int  not null default 0,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null default (now() + interval '15 minutes')
);

create index if not exists tg_verif_chat_idx
  on public.telegram_verifications (chat_id, created_at desc);

alter table public.telegram_verifications enable row level security;
-- Hech qanday anon/authenticated siyosat bermaymiz — jadvalga faqat
-- SERVICE_ROLE (bot) va quyidagi SECURITY DEFINER funksiyalar kiradi.

-- ---------------------------------------------------------------
-- 2) tg_verify_start — sayt yangi tasdiqlash sessiyasini ochadi
--    Yangi token qaytaradi. Bu token Telegram deep-link'ida ishlatiladi:
--       https://t.me/<BOT>?start=<token>
-- ---------------------------------------------------------------
create or replace function public.tg_verify_start()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  -- Eski, muddati o'tgan sessiyalarni tozalaymiz (jadval shishmasligi uchun)
  delete from public.telegram_verifications
    where expires_at < now() - interval '1 hour';

  v_token := substr(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 20);

  insert into public.telegram_verifications (token, status)
    values (v_token, 'pending');

  return v_token;
end;
$$;

-- ---------------------------------------------------------------
-- 3) tg_verify_status — sayt holatni bilib turadi (polling)
--    Qaytaradi: 'pending' | 'code_sent' | 'verified' | 'locked' | 'expired' | 'unknown'
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
  if r.status <> 'verified' and r.expires_at < now() then
    return 'expired';
  end if;
  return r.status;
end;
$$;

-- ---------------------------------------------------------------
-- 4) tg_verify_check — sayt kiritilgan kodni tekshiradi
--    Muvaffaqiyat: jsonb {ok:true, phone:'998...'}
--    Xato:        jsonb {ok:false, reason:'wrong'|'expired'|'locked'|'unknown'|'no_code'}
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
    -- Allaqachon tasdiqlangan — raqamni qaytaraveramiz (idempotent)
    return jsonb_build_object('ok', true, 'phone', r.phone);
  end if;

  if r.expires_at < now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  if r.attempts >= 6 then
    update public.telegram_verifications set status = 'locked' where token = p_token;
    return jsonb_build_object('ok', false, 'reason', 'locked');
  end if;

  if r.code is null or r.status <> 'code_sent' then
    return jsonb_build_object('ok', false, 'reason', 'no_code');
  end if;

  if r.code = regexp_replace(coalesce(p_code, ''), '\D', '', 'g') then
    update public.telegram_verifications
      set status = 'verified'
      where token = p_token;
    return jsonb_build_object('ok', true, 'phone', r.phone);
  end if;

  update public.telegram_verifications
    set attempts = attempts + 1
    where token = p_token;
  return jsonb_build_object('ok', false, 'reason', 'wrong');
end;
$$;

-- ---------------------------------------------------------------
-- 5) RUXSATLAR — saytdagi anon kalit shu 3 ta funksiyani chaqira oladi
-- ---------------------------------------------------------------
grant execute on function public.tg_verify_start()               to anon, authenticated;
grant execute on function public.tg_verify_status(text)          to anon, authenticated;
grant execute on function public.tg_verify_check(text, text)     to anon, authenticated;
