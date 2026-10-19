-- 領標改為得標者自行傳訊息；24 小時一律從最終結標時間起算。
alter table private.auction_workflow_settings add column fulfillment_mode text not null default 'manual_claim' check(fulfillment_mode in ('manual_claim','line_push'));
alter table private.auction_link_challenges add column auction_id text references public.auctions(id);
alter table private.auction_outcomes add column claimed_at timestamptz;
update private.auction_workflow_settings set notifications_enabled=false where id;


create or replace function private.process_auction_workflow() returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.auctions%rowtype; b public.auction_bids%rowtype; c private.auction_line_contacts%rowtype;
 o private.auction_outcomes%rowtype; settled integer:=0; restricted integer:=0;
begin
 if not (select processing_enabled from private.auction_workflow_settings where id)
 then return jsonb_build_object('enabled',false); end if;
 for a in select aa.* from public.auctions aa join private.auction_enrollments e on e.auction_id=aa.id
 where aa.status='active' and aa.end_time<=clock_timestamp()
 order by aa.end_time,aa.id for update of aa skip locked limit 100 loop
  if exists(select 1 from private.auction_outcomes where auction_id=a.id) then continue; end if;
  select * into b from public.auction_bids where auction_id=a.id order by amount desc,bid_time,id limit 1;
  if not found then
   insert into private.auction_outcomes(auction_id,state) values(a.id,'no_bids');
  else
   select * into c from private.auction_line_contacts where user_id=b.user_id;
   if (select fulfillment_mode from private.auction_workflow_settings where id)='manual_claim' then
    insert into private.auction_outcomes(auction_id,winner_bid_id,winner_user_id,line_user_id,amount,state,notification_status,payment_due_at)
    values(a.id,b.id,b.user_id,c.line_user_id,b.amount,'awaiting_payment','manual',a.end_time+interval '24 hours');
   else
   insert into private.auction_outcomes(auction_id,winner_bid_id,winner_user_id,line_user_id,amount,state)
    values(a.id,b.id,b.user_id,c.line_user_id,b.amount,case when c.followed and c.conversation_verified then 'awaiting_notice' else 'pending_contact' end);
   if c.followed and c.conversation_verified then
    insert into private.auction_notification_outbox(auction_id,line_user_id) values(a.id,c.line_user_id) on conflict do nothing;
   end if;
  end if;
   end if;
  update public.auctions set status='ended' where id=a.id;
  insert into private.auction_workflow_events(auction_id,event) values(a.id,'settled');
  settled:=settled+1;
 end loop;
 for o in select * from private.auction_outcomes where state='awaiting_payment'
 and notification_status in ('sent','manual') and payment_due_at<=clock_timestamp()
 order by payment_due_at,auction_id for update skip locked limit 100 loop
  perform private.restrict_auction_winner(o.auction_id,'超過付款期限尚未完成付款');
  restricted:=restricted+1;
 end loop;
 -- 重試用盡或過期時保留可處理的失敗狀態，不開始付款倒數。
 for o in select oo.* from private.auction_outcomes oo join private.auction_notification_outbox q on q.auction_id=oo.auction_id
 where oo.state='awaiting_notice' and (q.state='pending' or q.state='processing' and q.lease_until<clock_timestamp())
 and (q.attempts>=6 or q.created_at<=clock_timestamp()-interval '24 hours')
 for update of oo skip locked limit 100 loop
  update private.auction_notification_outbox set state='failed',claim_token=null,last_error='RETRY_WINDOW_EXHAUSTED'
   where auction_id=o.auction_id and (state='pending' or state='processing' and lease_until<clock_timestamp());
  if found then update private.auction_outcomes set notification_status='failed',updated_at=clock_timestamp() where auction_id=o.auction_id; end if;
 end loop;
 return jsonb_build_object('settled',settled,'restricted',restricted);
end $$;

