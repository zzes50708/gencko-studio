-- 帳號與場次均在子交易回滾，不建立可登入帳號、不發通知。
do $audit$
declare u uuid:=gen_random_uuid(); g uuid; l uuid; denied boolean:=false; r jsonb; checks jsonb:='{}';
begin
 begin
  insert into auth.users(id,raw_app_meta_data,raw_user_meta_data)
   values(u,'{"provider":"email","providers":["email"]}', '{"provider":"google"}');
  insert into public.auctions(id,title,morph,status,start_price,min_increment,end_time)
   values('TEST-PROVIDER-ROLLBACK','登入方式回滾測試','測試','active',100,100,clock_timestamp()+interval '2 hours');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated','user_metadata',jsonb_build_object('provider','google'))::text,true);
  begin perform public.submit_auction_bid(gen_random_uuid(),'TEST-PROVIDER-ROLLBACK',100,'登入方式測試');
   exception when insufficient_privilege then denied:=true; end;
  checks:=checks||jsonb_build_object('unsupported_provider_denied',denied);
  checks:=checks||jsonb_build_object('no_unauthorized_bid',not exists(select 1 from public.auction_bids where auction_id='TEST-PROVIDER-ROLLBACK'));
  select id into strict g from auth.users where raw_app_meta_data->>'auction_admin'='true';
  select user_id into strict l from auth.identities where provider='custom:line-oauth';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',g,'role','authenticated')::text,true);
  r:=public.submit_auction_bid(gen_random_uuid(),'TEST-PROVIDER-ROLLBACK',100,'Google測試');
  checks:=checks||jsonb_build_object('google_still_allowed',r#>>'{bid,amount}'='100');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',l,'role','authenticated')::text,true);
  r:=public.submit_auction_bid(gen_random_uuid(),'TEST-PROVIDER-ROLLBACK',200,'LINE測試');
  checks:=checks||jsonb_build_object('line_still_allowed',r#>>'{bid,amount}'='200');
  raise exception using errcode='PZ999',message='登入方式測試回滾';
 exception when sqlstate 'PZ999' then null;
 end;
 if exists(select 1 from jsonb_each(checks) where value is distinct from 'true'::jsonb) then raise exception '登入方式防護失敗：%',checks; end if;
 perform set_config('gencko.provider_audit',checks::text,true);
end $audit$;
select current_setting('gencko.provider_audit')::jsonb as checks,
 exists(select 1 from public.auctions where id='TEST-PROVIDER-ROLLBACK') as leaked_fixture;
