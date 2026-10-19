-- 僅處理明確納入新流程的場次；既有場次不批次結標、不更改守宮資料。
create index if not exists auction_bids_auction_amount_idx on public.auction_bids(auction_id, amount desc, bid_time, id);
revoke truncate, references, trigger on public.auctions, public.auction_bids from anon, authenticated;
alter table public.auctions add column if not exists workflow_enabled boolean not null default false;

create table private.auction_workflow_settings (
 id boolean primary key default true check(id), processing_enabled boolean not null default false,
 auto_enroll_new boolean not null default false, notifications_enabled boolean not null default false,
 payment_hours integer not null default 24 check(payment_hours=24)
);
insert into private.auction_workflow_settings(id) values(true);
create table private.auction_enrollments (
 auction_id text primary key references public.auctions(id), enrolled_at timestamptz not null default clock_timestamp()
);
create table private.auction_line_contacts (
 user_id uuid primary key references auth.users(id), line_user_id text not null check(line_user_id ~ '^U[0-9a-f]{32}$'),
 display_name text, picture_url text, followed boolean not null default true,
 conversation_verified boolean not null default true, verified_at timestamptz not null default clock_timestamp(),
 last_event_at timestamptz not null default clock_timestamp()
);
create index auction_line_contacts_subject_idx on private.auction_line_contacts(line_user_id);
create table private.auction_link_challenges (
 token_hash text primary key, user_id uuid not null references auth.users(id), created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null, used_at timestamptz
);
create index auction_link_challenges_user_idx on private.auction_link_challenges(user_id, created_at desc);
create table private.auction_outcomes (
 auction_id text primary key references public.auctions(id), winner_bid_id uuid references public.auction_bids(id),
 winner_user_id uuid references auth.users(id), line_user_id text, amount integer,
 state text not null check(state in ('no_bids','pending_contact','awaiting_notice','awaiting_payment','payment_review','paid','abandoned','cancelled')),
 notification_status text not null default 'pending' check(notification_status in ('pending','sent','failed','manual')),
 settled_at timestamptz not null default clock_timestamp(), notified_at timestamptz,
 payment_due_at timestamptz, payment_reported_at timestamptz, updated_at timestamptz not null default clock_timestamp()
);
create index auction_outcomes_due_idx on private.auction_outcomes(payment_due_at) where state='awaiting_payment';
create table private.auction_bid_restrictions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), line_user_id text,
 auction_id text references public.auctions(id), reason text not null, active boolean not null default true,
 created_at timestamptz not null default clock_timestamp(), released_at timestamptz, released_by uuid,
 release_reason text, unique(auction_id,user_id)
);
create index auction_restrictions_user_idx on private.auction_bid_restrictions(user_id) where active;
create index auction_restrictions_line_idx on private.auction_bid_restrictions(line_user_id) where active;
create table private.auction_notification_outbox (
 id uuid primary key default gen_random_uuid(), auction_id text not null unique references private.auction_outcomes(auction_id),
 line_user_id text not null, retry_key uuid not null unique default gen_random_uuid(),
 state text not null default 'pending' check(state in ('pending','processing','sent','failed','cancelled')),
 attempts integer not null default 0, next_attempt_at timestamptz not null default clock_timestamp(),
 lease_until timestamptz, claim_token uuid, created_at timestamptz not null default clock_timestamp(),
 sent_at timestamptz, last_error text, line_request_id text
);
create index auction_outbox_ready_idx on private.auction_notification_outbox(next_attempt_at) where state in ('pending','processing');
create table private.auction_workflow_events (
 id bigint generated always as identity primary key, auction_id text, actor_id uuid, event text not null,
 note text, created_at timestamptz not null default clock_timestamp()
);
create table private.auction_line_webhook_events (
 event_id text primary key, received_at timestamptz not null default clock_timestamp()
);
do $$ declare t text; begin
 foreach t in array array['auction_workflow_settings','auction_enrollments','auction_line_contacts','auction_link_challenges','auction_outcomes','auction_bid_restrictions','auction_notification_outbox','auction_workflow_events','auction_line_webhook_events'] loop
 execute format('alter table private.%I enable row level security',t);
 execute format('revoke all on private.%I from public,anon,authenticated',t);
 end loop;
end $$;

create function private.auction_require_admin() returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from auth.users where id=auth.uid() and raw_app_meta_data->'auction_admin'='true'::jsonb)
 then raise exception using errcode='42501',message='僅限競標管理員操作'; end if;
