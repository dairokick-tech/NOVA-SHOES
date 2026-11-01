-- CONTANOVA: auditoría de movimientos y balance de comprobación.
create table if not exists public.audit_logs (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 actor_id uuid references auth.users(id),
 action text not null,
 entity text not null,
 record_id uuid,
 payload jsonb,
 created_at timestamptz not null default now()
);
create index if not exists idx_audit_org_created on public.audit_logs(organization_id,created_at desc);
alter table public.audit_logs enable row level security;
create policy "members can read organization audit logs" on public.audit_logs
for select to authenticated using (public.user_belongs_to_org(organization_id));

create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path=public
as $$
declare row_data jsonb;
declare org_id uuid;
declare rec_id uuid;
begin
 if TG_OP='DELETE' then row_data:=to_jsonb(OLD); else row_data:=to_jsonb(NEW); end if;
 org_id:=(row_data->>'organization_id')::uuid;
 rec_id:=(row_data->>'id')::uuid;
 insert into public.audit_logs(organization_id,actor_id,action,entity,record_id,payload)
 values(org_id,auth.uid(),TG_OP,TG_TABLE_NAME,rec_id,row_data);
 if TG_OP='DELETE' then return OLD; else return NEW; end if;
end;
$$;

drop trigger if exists audit_journal_entries on public.journal_entries;
create trigger audit_journal_entries after insert or update or delete on public.journal_entries
for each row execute function public.write_audit_log();
drop trigger if exists audit_journal_lines on public.journal_lines;
create trigger audit_journal_lines after insert or update or delete on public.journal_lines
for each row execute function public.write_audit_log();

create or replace view public.v_trial_balance
with (security_invoker=true)
as
select
 a.organization_id,
 a.id as account_id,
 a.code as account_code,
 a.name as account_name,
 coalesce(sum(l.debit) filter (where e.id is not null),0)::numeric(14,2) as total_debit,
 coalesce(sum(l.credit) filter (where e.id is not null),0)::numeric(14,2) as total_credit,
 (coalesce(sum(l.debit) filter (where e.id is not null),0)-coalesce(sum(l.credit) filter (where e.id is not null),0))::numeric(14,2) as net_balance
from public.chart_accounts a
left join public.journal_lines l on l.account_id=a.id and l.organization_id=a.organization_id
left join public.journal_entries e on e.id=l.entry_id and e.status='posted'
where a.is_active=true
group by a.organization_id,a.id,a.code,a.name;

revoke all on function public.user_belongs_to_org(uuid) from public,anon;
grant execute on function public.user_belongs_to_org(uuid) to authenticated;
