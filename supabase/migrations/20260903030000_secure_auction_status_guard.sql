-- Treat a missing status as closed; only explicit active auctions can receive bids.
create or replace function private.place_auction_bid(
  p_auction_id text,
  p_amount integer,
  p_nickname text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := nullif(trim(auth.jwt() ->> 'email'), '');
  v_email_or_id text;
  v_auction public.auctions%rowtype;
  v_highest integer;
  v_increment integer;
  v_min_next integer;
  v_nickname text := nullif(trim(p_nickname), '');
  v_user_name text;
  v_bid public.auction_bids%rowtype;
  v_new_end_time timestamptz;
  v_extended boolean := false;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = '請先使用 Google 登入後再出價';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception using errcode = '22023', message = '出價金額無效';
  end if;

  if v_nickname is not null and char_length(v_nickname) > 15 then
    raise exception using errcode = '22023', message = '暱稱不可超過 15 個字';
  end if;

  select *
    into v_auction
    from public.auctions
   where id = p_auction_id
   for update;

  if not found
     or coalesce(v_auction.status, '') <> 'active'
     or v_auction.end_time is null
     or v_auction.end_time <= statement_timestamp() then
    raise exception using errcode = 'P0001', message = '此競標不存在或已結束';
  end if;

  v_increment := greatest(coalesce(v_auction.min_increment, 100), 1);
  select coalesce(max(b.amount), coalesce(v_auction.start_price, 0))
    into v_highest
    from public.auction_bids as b
   where b.auction_id = v_auction.id;

  if v_highest = 0 and coalesce(v_auction.start_price, 0) = 0 then
    v_min_next := v_increment;
  else
    v_min_next := v_highest + v_increment;
  end if;

  if p_amount < v_min_next then
    raise exception using errcode = '22023', message = '出價必須至少為目前最低出價';
  end if;

  v_email_or_id := coalesce(v_email, v_user_id::text);
  if exists (
    select 1
      from public.blacklist as b
     where lower(b.email) = lower(v_email_or_id)
  ) then
    raise exception using errcode = '42501', message = '您的帳號已被限制出價功能。若有疑問請聯絡官方管理員。';
  end if;

  if v_nickname is not null then
    v_user_name := v_nickname;
  elsif v_email is not null then
    v_user_name := split_part(v_email, '@', 1);
    v_user_name := case
      when char_length(v_user_name) > 3 then left(v_user_name, 3) || '***'
      else v_user_name || '***'
    end;
  else
    v_user_name := '使用者***';
  end if;

  insert into public.auction_bids (auction_id, user_id, user_name, amount, phone)
  values (v_auction.id, v_user_id, v_user_name, p_amount, v_email_or_id)
  returning * into v_bid;

  if v_auction.end_time - statement_timestamp() <= interval '3 minutes' then
    v_new_end_time := v_auction.end_time + interval '3 minutes';
    update public.auctions
       set end_time = v_new_end_time
     where id = v_auction.id
       and status = 'active';
    v_extended := true;
  else
    v_new_end_time := v_auction.end_time;
  end if;

  return jsonb_build_object(
    'bid', jsonb_build_object(
      'id', v_bid.id,
      'auction_id', v_bid.auction_id,
      'user_name', v_bid.user_name,
      'amount', v_bid.amount,
      'bid_time', v_bid.bid_time
    ),
    'auction', jsonb_build_object('id', v_auction.id, 'end_time', v_new_end_time),
    'extended', v_extended,
    'min_next_bid', p_amount + v_increment
  );
end;
$$;

revoke all on function private.place_auction_bid(text, integer, text) from public, anon;
grant execute on function private.place_auction_bid(text, integer, text) to authenticated;
