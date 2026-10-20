do $$ begin
 if exists(select 1 from public.animals where id='TEST-LISTING-CLOCK-LOCK') then raise exception '測試個體已存在，停止以免覆蓋'; end if;
 insert into public.animals(id,morph,status,image_url) values('TEST-LISTING-CLOCK-LOCK','測試：上架時鐘鎖','NotForSale','https://example.invalid/test.jpg');
end $$;
