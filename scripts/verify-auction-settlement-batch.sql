-- 超過單次結算上限的回滾測試；不呼叫外部通知。
do $audit$
declare r jsonb; checks jsonb:='{}';
begin
 begin
  if exists(select 1 from private.auction_enrollments where auction_id not like 'TEST-%') then raise exception '已有正式場次，不執行批次測試'; end if;
  update private.auction_workflow_settings set processing_enabled=true,auto_enroll_new=false,notifications_enabled=false,fulfillment_mode='manual_claim';
  insert into public.auctions(id,title,morph,status,start_price,min_increment,end_time)
   select 'TEST-BATCH-ROLLBACK-'||g,'批次回滾測試','測試','active',100,100,clock_timestamp()-interval '1 hour' from generate_series(1,101) g;
  insert into public.auctions(id,title,morph,status,start_price,min_increment,start_time,end_time)
   values('TEST-BATCH-FUTURE-ROLLBACK','未開標回滾測試','測試','active',100,100,clock_timestamp()+interval '1 hour',clock_timestamp()+interval '2 hours');
  insert into private.auction_enrollments(auction_id) select id from public.auctions where id like 'TEST-BATCH-ROLLBACK-%' or id='TEST-BATCH-FUTURE-ROLLBACK';
  r:=private.process_auction_workflow();
  checks:=checks||jsonb_build_object('first_batch_respects_limit',r->>'settled'='100');
  checks:=checks||jsonb_build_object('one_expired_auction_waits_next_batch',(select count(*)=1 from public.auctions where id like 'TEST-BATCH-ROLLBACK-%' and status='active'));
  r:=private.process_auction_workflow();
  checks:=checks||jsonb_build_object('next_batch_drains_remaining',r->>'settled'='1');
  checks:=checks||jsonb_build_object('all_expired_settled_once',(select count(*)=101 from private.auction_outcomes where auction_id like 'TEST-BATCH-ROLLBACK-%' and state='no_bids'));
  checks:=checks||jsonb_build_object('no_fake_winner_for_empty_auction',not exists(select 1 from private.auction_outcomes where auction_id like 'TEST-BATCH-ROLLBACK-%' and (winner_user_id is not null or amount is not null)));
  checks:=checks||jsonb_build_object('future_auction_not_settled',not exists(select 1 from private.auction_outcomes where auction_id='TEST-BATCH-FUTURE-ROLLBACK'));
  checks:=checks||jsonb_build_object('no_notification_for_no_bids',not exists(select 1 from private.auction_notification_outbox where auction_id like 'TEST-BATCH-ROLLBACK-%'));
  r:=private.process_auction_workflow();
  checks:=checks||jsonb_build_object('repeated_job_does_not_resettle',r->>'settled'='0');
  raise exception using errcode='PZ999',message='完整回滾批次結算測試';
 exception when sqlstate 'PZ999' then null;
 end;
 perform set_config('gencko.settlement_batch_audit',checks::text,true);
 if exists(select 1 from jsonb_each(checks) where value is distinct from 'true'::jsonb) then raise exception '批次結算檢查失敗：%',checks; end if;
end $audit$;
select current_setting('gencko.settlement_batch_audit')::jsonb as checks,
 (select count(*) from public.auctions where id like 'TEST-BATCH-ROLLBACK-%' or id='TEST-BATCH-FUTURE-ROLLBACK') as leaked_fixtures;
