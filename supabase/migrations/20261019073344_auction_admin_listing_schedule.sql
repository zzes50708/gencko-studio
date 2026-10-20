-- 舊場次不設定開始時間，維持原本立即開標行為。
alter table public.auctions add column start_time timestamptz;
create table private.auction_listing_requests (
 request_id uuid primary key, actor_id uuid not null references auth.users(id),
 params jsonb not null, auction_id text not null unique references public.auctions(id),
 created_at timestamptz not null default clock_timestamp()
);
alter table private.auction_listing_requests enable row level security;
revoke all on private.auction_listing_requests from public,anon,authenticated;

create function private.admin_auction_candidates(p_query text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.auction_require_admin();
 if length(coalesce(p_query,''))>80 then raise exception using errcode='22023',message='搜尋文字過長'; end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from (
 select a.id,a.morph,a.gender_type,a.gender_value,a.birthday,a.status,a.image_url,a.images
 from public.animals a where a.status in ('ForSale','NotForSale','SelfKeep') and not a.is_breeder
 and (a.id ilike '%'||trim(coalesce(p_query,''))||'%' or a.morph ilike '%'||trim(coalesce(p_query,''))||'%')
 order by a.id limit 30) x;
 return result;
end $$;

create function private.admin_create_auction(p_request_id uuid,p_animal_id text,p_start_price integer,p_min_increment integer,
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
 if exists(select 1 from public.auctions q where q.animal_id=a.id and q.status='active' and q.end_time>decision)
 then raise exception using errcode='22023',message='此個體已有尚未結束的場次'; end if;
 if trim(a.morph)='' then raise exception using errcode='22023',message='請先在個體資料補齊品系'; end if;
 select coalesce(jsonb_agg(url),'[]'::jsonb) into photos from (
 select distinct trim(url) as url from unnest(coalesce(a.images,'{}')||array[a.image_url]) url
 where trim(url) ~ '^(https?://|/[^/])' order by url limit 12) p;
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

create function public.admin_auction_candidates(p_query text) returns jsonb language sql security invoker set search_path='' as $$select private.admin_auction_candidates($1)$$;
create function public.admin_create_auction(p_request_id uuid,p_animal_id text,p_start_price integer,p_min_increment integer,p_start_time timestamptz,p_end_time timestamptz,p_note text,p_shipping_info text,p_diet text,p_feeding_freq text,p_tongs_fed text)
returns jsonb language sql security invoker set search_path='' as $$select private.admin_create_auction($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)$$;
revoke all on function private.admin_auction_candidates(text),public.admin_auction_candidates(text),private.admin_create_auction(uuid,text,integer,integer,timestamptz,timestamptz,text,text,text,text,text),public.admin_create_auction(uuid,text,integer,integer,timestamptz,timestamptz,text,text,text,text,text) from public,anon;
grant execute on function private.admin_auction_candidates(text),public.admin_auction_candidates(text),private.admin_create_auction(uuid,text,integer,integer,timestamptz,timestamptz,text,text,text,text,text),public.admin_create_auction(uuid,text,integer,integer,timestamptz,timestamptz,text,text,text,text,text) to authenticated;

-- 第一筆最低價為起標價，後續才套用增額；零元起標仍需正整數增額。
create or replace function private.place_auction_bid(p_auction_id text,p_amount integer,p_nickname text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); v_email text:=nullif(trim(auth.jwt()->>'email'),''); a public.auctions%rowtype;
 highest integer; increment integer; minimum bigint; nickname text:=nullif(trim(p_nickname),'');
 display text; b public.auction_bids%rowtype; decision_time timestamptz; extended boolean:=false;
 contact private.auction_line_contacts%rowtype;
begin
 if uid is null then raise exception using errcode='42501',message='請先使用 Google 或 LINE 登入後再出價'; end if;
 if p_amount is null or p_amount<=0 then raise exception using errcode='22023',message='出價金額無效'; end if;
 if char_length(nickname)>15 then raise exception using errcode='22023',message='暱稱不可超過 15 個字'; end if;
 -- 與結標共用場次列鎖；取得鎖後重新讀取真實資料庫時間。
 select * into a from public.auctions where id=p_auction_id for update;
 decision_time:=clock_timestamp();
 if not found or a.status<>'active' or a.end_time is null or a.end_time<=decision_time
  or exists(select 1 from private.auction_outcomes where auction_id=p_auction_id)
 then raise exception using errcode='P0001',message='此競標不存在或已結束'; end if;
 if a.start_time is not null and a.start_time>decision_time then raise exception using errcode='P0001',message='此競標尚未開標'; end if;
 perform private.sync_verified_line_contact(uid);
 select * into contact from private.auction_line_contacts where user_id=uid for update;
 if private.auction_is_restricted(uid,contact.line_user_id) or exists(select 1 from public.blacklist bl
  where lower(bl.email)=lower(v_email) or bl.email=uid::text)
 then raise exception using errcode='42501',message='您的帳號已被限制出價功能。若有疑問請聯絡官方管理員。'; end if;
 if (select fulfillment_mode from private.auction_workflow_settings where id)<>'manual_claim' and exists(select 1 from private.auction_enrollments where auction_id=a.id)
  and (contact.followed is distinct from true or contact.conversation_verified is distinct from true)
 then raise exception using errcode='42501',message='請先完成官方 LINE 聯絡驗證後再出價'; end if;
 increment:=greatest(coalesce(a.min_increment,100),1);
 select amount into highest from public.auction_bids where auction_id=a.id order by amount desc limit 1;
 minimum:=case when highest is not null then highest::bigint+increment when coalesce(a.start_price,0)>0 then a.start_price else increment end;
 if minimum>2147483647 or p_amount::bigint+increment>2147483647 then raise exception using errcode='22003',message='integer out of range'; end if;
 if p_amount<minimum then raise exception using errcode='22023',message='出價必須至少為目前最低出價'; end if;
 display:=coalesce(nickname,case when v_email is not null then left(split_part(v_email,'@',1),3)||'***' else '使用者***' end);
 insert into public.auction_bids(auction_id,user_id,user_name,amount,phone,bid_time)
 values(a.id,uid,display,p_amount,coalesce(v_email,uid::text),decision_time) returning * into b;
 if a.end_time-decision_time<=interval '3 minutes' then
   a.end_time:=a.end_time+interval '3 minutes';
   update public.auctions set end_time=a.end_time where id=a.id;
   extended:=true;
 end if;
 return jsonb_build_object('bid',jsonb_build_object('id',b.id,'auction_id',a.id,'user_name',b.user_name,'amount',b.amount,'bid_time',b.bid_time),
 'auction',jsonb_build_object('id',a.id,'end_time',a.end_time),'extended',extended,'min_next_bid',p_amount+increment);
end $$;