end $$;

create function private.auction_is_restricted(p_user uuid, p_line text default null) returns boolean
language sql security definer set search_path='' as $$
 select exists(select 1 from private.auction_bid_restrictions r where r.active
 and (r.user_id=p_user or r.line_user_id=p_line or r.line_user_id in
 (select c.line_user_id from private.auction_line_contacts c where c.user_id=p_user)))
$$;

create function private.get_auction_contact_status(p_auction_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c private.auction_line_contacts%rowtype; required boolean;
begin
 if auth.uid() is null then raise exception using errcode='42501',message='請先登入'; end if;
 select * into c from private.auction_line_contacts where user_id=auth.uid();
 required := exists(select 1 from private.auction_enrollments where auction_id=p_auction_id);
 return jsonb_build_object('required',required,'ready',c.followed is true and c.conversation_verified is true,
 'linked',c.user_id is not null,'display_name',c.display_name,'restricted',private.auction_is_restricted(auth.uid(),c.line_user_id));
end $$;

create function private.create_auction_line_link() returns jsonb language plpgsql security definer set search_path='' as $$
declare token text; deadline timestamptz:=clock_timestamp()+interval '15 minutes';
begin
 if auth.uid() is null then raise exception using errcode='42501',message='請先登入'; end if;
 if (select count(*) from private.auction_link_challenges where user_id=auth.uid() and created_at>clock_timestamp()-interval '10 minutes')>=5
 then raise exception using errcode='22023',message='操作太頻繁，請稍後再試'; end if;
 token:=encode(extensions.gen_random_bytes(18),'hex');
 update private.auction_link_challenges set used_at=clock_timestamp() where user_id=auth.uid() and used_at is null;
 insert into private.auction_link_challenges(token_hash,user_id,expires_at)
 values(encode(extensions.digest(token,'sha256'),'hex'),auth.uid(),deadline);
 return jsonb_build_object('code',token,'expires_at',deadline);
end $$;

-- 僅由驗證 LINE 簽章後的後端呼叫；舊事件、重送事件不覆蓋新狀態。
create function private.record_auction_line_event(p_event_id text,p_line_id text,p_kind text,p_at timestamptz,p_code text default null,p_name text default null)
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
   update private.auction_link_challenges set used_at=clock_timestamp() where token_hash=challenge.token_hash;
   insert into private.auction_workflow_events(actor_id,event) values(challenge.user_id,'line_contact_verified');
   return jsonb_build_object('linked',true);
 end if;
 return jsonb_build_object('received',true);
end $$;

create function private.enroll_auction_workflow(p_auction_id text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.auction_require_admin();
 perform 1 from public.auctions where id=p_auction_id and status='active' and end_time>clock_timestamp() for update;
 if not found then raise exception using errcode='22023',message='只能啟用尚未截止的競標'; end if;
 insert into private.auction_enrollments(auction_id) values(p_auction_id) on conflict do nothing;
 update public.auctions set workflow_enabled=true where id=p_auction_id;
 insert into private.auction_workflow_events(auction_id,actor_id,event) values(p_auction_id,auth.uid(),'workflow_enrolled');
end $$;
create function private.enroll_new_auction_workflow() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (select auto_enroll_new from private.auction_workflow_settings where id) then
  insert into private.auction_enrollments(auction_id) values(new.id) on conflict do nothing;
  update public.auctions set workflow_enabled=true where id=new.id;
 end if;
 return new;
end $$;
create trigger auction_workflow_new after insert on public.auctions for each row execute function private.enroll_new_auction_workflow();

create or replace function private.place_auction_bid(p_auction_id text,p_amount integer,p_nickname text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); email text:=nullif(trim(auth.jwt()->>'email'),''); a public.auctions%rowtype;
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
 select * into contact from private.auction_line_contacts where user_id=uid for update;
 if private.auction_is_restricted(uid,contact.line_user_id) or exists(select 1 from public.blacklist bl
  where lower(bl.email)=lower(email) or bl.email=uid::text)
 then raise exception using errcode='42501',message='您的帳號已被限制出價功能。若有疑問請聯絡官方管理員。'; end if;
 if exists(select 1 from private.auction_enrollments where auction_id=a.id)
  and (contact.followed is distinct from true or contact.conversation_verified is distinct from true)
 then raise exception using errcode='42501',message='請先完成官方 LINE 聯絡驗證後再出價'; end if;
 increment:=greatest(coalesce(a.min_increment,100),1);
 select amount into highest from public.auction_bids where auction_id=a.id order by amount desc limit 1;
 highest:=coalesce(highest,a.start_price,0);
 minimum:=highest::bigint+increment;
 if minimum>2147483647 or p_amount::bigint+increment>2147483647 then raise exception using errcode='22003',message='integer out of range'; end if;
 if p_amount<minimum then raise exception using errcode='22023',message='出價必須至少為目前最低出價'; end if;
 display:=coalesce(nickname,case when email is not null then left(split_part(email,'@',1),3)||'***' else '使用者***' end);
 insert into public.auction_bids(auction_id,user_id,user_name,amount,phone,bid_time)
 values(a.id,uid,display,p_amount,coalesce(email,uid::text),decision_time) returning * into b;
 if a.end_time-decision_time<=interval '3 minutes' then
   a.end_time:=a.end_time+interval '3 minutes';
   update public.auctions set end_time=a.end_time where id=a.id;
   extended:=true;
 end if;
 return jsonb_build_object('bid',jsonb_build_object('id',b.id,'auction_id',a.id,'user_name',b.user_name,'amount',b.amount,'bid_time',b.bid_time),
 'auction',jsonb_build_object('id',a.id,'end_time',a.end_time),'extended',extended,'min_next_bid',p_amount+increment);
end $$;

create function private.restrict_auction_winner(p_auction_id text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare o private.auction_outcomes%rowtype;
begin
 select * into o from private.auction_outcomes where auction_id=p_auction_id for update;
 if not found or o.winner_user_id is null or o.state in ('paid','cancelled','no_bids')
  then raise exception using errcode='22023',message='此得標紀錄不能標記棄標'; end if;
 insert into private.auction_bid_restrictions(user_id,line_user_id,auction_id,reason)
 values(o.winner_user_id,o.line_user_id,p_auction_id,p_reason) on conflict(auction_id,user_id) do nothing;
 update private.auction_outcomes set state='abandoned',updated_at=clock_timestamp() where auction_id=p_auction_id;
 update private.auction_notification_outbox set state='cancelled',claim_token=null where auction_id=p_auction_id and state<>'sent';
 insert into private.auction_workflow_events(auction_id,actor_id,event,note) values(p_auction_id,auth.uid(),'bid_restricted',p_reason);
end $$;

create function private.process_auction_workflow() returns jsonb language plpgsql security definer set search_path='' as $$
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
   insert into private.auction_outcomes(auction_id,winner_bid_id,winner_user_id,line_user_id,amount,state)
    values(a.id,b.id,b.user_id,c.line_user_id,b.amount,case when c.followed and c.conversation_verified then 'awaiting_notice' else 'pending_contact' end);
   if c.followed and c.conversation_verified then
    insert into private.auction_notification_outbox(auction_id,line_user_id) values(a.id,c.line_user_id) on conflict do nothing;
   end if;
  end if;
  update public.auctions set status='ended' where id=a.id;
  insert into private.auction_workflow_events(auction_id,event) values(a.id,'settled');
  settled:=settled+1;
 end loop;
 for o in select * from private.auction_outcomes where state='awaiting_payment'
 and notification_status='sent' and payment_due_at<=clock_timestamp()
 order by payment_due_at,auction_id for update skip locked limit 100 loop
  perform private.restrict_auction_winner(o.auction_id,'得標通知送出後 24 小時未付款');
  restricted:=restricted+1;
 end loop;
 return jsonb_build_object('settled',settled,'restricted',restricted);
end $$;

create function private.claim_auction_notifications() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not (select notifications_enabled from private.auction_workflow_settings where id) then return '[]'::jsonb; end if;
 with candidates as (
  select q.id from private.auction_notification_outbox q join private.auction_outcomes o on o.auction_id=q.auction_id
  where (q.state='pending' and q.next_attempt_at<=clock_timestamp() or q.state='processing' and q.lease_until<clock_timestamp())
   and q.attempts<6 and q.created_at>clock_timestamp()-interval '24 hours'
   and o.state='awaiting_notice'
  order by q.next_attempt_at for update of q skip locked limit 10
 ), claimed as (
  update private.auction_notification_outbox q set state='processing',attempts=q.attempts+1,
   lease_until=clock_timestamp()+interval '2 minutes',claim_token=gen_random_uuid()
  where q.id in(select id from candidates) returning q.*
 )
 select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('amount',o.amount,'morph',a.morph)),'[]'::jsonb) into result
 from claimed c join private.auction_outcomes o on o.auction_id=c.auction_id join public.auctions a on a.id=c.auction_id;
 return result;
end $$;

create function private.finish_auction_notification(p_id uuid,p_claim uuid,p_result text,p_error text default null,p_request_id text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare q private.auction_notification_outbox%rowtype; sent timestamptz:=clock_timestamp();
begin
 select * into q from private.auction_notification_outbox where id=p_id for update;
 if not found or q.state<>'processing' or q.claim_token is distinct from p_claim then return false; end if;
 if p_result not in ('sent','retry','failed') then raise exception 'Invalid result'; end if;
 if p_result='sent' then
  update private.auction_notification_outbox set state='sent',sent_at=sent,claim_token=null,line_request_id=left(p_request_id,200) where id=p_id;
  update private.auction_outcomes set notification_status='sent',notified_at=sent,payment_due_at=sent+interval '24 hours',
    state='awaiting_payment',updated_at=sent where auction_id=q.auction_id and state='awaiting_notice';
 elsif p_result='retry' and q.attempts<6 and q.created_at>sent-interval '23 hours' then
  update private.auction_notification_outbox set state='pending',next_attempt_at=sent+least(power(3,q.attempts),60)*interval '1 minute',
   claim_token=null,last_error=left(p_error,120) where id=p_id;
 else
  update private.auction_notification_outbox set state='failed',claim_token=null,last_error=left(p_error,120) where id=p_id;
  update private.auction_outcomes set notification_status='failed',updated_at=sent where auction_id=q.auction_id and state='awaiting_notice';
 end if;
 return true;
end $$;

create function private.my_auction_outcomes() returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('auction_id',o.auction_id,'morph',a.morph,'amount',o.amount,'state',o.state,
 'notification_status',o.notification_status,'payment_due_at',o.payment_due_at,'payment_reported_at',o.payment_reported_at)
 order by o.settled_at desc),'[]'::jsonb) from private.auction_outcomes o join public.auctions a on a.id=o.auction_id
 where o.winner_user_id=auth.uid()
