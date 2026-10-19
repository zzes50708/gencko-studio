-- 只沿用同一 Provider 驗證的 LINE subject；暱稱／email 相同不構成綁定證據。
create function private.sync_verified_line_contact(p_user uuid) returns void language plpgsql security definer set search_path='' as $$
declare c private.auction_line_contacts%rowtype;
begin
 select cc.* into c from auth.identities i join private.auction_line_contacts cc on cc.line_user_id=i.provider_id
 where i.user_id=p_user and i.provider in ('custom:line-oauth','custom:line')
 order by cc.last_event_at desc,cc.followed asc limit 1;
 if not found or not c.followed or not c.conversation_verified then return; end if;
 insert into private.auction_line_contacts(user_id,line_user_id,display_name,picture_url,followed,conversation_verified,verified_at,last_event_at)
 values(p_user,c.line_user_id,c.display_name,c.picture_url,c.followed,c.conversation_verified,c.verified_at,c.last_event_at)
 on conflict(user_id) do update set line_user_id=excluded.line_user_id,display_name=excluded.display_name,picture_url=excluded.picture_url,
 followed=excluded.followed,conversation_verified=excluded.conversation_verified,verified_at=excluded.verified_at,last_event_at=excluded.last_event_at
 where private.auction_line_contacts.last_event_at<=excluded.last_event_at;
end $$;
revoke all on function private.sync_verified_line_contact(uuid) from public,anon,authenticated;
grant execute on function private.sync_verified_line_contact(uuid) to service_role;

create or replace function private.get_auction_contact_status(p_auction_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c private.auction_line_contacts%rowtype; required boolean;
begin
 if auth.uid() is null then raise exception using errcode='42501',message='請先登入'; end if;
 perform private.sync_verified_line_contact(auth.uid());
 select * into c from private.auction_line_contacts where user_id=auth.uid();
 required := exists(select 1 from private.auction_enrollments where auction_id=p_auction_id);
 return jsonb_build_object('required',required,'ready',c.followed is true and c.conversation_verified is true,
 'linked',c.user_id is not null,'display_name',c.display_name,'restricted',private.auction_is_restricted(auth.uid(),c.line_user_id));
end $$;
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
 perform private.sync_verified_line_contact(uid);
 select * into contact from private.auction_line_contacts where user_id=uid for update;
 if private.auction_is_restricted(uid,contact.line_user_id) or exists(select 1 from public.blacklist bl
  where lower(bl.email)=lower(v_email) or bl.email=uid::text)
 then raise exception using errcode='42501',message='您的帳號已被限制出價功能。若有疑問請聯絡官方管理員。'; end if;
 if exists(select 1 from private.auction_enrollments where auction_id=a.id)
  and (contact.followed is distinct from true or contact.conversation_verified is distinct from true)
 then raise exception using errcode='42501',message='請先完成官方 LINE 聯絡驗證後再出價'; end if;
 increment:=greatest(coalesce(a.min_increment,100),1);
 select amount into highest from public.auction_bids where auction_id=a.id order by amount desc limit 1;
 highest:=coalesce(highest,a.start_price,0);
 minimum:=highest::bigint+increment;
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
