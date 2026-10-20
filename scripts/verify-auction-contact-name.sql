-- 僅使用回滾場次與子交易，不發送 LINE；聯絡名稱的測試更新也完整回滾。
do $audit$
declare uid uuid; line_id text; aid text:='TEST-CONTACT-NAME-ROLLBACK'; claim jsonb; code text; r jsonb; checks jsonb:='{}';
begin
 select id into strict uid from auth.users where raw_app_meta_data->>'auction_admin'='true';
 select line_user_id into strict line_id from private.auction_line_contacts where user_id=uid and conversation_verified;
 begin
  insert into public.auctions(id,title,morph,status,start_price,min_increment,end_time)
   values(aid,'聯絡名稱回滾測試','測試','ended',100,100,clock_timestamp()-interval '1 hour');
  insert into private.auction_outcomes(auction_id,winner_user_id,amount,state,notification_status,payment_due_at)
   values(aid,uid,700,'awaiting_payment','manual',clock_timestamp()+interval '23 hours');
  update private.auction_line_contacts set display_name='已驗證聯絡名稱' where user_id=uid;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
  claim:=public.create_auction_winner_claim(aid);
  code:=substring(claim->>'message' from '領標驗證：([0-9a-f]{36})');
  r:=private.record_auction_line_event('contact-name-null',line_id,'message',clock_timestamp(),code,null);
  checks:=checks||jsonb_build_object('missing_profile_still_claims',r->>'linked'='true');
  checks:=checks||jsonb_build_object('missing_profile_preserves_known_name',exists(select 1 from private.auction_line_contacts where user_id=uid and display_name='已驗證聯絡名稱'));
  claim:=public.create_auction_winner_claim(aid);
  code:=substring(claim->>'message' from '領標驗證：([0-9a-f]{36})');
  r:=private.record_auction_line_event('contact-name-new',line_id,'message',clock_timestamp(),code,'更新的聯絡名稱');
  checks:=checks||jsonb_build_object('new_verified_profile_updates_name',exists(select 1 from private.auction_line_contacts where user_id=uid and display_name='更新的聯絡名稱'));
  checks:=checks||jsonb_build_object('claim_recorded',exists(select 1 from private.auction_outcomes where auction_id=aid and claimed_at is not null));
  raise exception using errcode='PZ999',message='完整回滾聯絡名稱測試';
 exception when sqlstate 'PZ999' then null;
 end;
 perform set_config('gencko.contact_name_audit',checks::text,true);
 if exists(select 1 from jsonb_each(checks) where value is distinct from 'true'::jsonb) then raise exception '聯絡名稱檢查失敗：%',checks; end if;
end $audit$;
select current_setting('gencko.contact_name_audit')::jsonb as checks,
 exists(select 1 from public.auctions where id='TEST-CONTACT-NAME-ROLLBACK') as leaked_fixture;