$$;

create function private.report_auction_payment(p_auction_id text) returns void language plpgsql security definer set search_path='' as $$
declare o private.auction_outcomes%rowtype;
begin
 select * into o from private.auction_outcomes where auction_id=p_auction_id for update;
 if not found or o.winner_user_id is distinct from auth.uid() or auth.uid() is null
 then raise exception using errcode='42501',message='只能回報自己的得標付款'; end if;
 if o.state='payment_review' then return; end if;
 if o.state<>'awaiting_payment' then raise exception using errcode='22023',message='此場次目前不能回報付款'; end if;
 update private.auction_outcomes set state='payment_review',payment_reported_at=clock_timestamp(),updated_at=clock_timestamp() where auction_id=p_auction_id;
 insert into private.auction_workflow_events(auction_id,actor_id,event) values(p_auction_id,auth.uid(),'payment_reported');
end $$;

create function private.abandon_auction(p_auction_id text) returns void language plpgsql security definer set search_path='' as $$
declare o private.auction_outcomes%rowtype;
begin
 select * into o from private.auction_outcomes where auction_id=p_auction_id for update;
 if not found or o.winner_user_id is distinct from auth.uid() or auth.uid() is null
 then raise exception using errcode='42501',message='只能操作自己的得標紀錄'; end if;
 perform private.restrict_auction_winner(p_auction_id,'得標者主動棄標');
