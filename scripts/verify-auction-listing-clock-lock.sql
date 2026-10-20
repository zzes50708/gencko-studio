begin;
select id from public.animals where id='TEST-LISTING-CLOCK-LOCK' for update;
select pg_sleep(25); -- 只持有專屬測試個體列鎖，讓另一個測試交易排隊。
rollback;
