-- ============================================================
-- SGC24h · 0004 — cobros parciales (anticipos) y gastos/compras
-- Ejecutar en Supabase → SQL Editor (después de 0003).
-- ============================================================

-- Cada cobro de un pedido (anticipo, resto, pago completo…)
create table if not exists public.sg_pagos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  pedido_id uuid not null references public.sg_pedidos(id) on delete cascade,
  importe numeric(10,2) not null check (importe > 0),
  metodo text not null check (metodo in ('efectivo','bizum')),
  fecha date not null default current_date,
  nota text
);

-- Los pedidos que ya estaban marcados como pagados pasan a tener su cobro registrado
insert into public.sg_pagos (pedido_id, importe, metodo, fecha)
select p.id, p.total, coalesce(p.metodo_pago, 'efectivo'), coalesce(p.pagado_en::date, p.created_at::date)
from public.sg_pedidos p
where p.pagado and p.total > 0
  and not exists (select 1 from public.sg_pagos x where x.pedido_id = p.id);

update public.sg_pedidos p set anticipo = coalesce((select sum(importe) from public.sg_pagos x where x.pedido_id = p.id), 0);

-- Gastos del negocio (compras de prendas, polvo, film, cinta…). La foto del ticket va al bucket «adjuntos».
create table if not exists public.sg_gastos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  fecha date not null default current_date,
  concepto text not null,
  categoria text not null default 'otros' check (categoria in ('prendas','polvo','film','cinta','otros')),
  importe numeric(10,2) not null check (importe >= 0),
  pagado_por text,
  proveedor text,
  foto_path text,
  prenda_id uuid references public.sg_prendas(id) on delete set null
);

do $$
declare t text;
begin
  foreach t in array array['sg_pagos','sg_gastos']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%1$s_auth" on public.%1$I', t);
    execute format('create policy "%1$s_auth" on public.%1$I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
