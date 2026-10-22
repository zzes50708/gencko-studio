-- 唯讀匯出：只含本機交易測試需要的結構與函式，不含帳號、交易、密鑰。
select 'table' as kind, n.nspname || '.' || c.relname as name,
 jsonb_build_object(
  'columns', (select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid),'identity',a.attidentity) order by a.attnum)
    from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
    where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
  'constraints', (select jsonb_agg(pg_get_constraintdef(co.oid)) from pg_constraint co where co.conrelid=c.oid and co.contype<>'f'),
  'indexes', (select jsonb_agg(pg_get_indexdef(i.indexrelid)) from pg_index i where i.indrelid=c.oid and not exists(select 1 from pg_constraint co where co.conindid=i.indexrelid)),
  'triggers', (select jsonb_agg(pg_get_triggerdef(t.oid)) from pg_trigger t where t.tgrelid=c.oid and not t.tgisinternal)
 )::text as definition
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.relkind='r' and ((n.nspname='private' and c.relname like 'auction%') or (n.nspname='public' and c.relname in ('auctions','auction_bids','blacklist','animals')))
union all
select 'function', n.nspname || '.' || p.proname, pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='private' and p.proname in (
 'auction_is_restricted','auction_member_bid_restricted','auction_line_bid_verified',
 'sync_verified_line_contact','auction_require_admin','place_auction_bid','submit_auction_bid',
 'restrict_auction_winner','process_auction_workflow','admin_auction_action',
 'admin_auction_action_once','report_auction_payment','abandon_auction','enroll_new_auction_workflow',
 'create_auction_line_link','create_auction_winner_claim','record_auction_line_event','get_auction_contact_status',
 'enroll_auction_workflow','admin_create_auction','admin_auction_candidates'
)
or n.nspname='public' and p.proname='set_animals_photo_updated_at';