create or replace function private.get_auction_contact_status(p_auction_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c private.auction_line_contacts%rowtype; required boolean;
begin
 if auth.uid() is null then raise exception using errcode='42501',message='請先登入'; end if;
 perform private.sync_verified_line_contact(auth.uid());
 select * into c from private.auction_line_contacts where user_id=auth.uid();
 required := exists(select 1 from private.auction_enrollments where auction_id=p_auction_id) and (select fulfillment_mode from private.auction_workflow_settings where id)<>'manual_claim';
 return jsonb_build_object('required',required,'ready',c.followed is true and c.conversation_verified is true,
 'linked',c.user_id is not null,'display_name',c.display_name,'restricted',private.auction_is_restricted(auth.uid(),c.line_user_id));
end $$;

create or replace function private.place_auction_bid(p_auction_id text,p_amount integer,p_nickname text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); v_email text:=nullif(trim(auth.jwt()->>'email'),''); a public.auctions%rowtype;
 highest integer; increment integer; minimum bigint; nickname text:=nullif(trim(p_nickname),'');
 display text; b public.auction_bids%rowtype; decision_time timestamptz; extended boolean:=false;
 contact private.auction_line_contacts%rowtype;
begin
 if uid is null then raise exception using errcode='42501',message='請先使用 Google 或 LINE 登入後再出價'; end if;
 if p_amount is null or p_amount<=0 then raise exception using errcode='22023',message='出價金額無效'; end if;
 if char_length(nickname)>15 then raise exception using errcode='22023',message='暱稱不可超過 15 個字'; end if;
 -- 與結標共用場次列鎖；取得鎖後重新讀取真實資料庫時間。
 select * into a from public.auctions where id=p_auction_id for update;
 decision_time:=clock_timestamp();
 if not found or a.status<>'active' or a.end_time is null or a.end_time<=decision_time
  or exists(select 1 from private.auction_outcomes where auction_id=p_auction_id)
 then raise exception using errcode='P0001',message='此競標不存在或已結束'; end if;
 perform private.sync_verified_line_contact(uid);
 select * into contact from private.auction_line_contacts where user_id=uid for update;
 if private.auction_is_restricted(uid,contact.line_user_id) or exists(select 1 from public.blacklist bl
  where lower(bl.email)=lower(v_email) or bl.email=uid::text)
 then raise exception using errcode='42501',message='您的帳號已被限制出價功能。若有疑問請聯絡官方管理員。'; end if;
 if (select fulfillment_mode from private.auction_workflow_settings where id)<>'manual_claim' and exists(select 1 from private.auction_enrollments where auction_id=a.id)
  and (contact.followed is distinct from true or contact.conversation_verified is distinct from true)
 then raise exception using errcode='42501',message='請先完成官方 LINE 聯絡驗證後再出價'; end if;
 increment:=greatest(coalesce(a.min_increment,100),1);
 select amount into highest from public.auction_bids where auction_id=a.id order by amount desc limit 1;
 highest:=coalesce(highest,a.start_price,0);
 minimum:=highest::bigint+increment;
 if minimum>2147483647 or p_amount::bigint+increment>2147483647 then raise exception using errcode='22003',message='integer out of range'; end if;
 if p_amount<minimum then raise exception using errcode='22023',message='出價必須至少為目前最低出價'; end if;
 display:=coalesce(nickname,case when v_email is not null then left(split_part(v_email,'@',1),3)||'***' else '使用者***' end);
 insert into public.auction_bids(auction_id,user_id,user_name,amount,phone,bid_time)
 values(a.id,uid,display,p_amount,coalesce(v_email,uid::text),decision_time) returning * into b;
 if a.end_time-decision_time<=interval '3 minutes' then
   a.end_time:=a.end_time+interval '3 minutes';
   update public.auctions set end_time=a.end_time where id=a.id;
   extended:=true;
 end if;
 return jsonb_build_object('bid',jsonb_build_object('id',b.id,'auction_id',a.id,'user_name',b.user_name,'amount',b.amount,'bid_time',b.bid_time),
 'auction',jsonb_build_object('id',a.id,'end_time',a.end_time),'extended',extended,'min_next_bid',p_amount+increment);
end $$;

create or replace function private.record_auction_line_event(p_event_id text,p_line_id text,p_kind text,p_at timestamptz,p_code text default null,p_name text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare challenge private.auction_link_challenges%rowtype; inserted integer; expected_line text;
begin
 if p_line_id !~ '^U[0-9a-f]{32}$' or p_event_id is null or length(p_event_id)>200
 then raise exception using errcode='22023',message='LINE 事件資料無效'; end if;
 insert into private.auction_line_webhook_events(event_id) values(p_event_id) on conflict do nothing;
 get diagnostics inserted=row_count;
 if inserted=0 then return jsonb_build_object('duplicate',true); end if;
 if p_kind in ('follow','unfollow','message') then
   update private.auction_line_contacts set followed=(p_kind<>'unfollow'),
     conversation_verified=conversation_verified or p_kind='message',last_event_at=p_at
   where line_user_id=p_line_id and last_event_at<=p_at;
 end if;
 if p_kind='message' and p_code is not null then
   select * into challenge from private.auction_link_challenges
    where token_hash=encode(extensions.digest(p_code,'sha256'),'hex') for update;
   if not found or challenge.used_at is not null or challenge.expires_at<=clock_timestamp()
    then return jsonb_build_object('linked',false,'reason','expired'); end if;
   select provider_id into expected_line from auth.identities
    where user_id=challenge.user_id and provider in ('custom:line-oauth','custom:line') limit 1;
   if expected_line is not null and expected_line<>p_line_id
    then return jsonb_build_object('linked',false,'reason','identity_mismatch'); end if;
   insert into private.auction_line_contacts(user_id,line_user_id,display_name,followed,conversation_verified,last_event_at)
    values(challenge.user_id,p_line_id,left(p_name,150),true,true,p_at)
    on conflict(user_id) do update set line_user_id=excluded.line_user_id,display_name=excluded.display_name,
       followed=true,conversation_verified=true,verified_at=clock_timestamp(),last_event_at=p_at
     where private.auction_line_contacts.last_event_at<=p_at;
   get diagnostics inserted=row_count;
   if inserted=0 then return jsonb_build_object('linked',false,'reason','stale_event'); end if;
   update private.auction_link_challenges set used_at=clock_timestamp() where token_hash=challenge.token_hash;
   -- 補綁聯絡方式後，只補排尚未通知的本人得標；不重發已受理的通知。
   with resumed as (
    update private.auction_outcomes set line_user_id=p_line_id,state='awaiting_notice',updated_at=clock_timestamp()
     where winner_user_id=challenge.user_id and state='pending_contact' returning auction_id
   ) insert into private.auction_notification_outbox(auction_id,line_user_id)
     select auction_id,p_line_id from resumed on conflict do nothing;
   if challenge.auction_id is not null then
    update private.auction_outcomes set claimed_at=coalesce(claimed_at,clock_timestamp()),line_user_id=p_line_id,updated_at=clock_timestamp()
    where auction_id=challenge.auction_id and winner_user_id=challenge.user_id;
    insert into private.auction_workflow_events(auction_id,actor_id,event) values(challenge.auction_id,challenge.user_id,'winner_claimed_on_line');
   end if;
   insert into private.auction_workflow_events(actor_id,event) values(challenge.user_id,'line_contact_verified');
   return jsonb_build_object('linked',true);
 end if;
 return jsonb_build_object('received',true);
end $$;

create or replace function private.auction_is_restricted(p_user uuid, p_line text default null) returns boolean
language sql security definer set search_path='' as $$
 select exists(select 1 from private.auction_bid_restrictions r where r.active
 and (r.user_id=p_user or r.line_user_id=p_line or r.line_user_id in
 (select c.line_user_id from private.auction_line_contacts c where c.user_id=p_user union select i.provider_id from auth.identities i where i.user_id=p_user and i.provider in ('custom:line-oauth','custom:line'))))
$$;


create function private.create_auction_winner_claim(p_auction_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare o private.auction_outcomes%rowtype; a public.auctions%rowtype; link jsonb; text_message text;
begin
 if auth.uid() is null then raise exception using errcode='42501',message='請先登入'; end if;
 select * into o from private.auction_outcomes where auction_id=p_auction_id for update;
 if not found or o.winner_user_id is distinct from auth.uid() then raise exception using errcode='42501',message='僅限本場得標者領標'; end if;
 if o.state in ('no_bids','cancelled') then raise exception using errcode='22023',message='此場次不能領標'; end if;
 select * into a from public.auctions where id=p_auction_id;
 link:=private.create_auction_line_link();
 update private.auction_link_challenges set auction_id=p_auction_id where token_hash=encode(extensions.digest(link->>'code','sha256'),'hex');
 text_message:='【Gencko 得標確認】'||chr(10)||'場次：'||a.id||chr(10)||'品系：'||coalesce(a.morph,'守宮')||chr(10)||'成交金額：NT$ '||o.amount::text||chr(10)||'請協助確認領標與付款方式。'||chr(10)||'領標驗證：'||(link->>'code');
 if a.id='TEST-AUCTION-20261016-01' then text_message:='【非販售測試，請勿付款】'||chr(10)||text_message; end if;
 return jsonb_build_object('message',text_message,'expires_at',link->'expires_at','amount',o.amount,'payment_due_at',o.payment_due_at);
end $$;
create function public.create_auction_winner_claim(p_auction_id text) returns jsonb language sql security invoker set search_path='' as $$select private.create_auction_winner_claim($1)$$;
revoke all on function private.create_auction_winner_claim(text),public.create_auction_winner_claim(text) from public,anon;
grant execute on function private.create_auction_winner_claim(text),public.create_auction_winner_claim(text) to authenticated;
create function private.my_auction_outcome(p_auction_id text) returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('auction_id',o.auction_id,'morph',a.morph,'amount',o.amount,'state',o.state,'notification_status',o.notification_status,'payment_due_at',o.payment_due_at,'claimed_at',o.claimed_at)
 from private.auction_outcomes o join public.auctions a on a.id=o.auction_id where o.auction_id=p_auction_id and o.winner_user_id=auth.uid()
$$;
create function public.my_auction_outcome(p_auction_id text) returns jsonb language sql security invoker set search_path='' as $$select private.my_auction_outcome($1)$$;
revoke all on function private.my_auction_outcome(text),public.my_auction_outcome(text) from public,anon;
grant execute on function private.my_auction_outcome(text),public.my_auction_outcome(text) to authenticated;
