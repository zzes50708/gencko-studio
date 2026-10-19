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
   -- 和重新產生領標訊息相同：先鎖結算紀錄，再鎖驗證碼，避免雙方反向等待。
   select * into challenge from private.auction_link_challenges
    where token_hash=encode(extensions.digest(p_code,'sha256'),'hex');
   if challenge.auction_id is not null then
    perform 1 from private.auction_outcomes where auction_id=challenge.auction_id for update;
   end if;
   -- 等待期間可能已重新產生驗證碼，取得鎖後必須再次核對。
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
