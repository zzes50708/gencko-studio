-- 短效 OAuth 授權碼接續區，與永久 LINE 出價驗證完全分開。
create table public.line_login_relays (
  id uuid primary key,
  proof text not null check (proof ~ '^[0-9a-f]{64}$'),
  ip_hash text not null,
  status text not null default 'pending' check (status in ('pending','ready','failed')),
  encrypted_code text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes'
);
alter table public.line_login_relays enable row level security;
revoke all on public.line_login_relays from public, anon, authenticated;
grant all on public.line_login_relays to service_role;
create index line_login_relays_expiry on public.line_login_relays(expires_at);
create index line_login_relays_rate on public.line_login_relays(ip_hash,created_at);

-- 原子限流，不以單一 serverless 執行個體的記憶體計數。
create function public.start_line_login_relay(p_id uuid,p_proof text,p_ip_hash text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_ip_hash, 0));
  delete from public.line_login_relays where expires_at < now();
  if (select count(*) from public.line_login_relays where ip_hash=p_ip_hash and created_at > now()-interval '10 minutes') >= 30 then
    raise exception 'RATE_LIMIT';
  end if;
  insert into public.line_login_relays(id,proof,ip_hash) values(p_id,p_proof,p_ip_hash);
end;
$$;
revoke all on function public.start_line_login_relay(uuid,text,text) from public,anon,authenticated;
grant execute on function public.start_line_login_relay(uuid,text,text) to service_role;

-- 即使無人再次登入，也不長期保存過期的短效授權碼。
select cron.schedule('line-login-relay-cleanup','* * * * *',
  $job$delete from public.line_login_relays where expires_at < now();$job$);
