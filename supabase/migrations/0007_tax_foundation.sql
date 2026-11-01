-- CONTANOVA: base de gestión tributaria peruana.
-- Este esquema registra datos y estados internos. NO conecta por sí solo con SUNAT,
-- SIRE ni PLE; la transmisión real requiere credenciales/certificados y un servicio autorizado.
begin;

create table if not exists public.tax_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  tax_regime text,
  igv_rate numeric(5,2) not null default 18.00 check (igv_rate >= 0 and igv_rate <= 100),
  sol_user_configured boolean not null default false,
  certificate_configured boolean not null default false,
  environment text not null default 'beta' check (environment in ('beta','production')),
  updated_at timestamptz not null default now()
);

create table if not exists public.tax_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_type text not null check (document_type in ('invoice','receipt','credit_note','debit_note','purchase')),
  series text,
  number text,
  issue_date date not null,
  counterparty_tax_id varchar(11),
  counterparty_name text,
  currency_code char(3) not null default 'PEN',
  taxable_amount numeric(14,2) not null default 0 check (taxable_amount >= 0),
  exempt_amount numeric(14,2) not null default 0 check (exempt_amount >= 0),
  igv_amount numeric(14,2) not null default 0 check (igv_amount >= 0),
  total_amount numeric(14,2) not null check (total_amount >= 0),
  internal_status text not null default 'draft' check (internal_status in ('draft','issued','void')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (organization_id, document_type, series, number)
);

create table if not exists public.tax_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period char(6) not null check (period ~ '^[0-9]{6}$'),
  purchase_status text not null default 'pending' check (purchase_status in ('pending','prepared','submitted','accepted','observed','rejected')),
  sales_status text not null default 'pending' check (sales_status in ('pending','prepared','submitted','accepted','observed','rejected')),
  ple_status text not null default 'pending' check (ple_status in ('pending','prepared','submitted','accepted','observed','rejected')),
  due_date date,
  created_at timestamptz not null default now(),
  unique (organization_id, period)
);

create table if not exists public.tax_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_id uuid not null references public.tax_periods(id) on delete cascade,
  channel text not null check (channel in ('sunat_invoice','sire_purchases','sire_sales','ple')),
  status text not null default 'pending' check (status in ('pending','prepared','sent','accepted','observed','rejected','failed')),
  external_ticket text,
  response_code text,
  response_message text,
  submitted_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_tax_documents_org_date on public.tax_documents(organization_id, issue_date);
create index if not exists idx_tax_periods_org_period on public.tax_periods(organization_id, period);
create index if not exists idx_tax_submissions_org_created on public.tax_submissions(organization_id, created_at desc);

alter table public.tax_settings enable row level security;
alter table public.tax_documents enable row level security;
alter table public.tax_periods enable row level security;
alter table public.tax_submissions enable row level security;

drop policy if exists "members read tax settings" on public.tax_settings;
create policy "members read tax settings" on public.tax_settings
for select to authenticated using (public.user_belongs_to_org(organization_id) or public.is_platform_superadmin());
drop policy if exists "members read tax documents" on public.tax_documents;
create policy "members read tax documents" on public.tax_documents
for select to authenticated using (public.user_belongs_to_org(organization_id) or public.is_platform_superadmin());
drop policy if exists "members read tax periods" on public.tax_periods;
create policy "members read tax periods" on public.tax_periods
for select to authenticated using (public.user_belongs_to_org(organization_id) or public.is_platform_superadmin());
drop policy if exists "members read tax submissions" on public.tax_submissions;
create policy "members read tax submissions" on public.tax_submissions
for select to authenticated using (public.user_belongs_to_org(organization_id) or public.is_platform_superadmin());

grant select on public.tax_settings, public.tax_documents, public.tax_periods, public.tax_submissions to authenticated;
commit;
