do $audit$
declare u uuid; other_id uuid; a text:='TEST-MEMBER-OUTCOME-ROLLBACK'; c jsonb:='{}'; r jsonb; single_result jsonb;
begin
 select id into strict u from auth.users where raw_app_meta_data->>'auction_admin'='true';
 select user_id into strict other_id from auth.identities where provider='custom:line-oauth';
 begin
  insert into public.auctions(id,title,morph,status,start_price,min_increment,end_time)
   values(a,'會員領標狀態回滾測試','測試','ended',100,100,clock_timestamp()-interval '1 hour');
  insert into private.auction_outcomes(auction_id,winner_user_id,amount,state,notification_status,payment_due_at,claimed_at)
   values(a,u,700,'awaiting_payment','manual',clock_timestamp()+interval '23 hours',clock_timestamp());
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
  single_result:=public.my_auction_outcome(a);
  select x into r from jsonb_array_elements(public.my_auction_outcomes()) x where x->>'auction_id'=a;
  c:=c||jsonb_build_object('member_list_matches_detail_claim',r->>'claimed_at' is not null and r->>'claimed_at'=single_result->>'claimed_at');
  c:=c||jsonb_build_object('member_receives_own_amount',r->>'amount'='700');
  c:=c||jsonb_build_object('no_private_contact_or_token',not (r ?| array['line_user_id','winner_user_id','token_hash']));
  perform set_config('request.jwt.claims',jsonb_build_object('sub',other_id,'role','authenticated')::text,true);
  c:=c||jsonb_build_object('other_member_cannot_see_record',not exists(select 1 from jsonb_array_elements(public.my_auction_outcomes()) x where x->>'auction_id'=a));
  c:=c||jsonb_build_object('other_member_cannot_read_detail',public.my_auction_outcome(a) is null);
  raise exception using errcode='PZ999',message='會員狀態回滾';
 exception when sqlstate 'PZ999' then null;
 end;
 if exists(select 1 from jsonb_each(c) where value is distinct from 'true'::jsonb) then raise exception '會員領標狀態檢查失敗 %',c; end if;
 perform set_config('gencko.member_outcomes',c::text,true);
end $audit$;
select current_setting('gencko.member_outcomes')::jsonb as checks,
 exists(select 1 from public.auctions where id='TEST-MEMBER-OUTCOME-ROLLBACK') as leaked_fixture;
