-- CONTANOVA: permisos de escritura acotados para datos tributarios.
-- Los estados de envío SUNAT/SIRE/PLE no se pueden falsificar desde el cliente.
begin;

create or replace function public.can_manage_tax(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner','director','accountant')
  );
$$;

revoke all on function public.can_manage_tax(uuid) from public, anon;
grant execute on function public.can_manage_tax(uuid) to authenticated;

drop policy if exists "tax managers insert settings" on public.tax_settings;
create policy "tax managers insert settings" on public.tax_settings
for insert to authenticated
with check (public.can_manage_tax(organization_id));

drop policy if exists "tax managers update settings" on public.tax_settings;
create policy "tax managers update settings" on public.tax_settings
for update to authenticated
using (public.can_manage_tax(organization_id))
with check (public.can_manage_tax(organization_id));

drop policy if exists "tax managers insert documents" on public.tax_documents;
create policy "tax managers insert documents" on public.tax_documents
for insert to authenticated
with check (public.can_manage_tax(organization_id) and (created_by is null or created_by = auth.uid()));

drop policy if exists "tax managers update documents" on public.tax_documents;
create policy "tax managers update documents" on public.tax_documents
for update to authenticated
using (public.can_manage_tax(organization_id))
with check (public.can_manage_tax(organization_id));

drop policy if exists "tax managers delete draft documents" on public.tax_documents;
create policy "tax managers delete draft documents" on public.tax_documents
for delete to authenticated
using (public.can_manage_tax(organization_id) and internal_status = 'draft');

drop policy if exists "tax managers create periods" on public.tax_periods;
create policy "tax managers create periods" on public.tax_periods
for insert to authenticated
with check (public.can_manage_tax(organization_id));

grant insert, update on public.tax_settings to authenticated;
grant insert, update, delete on public.tax_documents to authenticated;
grant insert on public.tax_periods to authenticated;

-- No se concede escritura directa en tax_submissions: la respuesta oficial
-- debe registrarse desde un servicio de integración confiable, no desde el navegador.
revoke insert, update, delete on public.tax_submissions from anon, authenticated;

commit;
