-- 所有測試寫入均在子交易中回滾；不發送 LINE 訊息。
do $audit$
declare uid uuid; line_id text; claim jsonb; code text; result jsonb; checks jsonb := '{}';
 aid text := 'TEST-CLAIM-STATE-ROLLBACK';
begin
 select id into strict uid from auth.users where raw_app_meta_data->>'auction_admin'='true';
 select line_user_id into strict line_id from private.auction_line_contacts where user_id=uid and conversation_verified;
 begin
  insert into public.auctions(id,title,morph,status,start_price,min_increment,end_time)
   values(aid,'領標狀態回滾測試','測試','ended',100,100,clock_timestamp()-interval '1 hour');
  insert into private.auction_outcomes(auction_id,winner_user_id,amount,state,notification_status,payment_due_at)
   values(aid,uid,700,'awaiting_payment','manual',clock_timestamp()+interval '23 hours');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
  claim := public.create_auction_winner_claim(aid);
  code := substring(claim->>'message' from '領標驗證：([0-9a-f]{36})');
  update private.auction_outcomes set state='cancelled' where auction_id=aid;
  result := private.record_auction_line_event('claim-state-cancelled',line_id,'message',clock_timestamp(),code,'測試');
  checks := checks || jsonb_build_object('cancelled_rejected',result->>'linked'='false');
  checks := checks || jsonb_build_object('cancelled_not_claimed',exists(select 1 from private.auction_outcomes where auction_id=aid and claimed_at is null));
  checks := checks || jsonb_build_object('cancelled_no_claim_audit',not exists(select 1 from private.auction_workflow_events where auction_id=aid and event='winner_claimed_on_line'));
  checks := checks || jsonb_build_object('invalid_claim_not_consumed',exists(select 1 from private.auction_link_challenges where auction_id=aid and used_at is null));
  update private.auction_outcomes set state='no_bids' where auction_id=aid;
  result := private.record_auction_line_event('claim-state-no-bids',line_id,'message',clock_timestamp(),code,'測試');
  checks := checks || jsonb_build_object('no_bids_rejected',result->>'linked'='false');
  update private.auction_outcomes set state='awaiting_payment' where auction_id=aid;
  result := private.record_auction_line_event('claim-state-valid',line_id,'message',clock_timestamp(),code,'測試');
  checks := checks || jsonb_build_object('valid_claim_accepted',result->>'linked'='true');
  checks := checks || jsonb_build_object('valid_claim_recorded',exists(select 1 from private.auction_outcomes where auction_id=aid and claimed_at is not null));
  result := private.record_auction_line_event('claim-state-valid',line_id,'message',clock_timestamp(),code,'測試');
  checks := checks || jsonb_build_object('duplicate_event_idempotent',result->>'duplicate'='true');
  checks := checks || jsonb_build_object('exactly_one_claim_audit',(select count(*)=1 from private.auction_workflow_events where auction_id=aid and event='winner_claimed_on_line'));
  raise exception using errcode='PZ999',message='領標狀態完整回滾';
 exception when sqlstate 'PZ999' then null;
 end;
 perform set_config('gencko.claim_state_audit',checks::text,true);
 if exists(select 1 from jsonb_each(checks) where value is distinct from 'true'::jsonb)
 then raise exception '領標狀態檢查失敗：%',checks; end if;
end $audit$;
select current_setting('gencko.claim_state_audit')::jsonb as checks,
 exists(select 1 from public.auctions where id='TEST-CLAIM-STATE-ROLLBACK') as leaked_test_fixture;
