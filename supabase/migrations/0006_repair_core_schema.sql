-- CONTANOVA: reparación idempotente del esquema base.
-- Puede ejecutarse en SQL Editor cuando faltan tablas por migraciones no aplicadas.
-- No elimina datos existentes. Ejecutar con el propietario del proyecto.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trade_name text,
  tax_id varchar(11),
  tax_regime text,
  country_code char(2) not null default 'PE',
  currency_code char(3) not null default 'PEN',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','director','accountant','assistant','auditor','client')),
  created_at timestamptz not null default now(),
  primary key (organization_id,user_id)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  platform_role text not null default 'user' check (platform_role in ('user','superadmin')),
  created_at timestamptz not null default now()
);

create table if not exists public.chart_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code varchar(20) not null,
  name text not null,
  account_type text not null,
  parent_id uuid references public.chart_accounts(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id,code)
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entry_number bigint,
  entry_date date not null,
  description text not null,
  source_type text,
  source_id uuid,
  status text not null default 'draft' check (status in ('draft','posted','void')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id uuid not null references public.chart_accounts(id),
  description text,
  debit numeric(14,2) not null default 0 check (debit >= 0),
  credit numeric(14,2) not null default 0 check (credit >= 0),
  check (not (debit > 0 and credit > 0))
);

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

create index if not exists idx_journal_entries_org_date on public.journal_entries(organization_id,entry_date);
create index if not exists idx_journal_lines_entry on public.journal_lines(entry_id);
create index if not exists idx_audit_org_created on public.audit_logs(organization_id,created_at desc);

