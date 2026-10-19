-- 排程只使用 Vault 中的專用密鑰，不公開管理員憑證或服務角色金鑰。
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create function private.dispatch_auction_notifications() returns bigint
language plpgsql security definer set search_path='' as $$
declare worker_key text; request_id bigint;
begin
 if not (select notifications_enabled from private.auction_workflow_settings where id) then return null; end if;
 select decrypted_secret into strict worker_key from vault.decrypted_secrets where name='auction_worker_secret';
 if worker_key is null or length(worker_key)<32 then raise exception '通知服務尚未設定'; end if;
 select net.http_post(
  url:='https://sfndneptcwhblvrxykcy.supabase.co/functions/v1/auction-workflow',
  headers:=jsonb_build_object('content-type','application/json','x-auction-worker-secret',worker_key),
  body:='{}'::jsonb,timeout_milliseconds:=10000
 ) into request_id;
 return request_id;
end $$;
revoke all on function private.dispatch_auction_notifications() from public,anon,authenticated,service_role;
do $$ declare job bigint; begin
 select cron.schedule('gencko-auction-workflow','* * * * *',
  'select private.process_auction_workflow(); select private.dispatch_auction_notifications();') into job;
 -- 完成端到端驗證前不啟動排程，不處理既有場次。
 perform cron.alter_job(job,active:=false);
end $$;
