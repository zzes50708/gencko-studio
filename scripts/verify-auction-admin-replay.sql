-- 所有場次、管理操作及回執均完整回滾。
do $audit$
declare u uuid; member_id uuid; a text:='TEST-ADMIN-REPLAY-ROLLBACK'; r jsonb; c jsonb:='{}';
 original_due timestamptz:=clock_timestamp()+interval '48 hours'; due_after timestamptz; denied boolean;
 req uuid:=gen_random_uuid(); paid_req uuid:=gen_random_uuid();
begin
 select id into strict u from auth.users where raw_app_meta_data->>'auction_admin'='true';
 select user_id into strict member_id from auth.identities where provider='custom:line-oauth';
 begin
  insert into public.auctions(id,title,morph,status,start_price,min_increment,end_time)
   values(a,'管理重送回滾測試','測試','ended',100,100,clock_timestamp()-interval '1 hour');
  insert into private.auction_outcomes(auction_id,winner_user_id,amount,state,notification_status,payment_due_at)
   values(a,u,700,'awaiting_payment','manual',original_due);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated','user_metadata',jsonb_build_object('auction_admin',true))::text,true);
  denied:=false;
  begin perform public.admin_auction_action_once(req,a,'extend','測試延期'); exception when insufficient_privilege then denied:=true; end;
  c:=c||jsonb_build_object('non_admin_denied',denied);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
  r:=public.admin_auction_action_once(req,a,'extend','測試延期');
  select payment_due_at into due_after from private.auction_outcomes where auction_id=a;
  c:=c||jsonb_build_object('extension_adds_full_day',due_after=original_due+interval '24 hours');
  c:=c||jsonb_build_object('receipt_matches_request',r->>'request_id'=req::text and r->>'auction_id'=a and r->>'action'='extend');
  r:=public.admin_auction_action_once(req,a,'extend','測試延期');
  c:=c||jsonb_build_object('retry_returns_receipt',r->>'replayed'='true');
  c:=c||jsonb_build_object('retry_does_not_extend_again',exists(select 1 from private.auction_outcomes where auction_id=a and payment_due_at=due_after));
  c:=c||jsonb_build_object('retry_does_not_duplicate_audit',(select count(*)=1 from private.auction_workflow_events where auction_id=a and event='extend'));
  denied:=false;
  begin perform public.admin_auction_action_once(req,a,'extend','改掉原理由'); exception when invalid_parameter_value then denied:=true; end;
  c:=c||jsonb_build_object('changed_request_denied',denied);
  perform public.admin_auction_action_once(gen_random_uuid(),a,'extend','第二次明確延期');
  c:=c||jsonb_build_object('new_intent_can_extend_again',exists(select 1 from private.auction_outcomes where auction_id=a and payment_due_at=due_after+interval '24 hours'));
  denied:=false;
  begin perform public.admin_auction_action_once(null,a,'extend','缺少編號'); exception when invalid_parameter_value then denied:=true; end;
  c:=c||jsonb_build_object('missing_request_denied',denied);
  denied:=false;
  begin perform public.admin_auction_action_once(gen_random_uuid(),a,'extend',' '); exception when invalid_parameter_value then denied:=true; end;
  c:=c||jsonb_build_object('empty_reason_denied',denied);
  perform public.admin_auction_action_once(paid_req,a,'paid','確認收到款項');
  r:=public.admin_auction_action_once(paid_req,a,'paid','確認收到款項');
  c:=c||jsonb_build_object('paid_retry_still_returns_original_receipt',r->>'replayed'='true');
  c:=c||jsonb_build_object('paid_once_only',(select count(*)=1 from private.auction_workflow_events where auction_id=a and event='paid'));
  denied:=false;
  begin perform public.admin_auction_action_once(gen_random_uuid(),a,'abandon','不得棄標已付款'); exception when invalid_parameter_value then denied:=true; end;
  c:=c||jsonb_build_object('paid_cannot_be_abandoned',denied);
  update private.auction_outcomes set state='awaiting_payment',payment_due_at=clock_timestamp()-interval '1 hour' where auction_id=a;
  perform public.admin_auction_action_once(gen_random_uuid(),a,'extend','逾期後重新給期限');
  c:=c||jsonb_build_object('overdue_extension_starts_now',exists(select 1 from private.auction_outcomes where auction_id=a and payment_due_at>clock_timestamp()+interval '23 hours 59 minutes'));
  raise exception using errcode='PZ999',message='管理操作完整回滾';
 exception when sqlstate 'PZ999' then null;
 end;
 if exists(select 1 from jsonb_each(c) where value is distinct from 'true'::jsonb) then raise exception '管理操作驗證失敗 %',c; end if;
 perform set_config('gencko.admin_replay_audit',c::text,true);
end $audit$;
select current_setting('gencko.admin_replay_audit')::jsonb as checks,
 exists(select 1 from public.auctions where id='TEST-ADMIN-REPLAY-ROLLBACK') as leaked_fixture;
