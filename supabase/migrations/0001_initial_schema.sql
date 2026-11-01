-- CONTANOVA - esquema inicial multiempresa para Supabase/PostgreSQL
-- Ejecutar en un proyecto nuevo después de revisar políticas y requisitos legales.
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
  primary key (organization_id, user_id)
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
  unique (organization_id, code)
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

create index if not exists idx_journal_entries_org_date on public.journal_entries(organization_id, entry_date);
create index if not exists idx_journal_lines_entry on public.journal_lines(entry_id);

create or replace function public.user_belongs_to_org(org_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org_id and m.user_id = auth.uid()
  );
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.chart_accounts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;

create policy "members can view their organizations" on public.organizations
for select to authenticated using (public.user_belongs_to_org(id));
create policy "members can view organization membership" on public.organization_members
for select to authenticated using (public.user_belongs_to_org(organization_id));
create policy "members can read chart accounts" on public.chart_accounts
for select to authenticated using (public.user_belongs_to_org(organization_id));
create policy "members can read journal entries" on public.journal_entries
for select to authenticated using (public.user_belongs_to_org(organization_id));
create policy "members can read journal lines" on public.journal_lines
for select to authenticated using (public.user_belongs_to_org(organization_id));

-- Las políticas de escritura deben ampliarse por rol y validarse con pruebas RLS
-- antes de habilitar operaciones reales. No conceder acceso anónimo.
