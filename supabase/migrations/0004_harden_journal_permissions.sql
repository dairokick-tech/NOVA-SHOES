-- CONTANOVA: endurecimiento del registro contable.
-- Aplicar después de 0003_audit_and_trial_balance.sql.
-- Los perfiles de auditoría y cliente mantienen acceso de consulta, no contabilizan.

create or replace function public.post_journal_entry(
  p_organization_id uuid,
  p_entry_date date,
  p_description text,
  p_lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_entry_id uuid;
  total_debit numeric(14,2);
  total_credit numeric(14,2);
  line jsonb;
  account_uuid uuid;
  member_role text;
  line_debit numeric(14,2);
  line_credit numeric(14,2);
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  select m.role into member_role
  from public.organization_members m
  where m.organization_id = p_organization_id
    and m.user_id = auth.uid();

  if member_role is null then
    raise exception 'No tienes acceso a esta empresa.';
  end if;

  if member_role not in ('owner','director','accountant','assistant') then
    raise exception 'Tu rol tiene permiso de consulta, pero no de contabilización.';
  end if;

  if p_entry_date is null then
    raise exception 'La fecha del asiento es obligatoria.';
  end if;
  if length(trim(coalesce(p_description,''))) < 3 then
    raise exception 'La glosa debe contener al menos 3 caracteres.';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) is distinct from 'array'
     or jsonb_array_length(p_lines) < 2 then
    raise exception 'El asiento requiere al menos dos líneas.';
  end if;

  select
    coalesce(sum((x->>'debit')::numeric),0),
    coalesce(sum((x->>'credit')::numeric),0)
  into total_debit,total_credit
  from jsonb_array_elements(p_lines) x;

  if total_debit <= 0 or total_debit <> total_credit then
    raise exception 'El asiento debe estar cuadrado: debe = haber y ser mayor que cero.';
  end if;

  for line in select * from jsonb_array_elements(p_lines) loop
    account_uuid := (line->>'account_id')::uuid;
    line_debit := coalesce((line->>'debit')::numeric,0);
    line_credit := coalesce((line->>'credit')::numeric,0);

    if line_debit < 0 or line_credit < 0
       or (line_debit > 0 and line_credit > 0)
       or (line_debit = 0 and line_credit = 0) then
      raise exception 'Cada línea debe registrar un importe válido solo en debe o haber.';
    end if;

    if not exists (
      select 1 from public.chart_accounts a
      where a.id = account_uuid
        and a.organization_id = p_organization_id
        and a.is_active = true
    ) then
      raise exception 'Cuenta contable no válida para esta empresa.';
    end if;
  end loop;

  insert into public.journal_entries(
    organization_id,entry_date,description,status,created_by
  )
  values (
    p_organization_id,p_entry_date,trim(p_description),'posted',auth.uid()
  )
  returning id into new_entry_id;

  for line in select * from jsonb_array_elements(p_lines) loop
    account_uuid := (line->>'account_id')::uuid;
    insert into public.journal_lines(
      organization_id,entry_id,account_id,description,debit,credit
    )
    values (
      p_organization_id,new_entry_id,account_uuid,
      nullif(trim(coalesce(line->>'description','')),''),
      coalesce((line->>'debit')::numeric,0),
      coalesce((line->>'credit')::numeric,0)
    );
  end loop;

  return new_entry_id;
end;
$$;

revoke all on function public.post_journal_entry(uuid,date,text,jsonb) from public, anon;
grant execute on function public.post_journal_entry(uuid,date,text,jsonb) to authenticated;
