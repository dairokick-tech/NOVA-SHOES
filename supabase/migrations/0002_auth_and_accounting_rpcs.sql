-- CONTANOVA: perfiles, alta de empresa y registro de asientos balanceados.
-- Aplicar después de 0001_initial_schema.sql en el SQL Editor de Supabase.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  platform_role text not null default 'user' check (platform_role in ('user','superadmin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "users can read own profile" on public.profiles
for select to authenticated using (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_contanova on auth.users;
create trigger on_auth_user_created_contanova
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.create_organization(
  p_legal_name text,
  p_tax_id text default null,
  p_trade_name text default null
)
returns uuid language plpgsql security definer set search_path = public
as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  if length(trim(coalesce(p_legal_name,''))) < 3 then raise exception 'Razón social no válida.'; end if;
  if p_tax_id is not null and p_tax_id !~ '^[0-9]{11}$' then raise exception 'El RUC debe tener 11 dígitos.'; end if;

  insert into public.organizations(legal_name, trade_name, tax_id, created_by)
  values (trim(p_legal_name), nullif(trim(p_trade_name),''), p_tax_id, auth.uid())
  returning id into new_id;

  insert into public.organization_members(organization_id,user_id,role)
  values (new_id,auth.uid(),'owner');

  insert into public.chart_accounts(organization_id,code,name,account_type) values
    (new_id,'10','Efectivo y equivalentes de efectivo','asset'),
    (new_id,'12','Cuentas por cobrar comerciales','asset'),
    (new_id,'20','Mercaderías','asset'),
    (new_id,'33','Propiedad, planta y equipo','asset'),
    (new_id,'40','Tributos por pagar','liability'),
    (new_id,'42','Cuentas por pagar comerciales','liability'),
    (new_id,'50','Capital','equity'),
    (new_id,'70','Ventas','income'),
    (new_id,'60','Compras','expense'),
    (new_id,'63','Gastos de servicios prestados por terceros','expense');

  return new_id;
end;
$$;

create or replace function public.post_journal_entry(
  p_organization_id uuid,
  p_entry_date date,
  p_description text,
  p_lines jsonb
)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  new_entry_id uuid;
  total_debit numeric(14,2);
  total_credit numeric(14,2);
  line jsonb;
  account_uuid uuid;
begin
  if auth.uid() is null or not public.user_belongs_to_org(p_organization_id) then
    raise exception 'No tienes acceso a esta empresa.';
  end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) < 2 then
    raise exception 'El asiento requiere al menos dos líneas.';
  end if;

  select coalesce(sum((x->>'debit')::numeric),0), coalesce(sum((x->>'credit')::numeric),0)
  into total_debit,total_credit
  from jsonb_array_elements(p_lines) x;

  if total_debit <= 0 or total_debit <> total_credit then
    raise exception 'El asiento debe estar cuadrado: debe = haber y ser mayor que cero.';
  end if;

  insert into public.journal_entries(organization_id,entry_date,description,status,created_by)
  values (p_organization_id,p_entry_date,trim(p_description),'posted',auth.uid())
  returning id into new_entry_id;

  for line in select * from jsonb_array_elements(p_lines) loop
    account_uuid := (line->>'account_id')::uuid;
    if not exists(select 1 from public.chart_accounts a where a.id=account_uuid and a.organization_id=p_organization_id and a.is_active) then
      raise exception 'Cuenta contable no válida para esta empresa.';
    end if;
    insert into public.journal_lines(organization_id,entry_id,account_id,description,debit,credit)
    values (p_organization_id,new_entry_id,account_uuid,line->>'description',
      coalesce((line->>'debit')::numeric,0),coalesce((line->>'credit')::numeric,0));
  end loop;

  return new_entry_id;
end;
$$;

grant execute on function public.create_organization(text,text,text) to authenticated;
grant execute on function public.post_journal_entry(uuid,date,text,jsonb) to authenticated;

-- Nota: la creación de empresas y el registro de asientos se realizan mediante RPC
-- para validar membresía y cuadratura en el servidor. Revisar políticas RLS adicionales
-- antes de habilitar edición/borrado y antes de almacenar información real.

revoke all on function public.create_organization(text,text,text) from public, anon;
revoke all on function public.post_journal_entry(uuid,date,text,jsonb) from public, anon;
grant execute on function public.create_organization(text,text,text) to authenticated;
grant execute on function public.post_journal_entry(uuid,date,text,jsonb) to authenticated;
