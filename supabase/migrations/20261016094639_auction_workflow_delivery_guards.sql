create or replace function private.finish_auction_notification(p_id uuid,p_claim uuid,p_result text,p_error text default null,p_request_id text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare q private.auction_notification_outbox%rowtype; sent timestamptz:=clock_timestamp(); outcome_id text;
begin
 -- 所有結算／管理操作都先鎖得標紀錄，再鎖通知，避免反向鎖定造成死結。
 select auction_id into outcome_id from private.auction_notification_outbox where id=p_id;
 if not found then return false; end if;
 perform 1 from private.auction_outcomes where auction_id=outcome_id for update;
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
   insert into private.auction_workflow_events(actor_id,event) values(challenge.user_id,'line_contact_verified');
   return jsonb_build_object('linked',true);
 end if;
 return jsonb_build_object('received',true);
end $$;

create or replace function private.restrict_auction_winner(p_auction_id text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare o private.auction_outcomes%rowtype;
begin
 select * into o from private.auction_outcomes where auction_id=p_auction_id for update;
 if not found or o.winner_user_id is null or o.state in ('paid','cancelled','no_bids')
  then raise exception using errcode='22023',message='此得標紀錄不能標記棄標'; end if;
 if o.state='abandoned' then return; end if;
 insert into private.auction_bid_restrictions(user_id,line_user_id,auction_id,reason)
 values(o.winner_user_id,o.line_user_id,p_auction_id,p_reason) on conflict(auction_id,user_id) do nothing;
 update private.auction_outcomes set state='abandoned',updated_at=clock_timestamp() where auction_id=p_auction_id;
 update private.auction_notification_outbox set state='cancelled',claim_token=null where auction_id=p_auction_id and state<>'sent';
 insert into private.auction_workflow_events(auction_id,actor_id,event,note) values(p_auction_id,auth.uid(),'bid_restricted',p_reason);
end $$;
