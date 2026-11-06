-- 使用者要求獨立後台維持不登入；撤回本次尚未投入使用的登入輔助函式。
-- 不更改資料表、資料、既有登入、競標管理員或原有權限。
drop function if exists public.site_admin_access();
drop function if exists private.has_site_admin();
