-- CONTANOVA: reparación de permisos y consistencia para registros multiempresa.
-- Idempotente. No borra ni modifica registros existentes.
begin;

-- Asegurar que el cliente autenticado pueda consultar los datos que la interfaz usa.
grant usage on schema public to authenticated;
grant select on public.organizations, public.organization_members, public.profiles,
  public.chart_accounts, public.journal_entries, public.journal_lines, public.audit_logs
  to authenticated;

-- La creación de empresas y los asientos se ejecutan exclusivamente por RPC validada.
revoke insert, update, delete on public.organizations,
  public.organization_members, public.journal_entries, public.journal_lines
  from anon, authenticated;

revoke all on function public.create_organization(text,text,text) from public, anon;
grant execute on function public.create_organization(text,text,text) to authenticated;

revoke all on function public.post_journal_entry(uuid,date,text,jsonb) from public, anon;
grant execute on function public.post_journal_entry(uuid,date,text,jsonb) to authenticated;

-- El plan contable solo puede ser ampliado/actualizado por responsables de la empresa.
create or replace function public.can_manage_accounting(p_organization_id uuid)
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id=p_organization_id
      and m.user_id=auth.uid()
      and m.role in ('owner','director','accountant')
  );
$$;
revoke all on function public.can_manage_accounting(uuid) from public, anon;
grant execute on function public.can_manage_accounting(uuid) to authenticated;

drop policy if exists "accounting managers add chart accounts" on public.chart_accounts;
create policy "accounting managers add chart accounts" on public.chart_accounts
for insert to authenticated
with check (public.can_manage_accounting(organization_id));

drop policy if exists "accounting managers update chart accounts" on public.chart_accounts;
create policy "accounting managers update chart accounts" on public.chart_accounts
for update to authenticated
using (public.can_manage_accounting(organization_id))
with check (public.can_manage_accounting(organization_id));

grant insert, update on public.chart_accounts to authenticated;

commit;
