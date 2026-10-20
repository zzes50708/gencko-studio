do $audit$
declare uid uuid; denied boolean:=false;
begin
 select id into strict uid from auth.users where raw_app_meta_data->>'auction_admin'='true';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
 begin
  perform public.admin_create_auction('70000000-0000-4000-8000-000000000001','TEST-LISTING-CLOCK-LOCK',200,100,null,clock_timestamp()+interval '1 second','','','','','');
  raise exception using errcode='PZ999',message='上架寫入完整回滾';
 exception when invalid_parameter_value then denied:=SQLERRM='請設定有效的開標與結標時間，結標須晚於開標';
  when sqlstate 'PZ999' then null;
 end;
 if not denied then raise exception '上架等待個體鎖後，已過期的結標時間仍獲接受'; end if;
 perform set_config('gencko.listing_clock_audit','true',true);
end $audit$;
select current_setting('gencko.listing_clock_audit')::boolean as expired_after_lock_rejected,
 exists(select 1 from public.auctions where id='A-70000000-0000-4000-8000-000000000001') as leaked_auction;
