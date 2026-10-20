do $$ begin
 if exists(select 1 from public.auctions where animal_id='TEST-LISTING-CLOCK-LOCK') then raise exception '測試個體仍被場次引用，停止清除'; end if;
 delete from public.animals where id='TEST-LISTING-CLOCK-LOCK' and morph='測試：上架時鐘鎖' and status='NotForSale';
end $$;
select exists(select 1 from public.animals where id='TEST-LISTING-CLOCK-LOCK') as leaked_animal;
