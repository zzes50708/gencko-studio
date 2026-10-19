create or replace function private.create_auction_winner_claim(p_auction_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare o private.auction_outcomes%rowtype; a public.auctions%rowtype; link jsonb; text_message text; claim_code text; claim_deadline timestamptz;
begin
 if auth.uid() is null then raise exception using errcode='42501',message='請先登入'; end if;
 select * into o from private.auction_outcomes where auction_id=p_auction_id for update;
 if not found or o.winner_user_id is distinct from auth.uid() then raise exception using errcode='42501',message='僅限本場得標者領標'; end if;
 if o.state in ('no_bids','cancelled') then raise exception using errcode='22023',message='此場次不能領標'; end if;
 select * into a from public.auctions where id=p_auction_id;
 -- 每場各自管理驗證碼，避免另一場得標或一般聯絡綁定使本場訊息失效。
 if (select count(*) from private.auction_link_challenges where user_id=auth.uid() and auction_id=p_auction_id and created_at>clock_timestamp()-interval '10 minutes')>=5
 then raise exception using errcode='22023',message='操作太頻繁，請稍後再試'; end if;
 claim_code:=encode(extensions.gen_random_bytes(18),'hex');
 claim_deadline:=clock_timestamp()+interval '15 minutes';
 update private.auction_link_challenges set used_at=clock_timestamp() where user_id=auth.uid() and auction_id=p_auction_id and used_at is null;
 insert into private.auction_link_challenges(token_hash,user_id,auction_id,expires_at)
 values(encode(extensions.digest(claim_code,'sha256'),'hex'),auth.uid(),p_auction_id,claim_deadline);
 link:=jsonb_build_object('code',claim_code,'expires_at',claim_deadline);
 text_message:='【Gencko 得標確認】'||chr(10)||'場次：'||a.id||chr(10)||'品系：'||coalesce(a.morph,'守宮')||chr(10)||'成交金額：NT$ '||o.amount::text||chr(10)||'請協助確認領標與付款方式。'||chr(10)||'領標驗證：'||(link->>'code');
 if a.id='TEST-AUCTION-20261016-01' then text_message:='【非販售測試，請勿付款】'||chr(10)||text_message; end if;
 return jsonb_build_object('message',text_message,'expires_at',link->'expires_at','amount',o.amount,'payment_due_at',o.payment_due_at);
end $$;

create or replace function private.create_auction_line_link() returns jsonb language plpgsql security definer set search_path='' as $$
declare token text; deadline timestamptz:=clock_timestamp()+interval '15 minutes';
begin
 if auth.uid() is null then raise exception using errcode='42501',message='請先登入'; end if;
 if (select count(*) from private.auction_link_challenges where user_id=auth.uid() and auction_id is null and created_at>clock_timestamp()-interval '10 minutes')>=5
 then raise exception using errcode='22023',message='操作太頻繁，請稍後再試'; end if;
 token:=encode(extensions.gen_random_bytes(18),'hex');
 update private.auction_link_challenges set used_at=clock_timestamp() where user_id=auth.uid() and auction_id is null and used_at is null;
 insert into private.auction_link_challenges(token_hash,user_id,expires_at)
 values(encode(extensions.digest(token,'sha256'),'hex'),auth.uid(),deadline);
 return jsonb_build_object('code',token,'expires_at',deadline);
end $$;
