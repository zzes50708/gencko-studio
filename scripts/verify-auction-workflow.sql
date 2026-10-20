do $audit$
declare uid uuid; admin_id uuid; line_id text; receipt jsonb; replay jsonb; code text; r jsonb; q jsonb;
 results jsonb:='{}'; denied boolean; previous_end timestamptz; max_amount integer; before_count integer; baseline integer;
begin
 select i.user_id,i.provider_id into strict uid,line_id from auth.identities i join public.auction_bids b on b.user_id=i.user_id where i.provider='custom:line-oauth' and b.auction_id='TEST-AUCTION-20261016-01' and b.amount=500;
 select id into strict admin_id from auth.users where raw_app_meta_data->>'auction_admin'='true';
 select count(*) into before_count from public.auction_bids where auction_id='TEST-AUCTION-CORE-ROLLBACK';
 select coalesce(max(amount),100) into baseline from public.auction_bids where auction_id='TEST-AUCTION-CORE-ROLLBACK';
 begin
  if exists(select 1 from private.auction_enrollments where auction_id not in ('TEST-AUCTION-20261016-01','TEST-AUCTION-CORE-ROLLBACK'))
  then raise exception '測試隔離失敗，不執行結算'; end if;
  update private.auction_workflow_settings set processing_enabled=true,auto_enroll_new=false,notifications_enabled=true,fulfillment_mode='line_push';
  insert into public.auctions(id,title,morph,status,start_price,min_increment,end_time,note) values('TEST-AUCTION-CORE-ROLLBACK','回滾測試','回滾測試','active',100,100,clock_timestamp()+interval '1 hour','僅供回滾測試');
  update private.auction_line_contacts set followed=false where user_id in(uid,admin_id);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
  perform public.enroll_auction_workflow('TEST-AUCTION-CORE-ROLLBACK');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','email','')::text,true);
  denied:=false;
  begin perform public.submit_auction_bid('5fe84669-0d2d-400d-9946-000000000001','TEST-AUCTION-CORE-ROLLBACK',baseline+100,'流程測試');
  exception when insufficient_privilege then denied:=SQLERRM='請先完成官方 LINE 聯絡驗證後再出價'; end;
  results:=results||jsonb_build_object('unverified_contact_denied',denied);
  select public.create_auction_line_link()->>'code' into code;
  r:=private.record_auction_line_event('audit-wrong', 'U00000000000000000000000000000000','message',clock_timestamp(),code,'錯誤來源');
  results:=results||jsonb_build_object('wrong_line_cannot_bind',r->>'reason'='identity_mismatch');
  r:=private.record_auction_line_event('audit-good',line_id,'message',clock_timestamp(),code,'測試LINE');
  results:=results||jsonb_build_object('correct_line_bound',(r->>'linked')::boolean);
  r:=private.record_auction_line_event('audit-good',line_id,'message',clock_timestamp(),code,'測試LINE');
  results:=results||jsonb_build_object('webhook_replay_ignored',(r->>'duplicate')::boolean);
  receipt:=public.submit_auction_bid('5fe84669-0d2d-400d-9946-000000000008','TEST-AUCTION-CORE-ROLLBACK',100,'起標價測試');
  results:=results||jsonb_build_object('opening_bid_accepts_start_price',(receipt#>>'{bid,amount}')::integer=100);
  denied:=false;
  begin perform public.submit_auction_bid('5fe84669-0d2d-400d-9946-000000000009','TEST-AUCTION-CORE-ROLLBACK',150,'後續仍須加價');
  exception when invalid_parameter_value then denied:=true; end;
  results:=results||jsonb_build_object('later_bid_still_requires_increment',denied);
  update public.auctions set end_time=clock_timestamp()+interval '10 minutes' where id='TEST-AUCTION-CORE-ROLLBACK';
  receipt:=public.submit_auction_bid('5fe84669-0d2d-400d-9946-000000000002','TEST-AUCTION-CORE-ROLLBACK',baseline+100,'流程測試');
  replay:=public.submit_auction_bid('5fe84669-0d2d-400d-9946-000000000002','TEST-AUCTION-CORE-ROLLBACK',baseline+100,'流程測試');
  results:=results||jsonb_build_object('normal_bid_no_extension',receipt->>'extended'='false','request_replay_same_receipt',receipt=replay);
  denied:=false;
  begin perform public.submit_auction_bid('5fe84669-0d2d-400d-9946-000000000002','TEST-AUCTION-CORE-ROLLBACK',baseline+200,'流程測試');
  exception when invalid_parameter_value then denied:=true; end;
  results:=results||jsonb_build_object('request_payload_change_denied',denied);
  update public.auctions set end_time=clock_timestamp()+interval '2 minutes' where id='TEST-AUCTION-CORE-ROLLBACK' returning end_time into previous_end;
  receipt:=public.submit_auction_bid('5fe84669-0d2d-400d-9946-000000000003','TEST-AUCTION-CORE-ROLLBACK',baseline+200,'流程測試');
  results:=results||jsonb_build_object('late_bid_extends_three_minutes',
   (receipt->>'extended')::boolean and (receipt#>>'{auction,end_time}')::timestamptz=previous_end+interval '3 minutes');
  denied:=false;
  begin perform public.submit_auction_bid('5fe84669-0d2d-400d-9946-000000000004','TEST-AUCTION-CORE-ROLLBACK',baseline+200,'搶同價');
  exception when invalid_parameter_value then denied:=true; end;
  results:=results||jsonb_build_object('competing_same_price_rejected',denied);
  update public.auctions set end_time=clock_timestamp()-interval '1 second' where id='TEST-AUCTION-CORE-ROLLBACK';
  denied:=false;
  begin perform public.submit_auction_bid('5fe84669-0d2d-400d-9946-000000000005','TEST-AUCTION-CORE-ROLLBACK',baseline+300,'已截止');
  exception when raise_exception then denied:=SQLERRM='此競標不存在或已結束'; end;
  results:=results||jsonb_build_object('after_deadline_rejected',denied);
  update public.auctions set end_time=clock_timestamp()+interval '10 minutes' where id='TEST-AUCTION-CORE-ROLLBACK';
  insert into public.auction_bids(auction_id,user_id,user_name,amount,phone)
   select 'TEST-AUCTION-CORE-ROLLBACK',uid,'大量資料測試',1000+g*100,uid::text from generate_series(1,1105) g;
  select max(amount) into max_amount from public.auction_bids where auction_id='TEST-AUCTION-CORE-ROLLBACK';
  denied:=false;
  begin perform public.submit_auction_bid('5fe84669-0d2d-400d-9946-000000000006','TEST-AUCTION-CORE-ROLLBACK',max_amount,'低於真實最高價');
  exception when invalid_parameter_value then denied:=true; end;
  receipt:=public.submit_auction_bid('5fe84669-0d2d-400d-9946-000000000007','TEST-AUCTION-CORE-ROLLBACK',max_amount+100,'真實最高價');
  results:=results||jsonb_build_object('over_1000_bids_price_correct',denied and (receipt#>>'{bid,amount}')::int=max_amount+100);
  update public.auctions set end_time=clock_timestamp()-interval '1 second' where id='TEST-AUCTION-CORE-ROLLBACK';
  r:=private.process_auction_workflow();
  results:=results||jsonb_build_object('winner_settled_once',(r->>'settled')::int=1 and exists(select 1 from private.auction_outcomes where auction_id='TEST-AUCTION-CORE-ROLLBACK' and winner_user_id=uid and amount=max_amount+100));
  r:=private.process_auction_workflow();
  results:=results||jsonb_build_object('settlement_replay_no_duplicate',(r->>'settled')::int=0);
  update private.auction_notification_outbox set state='processing',attempts=6,lease_until=clock_timestamp()-interval '1 minute'
   where auction_id='TEST-AUCTION-CORE-ROLLBACK';
  r:=private.process_auction_workflow();
  results:=results||jsonb_build_object('exhausted_worker_lease_fails_safely',exists(select 1 from private.auction_notification_outbox
   where auction_id='TEST-AUCTION-CORE-ROLLBACK' and state='failed'));
  update private.auction_notification_outbox set state='pending',attempts=0 where auction_id='TEST-AUCTION-CORE-ROLLBACK';
  q:=private.claim_auction_notifications()->0;
  perform private.finish_auction_notification((q->>'id')::uuid,(q->>'claim_token')::uuid,'failed','audit_delivery_failed');
  results:=results||jsonb_build_object('failed_notice_no_payment_timer',
   exists(select 1 from private.auction_outcomes where auction_id='TEST-AUCTION-CORE-ROLLBACK' and notification_status='failed' and payment_due_at is null));
  update private.auction_notification_outbox set state='pending',attempts=0 where auction_id='TEST-AUCTION-CORE-ROLLBACK';
  q:=private.claim_auction_notifications()->0;
  perform private.finish_auction_notification((q->>'id')::uuid,(q->>'claim_token')::uuid,'sent',null,'audit-line-request');
  results:=results||jsonb_build_object('accepted_notice_starts_24h',exists(select 1 from private.auction_outcomes where auction_id='TEST-AUCTION-CORE-ROLLBACK' and payment_due_at=notified_at+interval '24 hours'));
  perform public.report_auction_payment('TEST-AUCTION-CORE-ROLLBACK');
  update private.auction_outcomes set payment_due_at=clock_timestamp()-interval '1 hour' where auction_id='TEST-AUCTION-CORE-ROLLBACK';
  r:=private.process_auction_workflow();
  results:=results||jsonb_build_object('reported_payment_not_auto_blocked',(r->>'restricted')::int=0 and not private.auction_is_restricted(uid,line_id));
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
  perform public.admin_auction_action('TEST-AUCTION-CORE-ROLLBACK','extend','測試暫緩核帳');
  update private.auction_outcomes set payment_due_at=clock_timestamp()-interval '1 second' where auction_id='TEST-AUCTION-CORE-ROLLBACK';
  r:=private.process_auction_workflow();
  results:=results||jsonb_build_object('overdue_blocks_bidding',(r->>'restricted')::int=1 and private.auction_is_restricted(uid,line_id));
  perform public.admin_auction_action('TEST-AUCTION-CORE-ROLLBACK','unblock','測試正當理由解封');
  results:=results||jsonb_build_object('admin_can_release_bidding_restriction',not private.auction_is_restricted(uid,line_id));
  perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','user_metadata',jsonb_build_object('auction_admin',true))::text,true);
  denied:=false;
  begin perform public.admin_auction_action('TEST-AUCTION-CORE-ROLLBACK','unblock','自己假冒管理員');
  exception when insufficient_privilege then denied:=true; end;
  results:=results||jsonb_build_object('non_admin_cannot_unblock',denied);
  raise exception using errcode='PZ999',message='完整回滾指定測試場次';
 exception when sqlstate 'PZ999' then null;
 end;
 perform set_config('gencko.workflow_audit',results::text,true);
 if exists(select 1 from jsonb_each(results) where value is distinct from 'true'::jsonb) then
  raise exception '競標回歸檢查失敗：%',results;
 end if;
end $audit$;
select current_setting('gencko.workflow_audit')::jsonb as audit,
(select count(*) from public.auction_bids where auction_id='TEST-AUCTION-CORE-ROLLBACK') as persistent_test_bids,
(select count(*) from private.auction_outcomes) as persistent_outcomes;
