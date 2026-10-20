do $audit$
declare u uuid; l text; a text:='TEST-CLAIM-EXPIRY-ROLLBACK'; x jsonb; old_code text; code text; c jsonb:='{}';
begin
 select id into strict u from auth.users where raw_app_meta_data->>'auction_admin'='true';
 select line_user_id into strict l from private.auction_line_contacts where user_id=u and conversation_verified;
 begin
  insert into public.auctions(id,title,morph,status,start_price,min_increment,end_time)
   values(a,'領標碼回滾測試','測試','ended',100,100,clock_timestamp()-interval '1 hour');
  insert into private.auction_outcomes(auction_id,winner_user_id,amount,state,notification_status,payment_due_at)
   values(a,u,700,'awaiting_payment','manual',clock_timestamp()+interval '23 hours');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
  x:=public.create_auction_winner_claim(a);
  old_code:=substring(x->>'message' from '領標驗證：([0-9a-f]{36})');
  x:=public.create_auction_winner_claim(a);
  code:=substring(x->>'message' from '領標驗證：([0-9a-f]{36})');
  x:=private.record_auction_line_event('expiry-old-code',l,'message',clock_timestamp(),old_code,'測試');
  c:=c||jsonb_build_object('regeneration_invalidates_old_code',x->>'linked'='false');
  update private.auction_link_challenges set expires_at=clock_timestamp()-interval '1 second' where auction_id=a;
  x:=private.record_auction_line_event('expiry-expired-code',l,'message',clock_timestamp(),code,'測試');
  c:=c||jsonb_build_object('expired_code_rejected',x->>'linked'='false');
  c:=c||jsonb_build_object('expired_code_does_not_claim',exists(select 1 from private.auction_outcomes where auction_id=a and claimed_at is null));
  x:=public.create_auction_winner_claim(a);
  code:=substring(x->>'message' from '領標驗證：([0-9a-f]{36})');
  x:=private.record_auction_line_event('expiry-new-code',l,'message',clock_timestamp(),code,'測試');
  c:=c||jsonb_build_object('new_valid_code_accepted',x->>'linked'='true');
  x:=private.record_auction_line_event('expiry-reused-code',l,'message',clock_timestamp(),code,'測試');
  c:=c||jsonb_build_object('used_code_rejected_with_new_event',x->>'linked'='false');
  c:=c||jsonb_build_object('only_one_claim_audit',(select count(*)=1 from private.auction_workflow_events where auction_id=a and event='winner_claimed_on_line'));
  raise exception using errcode='PZ999',message='領標碼測試回滾';
 exception when sqlstate 'PZ999' then null;
 end;
 if exists(select 1 from jsonb_each(c) where value is distinct from 'true'::jsonb) then raise exception '領標碼檢查失敗 %',c; end if;
 perform set_config('gencko.claim_expiry',c::text,true);
end $audit$;
select current_setting('gencko.claim_expiry')::jsonb as checks,
 exists(select 1 from public.auctions where id='TEST-CLAIM-EXPIRY-ROLLBACK') as leaked_fixture;
