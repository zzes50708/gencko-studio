-- 所有個體、場次與得標狀態均為獨立測試資料，完整回滾，不發送訊息。
do $audit$
declare admin_id uuid; aid text:='TEST-STOCK-HOLD-ROLLBACK'; animal text:='TEST-STOCK-HOLD-ANIMAL';
 state_name text; denied boolean; allowed boolean; checks jsonb:='{}';
begin
 select id into strict admin_id from auth.users where raw_app_meta_data->>'auction_admin'='true';
 begin
  insert into public.animals(id,morph,status,image_url) values(animal,'測試','ForSale','https://example.invalid/test.jpg');
  insert into public.auctions(id,animal_id,title,morph,status,start_price,min_increment,end_time)
   values(aid,animal,'庫存保留回滾測試','測試','ended',200,100,clock_timestamp()-interval '1 hour');
  insert into private.auction_outcomes(auction_id,winner_user_id,amount,state,notification_status,payment_due_at)
   values(aid,admin_id,700,'awaiting_payment','manual',clock_timestamp()+interval '23 hours');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
  foreach state_name in array array['pending_contact','awaiting_notice','awaiting_payment','payment_review'] loop
   update private.auction_outcomes set state=state_name where auction_id=aid;
   checks:=checks||jsonb_build_object(state_name||'_hidden',jsonb_array_length(public.admin_auction_candidates(animal))=0);
   denied:=false;
   begin
    perform public.admin_create_auction(gen_random_uuid(),animal,200,100,null,clock_timestamp()+interval '2 days','','','','','');
    raise exception using errcode='PZ998',message='回滾本次重複上架';
   exception when invalid_parameter_value then denied:=true;
    when sqlstate 'PZ998' then null;
   end;
   checks:=checks||jsonb_build_object(state_name||'_cannot_relist',denied);
  end loop;
  foreach state_name in array array['no_bids','cancelled','abandoned'] loop
   update private.auction_outcomes set state=state_name where auction_id=aid;
   checks:=checks||jsonb_build_object(state_name||'_can_select',jsonb_array_length(public.admin_auction_candidates(animal))=1);
   allowed:=false;
   begin
    perform public.admin_create_auction(gen_random_uuid(),animal,200,100,null,clock_timestamp()+interval '2 days','','','','','');
    allowed:=true;
    raise exception using errcode='PZ998',message='回滾合法重新上架';
   exception when sqlstate 'PZ998' then null;
   end;
   checks:=checks||jsonb_build_object(state_name||'_can_relist',allowed);
  end loop;
  delete from private.auction_outcomes where auction_id=aid;
  update public.auctions set status='active' where id=aid;
  checks:=checks||jsonb_build_object('expired_unsettled_hidden',jsonb_array_length(public.admin_auction_candidates(animal))=0);
  denied:=false;
  begin
   perform public.admin_create_auction(gen_random_uuid(),animal,200,100,null,clock_timestamp()+interval '2 days','','','','','');
   raise exception using errcode='PZ998',message='回滾未結算場次重複上架';
  exception when invalid_parameter_value then denied:=true;
   when sqlstate 'PZ998' then null;
  end;
  checks:=checks||jsonb_build_object('expired_unsettled_cannot_relist',denied);
  raise exception using errcode='PZ999',message='完整回滾庫存保留測試';
 exception when sqlstate 'PZ999' then null;
 end;
 perform set_config('gencko.stock_hold_audit',checks::text,true);
 if exists(select 1 from jsonb_each(checks) where value is distinct from 'true'::jsonb) then raise exception '庫存保留檢查失敗：%',checks; end if;
end $audit$;
select current_setting('gencko.stock_hold_audit')::jsonb as checks,
 exists(select 1 from public.auctions where id='TEST-STOCK-HOLD-ROLLBACK') as leaked_auction,
 exists(select 1 from public.animals where id='TEST-STOCK-HOLD-ANIMAL') as leaked_animal;
