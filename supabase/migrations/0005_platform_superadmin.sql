-- CONTANOVA: habilitar el propietario de la plataforma como superadministrador.
-- Esta migración debe ejecutarse con privilegios de administrador de Supabase.
-- Solo promociona la cuenta exacta que ya exista en Auth; no crea cuentas ni contraseñas.

create or replace function public.is_platform_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.id = auth.uid()
      and lower(u.email) = lower('nexodigitex@yahoo.com')
      and p.platform_role = 'superadmin'
  );
$$;

revoke all on function public.is_platform_superadmin() from public, anon;
grant execute on function public.is_platform_superadmin() to authenticated;

-- Promoción limitada al correo indicado y únicamente si ya está registrado.
update public.profiles p
set platform_role = 'superadmin'
from auth.users u
where u.id = p.id
  and lower(u.email) = lower('nexodigitex@yahoo.com');

-- Acceso global de lectura y administración de empresas y sus membresías.
drop policy if exists "platform superadmin manages organizations" on public.organizations;
create policy "platform superadmin manages organizations"
on public.organizations for all to authenticated
using (public.is_platform_superadmin())
with check (public.is_platform_superadmin());

drop policy if exists "platform superadmin manages memberships" on public.organization_members;
create policy "platform superadmin manages memberships"
on public.organization_members for all to authenticated
using (public.is_platform_superadmin())
with check (public.is_platform_superadmin());

drop policy if exists "platform superadmin reads profiles" on public.profiles;
create policy "platform superadmin reads profiles"
on public.profiles for select to authenticated
using (public.is_platform_superadmin());

drop policy if exists "platform superadmin reads chart accounts" on public.chart_accounts;
create policy "platform superadmin reads chart accounts"
on public.chart_accounts for select to authenticated
using (public.is_platform_superadmin());

drop policy if exists "platform superadmin reads journal entries" on public.journal_entries;
create policy "platform superadmin reads journal entries"
on public.journal_entries for select to authenticated
using (public.is_platform_superadmin());

drop policy if exists "platform superadmin reads journal lines" on public.journal_lines;
create policy "platform superadmin reads journal lines"
on public.journal_lines for select to authenticated
using (public.is_platform_superadmin());

drop policy if exists "platform superadmin reads audit logs" on public.audit_logs;
create policy "platform superadmin reads audit logs"
on public.audit_logs for select to authenticated
using (public.is_platform_superadmin());
