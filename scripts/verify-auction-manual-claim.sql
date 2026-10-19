do $audit$
declare uid uuid; other_uid uuid; end_at timestamptz:=clock_timestamp()-interval '2 hours'; r jsonb; claim jsonb; denied boolean; checks jsonb:='{}'; code text; line_id text;
begin
 select id into strict uid from auth.users where raw_app_meta_data->>'auction_admin'='true';
 select c.line_user_id into strict line_id from private.auction_line_contacts c where c.user_id=uid and c.conversation_verified;
 select user_id into strict other_uid from auth.identities where provider='custom:line-oauth' and provider_id=line_id;
 begin
  if exists(select 1 from private.auction_enrollments where auction_id not in ('TEST-AUCTION-20261016-01','TEST-AUCTION-MANUAL-ROLLBACK')) then raise exception '測試隔離失敗'; end if;
  update private.auction_workflow_settings set processing_enabled=true;
  insert into public.auctions(id,title,morph,status,start_price,min_increment,end_time,note) values('TEST-AUCTION-MANUAL-ROLLBACK','回滾測試','回滾測試','active',100,100,end_at,'僅供回滾測試');
  insert into private.auction_enrollments(auction_id) values('TEST-AUCTION-MANUAL-ROLLBACK');
  insert into public.auction_bids(auction_id,user_id,user_name,amount,phone) values('TEST-AUCTION-MANUAL-ROLLBACK',uid,'測試得標',700,uid::text);
  r:=private.process_auction_workflow();
  checks:=checks||jsonb_build_object('deadline_from_final_end',exists(select 1 from private.auction_outcomes where auction_id='TEST-AUCTION-MANUAL-ROLLBACK' and payment_due_at=end_at+interval '24 hours' and notification_status='manual'));
  checks:=checks||jsonb_build_object('no_automatic_line_push',not exists(select 1 from private.auction_notification_outbox where auction_id='TEST-AUCTION-MANUAL-ROLLBACK'));
  perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
  begin
   claim:=public.create_auction_winner_claim('TEST-AUCTION-MANUAL-ROLLBACK');
   checks:=checks||jsonb_build_object('winner_message_uses_final_amount',claim->>'amount'='700' and claim->>'message' like '%成交金額：NT$ 700%');
   select substring(claim->>'message' from '領標驗證：([0-9a-f]{36})') into code;
   insert into public.auctions(id,title,morph,status,start_price,min_increment,end_time) values('TEST-AUCTION-CLAIM-SECOND','回滾測試','第二筆領標','ended',100,100,end_at);
   insert into private.auction_outcomes(auction_id,winner_user_id,amount,state,notification_status,payment_due_at) values('TEST-AUCTION-CLAIM-SECOND',uid,500,'awaiting_payment','manual',end_at+interval '24 hours');
   perform public.create_auction_winner_claim('TEST-AUCTION-CLAIM-SECOND');
   r:=private.record_auction_line_event('manual-claim-audit',line_id,'message',clock_timestamp(),code,'測試');
   checks:=checks||jsonb_build_object('another_win_does_not_invalidate_first_claim',r->>'linked'='true');
   checks:=checks||jsonb_build_object('line_claim_verified',exists(select 1 from private.auction_outcomes where auction_id='TEST-AUCTION-MANUAL-ROLLBACK' and claimed_at is not null));
   perform set_config('request.jwt.claims',jsonb_build_object('sub',other_uid,'role','authenticated')::text,true);
   denied:=false;
   begin perform public.create_auction_winner_claim('TEST-AUCTION-MANUAL-ROLLBACK'); exception when insufficient_privilege then denied:=true; end;
   checks:=checks||jsonb_build_object('non_winner_cannot_claim',denied);
  exception when undefined_function then checks:=checks||jsonb_build_object('winner_claim_available',false);
  end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
  denied:=false;
  begin perform public.report_auction_payment('TEST-AUCTION-MANUAL-ROLLBACK'); exception when invalid_parameter_value then denied:=true; end;
  checks:=checks||jsonb_build_object('customer_cannot_bypass_manual_reconciliation',denied);
  update private.auction_outcomes set state='awaiting_payment' where auction_id='TEST-AUCTION-MANUAL-ROLLBACK';
  update private.auction_outcomes set payment_due_at=clock_timestamp()-interval '1 second' where auction_id='TEST-AUCTION-MANUAL-ROLLBACK';
  checks:=checks||jsonb_build_object('overdue_restricted_even_before_cron',private.auction_is_restricted(uid,line_id));
  begin perform public.admin_auction_action('TEST-AUCTION-MANUAL-ROLLBACK','paid','測試管理員主動核帳'); exception when invalid_parameter_value then null; end;
  checks:=checks||jsonb_build_object('admin_can_confirm_payment',exists(select 1 from private.auction_outcomes where auction_id='TEST-AUCTION-MANUAL-ROLLBACK' and state='paid'));
  update private.auction_outcomes set payment_due_at=clock_timestamp()-interval '1 second' where auction_id='TEST-AUCTION-MANUAL-ROLLBACK';
  perform private.process_auction_workflow();
  checks:=checks||jsonb_build_object('paid_never_auto_restricted',not exists(select 1 from private.auction_bid_restrictions where auction_id='TEST-AUCTION-MANUAL-ROLLBACK' and active));
  update private.auction_outcomes set state='abandoned' where auction_id='TEST-AUCTION-MANUAL-ROLLBACK';
  insert into private.auction_bid_restrictions(user_id,line_user_id,auction_id,reason) values
   (uid,line_id,'TEST-AUCTION-MANUAL-ROLLBACK','測試本場逾期'),(uid,line_id,'TEST-AUCTION-CLAIM-SECOND','測試其他場未付款');
  begin perform public.admin_auction_action('TEST-AUCTION-MANUAL-ROLLBACK','paid','測試逾期後已確認收到款項'); exception when invalid_parameter_value then null; end;
  checks:=checks||jsonb_build_object('late_payment_can_be_reconciled',exists(select 1 from private.auction_outcomes where auction_id='TEST-AUCTION-MANUAL-ROLLBACK' and state='paid'));
  checks:=checks||jsonb_build_object('paid_auction_restriction_released',not exists(select 1 from private.auction_bid_restrictions where auction_id='TEST-AUCTION-MANUAL-ROLLBACK' and active));
  checks:=checks||jsonb_build_object('other_auction_restriction_preserved',exists(select 1 from private.auction_bid_restrictions where auction_id='TEST-AUCTION-CLAIM-SECOND' and active));
  raise exception using errcode='PZ999',message='完整回滾領標測試';
 exception when sqlstate 'PZ999' then null;
 end;
 perform set_config('gencko.manual_claim_audit',checks::text,true);
end $audit$;
select current_setting('gencko.manual_claim_audit')::jsonb as checks,
exists(select 1 from public.auctions where id='TEST-AUCTION-MANUAL-ROLLBACK') as leaked_test_fixture;
