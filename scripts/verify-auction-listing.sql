do $audit$
declare admin_id uuid; member_id uuid; r jsonb; again jsonb; checks jsonb:='{}'; denied boolean;
 future_start timestamptz:=clock_timestamp()+interval '2 hours'; future_end timestamptz:=clock_timestamp()+interval '4 hours';
 request uuid:='10000000-0000-4000-8000-000000000001'; scheduled_request uuid:='10000000-0000-4000-8000-000000000002';
 animal1 text:='TEST-AUCTION-LISTING-ROLLBACK'; animal2 text:='TEST-AUCTION-SCHEDULE-ROLLBACK'; aid text;
begin
 select id into strict admin_id from auth.users where raw_app_meta_data->>'auction_admin'='true';
 select user_id into strict member_id from public.auction_bids where auction_id='TEST-AUCTION-20261016-01' and amount=500;
 begin
  insert into public.animals(id,morph,status,image_url,images) values
   (animal1,'上架回滾測試','NotForSale','https://example.invalid/cover.jpg',array['https://example.invalid/second.jpg']),
   (animal2,'預約回滾測試','NotForSale','https://example.invalid/cover.jpg','{}');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated','user_metadata',jsonb_build_object('auction_admin',true))::text,true);
  denied:=false;
  begin perform public.admin_auction_candidates(animal1); exception when insufficient_privilege then denied:=true; end;
  checks:=checks||jsonb_build_object('non_admin_cannot_search',denied);
  denied:=false;
  begin perform public.admin_create_auction(request,animal1,100,100,null,future_end,'','','','',''); exception when insufficient_privilege then denied:=true; end;
  checks:=checks||jsonb_build_object('non_admin_cannot_publish',denied);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
  r:=public.admin_auction_candidates(animal1);
  checks:=checks||jsonb_build_object('candidate_has_no_buyer_or_cost_data',jsonb_array_length(r)=1 and not (r->0 ? 'cost_price') and not (r->0 ? 'buyer_contact'));
  r:=public.admin_create_auction(request,animal1,100,100,null,future_end,'測試注意事項','測試面交','測試餌料','每日','是');
  aid:=r->>'id';
  checks:=checks||jsonb_build_object('immediate_publish_created',exists(select 1 from public.auctions where id=aid and animal_id=animal1 and start_time<=clock_timestamp() and status='active'));
  checks:=checks||jsonb_build_object('animal_changes_only_to_auction',exists(select 1 from public.animals where id=animal1 and status='Auction' and morph='上架回滾測試'));
  checks:=checks||jsonb_build_object('new_auction_enrolled',exists(select 1 from private.auction_enrollments where auction_id=aid));
  checks:=checks||jsonb_build_object('photo_and_morph_copied',exists(select 1 from public.auctions where id=aid and morph='上架回滾測試' and jsonb_array_length(images)=2));
  checks:=checks||jsonb_build_object('cover_matches_existing_photo_order',exists(select 1 from public.auctions where id=aid and images->>0='https://example.invalid/second.jpg'));
  again:=public.admin_create_auction(request,animal1,100,100,null,future_end,'測試注意事項','測試面交','測試餌料','每日','是');
  checks:=checks||jsonb_build_object('same_request_returns_same_auction',again->>'id'=aid and again->>'replayed'='true');
  denied:=false;
  begin perform public.admin_create_auction(request,animal1,200,100,null,future_end,'','','','',''); exception when invalid_parameter_value then denied:=true; end;
  checks:=checks||jsonb_build_object('changed_request_rejected',denied);
  denied:=false;
  begin perform public.admin_create_auction(gen_random_uuid(),animal1,100,100,null,future_end,'','','','',''); exception when invalid_parameter_value then denied:=true; end;
  checks:=checks||jsonb_build_object('same_animal_cannot_publish_twice',denied);
  denied:=false;
  begin perform public.admin_create_auction(gen_random_uuid(),animal2,-1,100,null,future_end,'','','','',''); exception when invalid_parameter_value then denied:=true; end;
  checks:=checks||jsonb_build_object('negative_price_rejected',denied);
  denied:=false;
  begin perform public.admin_create_auction(gen_random_uuid(),animal2,100,0,null,future_end,'','','','',''); exception when invalid_parameter_value then denied:=true; end;
  checks:=checks||jsonb_build_object('zero_increment_rejected',denied);
  denied:=false;
  begin perform public.admin_create_auction(gen_random_uuid(),animal2,100,100,future_end,future_start,'','','','',''); exception when invalid_parameter_value then denied:=true; end;
  checks:=checks||jsonb_build_object('end_before_start_rejected',denied);
  denied:=false;
  begin perform public.admin_create_auction(gen_random_uuid(),animal2,100,100,clock_timestamp()-interval '1 hour',future_end,'','','','',''); exception when invalid_parameter_value then denied:=true; end;
  checks:=checks||jsonb_build_object('past_schedule_rejected',denied);
  r:=public.admin_create_auction(scheduled_request,animal2,100,100,future_start,future_end,'','','','','');
  aid:=r->>'id';
  checks:=checks||jsonb_build_object('schedule_times_preserved',exists(select 1 from public.auctions where id=aid and start_time=future_start and end_time=future_end));
  perform set_config('request.jwt.claims',jsonb_build_object('sub',member_id,'role','authenticated')::text,true);
  denied:=false;
  begin perform public.submit_auction_bid(gen_random_uuid(),aid,100,'預約前測試'); exception when raise_exception then denied:=SQLERRM='此競標尚未開標'; end;
  checks:=checks||jsonb_build_object('bid_before_open_rejected',denied);
  checks:=checks||jsonb_build_object('early_rejection_has_no_bid',not exists(select 1 from public.auction_bids where auction_id=aid));
  update public.auctions set start_time=clock_timestamp()-interval '1 second' where id=aid;
  r:=public.submit_auction_bid(gen_random_uuid(),aid,100,'開標後測試');
  checks:=checks||jsonb_build_object('bid_after_open_accepted',(r#>>'{bid,amount}')::integer=100);
  raise exception using errcode='PZ999',message='回滾上架測試';
 exception when sqlstate 'PZ999' then null;
 end;
 if exists(select 1 from jsonb_each(checks) where value is distinct from 'true'::jsonb) then raise exception '上架檢查失敗：%',checks; end if;
 perform set_config('gencko.listing_audit',checks::text,true);
end $audit$;
select current_setting('gencko.listing_audit')::jsonb as checks,
 (select count(*) from public.animals where id in ('TEST-AUCTION-LISTING-ROLLBACK','TEST-AUCTION-SCHEDULE-ROLLBACK')) as leftover_animals,
 (select count(*) from public.auctions where id in ('A-10000000-0000-4000-8000-000000000001','A-10000000-0000-4000-8000-000000000002')) as leftover_auctions;