create or replace function public.user_belongs_to_org(org_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(select 1 from public.organization_members m
    where m.organization_id=org_id and m.user_id=auth.uid());
$$;

create or replace function public.is_platform_superadmin()
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(select 1 from public.profiles p join auth.users u on u.id=p.id
    where p.id=auth.uid() and lower(u.email)=lower('nexodigitex@yahoo.com')
      and p.platform_role='superadmin');
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.profiles enable row level security;
alter table public.chart_accounts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "members can view their organizations" on public.organizations;
create policy "members can view their organizations" on public.organizations
for select to authenticated using (public.user_belongs_to_org(id) or public.is_platform_superadmin());
drop policy if exists "members can view organization membership" on public.organization_members;
create policy "members can view organization membership" on public.organization_members
for select to authenticated using (public.user_belongs_to_org(organization_id) or public.is_platform_superadmin());
drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile" on public.profiles
for select to authenticated using (id=auth.uid() or public.is_platform_superadmin());
drop policy if exists "members can read chart accounts" on public.chart_accounts;
create policy "members can read chart accounts" on public.chart_accounts
for select to authenticated using (public.user_belongs_to_org(organization_id) or public.is_platform_superadmin());
drop policy if exists "members can read journal entries" on public.journal_entries;
create policy "members can read journal entries" on public.journal_entries
for select to authenticated using (public.user_belongs_to_org(organization_id) or public.is_platform_superadmin());
drop policy if exists "members can read journal lines" on public.journal_lines;
create policy "members can read journal lines" on public.journal_lines
for select to authenticated using (public.user_belongs_to_org(organization_id) or public.is_platform_superadmin());
drop policy if exists "members can read organization audit logs" on public.audit_logs;
create policy "members can read organization audit logs" on public.audit_logs
for select to authenticated using (public.user_belongs_to_org(organization_id) or public.is_platform_superadmin());

drop policy if exists "platform superadmin manages organizations" on public.organizations;
create policy "platform superadmin manages organizations" on public.organizations
for all to authenticated using (public.is_platform_superadmin()) with check (public.is_platform_superadmin());
drop policy if exists "platform superadmin manages memberships" on public.organization_members;
create policy "platform superadmin manages memberships" on public.organization_members
for all to authenticated using (public.is_platform_superadmin()) with check (public.is_platform_superadmin());

insert into public.profiles(id,full_name)
select u.id,coalesce(u.raw_user_meta_data->>'full_name','') from auth.users u
on conflict(id) do nothing;

update public.profiles p set platform_role='superadmin'
from auth.users u
where u.id=p.id and lower(u.email)=lower('nexodigitex@yahoo.com');

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  insert into public.profiles(id,full_name)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict(id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_contanova on auth.users;
create trigger on_auth_user_created_contanova after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.create_organization(
  p_legal_name text,p_tax_id text default null,p_trade_name text default null
)
returns uuid language plpgsql security definer set search_path=public
as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  if length(trim(coalesce(p_legal_name,'')))<3 then raise exception 'Razón social no válida.'; end if;
  if p_tax_id is not null and p_tax_id !~ '^[0-9]{11}$' then raise exception 'El RUC debe tener 11 dígitos.'; end if;
  insert into public.organizations(legal_name,trade_name,tax_id,created_by)
  values(trim(p_legal_name),nullif(trim(p_trade_name),''),p_tax_id,auth.uid()) returning id into new_id;
  insert into public.organization_members(organization_id,user_id,role) values(new_id,auth.uid(),'owner');
  insert into public.chart_accounts(organization_id,code,name,account_type) values
    (new_id,'10','Efectivo y equivalentes de efectivo','asset'),
    (new_id,'12','Cuentas por cobrar comerciales','asset'),
    (new_id,'20','Mercaderías','asset'),
    (new_id,'33','Propiedad, planta y equipo','asset'),
    (new_id,'40','Tributos por pagar','liability'),
    (new_id,'42','Cuentas por pagar comerciales','liability'),
    (new_id,'50','Capital','equity'),
    (new_id,'60','Compras','expense'),
    (new_id,'63','Gastos de servicios prestados por terceros','expense'),
    (new_id,'70','Ventas','income');
  return new_id;
end;
$$;

create or replace function public.post_journal_entry(
  p_organization_id uuid,p_entry_date date,p_description text,p_lines jsonb
)
returns uuid language plpgsql security definer set search_path=public
as $$
declare new_entry_id uuid; total_debit numeric(14,2); total_credit numeric(14,2);
  line jsonb; account_uuid uuid; member_role text; line_debit numeric(14,2); line_credit numeric(14,2);
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  select role into member_role from public.organization_members
    where organization_id=p_organization_id and user_id=auth.uid();
  if member_role is null then raise exception 'No tienes acceso a esta empresa.'; end if;
  if member_role not in ('owner','director','accountant','assistant') then
    raise exception 'Tu rol tiene permiso de consulta, pero no de contabilización.';
  end if;
  if p_entry_date is null or length(trim(coalesce(p_description,'')))<3 then
    raise exception 'La fecha y una glosa de al menos 3 caracteres son obligatorias.';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines)<2 then
    raise exception 'El asiento requiere al menos dos líneas.';
  end if;
  select coalesce(sum((x->>'debit')::numeric),0),coalesce(sum((x->>'credit')::numeric),0)
    into total_debit,total_credit from jsonb_array_elements(p_lines) x;
  if total_debit<=0 or total_debit<>total_credit then
    raise exception 'El asiento debe estar cuadrado: debe = haber y ser mayor que cero.';
  end if;
  for line in select * from jsonb_array_elements(p_lines) loop
    account_uuid:=(line->>'account_id')::uuid;
    line_debit:=coalesce((line->>'debit')::numeric,0);
    line_credit:=coalesce((line->>'credit')::numeric,0);
    if line_debit<0 or line_credit<0 or (line_debit>0 and line_credit>0)
       or (line_debit=0 and line_credit=0) then raise exception 'Importe de línea no válido.'; end if;
    if not exists(select 1 from public.chart_accounts a where a.id=account_uuid
      and a.organization_id=p_organization_id and a.is_active) then
      raise exception 'Cuenta contable no válida para esta empresa.';
    end if;
  end loop;
  insert into public.journal_entries(organization_id,entry_date,description,status,created_by)
    values(p_organization_id,p_entry_date,trim(p_description),'posted',auth.uid())
    returning id into new_entry_id;
  for line in select * from jsonb_array_elements(p_lines) loop
    insert into public.journal_lines(organization_id,entry_id,account_id,description,debit,credit)
    values(p_organization_id,new_entry_id,(line->>'account_id')::uuid,
      nullif(trim(coalesce(line->>'description','')),''),coalesce((line->>'debit')::numeric,0),
      coalesce((line->>'credit')::numeric,0));
  end loop;
  return new_entry_id;
end;
$$;

create or replace view public.v_trial_balance with (security_invoker=true) as
select a.organization_id,a.id as account_id,a.code as account_code,a.name as account_name,
  coalesce(sum(l.debit) filter(where e.id is not null),0)::numeric(14,2) as total_debit,
  coalesce(sum(l.credit) filter(where e.id is not null),0)::numeric(14,2) as total_credit,
  (coalesce(sum(l.debit) filter(where e.id is not null),0)-coalesce(sum(l.credit) filter(where e.id is not null),0))::numeric(14,2) as net_balance
from public.chart_accounts a
left join public.journal_lines l on l.account_id=a.id and l.organization_id=a.organization_id
left join public.journal_entries e on e.id=l.entry_id and e.status='posted'
where a.is_active=true group by a.organization_id,a.id,a.code,a.name;

revoke all on function public.user_belongs_to_org(uuid) from public,anon;
grant execute on function public.user_belongs_to_org(uuid) to authenticated;
revoke all on function public.is_platform_superadmin() from public,anon;
grant execute on function public.is_platform_superadmin() to authenticated;
revoke all on function public.create_organization(text,text,text) from public,anon;
grant execute on function public.create_organization(text,text,text) to authenticated;
revoke all on function public.post_journal_entry(uuid,date,text,jsonb) from public,anon;
grant execute on function public.post_journal_entry(uuid,date,text,jsonb) to authenticated;