end $$;

create function private.admin_auction_action(p_auction_id text,p_action text,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare o private.auction_outcomes%rowtype;
begin
 perform private.auction_require_admin();
 if p_reason is null or length(trim(p_reason))<2 or length(p_reason)>500 then raise exception using errcode='22023',message='請填寫操作原因（2 至 500 字）'; end if;
 select * into o from private.auction_outcomes where auction_id=p_auction_id for update;
 if not found then raise exception using errcode='22023',message='此場次尚未結算'; end if;
 if p_action='paid' and o.state in ('awaiting_payment','payment_review') then
  update private.auction_outcomes set state='paid',updated_at=clock_timestamp() where auction_id=p_auction_id;
 elsif p_action='extend' and o.state in ('awaiting_payment','payment_review') then
  update private.auction_outcomes set state='awaiting_payment',payment_due_at=clock_timestamp()+interval '24 hours',updated_at=clock_timestamp() where auction_id=p_auction_id;
 elsif p_action='abandon' then perform private.restrict_auction_winner(p_auction_id,p_reason);
 elsif p_action='unblock' then
  update private.auction_bid_restrictions set active=false,released_at=clock_timestamp(),released_by=auth.uid(),release_reason=p_reason
  where active and (user_id=o.winner_user_id or line_user_id=o.line_user_id);
 else raise exception using errcode='22023',message='此狀態不能執行所選操作'; end if;
 insert into private.auction_workflow_events(auction_id,actor_id,event,note) values(p_auction_id,auth.uid(),p_action,p_reason);
end $$;

create function private.admin_auction_workflow(p_auction_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.auction_require_admin();
 select to_jsonb(o)||jsonb_build_object('restricted',private.auction_is_restricted(o.winner_user_id,o.line_user_id),
 'notification_error',(select q.last_error from private.auction_notification_outbox q where q.auction_id=o.auction_id))
 into result from private.auction_outcomes o where o.auction_id=p_auction_id;
 return jsonb_build_object('outcome',result,'enabled',exists(select 1 from private.auction_enrollments where auction_id=p_auction_id),
 'events',(select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at desc),'[]'::jsonb) from
 (select event,note,created_at from private.auction_workflow_events where auction_id=p_auction_id order by created_at desc limit 30) e));
