-- 同時驗證發起端與接收回程的持有證明，防止偽造登入連結接走他人身分。
alter table public.line_login_relays add column return_proof text
  check (return_proof is null or return_proof ~ '^[0-9a-f]{64}$');
