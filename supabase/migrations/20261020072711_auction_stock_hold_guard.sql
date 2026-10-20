-- 同一個體尚有未結束場次或未完成交易時，不可重複上架。
create index if not exists auctions_animal_id_idx on public.auctions(animal_id);
create or replace function private.admin_auction_candidates(p_query text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.auction_require_admin();
 if length(coalesce(p_query,''))>80 then raise exception using errcode='22023',message='搜尋文字過長'; end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from (
 select a.id,a.morph,a.gender_type,a.gender_value,a.birthday,a.status,a.image_url,a.images
 from public.animals a where a.status in ('ForSale','NotForSale','SelfKeep') and not a.is_breeder
 and not exists(select 1 from public.auctions q left join private.auction_outcomes o on o.auction_id=q.id
 where q.animal_id=a.id and (q.status='active' or o.state in ('pending_contact','awaiting_notice','awaiting_payment','payment_review')))
 and (a.id ilike '%'||trim(coalesce(p_query,''))||'%' or a.morph ilike '%'||trim(coalesce(p_query,''))||'%')
 order by a.id limit 30) x;
 return result;
end $$;
create or replace function private.admin_create_auction(p_request_id uuid,p_animal_id text,p_start_price integer,p_min_increment integer,
 p_start_time timestamptz,p_end_time timestamptz,p_note text,p_shipping_info text,p_diet text,p_feeding_freq text,p_tongs_fed text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.animals%rowtype; previous private.auction_listing_requests%rowtype;
 params jsonb; auction_id text; starts timestamptz; decision timestamptz; photos jsonb;
begin
 perform private.auction_require_admin();
 if p_request_id is null then raise exception using errcode='22023',message='缺少上架請求編號'; end if;
 params:=jsonb_build_array(p_animal_id,p_start_price,p_min_increment,p_start_time,p_end_time,p_note,p_shipping_info,p_diet,p_feeding_freq,p_tongs_fed);
 -- 同一請求重送回傳同一場次，不會重複上架，也不會再次更動個體。
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('auction-listing:'||p_request_id::text,0));
 select * into previous from private.auction_listing_requests where request_id=p_request_id;
 if found then
  if previous.actor_id<>auth.uid() or previous.params<>params then raise exception using errcode='22023',message='上架請求內容不一致，請先確認既有場次'; end if;
  return jsonb_build_object('id',previous.auction_id,'replayed',true);
 end if;
 decision:=clock_timestamp();
 starts:=coalesce(p_start_time,decision);
 if not isfinite(starts) or p_start_time is not null and starts<=decision or p_end_time is null or not isfinite(p_end_time) or p_end_time<=starts or p_end_time<=decision
 then raise exception using errcode='22023',message='請設定有效的開標與結標時間，結標須晚於開標'; end if;
 if p_start_price is null or p_start_price<0 or p_min_increment is null or p_min_increment<1
 or p_start_price::bigint+p_min_increment>2147483647
 then raise exception using errcode='22023',message='起標價須為非負整數，最低增額須為正整數'; end if;
 if coalesce(length(p_note),0)>3000 or coalesce(length(p_shipping_info),0)>500 or coalesce(length(p_diet),0)>200 or coalesce(length(p_feeding_freq),0)>100 or coalesce(length(p_tongs_fed),0)>30
 then raise exception using errcode='22023',message='場次說明文字過長'; end if;
 select * into a from public.animals where id=p_animal_id for update;
 if not found or a.status not in ('ForSale','NotForSale','SelfKeep') or a.is_breeder then
  raise exception using errcode='22023',message='此個體目前不能上架競標，請重新選取'; end if;
 if exists(select 1 from public.auctions q left join private.auction_outcomes o on o.auction_id=q.id
 where q.animal_id=a.id and (q.status='active' or o.state in ('pending_contact','awaiting_notice','awaiting_payment','payment_review')))
 then raise exception using errcode='22023',message='此個體尚有未結束場次或待處理交易，請先處理原場次'; end if;
 if trim(a.morph)='' then raise exception using errcode='22023',message='請先在個體資料補齊品系'; end if;
 select coalesce(jsonb_agg(url order by position),'[]'::jsonb) into photos from (
 select trim(url) as url,min(position) as position from unnest(coalesce(a.images,'{}')||array[a.image_url]) with ordinality p(url,position)
 where trim(url) ~ '^(https?://|/[^/])' group by trim(url) order by min(position) limit 12) p;
 if jsonb_array_length(photos)=0 then raise exception using errcode='22023',message='此個體尚無有效照片，請先補齊照片'; end if;
 auction_id:='A-'||p_request_id::text;
 insert into public.auctions(id,animal_id,title,morph,gender,birth_year,start_price,min_increment,start_time,end_time,images,status,note,shipping_info,diet,feeding_freq,tongs_fed)
 values(auction_id,a.id,a.morph,a.morph,case when a.gender_type in ('公','母') then a.gender_type else a.gender_type||coalesce(nullif(a.gender_value,''),'') end,
 a.birthday,p_start_price,p_min_increment,starts,p_end_time,photos,'active',coalesce(p_note,''),coalesce(p_shipping_info,''),coalesce(p_diet,''),coalesce(p_feeding_freq,''),coalesce(p_tongs_fed,''));
 perform private.enroll_auction_workflow(auction_id);
 update public.animals set status='Auction' where id=a.id;
 insert into private.auction_listing_requests(request_id,actor_id,params,auction_id) values(p_request_id,auth.uid(),params,auction_id);
 insert into private.auction_workflow_events(auction_id,actor_id,event) values(auction_id,auth.uid(),'auction_published');
 return jsonb_build_object('id',auction_id,'replayed',false);
end $$;