end $$;

-- 將會員函式以檢查後的 SECURITY DEFINER 內層及 SECURITY INVOKER 公開包裝分開。
create function public.get_auction_contact_status(p_auction_id text) returns jsonb language sql security invoker set search_path='' as $$select private.get_auction_contact_status($1)$$;
create function public.create_auction_line_link() returns jsonb language sql security invoker set search_path='' as $$select private.create_auction_line_link()$$;
create function public.enroll_auction_workflow(p_auction_id text) returns void language sql security invoker set search_path='' as $$select private.enroll_auction_workflow($1)$$;
create function public.my_auction_outcomes() returns jsonb language sql security invoker set search_path='' as $$select private.my_auction_outcomes()$$;
create function public.report_auction_payment(p_auction_id text) returns void language sql security invoker set search_path='' as $$select private.report_auction_payment($1)$$;
create function public.abandon_auction(p_auction_id text) returns void language sql security invoker set search_path='' as $$select private.abandon_auction($1)$$;
create function public.admin_auction_action(p_auction_id text,p_action text,p_reason text) returns void language sql security invoker set search_path='' as $$select private.admin_auction_action($1,$2,$3)$$;
create function public.admin_auction_workflow(p_auction_id text) returns jsonb language sql security invoker set search_path='' as $$select private.admin_auction_workflow($1)$$;
create function public.record_auction_line_event(p_event_id text,p_line_id text,p_kind text,p_at timestamptz,p_code text default null,p_name text default null) returns jsonb language sql security invoker set search_path='' as $$select private.record_auction_line_event($1,$2,$3,$4,$5,$6)$$;
create function public.process_auction_workflow() returns jsonb language sql security invoker set search_path='' as $$select private.process_auction_workflow()$$;
create function public.claim_auction_notifications() returns jsonb language sql security invoker set search_path='' as $$select private.claim_auction_notifications()$$;
create function public.finish_auction_notification(p_id uuid,p_claim uuid,p_result text,p_error text default null,p_request_id text default null) returns boolean language sql security invoker set search_path='' as $$select private.finish_auction_notification($1,$2,$3,$4,$5)$$;

do $$ declare fn regprocedure; begin
 for fn in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname in ('private','public') and p.proname in
 ('auction_require_admin','auction_is_restricted','get_auction_contact_status','create_auction_line_link','enroll_auction_workflow','enroll_new_auction_workflow','restrict_auction_winner','process_auction_workflow','claim_auction_notifications','finish_auction_notification','my_auction_outcomes','report_auction_payment','abandon_auction','admin_auction_action','admin_auction_workflow','record_auction_line_event')
 loop execute format('revoke all on function %s from public,anon,authenticated',fn);
 execute format('grant execute on function %s to service_role',fn);
 if (select proname from pg_proc where oid=fn::oid) in
 ('get_auction_contact_status','create_auction_line_link','enroll_auction_workflow','my_auction_outcomes','report_auction_payment','abandon_auction','admin_auction_action','admin_auction_workflow')
 then execute format('grant execute on function %s to authenticated',fn); end if;
 end loop;
end $$;
grant usage on schema private to service_role,authenticated;
