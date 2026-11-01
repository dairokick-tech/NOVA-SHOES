-- CONTANOVA: extend product records to match the professional catalog form.
-- Safe to run after 0001_contanova_core.sql; all additions are additive.
alter table public.products
  add column if not exists barcode text,
  add column if not exists category_name text,
  add column if not exists brand text,
  add column if not exists unit text not null default 'Unidad',
  add column if not exists wholesale_price numeric(14,2) not null default 0 check (wholesale_price >= 0),
  add column if not exists tax_rate numeric(5,2) not null default 18 check (tax_rate >= 0 and tax_rate <= 100),
  add column if not exists min_stock numeric(14,3) not null default 0 check (min_stock >= 0),
  add column if not exists max_stock numeric(14,3) check (max_stock is null or max_stock >= 0),
  add column if not exists initial_stock numeric(14,3) not null default 0 check (initial_stock >= 0),
  add column if not exists warehouse_name text not null default 'Principal',
  add column if not exists size text,
  add column if not exists color text,
  add column if not exists lot_number text,
  add column if not exists expiry_date date,
  add column if not exists model text,
  add column if not exists serial_number text,
  add column if not exists publish_online boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists products_company_barcode_idx
  on public.products(company_id, barcode) where barcode is not null;
create index if not exists products_company_category_name_idx
  on public.products(company_id, category_name);
create index if not exists products_company_online_idx
  on public.products(company_id, publish_online) where active = true;

-- Keep updated_at current for edits made through the Supabase API.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

comment on column public.products.category_name is 'Human-readable category selected in the CONTANOVA catalog form.';
comment on column public.products.publish_online is 'Whether this product may appear in the public online store.';
