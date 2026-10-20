-- 只建立回滾測試場次，不更動既有得標資料。
do $audit$
declare u uuid; original_due timestamptz:=clock_timestamp()+interval '48 hours'; ok boolean;
begin
 select id into strict u from auth.users where raw_app_meta_data->>'auction_admin'='true';
 begin
  insert into public.auctions(id,title,morph,status,start_price,min_increment,end_time)
   values('TEST-ADMIN-EXTEND-ROLLBACK','管理延期回滾測試','測試','ended',100,100,clock_timestamp()-interval '1 hour');
  insert into private.auction_outcomes(auction_id,winner_user_id,amount,state,notification_status,payment_due_at)
   values('TEST-ADMIN-EXTEND-ROLLBACK',u,700,'awaiting_payment','manual',original_due);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
  perform public.admin_auction_action('TEST-ADMIN-EXTEND-ROLLBACK','extend','回滾測試再延後一天');
  select payment_due_at>=original_due+interval '24 hours' into ok from private.auction_outcomes where auction_id='TEST-ADMIN-EXTEND-ROLLBACK';
  raise exception using errcode='PZ999',message='延期測試回滾';
 exception when sqlstate 'PZ999' then null;
 end;
 if ok is distinct from true then raise exception '延期未從原付款期限延後 24 小時，可能縮短原期限'; end if;
end $audit$;
select true as extension_preserves_existing_deadline;
