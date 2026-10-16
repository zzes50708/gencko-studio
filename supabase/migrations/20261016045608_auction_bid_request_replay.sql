-- 每一個出價意圖只成立一次；回應遺失後重送同一編號，會取得原回執。
create table private.auction_bid_requests (
  request_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  auction_id text not null,
  amount integer not null check (amount > 0),
  nickname text,
  response jsonb,
  created_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz
);
alter table private.auction_bid_requests enable row level security;
revoke all on private.auction_bid_requests from public, anon, authenticated;

create function private.submit_auction_bid(
  p_request_id uuid, p_auction_id text, p_amount integer, p_nickname text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_request private.auction_bid_requests%rowtype;
  v_response jsonb;
  v_nickname text := nullif(btrim(p_nickname), '');
begin
  if v_user is null then
    raise exception using errcode = '28000', message = '請先使用 Google 登入後再出價';
  end if;
  if p_request_id is null or p_amount is null or p_amount <= 0 then
    raise exception using errcode = '22023', message = '出價金額無效';
  end if;
  insert into private.auction_bid_requests(request_id, user_id, auction_id, amount, nickname)
    values (p_request_id, v_user, p_auction_id, p_amount, v_nickname)
    on conflict (request_id) do nothing;
  select * into v_request from private.auction_bid_requests
    where request_id = p_request_id for update;
  if v_request.user_id <> v_user or v_request.auction_id is distinct from p_auction_id
    or v_request.amount is distinct from p_amount or v_request.nickname is distinct from v_nickname then
    raise exception using errcode = '22023', message = '出價請求內容不一致，請重新整理後再試';
  end if;
  if v_request.response is not null then return v_request.response; end if;
  -- 保留原有出價規則與場次鎖；請求與出價在同一交易內完成或一併回滾。
  v_response := private.place_auction_bid(p_auction_id, p_amount, v_nickname);
  update private.auction_bid_requests set response = v_response, completed_at = clock_timestamp()
    where request_id = p_request_id;
  return v_response;
end;
$$;
revoke all on function private.submit_auction_bid(uuid, text, integer, text) from public, anon;
grant execute on function private.submit_auction_bid(uuid, text, integer, text) to authenticated;

create function public.submit_auction_bid(
  p_request_id uuid, p_auction_id text, p_amount integer, p_nickname text default null
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.submit_auction_bid(p_request_id, p_auction_id, p_amount, p_nickname);
$$;
revoke all on function public.submit_auction_bid(uuid, text, integer, text) from public, anon;
grant execute on function public.submit_auction_bid(uuid, text, integer, text) to authenticated;
